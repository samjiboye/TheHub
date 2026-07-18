const express = require("express");
const db = require("../db");

const router = express.Router();

// POST /concierge — proxies chat messages to Claude, keeping the API key server-side.
// Body: { messages: [{ role: "user"|"assistant", content: string }, ...] }
router.post("/", async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });
  }

  const salons = db.prepare("SELECT * FROM salons").all();
  const salonSummary = salons
    .map((s) => {
      const services = db.prepare("SELECT * FROM services WHERE salon_id = ?").all(s.id);
      return `${s.name} (${s.category}, services: ${services.map((sv) => `${sv.name} $${sv.price}`).join(", ")})`;
    })
    .join("\n");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: `You are Aria, the warm and concise front-desk concierge for SalonConnect, a local beauty booking app. Recommend from this exact list of salons only, referring to them by name. Keep replies to 2-4 sentences, friendly but efficient, like a good front-desk person. Salons:\n${salonSummary}`,
        messages,
      }),
    });
    const data = await response.json();
    const text =
      data?.content?.find((c) => c.type === "text")?.text ||
      "Sorry, I couldn't quite get that — could you try asking again?";
    res.json({ text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Aria is having trouble connecting right now." });
  }
});

module.exports = router;
