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
router.get("/", (req, res) => {
  const { category, lat, lng, q } = req.query;
  let sql = "SELECT * FROM salons WHERE 1=1";
  const params = [];
  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }
  if (q) {
    sql += " AND name LIKE ?";
    params.push(`%${q}%`);
  }
  const salons = db.prepare(sql).all(...params);

  const withExtras = salons.map((s) => {
    const services = db.prepare("SELECT * FROM services WHERE salon_id = ?").all(s.id);
    const reviewStats = db
      .prepare("SELECT COUNT(*) AS count, AVG(rating) AS avg FROM reviews WHERE salon_id = ?")
      .get(s.id);
    return {
      ...s,
      services,
      rating: reviewStats.avg ? Math.round(reviewStats.avg * 10) / 10 : null,
      reviewCount: reviewStats.count,
      distance: lat && lng ? Math.round(distanceMiles(+lat, +lng, s.lat, s.lng) * 10) / 10 : null,
    };
  });

  if (lat && lng) withExtras.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
  res.json(withExtras);
});

// GET /salons/mine (owner's own listings) — must be defined before /:id
router.get("/mine", requireAuth, requireRole("owner"), (req, res) => {
  const salons = db.prepare("SELECT * FROM salons WHERE owner_id = ?").all(req.user.id);
  res.json(salons);
});

// GET /salons/:id
router.get("/:id", (req, res) => {
  const salon = db.prepare("SELECT * FROM salons WHERE id = ?").get(req.params.id);
  if (!salon) return res.status(404).json({ error: "Salon not found" });
  const services = db.prepare("SELECT * FROM services WHERE salon_id = ?").all(salon.id);
  const reviews = db
    .prepare("SELECT r.*, u.name AS customer_name FROM reviews r JOIN users u ON u.id = r.customer_id WHERE salon_id = ? ORDER BY r.created_at DESC")
    .all(salon.id);
  res.json({ ...salon, services, reviews });
});

// POST /salons (owner creates a salon listing)
router.post("/", requireAuth, requireRole("owner"), (req, res) => {
  const { name, category, bio, address, lat, lng, hours } = req.body;
  if (!name || !category) return res.status(400).json({ error: "name and category are required" });
  const info = db
    .prepare(
      "INSERT INTO salons (owner_id, name, category, bio, address, lat, lng, hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(req.user.id, name, category, bio || null, address || null, lat || null, lng || null, hours || null);
  res.status(201).json({ id: info.lastInsertRowid });
});

// POST /salons/:id/services (owner adds a bookable service)
router.post("/:id/services", requireAuth, requireRole("owner"), (req, res) => {
  const salon = db.prepare("SELECT * FROM salons WHERE id = ?").get(req.params.id);
  if (!salon) return res.status(404).json({ error: "Salon not found" });
  if (salon.owner_id !== req.user.id) return res.status(403).json({ error: "Not your salon" });

  const { name, duration_min, price } = req.body;
  if (!name || !duration_min || price == null) {
    return res.status(400).json({ error: "name, duration_min, and price are required" });
  }
  const info = db
    .prepare("INSERT INTO services (salon_id, name, duration_min, price) VALUES (?, ?, ?, ?)")
    .run(salon.id, name, duration_min, price);
  res.status(201).json({ id: info.lastInsertRowid });
});

// GET /salons/:id/dashboard (owner earnings summary)
router.get("/:id/dashboard", requireAuth, requireRole("owner"), (req, res) => {
  const salon = db.prepare("SELECT * FROM salons WHERE id = ?").get(req.params.id);
  if (!salon) return res.status(404).json({ error: "Salon not found" });
  if (salon.owner_id !== req.user.id) return res.status(403).json({ error: "Not your salon" });

  const totals = db
    .prepare(
      `SELECT
        COALESCE(SUM(service_price), 0) AS gross,
        COALESCE(SUM(commission_amount), 0) AS commission,
        COALESCE(SUM(payout_amount), 0) AS payout,
        COUNT(*) AS bookingCount
       FROM bookings WHERE salon_id = ? AND status IN ('confirmed', 'completed') AND payment_status = 'paid'`
    )
    .get(salon.id);

  const upcoming = db
    .prepare(
      `SELECT b.*, s.name AS service_name, u.name AS customer_name
       FROM bookings b
       JOIN services s ON s.id = b.service_id
       JOIN users u ON u.id = b.customer_id
       WHERE b.salon_id = ? AND b.status = 'confirmed'
       ORDER BY b.created_at DESC LIMIT 20`
    )
    .all(salon.id);

  res.json({ ...totals, upcoming });
});

module.exports = router;
