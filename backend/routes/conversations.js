const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { notifyUser } = require("../lib/notify");

// Everything here is polling-based, not real-time: the frontend checks
// GET /conversations/:id/messages every 10-15s while a chat is open.
// Simpler and cheaper to run than a live/websocket connection, and the
// small delay isn't noticeable for this kind of casual back-and-forth.

// GET /conversations/mine — list of this user's chat threads (customer sees
// their threads with salons; owner sees threads with customers of their salon),
// newest activity first, with a short preview of the last message.
router.get("/mine", requireAuth, async (req, res) => {
  try {
    let rows;
    if (req.user.role === "owner") {
      const result = await db.query(
        `SELECT c.id, c.updated_at, c.customer_id, u.name AS other_name,
                (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_role = 'customer' AND read_at IS NULL) AS unread_count
         FROM conversations c
         JOIN salons s ON s.id = c.salon_id
         JOIN users u ON u.id = c.customer_id
         WHERE s.owner_id = $1
         ORDER BY c.updated_at DESC`,
        [req.user.id]
      );
      rows = result.rows;
    } else {
      const result = await db.query(
        `SELECT c.id, c.updated_at, c.salon_id, s.name AS other_name,
                (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_role = 'owner' AND read_at IS NULL) AS unread_count
         FROM conversations c
         JOIN salons s ON s.id = c.salon_id
         WHERE c.customer_id = $1
         ORDER BY c.updated_at DESC`,
        [req.user.id]
      );
      rows = result.rows;
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load your conversations." });
  }
});

// POST /conversations/start — customer only. Finds the existing thread with
// this salon, or creates one if this is their first message ever to it.
router.post("/start", requireAuth, async (req, res) => {
  if (req.user.role !== "customer") return res.status(403).json({ error: "Only customers can start a conversation." });
  const { salon_id } = req.body;
  if (!salon_id) return res.status(400).json({ error: "salon_id is required" });
  try {
    const { rows: salonRows } = await db.query("SELECT id FROM salons WHERE id = $1", [salon_id]);
    if (!salonRows[0]) return res.status(404).json({ error: "Salon not found" });

    const { rows } = await db.query(
      `INSERT INTO conversations (customer_id, salon_id) VALUES ($1, $2)
       ON CONFLICT (customer_id, salon_id) DO UPDATE SET customer_id = EXCLUDED.customer_id
       RETURNING *`,
      [req.user.id, salon_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't start that conversation." });
  }
});

// Shared helper: confirms req.user is actually a participant (the customer,
// or the owner of the salon) in the given conversation. Returns the
// conversation row (with salon owner_id attached) or null.
async function getConversationIfParticipant(conversationId, user) {
  const { rows } = await db.query(
    `SELECT c.*, s.owner_id AS salon_owner_id, s.name AS salon_name, u.name AS customer_name
     FROM conversations c JOIN salons s ON s.id = c.salon_id JOIN users u ON u.id = c.customer_id
     WHERE c.id = $1`,
    [conversationId]
  );
  const convo = rows[0];
  if (!convo) return null;
  const isParticipant =
    (user.role === "customer" && convo.customer_id === user.id) ||
    (user.role === "owner" && convo.salon_owner_id === user.id);
  return isParticipant ? convo : null;
}

// GET /conversations/:id/messages — the polling endpoint. Also marks the
// other person's messages as read, since opening the thread = reading it.
router.get("/:id/messages", requireAuth, async (req, res) => {
  try {
    const convo = await getConversationIfParticipant(req.params.id, req.user);
    if (!convo) return res.status(404).json({ error: "Conversation not found" });

    const { rows: messages } = await db.query(
      "SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC",
      [convo.id]
    );

    const otherRole = req.user.role === "customer" ? "owner" : "customer";
    await db.query(
      "UPDATE messages SET read_at = NOW() WHERE conversation_id = $1 AND sender_role = $2 AND read_at IS NULL",
      [convo.id, otherRole]
    );

    res.json({ conversation: convo, messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load messages." });
  }
});

// POST /conversations/:id/messages — send a message in an existing thread.
router.post("/:id/messages", requireAuth, async (req, res) => {
  const { body } = req.body;
  if (!body || !body.trim()) return res.status(400).json({ error: "Message can't be empty." });
  if (body.length > 2000) return res.status(400).json({ error: "That message is too long." });
  try {
    const convo = await getConversationIfParticipant(req.params.id, req.user);
    if (!convo) return res.status(404).json({ error: "Conversation not found" });

    const { rows } = await db.query(
      "INSERT INTO messages (conversation_id, sender_id, sender_role, body) VALUES ($1, $2, $3, $4) RETURNING *",
      [convo.id, req.user.id, req.user.role, body.trim()]
    );
    await db.query("UPDATE conversations SET updated_at = NOW() WHERE id = $1", [convo.id]);

    const recipientId = req.user.role === "customer" ? convo.salon_owner_id : convo.customer_id;
    await notifyUser(recipientId, {
      type: "new_message",
      title: req.user.role === "customer" ? "New message from a client" : `New message from ${convo.salon_name}`,
      body: body.trim().length > 80 ? body.trim().slice(0, 80) + "…" : body.trim(),
    });

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't send that message." });
  }
});

module.exports = router;
