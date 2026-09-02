const express = require("express");
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
    const enrichedSalons = await getEnrichedSalons();

    const salonListForPrompt = enrichedSalons
      .map(
        (s) =>
          `id=${s.id} | ${s.name} (${s.category}, ${s.city || ""} ${s.state || ""}) — services: ${
            s.services.map((sv) => `${sv.name} ₦${sv.price}`).join(", ") || "none listed"
          }`
      )
      .join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1000,
        system: `You are Aria, the warm and concise front-desk concierge for TheHub, a Nigerian beauty booking app. Prices are in naira (₦).

Match the customer's request (service type, budget, location, etc.) against this exact list of salons and their services — never invent salons or services not listed here:
${salonListForPrompt}

Respond with ONLY a JSON object, no markdown fences, no other text, in this exact shape:
{"reply": "2-4 sentence friendly reply", "matchIds": [salon ids that genuinely match, best first, max 3]}

If nothing genuinely matches, use an empty matchIds array and say so honestly in the reply — never force a weak match.`,
        messages,
      }),
    });
    const data = await response.json();
    const rawText = data?.content?.find((c) => c.type === "text")?.text || "";

    let reply = "Sorry, I couldn't quite get that — could you try asking again?";
    let matchIds = [];
    try {
      const cleaned = rawText.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.reply) reply = parsed.reply;
      if (Array.isArray(parsed.matchIds)) matchIds = parsed.matchIds;
    } catch (e) {
      if (rawText) reply = rawText;
    }

    const matches = matchIds
      .map((id) => enrichedSalons.find((s) => s.id === id))
      .filter(Boolean)
      .slice(0, 3);

    res.json({ text: reply, matches });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Aria is having trouble connecting right now." });
  }
});

module.exports = router;
