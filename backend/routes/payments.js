const express = require("express");
const db = require("../db");
const stripe = require("../lib/stripe");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

const BOOKING_FEE = 2.5;
const COMMISSION_RATE = 0.15;

// Where Stripe should send the owner back after onboarding. Set this to your real
// frontend URL in production (e.g. https://salonconnect.vercel.app).
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// POST /payments/connect — start (or resume) Stripe Express onboarding for the owner's salon
router.post("/connect", requireAuth, requireRole("owner"), async (req, res) => {
  const { salon_id } = req.body;
  const salon = db.prepare("SELECT * FROM salons WHERE id = ?").get(salon_id);
  if (!salon) return res.status(404).json({ error: "Salon not found" });
  if (salon.owner_id !== req.user.id) return res.status(403).json({ error: "Not your salon" });

  try {
    let accountId = salon.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: req.user.email,
        business_type: "individual",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      db.prepare("UPDATE salons SET stripe_account_id = ? WHERE id = ?").run(accountId, salon.id);
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${FRONTEND_URL}/?stripe_refresh=1`,
      return_url: `${FRONTEND_URL}/?stripe_return=1`,
      type: "account_onboarding",
    });

    res.json({ url: accountLink.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't start Stripe onboarding. Check STRIPE_SECRET_KEY is set." });
  }
});

// GET /payments/connect/status?salon_id=1 — check whether onboarding is complete
router.get("/connect/status", requireAuth, requireRole("owner"), async (req, res) => {
  const salon = db.prepare("SELECT * FROM salons WHERE id = ?").get(req.query.salon_id);
  if (!salon) return res.status(404).json({ error: "Salon not found" });
  if (salon.owner_id !== req.user.id) return res.status(403).json({ error: "Not your salon" });

  if (!salon.stripe_account_id) {
    return res.json({ connected: false, payoutsEnabled: false });
  }

  try {
    const account = await stripe.accounts.retrieve(salon.stripe_account_id);
    const payoutsEnabled = !!account.payouts_enabled;
    db.prepare("UPDATE salons SET stripe_payouts_enabled = ? WHERE id = ?").run(payoutsEnabled ? 1 : 0, salon.id);
    res.json({ connected: true, payoutsEnabled });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't check Stripe status" });
  }
});

// POST /payments/checkout — customer books + pays in one step via a Stripe Checkout Session
router.post("/checkout", requireAuth, async (req, res) => {
  const { salon_id, service_id, time_slot } = req.body;
  if (!salon_id || !service_id || !time_slot) {
    return res.status(400).json({ error: "salon_id, service_id, and time_slot are required" });
  }

  const salon = db.prepare("SELECT * FROM salons WHERE id = ?").get(salon_id);
  const service = db.prepare("SELECT * FROM services WHERE id = ? AND salon_id = ?").get(service_id, salon_id);
  if (!salon || !service) return res.status(404).json({ error: "Salon or service not found" });
  if (!salon.stripe_account_id || !salon.stripe_payouts_enabled) {
    return res.status(400).json({ error: "This salon hasn't finished setting up payouts yet." });
  }

  const commission_amount = Math.round(service.price * COMMISSION_RATE * 100) / 100;
  const payout_amount = Math.round((service.price - commission_amount) * 100) / 100;
  const total = service.price + BOOKING_FEE;
  // Our cut of the total charge: the commission on the service, plus the flat booking fee.
  const applicationFeeCents = Math.round((commission_amount + BOOKING_FEE) * 100);

  const bookingInfo = db
    .prepare(
      `INSERT INTO bookings
        (customer_id, salon_id, service_id, time_slot, status, service_price, booking_fee, commission_rate, commission_amount, payout_amount, payment_status)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, 'unpaid')`
    )
    .run(req.user.id, salon_id, service_id, time_slot, service.price, BOOKING_FEE, COMMISSION_RATE, commission_amount, payout_amount);
  const bookingId = bookingInfo.lastInsertRowid;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: req.user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `${service.name} at ${salon.name}` },
            unit_amount: Math.round(total * 100),
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeCents,
        transfer_data: { destination: salon.stripe_account_id },
        metadata: { booking_id: String(bookingId) },
      },
      metadata: { booking_id: String(bookingId) },
      success_url: `${FRONTEND_URL}/?booking_success=1&booking_id=${bookingId}`,
      cancel_url: `${FRONTEND_URL}/?booking_cancelled=1`,
    });

    db.prepare("UPDATE bookings SET stripe_checkout_session_id = ? WHERE id = ?").run(session.id, bookingId);
    res.json({ url: session.url, booking_id: bookingId });
  } catch (err) {
    console.error(err);
    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(bookingId);
    res.status(500).json({ error: "Couldn't start checkout. Check STRIPE_SECRET_KEY is set." });
  }
});

module.exports = router;
