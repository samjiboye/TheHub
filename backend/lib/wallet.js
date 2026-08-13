const db = require("../db");

async function getBalance(userId) {
  const { rows } = await db.query("SELECT wallet_balance FROM users WHERE id = $1", [userId]);
  return rows[0]?.wallet_balance || 0;
}

async function debitWallet(userId, amount, { bookingId = null, orderId = null } = {}) {
  const result = await db.query(
    "UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2 AND wallet_balance >= $1 RETURNING wallet_balance",
    [amount, userId]
  );
  if (result.rowCount === 0) return false;
  await db.query(
    `INSERT INTO wallet_transactions (user_id, type, amount, booking_id, order_id, status) VALUES ($1, 'debit', $2, $3, $4, 'success')`,
    [userId, amount, bookingId, orderId]
  );
  return true;
}

async function creditWallet(userId, amount, { type = "refund", bookingId = null } = {}) {
  await db.query("UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2", [amount, userId]);
  await db.query(
    `INSERT INTO wallet_transactions (user_id, type, amount, booking_id, status) VALUES ($1, $2, $3, $4, 'success')`,
    [userId, type, amount, bookingId]
  );
}

module.exports = { getBalance, debitWallet, creditWallet };
