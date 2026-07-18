const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const BOOKING_FEE = 2.5;
const COMMISSION_RATE = 0.15;

// POST /bookings — creates a booking with NO payment attached (status stays 'pending',
// payment_status stays 'unpaid'). Useful for testing or manual/free bookings, but the
// real customer flow is POST /payments/checkout, which creates the booking AND a
// Stripe Checkout Session together, then a webhook confirms it once paid.
router.post("/", requireAuth, (req, res) => {
  const { salon_id, service_id, time_slot } = req.body;
  if (!salon_id || !service_id || !time_slot) {
    return res.status(400).json({ error: "salon_id, service_id, and time_slot are required" });
  }

  const service = db.prepare("SELECT * FROM services WHERE id = ? AND salon_id = ?").get(service_id, salon_id);
  if (!service) return res.status(404).json({ error: "Service not found for this salon" });

  const commission_amount = Math.round(service.price * COMMISSION_RATE * 100) / 100;
  const payout_amount = Math.round((service.price - commission_amount) * 100) / 100;

  const info = db
    .prepare(
      `INSERT INTO bookings
        (customer_id, salon_id, service_id, time_slot, service_price, booking_fee, commission_rate, commission_amount, payout_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(req.user.id, salon_id, service_id, time_slot, service.price, BOOKING_FEE, COMMISSION_RATE, commission_amount, payout_amount);

  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(booking);
});

// GET /bookings/me (customer's own bookings)
router.get("/me", requireAuth, (req, res) => {
  const bookings = db
    .prepare(
      `SELECT b.*, s.name AS salon_name, sv.name AS service_name
       FROM bookings b
       JOIN salons s ON s.id = b.salon_id
       JOIN services sv ON sv.id = b.service_id
       WHERE b.customer_id = ?
       ORDER BY b.created_at DESC`
    )
    .all(req.user.id);
  res.json(bookings);
});

// PATCH /bookings/:id/cancel
router.patch("/:id/cancel", requireAuth, (req, res) => {
  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(req.params.id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.customer_id !== req.user.id) return res.status(403).json({ error: "Not your booking" });

  db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(booking.id);
  res.json({ ok: true });
});

module.exports = router;
