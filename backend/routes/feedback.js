const express = require("express");
const db = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const router = express.Router();

// POST /feedback - any logged-in user can submit feedback or a feature request.
router.post("/", requireAuth, async (req, res) => {
  const message = (req.body.message || "").trim();
  if (!message) {
    return res.status(400).json({ error: "Feedback message can't be empty." });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: "Keep it under 2000 characters." });
  }
  try {
    await db.query(
      "INSERT INTO feedback (user_id, message) VALUES ($1, $2)",
      [req.user.id, message]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't send that -- please try again." });
  }
});

// GET /feedback - admin only, most recent first.
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT f.id, f.message, f.created_at, u.name, u.email, u.role
       FROM feedback f
       JOIN users u ON u.id = f.user_id
       ORDER BY f.created_at DESC
       LIMIT 200`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load feedback." });
  }
});

module.exports = router;
