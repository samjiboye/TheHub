const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();

// POST /reviews
router.post("/", requireAuth, async (req, res) => {
  const { salon_id, booking_id, rating, comment } = req.body;
  if (!salon_id || !rating) return res.status(400).json({ error: "salon_id and rating are required" });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: "rating must be between 1 and 5" });
  try {
    const { rows } = await db.query(
      "INSERT INTO reviews (salon_id, customer_id, booking_id, rating, comment) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [salon_id, req.user.id, booking_id || null, rating, comment || null]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't save that review." });
  }
});

// GET /reviews/booking/:bookingId (check if a booking already has a review)
router.get("/booking/:bookingId", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM reviews WHERE booking_id = $1",
      [req.params.bookingId]
    );
    res.json({ review: rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't check review status." });
  }
});

// GET /reviews/unrated (customer's completed bookings that have no review yet)
router.get("/unrated", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT b.*, s.name AS salon_name, sv.name AS service_name
       FROM bookings b
       JOIN salons s ON s.id = b.salon_id
       JOIN services sv ON sv.id = b.service_id
       LEFT JOIN reviews r ON r.booking_id = b.id
       WHERE b.customer_id = $1 AND b.status = 'completed' AND r.id IS NULL
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json({ unrated: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load unrated bookings." });
  }
});

module.exports = router;
