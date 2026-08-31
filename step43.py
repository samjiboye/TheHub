changes = []

limiter_path = "backend/middleware/rateLimiters.js"
with open(limiter_path, "r") as f:
    limiter_src = f.read()

old_export = '''module.exports = { loginLimiter, authLimiter, uploadLimiter };'''
new_export = '''const ariaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: "Aria is getting a lot of questions right now — please try again in a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter, authLimiter, uploadLimiter, ariaLimiter };'''
if old_export in limiter_src:
    assert limiter_src.count(old_export) == 1
    limiter_src = limiter_src.replace(old_export, new_export)
    with open(limiter_path, "w") as f:
        f.write(limiter_src)
    changes.append("✅ rateLimiters.js — added a dedicated limiter for Aria (15 requests / 15 min per IP)")
else:
    changes.append("⏭️  Aria limiter already added")

concierge_path = "backend/routes/concierge.js"
with open(concierge_path, "r") as f:
    src = f.read()

old_top = '''const express = require("express");
const db = require("../db");
const router = express.Router();

// POST /concierge — proxies chat messages to Claude, keeping the API key server-side.
// Returns both a conversational reply and structured salon matches so the frontend
// can render tappable results instead of just prose the customer has to act on manually.
router.post("/", async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });
  }

  try {
    const { rows: salons } = await db.query("SELECT * FROM salons");
    const enrichedSalons = await Promise.all(
      salons.map(async (s) => {
        const { rows: services } = await db.query("SELECT * FROM services WHERE salon_id = $1", [s.id]);
        const { rows: statRows } = await db.query(
          "SELECT COUNT(*) FILTER (WHERE rating = 5) AS five_star_count FROM reviews WHERE salon_id = $1",
          [s.id]
        );
        return { ...s, services, fiveStarCount: Number(statRows[0].five_star_count) };
      })
    );'''
new_top = '''const express = require("express");
const db = require("../db");
const { ariaLimiter } = require("../middleware/rateLimiters");
const router = express.Router();

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 500;

let salonCache = { data: null, expiresAt: 0 };
async function getEnrichedSalons() {
  if (salonCache.data && Date.now() < salonCache.expiresAt) return salonCache.data;

  const { rows: salons } = await db.query("SELECT * FROM salons");
  const enrichedSalons = await Promise.all(
    salons.map(async (s) => {
      const { rows: services } = await db.query("SELECT * FROM services WHERE salon_id = $1", [s.id]);
      const { rows: statRows } = await db.query(
        "SELECT COUNT(*) FILTER (WHERE rating = 5) AS five_star_count FROM reviews WHERE salon_id = $1",
        [s.id]
      );
      return { ...s, services, fiveStarCount: Number(statRows[0].five_star_count) };
    })
  );
  salonCache = { data: enrichedSalons, expiresAt: Date.now() + 60 * 1000 };
  return enrichedSalons;
}

router.post("/", ariaLimiter, async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }
  if (messages.length > MAX_MESSAGES) {
    return res.status(400).json({ error: "That conversation has gotten too long — please start a new one." });
  }
  if (messages.some((m) => typeof m.content !== "string" || m.content.length > MAX_MESSAGE_LENGTH)) {
    return res.status(400).json({ error: `Messages can't be longer than ${MAX_MESSAGE_LENGTH} characters.` });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });
  }

  try {
    const enrichedSalons = await getEnrichedSalons();'''
if old_top in src:
    assert src.count(old_top) == 1
    src = src.replace(old_top, new_top)
    changes.append("✅ concierge.js — rate limited, message size/count capped, salon lookup cached")
else:
    changes.append("⏭️  concierge.js already hardened")

with open(concierge_path, "w") as f:
    f.write(src)

for c in changes:
    print(c)
