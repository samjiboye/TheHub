const express = require("express");
const db = require("../db");
const { geocodeAddress } = require("../lib/geocode");
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
  const { category, lat, lng, q, state, city } = req.query;
  try {
    let sql = "SELECT * FROM salons WHERE 1=1";
    const params = [];
    if (category) {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }
    if (state) {
      params.push(state);
      sql += ` AND state = $${params.length}`;
    }
    if (city) {
      params.push(city);
      sql += ` AND city = $${params.length}`;
    }
    if (q) {
      params.push(`%${q}%`);
      sql += ` AND (name ILIKE $${params.length} OR address ILIKE $${params.length})`;
    }
    const { rows: salons } = await db.query(sql, params);

    const withExtras = await Promise.all(
      salons.map(async (s) => {
        const { rows: services } = await db.query("SELECT * FROM services WHERE salon_id = $1", [s.id]);
        const { rows: statRows } = await db.query(
          "SELECT COUNT(*) AS count, AVG(rating) AS avg, COUNT(*) FILTER (WHERE rating = 5) AS five_star_count FROM reviews WHERE salon_id = $1",
          [s.id]
        );
        const reviewStats = statRows[0];

      const { rows: bookingStatRows } = await db.query(
        "SELECT COUNT(*) AS count FROM bookings WHERE salon_id = $1 AND status = 'completed'",
        [s.id]
      );
      const completedCount = Number(bookingStatRows[0].count);
        return {
          ...s,
          services,
          rating: reviewStats.avg ? Math.round(Number(reviewStats.avg) * 10) / 10 : null,
          reviewCount: Number(reviewStats.count),
          fiveStarCount: Number(reviewStats.five_star_count),
        completedCount,
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
    const withServices = await Promise.all(
      rows.map(async (s) => {
        const { rows: services } = await db.query("SELECT * FROM services WHERE salon_id = $1", [s.id]);
        return { ...s, services };
      })
    );
    res.json(withServices);
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
       WHERE salon_id = $1 ORDER BY r.created_at DESC`,
      [salon.id]
    );
    const { rows: statRows } = await db.query(
      "SELECT COUNT(*) AS count, AVG(rating) AS avg, COUNT(*) FILTER (WHERE rating = 5) AS five_star_count FROM reviews WHERE salon_id = $1",
      [salon.id]
    );
    const reviewStats = statRows[0];
    res.json({
      ...salon,
      services,
      reviews,
      rating: reviewStats.avg ? Math.round(Number(reviewStats.avg) * 10) / 10 : null,
      reviewCount: Number(reviewStats.count),
      fiveStarCount: Number(reviewStats.five_star_count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load that salon." });
  }
});

// POST /salons (owner creates a salon listing)
router.post("/", requireAuth, requireRole("owner"), async (req, res) => {
  const { name, category, bio, address, lat, lng, hours, service_type, state, city } = req.body;
  if (!name || !category) return res.status(400).json({ error: "name and category are required" });
  try {
    let finalLat = lat || null;
    let finalLng = lng || null;
    const fullAddress = [address, city, state].filter(Boolean).join(", ");
    if ((!finalLat || !finalLng) && fullAddress) {
      const geocoded = await geocodeAddress(fullAddress);
      finalLat = geocoded.lat;
      finalLng = geocoded.lng;
    }
    const { rows } = await db.query(
      `INSERT INTO salons (owner_id, name, category, bio, address, lat, lng, hours, service_type, state, city)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [req.user.id, name, category, bio || null, address || null, finalLat, finalLng, hours || null, service_type || 'unisex', state || null, city || null]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't create that salon." });
  }
});

// POST /salons/:id/services (owner adds a bookable service)
router.post("/:id/services", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [req.params.id]);
    const salon = salonRows[0];
    if (!salon) return res.status(404).json({ error: "Salon not found" });
    if (salon.owner_id !== req.user.id) return res.status(403).json({ error: "Not your salon" });

    const { name, duration_min, price, home_service_price, salon_service_available } = req.body;
    if (!name || !duration_min || price == null) {
      return res.status(400).json({ error: "name, duration_min, and price are required" });
    }
    const salonAvailable = salon_service_available !== false;
    if (!salonAvailable && home_service_price == null) {
      return res.status(400).json({ error: "A home-visit price is required when a service isn't offered at the salon." });
    }
    const { rows } = await db.query(
      `INSERT INTO services (salon_id, name, duration_min, price, home_service_price, salon_service_available)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [salon.id, name, duration_min, price, home_service_price ?? null, salonAvailable]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't add that service." });
  }
});

// PATCH /salons/:id (owner edits salon details: name, category, address, location, service type)
router.patch("/:id", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [req.params.id]);
    const salon = salonRows[0];
    if (!salon) return res.status(404).json({ error: "Salon not found" });
    if (salon.owner_id !== req.user.id) return res.status(403).json({ error: "Not your salon" });

    const { name, category, address, service_type, state, city, bio, hours } = req.body;
    if (!name || !category) return res.status(400).json({ error: "name and category are required" });

    let finalLat = salon.lat;
    let finalLng = salon.lng;
    const addressChanged = address !== salon.address || state !== salon.state || city !== salon.city;
    const fullAddress = [address, city, state].filter(Boolean).join(", ");
    if (addressChanged && fullAddress) {
      const geocoded = await geocodeAddress(fullAddress);
      finalLat = geocoded.lat;
      finalLng = geocoded.lng;
    }

    const { rows } = await db.query(
      `UPDATE salons SET name = $1, category = $2, address = $3, service_type = $4, state = $5, city = $6,
        bio = $7, hours = $8, lat = $9, lng = $10
       WHERE id = $11 RETURNING *`,
      [name, category, address || null, service_type || salon.service_type, state || null, city || null,
        bio ?? salon.bio, hours ?? salon.hours, finalLat, finalLng, salon.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't update that salon." });
  }
});

// PATCH /salons/:id/services/:serviceId (owner edits a service's name/duration/price/home-visit settings)
router.patch("/:id/services/:serviceId", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [req.params.id]);
    const salon = salonRows[0];
    if (!salon) return res.status(404).json({ error: "Salon not found" });
    if (salon.owner_id !== req.user.id) return res.status(403).json({ error: "Not your salon" });

    const { rows: svcRows } = await db.query(
      "SELECT * FROM services WHERE id = $1 AND salon_id = $2",
      [req.params.serviceId, salon.id]
    );
    const existing = svcRows[0];
    if (!existing) return res.status(404).json({ error: "Service not found" });

    const { name, duration_min, price, home_service_price, salon_service_available } = req.body;
    const salonAvailable = salon_service_available !== undefined ? salon_service_available !== false : existing.salon_service_available;
    const homePrice = home_service_price !== undefined ? home_service_price : existing.home_service_price;
    if (!salonAvailable && homePrice == null) {
      return res.status(400).json({ error: "A home-visit price is required when a service isn't offered at the salon." });
    }

    const { rows } = await db.query(
      `UPDATE services SET name = $1, duration_min = $2, price = $3, home_service_price = $4, salon_service_available = $5
       WHERE id = $6 RETURNING *`,
      [
        name || existing.name,
        duration_min || existing.duration_min,
        price != null ? price : existing.price,
        homePrice,
        salonAvailable,
        existing.id,
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't update that service." });
  }
});

// DELETE /salons/:id/services/:serviceId (owner removes a service)
router.delete("/:id/services/:serviceId", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [req.params.id]);
    const salon = salonRows[0];
    if (!salon) return res.status(404).json({ error: "Salon not found" });
    if (salon.owner_id !== req.user.id) return res.status(403).json({ error: "Not your salon" });

    const { rows } = await db.query(
      "DELETE FROM services WHERE id = $1 AND salon_id = $2 RETURNING id",
      [req.params.serviceId, salon.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Service not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't remove that service." });
  }
});

// DELETE /salons/:id (owner permanently deletes their salon listing — blocked if any bookings exist)
router.delete("/:id", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [req.params.id]);
    const salon = salonRows[0];
    if (!salon) return res.status(404).json({ error: "Salon not found" });
    if (salon.owner_id !== req.user.id) return res.status(403).json({ error: "Not your salon" });

    const { rows: bookingCountRows } = await db.query(
      "SELECT COUNT(*) AS count FROM bookings WHERE salon_id = $1",
      [salon.id]
    );
    if (Number(bookingCountRows[0].count) > 0) {
      return res.status(400).json({
        error: "This salon has booking history and can't be deleted. Contact support if you need help with this.",
      });
    }

    await db.query("DELETE FROM salons WHERE id = $1", [salon.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't delete that salon." });
  }
});

// GET /salons/:id/dashboard (owner earnings summary)
router.get("/:id/dashboard", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [req.params.id]);
    const salon = salonRows[0];
    if (!salon) return res.status(404).json({ error: "Salon not found" });
    if (salon.owner_id !== req.user.id) return res.status(403).json({ error: "Not your salon" });

    const { rows: totalsRows } = await db.query(
      `SELECT
        COALESCE(SUM(service_price), 0) AS gross,
        COALESCE(SUM(commission_amount), 0) AS commission,
        COALESCE(SUM(payout_amount), 0) AS payout,
        COUNT(*) AS "bookingCount"
       FROM bookings WHERE salon_id = $1 AND status IN ('confirmed', 'completed') AND payment_status = 'paid'`,
      [salon.id]
    );
    const totals = totalsRows[0];
    totals.gross = Number(totals.gross);
    totals.commission = Number(totals.commission);
    totals.payout = Number(totals.payout);
    totals.bookingCount = Number(totals.bookingCount);

    const { rows: upcoming } = await db.query(
      `SELECT b.*, s.name AS service_name, u.name AS customer_name
       FROM bookings b
       JOIN services s ON s.id = b.service_id
       JOIN users u ON u.id = b.customer_id
       WHERE b.salon_id = $1 AND b.status = 'confirmed'
       ORDER BY b.created_at DESC LIMIT 20`,
      [salon.id]
    );
    res.json({ ...totals, upcoming });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load dashboard." });
  }
});

// GET /salons/:id/completed-bookings (owner's completed appointment history)
router.get("/:id/completed-bookings", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [req.params.id]);
    const salon = salonRows[0];
    if (!salon) return res.status(404).json({ error: "Salon not found" });
    if (salon.owner_id !== req.user.id) return res.status(403).json({ error: "Not your salon" });

    const { rows: completed } = await db.query(
      `SELECT b.*, s.name AS service_name, u.name AS customer_name
       FROM bookings b
       JOIN services s ON s.id = b.service_id
       JOIN users u ON u.id = b.customer_id
       WHERE b.salon_id = $1 AND b.status = 'completed'
       ORDER BY b.created_at DESC LIMIT 100`,
      [salon.id]
    );
    res.json({ completed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load completed appointments." });
  }
});

// GET /salons/:id/reviews (owner-only: full review list + ratings breakdown)
router.get("/:id/reviews", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [req.params.id]);
    const salon = salonRows[0];
    if (!salon) return res.status(404).json({ error: "Salon not found" });
    if (salon.owner_id !== req.user.id) return res.status(403).json({ error: "Not your salon" });

    const { rows: reviews } = await db.query(
      `SELECT r.*, u.name AS customer_name FROM reviews r JOIN users u ON u.id = r.customer_id
       WHERE r.salon_id = $1 ORDER BY r.created_at DESC`,
      [salon.id]
    );
    const { rows: statRows } = await db.query(
      "SELECT COUNT(*) AS count, AVG(rating) AS avg, COUNT(*) FILTER (WHERE rating = 5) AS five_star_count FROM reviews WHERE salon_id = $1",
      [salon.id]
    );
    const reviewStats = statRows[0];
    res.json({
      reviews,
      rating: reviewStats.avg ? Math.round(Number(reviewStats.avg) * 10) / 10 : null,
      reviewCount: Number(reviewStats.count),
      fiveStarCount: Number(reviewStats.five_star_count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load reviews." });
  }
});

module.exports = router;
// redeploy trigger 1785345758
