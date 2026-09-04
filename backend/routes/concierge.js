const express = require("express");
const db = require("../db");
const { ariaLimiter } = require("../middleware/rateLimiters");
const router = express.Router();

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 500;
const ANTHROPIC_TIMEOUT_MS = 20000;

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

// Forcing Claude to call this tool (rather than asking it to write raw JSON as
// text and hoping we can regex/strip markdown fences off it reliably) means
// the response is always well-formed -- no more parsing failures.
const RECOMMEND_TOOL = {
  name: "recommend_salons",
  description: "Reply to the customer and list which salon IDs (if any) genuinely match what they're after.",
  input_schema: {
    type: "object",
    properties: {
      reply: {
        type: "string",
        description: "A warm, concise 2-4 sentence reply to the customer, in plain English.",
      },
      matchIds: {
        type: "array",
        items: { type: "integer" },
        description: "IDs of genuinely matching salons from the provided list, best match first, max 3. Empty array if nothing truly matches -- never force a weak match.",
      },
    },
    required: ["reply", "matchIds"],
  },
};

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
    console.error("Aria: ANTHROPIC_API_KEY is not set in this environment.");
    return res.status(500).json({ error: "Aria isn't configured yet — missing API key." });
  }

  // Step 1: load salon data. Failures here are almost always a database
  // issue, not an AI issue -- logged distinctly so that's obvious.
  let enrichedSalons;
  try {
    enrichedSalons = await getEnrichedSalons();
  } catch (dbErr) {
    console.error("Aria: failed to load salon data from the database:", dbErr);
    return res.status(500).json({ error: "Aria is having trouble loading salon data right now." });
  }

  const salonListForPrompt = enrichedSalons
    .map(
      (s) =>
        `id=${s.id} | ${s.name} (${s.category}, ${s.city || ""} ${s.state || ""}) — services: ${
          s.services.map((sv) => `${sv.name} ₦${sv.price}`).join(", ") || "none listed"
        }`
    )
    .join("\n");

  // Step 2: call Claude. A hard timeout means a slow/hanging connection fails
  // fast and visibly instead of leaving the customer staring at a spinner.
  let response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);
    response = await fetch("https://api.anthropic.com/v1/messages", {
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
${salonListForPrompt}`,
        messages,
        tools: [RECOMMEND_TOOL],
        tool_choice: { type: "tool", name: "recommend_salons" },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (fetchErr) {
    console.error("Aria: request to Anthropic's API failed (network/timeout):", fetchErr.message);
    return res.status(500).json({ error: "Aria couldn't reach the AI service right now — please try again." });
  }

  // Step 3: read and validate the response body.
  let data;
  try {
    data = await response.json();
  } catch (parseErr) {
    console.error("Aria: Anthropic's response wasn't valid JSON. HTTP status was", response.status);
    return res.status(500).json({ error: "Aria got an unexpected response — please try again." });
  }

  if (!response.ok) {
    console.error("Aria: Anthropic API returned an error. Status:", response.status, "Body:", JSON.stringify(data));
    return res.status(500).json({ error: "Aria is having trouble right now — please try again in a moment." });
  }

  const toolUse = data?.content?.find((c) => c.type === "tool_use" && c.name === "recommend_salons");
  if (!toolUse || !toolUse.input) {
    console.error("Aria: Claude responded but didn't use the expected tool. Full content:", JSON.stringify(data?.content));
    return res.status(500).json({ error: "Aria couldn't work that out — please try rephrasing." });
  }

  const reply = typeof toolUse.input.reply === "string" ? toolUse.input.reply : "Here's what I found:";
  const matchIds = Array.isArray(toolUse.input.matchIds) ? toolUse.input.matchIds : [];

  const matches = matchIds
    .map((id) => enrichedSalons.find((s) => s.id === id))
    .filter(Boolean)
    .slice(0, 3);

  res.json({ text: reply, matches });
});

module.exports = router;
