const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();

// GET /notifications/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
      [req.user.id]
    );
    const unreadCount = rows.filter((n) => !n.read).length;
    res.json({ notifications: rows, unreadCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load notifications." });
  }
});

// PATCH /notifications/:id/read
router.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    await db.query(
      "UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't update that notification." });
  }
});

// PATCH /notifications/read-all
router.patch("/read-all", requireAuth, async (req, res) => {
  try {
    await db.query("UPDATE notifications SET read = true WHERE user_id = $1 AND read = false", [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't update notifications." });
  }
});

module.exports = router;
