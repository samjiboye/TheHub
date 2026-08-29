const db = require("../db");
const { sendNotificationEmail } = require("./email");

// Saves an in-app notification for a user AND emails them. Both are best-effort:
// a failure in either one is logged but never throws, so a notification problem
// can never break the booking/review/payment flow that triggered it.
async function notifyUser(userId, { type, title, body, bookingId = null, conversationId = null }) {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, title, body, booking_id, conversation_id) VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, type, title, body || null, bookingId, conversationId]
    );
  } catch (err) {
    console.error("Failed to save in-app notification:", err);
  }

  try {
    const { rows } = await db.query("SELECT email FROM users WHERE id = $1", [userId]);
    const email = rows[0]?.email;
    if (email) {
      await sendNotificationEmail(email, title, body || title);
    }
  } catch (err) {
    console.error("Failed to send notification email:", err);
  }
}

module.exports = { notifyUser };
