const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const router = express.Router();

// Haversine distance in miles
function distanceMiles(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v === null || v === undefined)) return null;
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /salons?category=Barbing&lat=..&lng=..&q=fade
router.get("/", async (req, res) => {
  const { category, lat, lng, q } = req.query;
  try {
    let sql = "SELECT * FROM salons WHERE 1=1";
    const params = [];
    if (category) {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }
    if (q) {
      params.push(`%${q}%`);
      sql += ` AND name ILIKE $${params.length}`;
    }
    const { rows: salons } = await db.query(sql, params);

    const withExtras = await Promise.all(
      salons.map(async (s) => {
        const { rows: services } = await db.query("SELECT * FROM services WHERE salon_id = $1", [s.id]);
        const { rows: statRows } = await db.query(
          "SELECT COUNT(*) AS count, AVG(rating) AS avg FROM reviews WHERE salon_id = $1",
          [s.id]
        );
        const reviewStats = statRows[0];
        return {
          ...s,
          services,
          rating: reviewStats.avg ? Math.round(Number(reviewStats.avg) * 10) / 10 : null,
          reviewCount: Number(reviewStats.count),
          distance: lat && lng ? Math.round(distanceMiles(+lat, +lng, s.lat, s.lng) * 10) / 10 : null,
        };
      })
    );

    if (lat && lng) withExtras.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
    res.json(withExtras);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load salons." });
  }
});

// GET /salons/mine (owner's own listings) — must be defined before /:id
router.get("/mine", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM salons WHERE owner_id = $1", [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load your salons." });
  }
});

// GET /salons/:id
router.get("/:id", async (req, res) => {
  try {
    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [req.params.id]);
    const salon = salonRows[0];
    if (!salon) return res.status(404).json({ error: "Salon not found" });

    const { rows: services } = await db.query("SELECT * FROM services WHERE salon_id = $1", [salon.id]);
    const { rows: reviews } = await db.query(
      `SELECT r.*, u.name AS customer_name FROM reviews r JOIN users u ON u.id = r.customer_id
       WHERE salon_id = $1
