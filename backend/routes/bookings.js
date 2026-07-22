const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();
const BOOKING_FEE = 2.5;
const COMMISSION_RATE = 0.15;

// POST /bookings — creates a booking with NO payment attached (status stays 'pending',
// payment_status stays 'unpaid'). Useful for testing or manual/free bookings, but the
// real customer flow is POST /payments/checkout, which creates the booking AND a
// Paystack transaction together, then a webhook confirms it once paid.
router.post("/", requireAuth, async (req, res) => {
  const { salon_id, service_id, time_slot } = req.body;
  if (!salon_id || !service_id || !time_slot) {
    return res.status(400).json({ error: "salon_id, service_id, and time_slot are required" });
  }
  try {
    const { rows: serviceRows } = await db.query(
      "SELECT * FROM services WHERE id = $1 AND salon_id = $2",
      [service_id, salon_id]
    );
    const service = serviceRows[0];
    if (!service) return res.status(404).json({ error: "Service not found for this salon" });

    const commission_amount = Math.round(service.price * COMMISSION_RATE * 100) / 100;
    const payout_amount = Math.round((service.price - commission_amount) * 100) / 100;

    const { rows } = await db.query(
      `INSERT INTO bookings
        (customer_id, salon_id, service_id, time_slot, service_price, booking_fee, commission_rate, commission_amount, payout_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.user.id, salon_id, service_id, time_slot, service.price, BOOKING_FEE, COMMISSION_RATE, commission_amount, payout_amount]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't create that booking." });
  }
});

// GET /bookings/me (customer's own bookings)
router.get("/me", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT b.*, s.name AS salon_name, sv.name AS service_name
       FROM bookings b
       JOIN salons s ON s.id = b.salon_id
       JOIN services sv ON sv.id = b.service_id
       WHERE b.customer_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load your bookings." });
  }
});

// PATCH /bookings/:id/cancel
router.patch("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const { rows: bookingRows } = await db.query("SELECT * FROM bookings WHERE id = $1", [req.params.id]);
    const booking = bookingRows[0];
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.customer_id !== req.user.id) return res.status(403).json({ error: "Not your booking" });

    await db.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [booking.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't cancel that booking." });
  }
});

module.exports = router;
