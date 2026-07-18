const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// POST /reviews
router.post("/", requireAuth, (req, res) => {
  const { salon_id, booking_id, rating, comment } = req.body;
  if (!salon_id || !rating) return res.status(400).json({ error: "salon_id and rating are required" });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: "rating must be between 1 and 5" });

  const info = db
    .prepare("INSERT INTO reviews (salon_id, customer_id, booking_id, rating, comment) VALUES (?, ?, ?, ?, ?)")
    .run(salon_id, req.user.id, booking_id || null, rating, comment || null);

  res.status(201).json({ id: info.lastInsertRowid });
});

module.exports = router;
