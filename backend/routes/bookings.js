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
      `SELECT b.*, s.name AS salon_name, sv.name AS service_name,
              (r.id IS NOT NULL) AS already_rated, r.rating AS given_rating
       FROM bookings b
       JOIN salons s ON s.id = b.salon_id
       JOIN services sv ON sv.id = b.service_id
       LEFT JOIN reviews r ON r.booking_id = b.id
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
const OWNER_CANCEL_REASONS = [
  "Client no-show",
  "Owner unavailable",
  "Schedule conflict",
  "Emergency",
  "Other",
];

const CUSTOMER_CANCEL_REASONS = [
  "Schedule conflict",
  "Found another appointment",
  "No longer needed",
  "Booked by mistake",
  "Change of plans",
  "Other",
];

function parseAppointmentDateTime(booking) {
  // time_slot is a time-of-day string like "9:00 AM"; the appointment is always
  // on the same calendar day the booking was created.
  const created = new Date(booking.created_at);
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(booking.time_slot.trim());
  if (!match) return created;
  let [, hourStr, minuteStr, period] = match;
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  if (/PM/i.test(period) && hour !== 12) hour += 12;
  if (/AM/i.test(period) && hour === 12) hour = 0;
  const appt = new Date(created);
  appt.setHours(hour, minute, 0, 0);
  return appt;
}

router.patch("/:id/cancel", requireAuth, async (req, res) => {
  const { reason, note } = req.body;
  try {
    const { rows: bookingRows } = await db.query("SELECT * FROM bookings WHERE id = $1", [req.params.id]);
    const booking = bookingRows[0];
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [booking.salon_id]);
    const salon = salonRows[0];

    const isCustomer = booking.customer_id === req.user.id;
    const isOwner = salon && salon.owner_id === req.user.id;
    if (!isCustomer && !isOwner) return res.status(403).json({ error: "Not your booking" });

    const allowedReasons = isOwner ? OWNER_CANCEL_REASONS : CUSTOMER_CANCEL_REASONS;
    if (!reason || !allowedReasons.includes(reason)) {
      return res.status(400).json({ error: `reason is required and must be one of: ${allowedReasons.join(", ")}` });
    }

    if (booking.status !== "pending" && booking.status !== "confirmed") {
      return res.status(400).json({ error: "This booking can no longer be cancelled." });
    }

    const appointmentTime = parseAppointmentDateTime(booking);
    if (Date.now() >= appointmentTime.getTime()) {
      return res.status(400).json({ error: "This appointment time has already passed and can no longer be cancelled." });
    }

    const cancelledBy = isOwner ? "owner" : "customer";

    await db.query(
      "UPDATE bookings SET status = 'cancelled', cancelled_by = $1, cancel_reason = $2, cancel_note = $3 WHERE id = $4",
      [cancelledBy, reason, note || null, booking.id]
    );

    if (cancelledBy === "owner") {
      await db.query("UPDATE salons SET cancellation_count = cancellation_count + 1 WHERE id = $1", [booking.salon_id]);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't cancel that booking." });
  }
});


router.patch("/:id/complete", requireAuth, async (req, res) => {
  try {
    const { rows: bookingRows } = await db.query("SELECT * FROM bookings WHERE id = $1", [req.params.id]);
    const booking = bookingRows[0];
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [booking.salon_id]);
    const salon = salonRows[0];

    const isOwner = salon && salon.owner_id === req.user.id;
    if (!isOwner) return res.status(403).json({ error: "Not your booking" });

    if (booking.status !== "confirmed") {
      return res.status(400).json({ error: "Only confirmed bookings can be marked as completed." });
    }

    const appointmentTime = parseAppointmentDateTime(booking);
    if (Date.now() < appointmentTime.getTime()) {
      return res.status(400).json({ error: "This appointment hasn't happened yet." });
    }

    await db.query(
      "UPDATE bookings SET status = 'completed' WHERE id = $1",
      [booking.id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't mark booking as completed." });
  }
});

module.exports = router;
