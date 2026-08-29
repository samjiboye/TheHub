changes = []

for fname in ["backend/routes/salons.js", "backend/routes/media.js", "backend/routes/payments.js"]:
    with open(fname, "r") as f:
        content = f.read()
    count = content.count(', requireRole("owner")')
    if count > 0:
        content = content.replace(', requireRole("owner")', '')
        with open(fname, "w") as f:
            f.write(content)
        changes.append(f"✅ {fname} — removed {count} redundant role gate(s), ownership checks remain intact")
    else:
        changes.append(f"⏭️  {fname} — role gates already removed")

conv_path = "backend/routes/conversations.js"
new_conv_content = '''const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { notifyUser } = require("../lib/notify");

// Everything here is polling-based, not real-time: the frontend checks
// GET /conversations/:id/messages every 10-15s while a chat is open.
// Simpler and cheaper to run than a live/websocket connection, and the
// small delay isn't noticeable for this kind of casual back-and-forth.
//
// Nothing here gates on account "role" anymore. One account can own a
// salon AND book/message other salons as a customer — capability is
// always determined by real facts (do you own this salon? are you this
// conversation's customer?), never by a fixed label on the account.

router.get("/mine", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.id, c.updated_at, 'customer' AS my_role_here, s.name AS other_name,
              (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
              (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_role = 'owner' AND read_at IS NULL) AS unread_count
       FROM conversations c JOIN salons s ON s.id = c.salon_id
       WHERE c.customer_id = $1

       UNION ALL

       SELECT c.id, c.updated_at, 'owner' AS my_role_here, u.name AS other_name,
              (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
              (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_role = 'customer' AND read_at IS NULL) AS unread_count
       FROM conversations c JOIN salons s ON s.id = c.salon_id JOIN users u ON u.id = c.customer_id
       WHERE s.owner_id = $1

       ORDER BY updated_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load your conversations." });
  }
});

router.post("/start", requireAuth, async (req, res) => {
  let { salon_id, customer_id } = req.body;
  if (!salon_id) return res.status(400).json({ error: "salon_id is required" });
  try {
    const { rows: salonRows } = await db.query("SELECT id, owner_id FROM salons WHERE id = $1", [salon_id]);
    const salon = salonRows[0];
    if (!salon) return res.status(404).json({ error: "Salon not found" });

    if (salon.owner_id === req.user.id) {
      if (!customer_id) return res.status(400).json({ error: "customer_id is required" });
    } else {
      customer_id = req.user.id;
    }

    const { rows: hasBookedRows } = await db.query(
      "SELECT 1 FROM bookings WHERE customer_id = $1 AND salon_id = $2 LIMIT 1",
      [customer_id, salon_id]
    );
    if (!hasBookedRows[0]) {
      return res.status(403).json({ error: "This person hasn't booked this salon yet." });
    }

    const { rows } = await db.query(
      `INSERT INTO conversations (customer_id, salon_id) VALUES ($1, $2)
       ON CONFLICT (customer_id, salon_id) DO UPDATE SET customer_id = EXCLUDED.customer_id
       RETURNING *`,
      [customer_id, salon_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't start that conversation." });
  }
});

async function getConversationIfParticipant(conversationId, user) {
  const { rows } = await db.query(
    `SELECT c.*, s.owner_id AS salon_owner_id, s.name AS salon_name, u.name AS customer_name
     FROM conversations c JOIN salons s ON s.id = c.salon_id JOIN users u ON u.id = c.customer_id
     WHERE c.id = $1`,
    [conversationId]
  );
  const convo = rows[0];
  if (!convo) return null;
  if (convo.customer_id === user.id) return { ...convo, myRoleHere: "customer" };
  if (convo.salon_owner_id === user.id) return { ...convo, myRoleHere: "owner" };
  return null;
}

router.get("/:id/messages", requireAuth, async (req, res) => {
  try {
    const convo = await getConversationIfParticipant(req.params.id, req.user);
    if (!convo) return res.status(404).json({ error: "Conversation not found" });

    const { rows: messages } = await db.query(
      "SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC",
      [convo.id]
    );

    const otherRole = convo.myRoleHere === "customer" ? "owner" : "customer";
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

router.post("/:id/messages", requireAuth, async (req, res) => {
  const { body } = req.body;
  if (!body || !body.trim()) return res.status(400).json({ error: "Message can't be empty." });
  if (body.length > 2000) return res.status(400).json({ error: "That message is too long." });
  try {
    const convo = await getConversationIfParticipant(req.params.id, req.user);
    if (!convo) return res.status(404).json({ error: "Conversation not found" });

    const { rows } = await db.query(
      "INSERT INTO messages (conversation_id, sender_id, sender_role, body) VALUES ($1, $2, $3, $4) RETURNING *",
      [convo.id, req.user.id, convo.myRoleHere, body.trim()]
    );
    await db.query("UPDATE conversations SET updated_at = NOW() WHERE id = $1", [convo.id]);

    const recipientId = convo.myRoleHere === "customer" ? convo.salon_owner_id : convo.customer_id;
    await notifyUser(recipientId, {
      type: "new_message",
      title: convo.myRoleHere === "customer" ? "New message from a client" : `New message from ${convo.salon_name}`,
      body: body.trim().length > 80 ? body.trim().slice(0, 80) + "…" : body.trim(),
      conversationId: convo.id,
    });

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't send that message." });
  }
});

module.exports = router;
'''
with open(conv_path, "w") as f:
    f.write(new_conv_content)
changes.append("✅ conversations.js — fully rewritten to work off real facts, not a fixed account role")

for c in changes:
    print(c)
