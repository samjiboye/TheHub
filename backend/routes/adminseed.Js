const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const router = express.Router();
const DEMO_OWNER_EMAIL = "owner@thehub.demo";
const DEMO_OWNER_PASSWORD = "demo1234";
const SALONS = [
  {
    name: "Cutting Room", category: "Barbing", address: "14 Kelso Ave",
    lat: 40.73, lng: -73.99, hours: "9:00 AM – 7:00 PM",
    bio: "Sharp fades and old-school straight-razor lineups in a no-fuss space built for regulars.",
    services: [
      { name: "Skin Fade", duration_min: 30, price: 25 },
      { name: "Beard Trim", duration_min: 15, price: 12 },
      { name: "Classic Cut", duration_min: 25, price: 20 },
    ],
  },
  {
    name: "Bloom & Brush", category: "Hairdressing", address: "88 Vireo Street",
    lat: 40.74, lng: -73.98, hours: "10:00 AM – 8:00 PM",
    bio: "Colour specialists and precision cuts, with a consult before every chemical service.",
    services: [
      { name: "Cut & Style", duration_min: 60, price: 55 },
      { name: "Silk Press", duration_min: 90, price: 85 },
      { name: "Full Colour", duration_min: 150, price: 150 },
    ],
  },
  {
    name: "Nailed It Studio", category: "Nails", address: "21 Marchmont Rd",
    lat: 40.72, lng: -74.0, hours: "10:00 AM – 6:30 PM",
    bio: "Hand-painted sets and long-wear gel, done by appointment so you're never rushed.",
    services: [
      { name: "Gel Manicure", duration_min: 45, price: 35 },
      { name: "Classic Pedicure", duration_min: 40, price: 30 },
      { name: "Full Set Acrylic", duration_min: 75, price: 55 },
    ],
  },
  {
    name: "Aura Makeup Co.", category: "Makeup", address: "5 Halden Court",
    lat: 40.75, lng: -73.97, hours: "By appointment",
    bio: "Editorial-trained artists for everyday glam, events, and bridal trials.",
    services: [
      { name: "Everyday Glam", duration_min: 45, price: 65 },
      { name: "Full Glam", duration_min: 60, price: 85 },
      { name: "Bridal Trial", duration_min: 90, price: 120 },
    ],
  },
  {
    name: "The Fade Lounge", category: "Barbing", address: "102 Corrie Rd",
    lat: 40.735, lng: -73.985, hours: "8:00 AM – 6:00 PM",
    bio: "Fast, clean lineups and fades — walk-ins welcome but booking skips the wait.",
    services: [
      { name: "Skin Fade", duration_min: 30, price: 22 },
      { name: "Line Up", duration_min: 10, price: 10 },
    ],
  },
  {
    name: "Serenity Spa & Wellness", category: "Spa", address: "9 Thistle Row",
    lat: 40.71, lng: -74.01, hours: "9:00 AM – 9:00 PM",
    bio: "Massage, facials, and quiet rooms — a reset built into your week, not just a treat.",
    services: [
      { name: "Facial", duration_min: 45, price: 75 },
      { name: "Swedish Massage", duration_min: 60, price: 90 },
      { name: "Deep Tissue", duration_min: 60, price: 110 },
    ],
  },
];

// GET /admin/seed?key=<JWT_SECRET>
// A shell-free way to populate demo data on hosts (like Render's free tier) that
// don't offer shell access. Reuses JWT_SECRET as a simple shared key so no new
// environment variable is needed. Safe to leave in place — it's idempotent and
// does nothing once the demo owner already has salons.
router.get("/seed", async (req, res) => {
  if (!process.env.JWT_SECRET || req.query.key !== process.env.JWT_SECRET) {
    return res.status(403).json({ error: "Missing or incorrect key" });
  }
  try {
    let owner;
    const { rows: existingOwnerRows } = await db.query("SELECT * FROM users WHERE email = $1", [DEMO_OWNER_EMAIL]);
    owner = existingOwnerRows[0];

    if (!owner) {
      const password_hash = bcrypt.hashSync(DEMO_OWNER_PASSWORD, 10);
      const { rows } = await db.query(
        "INSERT INTO users (name, email, role, password_hash) VALUES ($1, $2, 'owner', $3) RETURNING id",
        ["Demo Owner", DEMO_OWNER_EMAIL, password_hash]
      );
      owner = { id: rows[0].id };
    }

    const { rows: countRows } = await db.query("SELECT COUNT(*) AS n FROM salons WHERE owner_id = $1", [owner.id]);
    const existingCount = Number(countRows[0].n);
    if (existingCount > 0) {
      return res.json({ ok: true, message: `Demo owner already has ${existingCount} salon(s). Nothing to do.` });
    }

    for (const s of SALONS) {
      const { rows: salonRows } = await db.query(
        "INSERT INTO salons (owner_id, name, category, bio, address, lat, lng, hours) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
        [owner.id, s.name, s.category, s.bio, s.address, s.lat, s.lng, s.hours]
      );
      const salonId = salonRows[0].id;
      for (const svc of s.services) {
        await db.query(
          "INSERT INTO services (salon_id, name, duration_min, price) VALUES ($1, $2, $3, $4)",
          [salonId, svc.name, svc.duration_min, svc.price]
        );
      }
    }

    res.json({
      ok: true,
      message: `Seeded ${SALONS.length} salons. Demo owner login: ${DEMO_OWNER_EMAIL} / ${DEMO_OWNER_PASSWORD}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Seeding failed." });
  }
});

module.exports = router;
