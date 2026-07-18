// Populates the database with a demo owner + 6 salons so the app isn't empty on first run.
// Run with: node seed.js
const bcrypt = require("bcryptjs");
const db = require("./db");

const DEMO_OWNER_EMAIL = "owner@salonconnect.demo";
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

function run() {
  let owner = db.prepare("SELECT * FROM users WHERE email = ?").get(DEMO_OWNER_EMAIL);
  if (!owner) {
    const password_hash = bcrypt.hashSync(DEMO_OWNER_PASSWORD, 10);
    const info = db
      .prepare("INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, 'owner', ?)")
      .run("Demo Owner", DEMO_OWNER_EMAIL, password_hash);
    owner = { id: info.lastInsertRowid };
    console.log(`Created demo owner: ${DEMO_OWNER_EMAIL} / ${DEMO_OWNER_PASSWORD}`);
  } else {
    console.log("Demo owner already exists, reusing it.");
  }

  const existingCount = db.prepare("SELECT COUNT(*) AS n FROM salons WHERE owner_id = ?").get(owner.id).n;
  if (existingCount > 0) {
    console.log(`Demo owner already has ${existingCount} salon(s). Skipping salon seed.`);
    return;
  }

  const insertSalon = db.prepare(
    "INSERT INTO salons (owner_id, name, category, bio, address, lat, lng, hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertService = db.prepare(
    "INSERT INTO services (salon_id, name, duration_min, price) VALUES (?, ?, ?, ?)"
  );

  for (const s of SALONS) {
    const info = insertSalon.run(owner.id, s.name, s.category, s.bio, s.address, s.lat, s.lng, s.hours);
    for (const svc of s.services) {
      insertService.run(info.lastInsertRowid, svc.name, svc.duration_min, svc.price);
    }
    console.log(`Seeded salon: ${s.name}`);
  }

  console.log("Done.");
}

run();
