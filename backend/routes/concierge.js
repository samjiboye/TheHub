const express = require("express");
const db = require("../db");
const { ariaLimiter } = require("../middleware/rateLimiters");
const router = express.Router();

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 500;
const GEMINI_TIMEOUT_MS = 20000;
const GEMINI_MODEL = "gemini-2.0-flash";

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

// Cost-saving filter: every AI request has to "read" whatever salon list we
// hand it, and that's what you pay/use quota for -- so instead of always
// sending the WHOLE database, we first try to narrow it down to salons in
// the category the customer actually mentioned. If nothing about category
// is detectable from their words, or the whole list is already small, we
// just send everything rather than risk hiding a real match.
const CATEGORY_KEYWORDS = {
  "Barbing": ["barb", "cut", "fade", "shave", "line up", "haircut"],
  "Hairdressing": ["braid", "weave", "relax", "silk press", "cornrow", "loc", "hairdress", "hairstyl"],
  "Lashes & Nails": ["lash", "nail", "manicure", "pedicure", "acrylic", "gel"],
  "Bridal & Event Makeup": ["makeup", "bridal", "glam", "wedding"],
  "Spa & Massage Therapy": ["spa", "massage", "therapy"],
  "Piercing": ["pierc"],
  "Tattoos": ["tattoo", "ink"],
  "Wig Making & Installation": ["wig"],
  "Gele & Head-tie Styling": ["gele", "head-tie", "headtie", "head tie"],
  "Skincare & Facials": ["skincare", "facial", "skin"],
  "Waxing & Hair Removal": ["wax", "hair removal"],
  "Teeth Whitening": ["teeth whit", "teeth"],
};

function filterRelevantSalons(allSalons, messages) {
  if (allSalons.length <= 20) return allSalons; // small enough, no real saving to be had
  const combinedText = messages.map((m) => (m.content || "")).join(" ").toLowerCase();
  // Word-boundary matching (not plain substring) -- otherwise a short keyword
  // like "hair" would also match inside unrelated words like "haircut",
  // pulling in the wrong category instead of narrowing things down.
  const matchedCategories = Object.entries(CATEGORY_KEYWORDS)
    .filter(([, keywords]) =>
      keywords.some((kw) => new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(combinedText))
    )
    .map(([category]) => category);
  if (matchedCategories.length === 0) return allSalons; // ambiguous -- don't risk hiding a match
  const filtered = allSalons.filter((s) => matchedCategories.includes(s.category));
  return filtered.length > 0 ? filtered : allSalons;
}

const RECOMMEND_FUNCTION = {
  name: "recommend_salons",
  description: "Reply to the customer and list which salon IDs (if any) genuinely match what they are after.",
  parameters: {
    type: "OBJECT",
    properties: {
      reply: {
        type: "STRING",
        description: "A warm, concise 2-4 sentence reply to the customer, in plain English.",
      },
      matchIds: {
        type: "ARRAY",
        items: { type: "INTEGER" },
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
  if (!process.env.GEMINI_API_KEY) {
    console.error("Aria: GEMINI_API_KEY is not set in this environment.");
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

  const relevantSalons = filterRelevantSalons(enrichedSalons, messages);

  const salonListForPrompt = relevantSalons
    .map(
      (s) =>
        `id=${s.id} | ${s.name} (${s.category}, ${s.city || ""} ${s.state || ""}) — services: ${
          s.services.map((sv) => `${sv.name} ₦${sv.price}`).join(", ") || "none listed"
        }`
    )
    .join("\n");

  // Gemini uses "user" / "model" roles (not "user" / "assistant") and wraps
  // text in a "parts" array -- converting our stored {role, content} shape
  // to match.
  const geminiContents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Step 2: call Gemini. A hard timeout means a slow/hanging connection
  // fails fast and visibly instead of leaving the customer staring at a
  // spinner.
  let response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: `You are Aria, the warm and concise front-desk concierge for TheHub, a Nigerian beauty booking app. Prices are in naira (₦).

Match the customer's request (service type, budget, location, etc.) against this exact list of salons and their services — never invent salons or services not listed here:
${salonListForPrompt}`,
            }],
          },
          contents: geminiContents,
          tools: [{ function_declarations: [RECOMMEND_FUNCTION] }],
          tool_config: { function_calling_config: { mode: "ANY", allowed_function_names: ["recommend_salons"] } },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
  } catch (fetchErr) {
    console.error("Aria: request to Gemini's API failed (network/timeout):", fetchErr.message);
    return res.status(500).json({ error: "Aria couldn't reach the AI service right now — please try again." });
  }

  // Step 3: read and validate the response body.
  let data;
  try {
    data = await response.json();
  } catch (parseErr) {
    console.error("Aria: Gemini's response wasn't valid JSON. HTTP status was", response.status);
    return res.status(500).json({ error: "Aria got an unexpected response — please try again." });
  }

  if (!response.ok) {
    console.error("Aria: Gemini API returned an error. Status:", response.status, "Body:", JSON.stringify(data));
    return res.status(500).json({ error: "Aria is having trouble right now — please try again in a moment." });
  }

  const functionCall = data?.candidates?.[0]?.content?.parts?.find((p) => p.functionCall)?.functionCall;
  if (!functionCall || !functionCall.args) {
    console.error("Aria: Gemini responded but didn't call the expected function. Full response:", JSON.stringify(data));
    return res.status(500).json({ error: "Aria couldn't work that out — please try rephrasing." });
  }

  const reply = typeof functionCall.args.reply === "string" ? functionCall.args.reply : "Here's what I found:";
  const matchIds = Array.isArray(functionCall.args.matchIds) ? functionCall.args.matchIds : [];

  const matches = matchIds
    .map((id) => enrichedSalons.find((s) => s.id === id))
    .filter(Boolean)
    .slice(0, 3);

  res.json({ text: reply, matches });
});

module.exports = router;
