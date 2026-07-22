const express = require("express");
const db = require("../db");
const paystack = require("../lib/paystack");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

const BOOKING_FEE = 2.5;
const COMMISSION_RATE = 0.15;
const CURRENCY = process.env.PAYSTACK_CURRENCY || "NGN";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

router.get("/banks", async (req, res) => {
  try {
    const banks = await paystack.get(`/bank?country=nigeria&currency=${CURRENCY}`);
    res.json(banks.map((b) => ({ name: b.name, code: b.code })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load bank list. Check PAYSTACK_SECRET_KEY is set." });
  }
});

router.get("/resolve-account", requireAuth, requireRole("owner"), async (req, res) => {
  const { account_number, bank_code } = req.query;
  if (!account_number || !bank_code) {
    return res.status(400).json({ error: "account_number and bank_code are required" });
  }
  try {
    const result = await paystack.get(
      `/bank/resolve?account_number=${encodeURIComponent(account_number)}&bank_code=${encodeURIComponent(bank_code)}`
    );
    res.json({ account_name: result.account_name });
  } catch (err) {
    res.status(400).json({ error: "Couldn't verify that account. Double-check the number and bank." });
  }
});

router.post("/connect", requireAuth, requireRole("owner"), async (req, res) => {
  const { salon_id, business_name, bank_code, account_number } = req.body;
  if (!salon_id || !business_name || !bank_code || !account_number) {
    return res.status(400).json({ error: "salon_id, business_name, bank_code, and account_number are required" });
  }

  const salon = db.prepare("SELECT * FROM salons WHERE id = ?").get(salon_id);
  if (!salon) return res.status(404).json({ error: "Salon not found" });
  if (salon.owner_id !== req.user.id) return res.status(403).json({ error: "Not your salon" });

  try {
    const subaccount = await paystack.post("/subaccount", {
      business_name,
      bank_code,
      account_number,
      percentage_charge: COMMISSION_RATE * 100,
    });

    db.prepare("UPDATE salons SET paystack_subaccount_code = ?, paystack_payouts_enabled = 1 WHERE id = ?").run(
      subaccount.subaccount_code,
      salon.id
    );

    res.json({ ok: true, subaccount_code: subaccount.subaccount_code, account_name: subaccount.account_name });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Couldn't set up payouts for this salon." });
  }
});

router.post("/checkout", requireAuth, async (req, res) => {
  const { salon_id, service_id, time_slot } = req.body;
  if (!salon_id || !service_id || !time_slot) {
    return res.status(400).json({ error: "salon_id, service_id, and time_slot are required" });
  }

  const salon = db.prepare("SELECT * FROM salons WHERE id = ?").get(salon_id);
  const service = db.prepare("SELECT * FROM services WHERE id = ? AND salon_id = ?").get(service_id, salon_id);
  if (!salon || !service) return res.status(404).json({ error: "Salon or service not found" });
  if (!salon.paystack_subaccount_code || !salon.paystack_payouts_enabled) {
    return res.status(400).json({ error: "This salon hasn't finished setting up payouts yet." });
  }

  const commission_amount = Math.round(service.price * COMMISSION_RATE * 100) / 100;
  const payout_amount = Math.round((service.price - commission_amount) * 100) / 100;
  const total = service.price + BOOKING_FEE;

  const bookingInfo = db
    .prepare(
      `INSERT INTO bookings
        (customer_id, salon_id, service_id, time_slot, status, service_price, booking_fee, commission_rate, commission_amount, payout_amount, payment_status)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, 'unpaid')`
    )
    .run(req.user.id, salon_id, service_id, time_slot, service.price, BOOKING_FEE, COMMISSION_RATE, commission_amount, payout_amount);
  const bookingId = bookingInfo.lastInsertRowid;

  try {
    const transaction = await paystack.post("/transaction/initialize", {
      email: req.user.email,
      amount: Math.round(total * 100),
      currency: CURRENCY,
      subaccount: salon.paystack_subaccount_code,
      transaction_charge: Math.round((commission_amount + BOOKING_FEE) * 100),
      bearer: "subaccount",
      metadata: { booking_id: bookingId },
      callback_url: `${FRONTEND_URL}/?booking_success=1&booking_id=${bookingId}`,
    });

    db.prepare("UPDATE bookings SET paystack_reference = ? WHERE id = ?").run(transaction.reference, bookingId);
    res.json({ url: transaction.authorization_url, booking_id: bookingId });
  } catch (err) {
    console.error(err);
    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(bookingId);
    res.status(500).json({ error: "Couldn't start checkout. Check PAYSTACK_SECRET_KEY is set." });
  }
});

module.exports = router;
