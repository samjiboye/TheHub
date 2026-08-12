const db = require("../db");
const { creditWallet } = require("./wallet");
const { notifyUser } = require("./notify");

const LOYALTY_GOAL = 150; // points needed for a reward (≈₦15,000 spent, ~5 bookings at ₦3,000)
const LOYALTY_REWARD = 500; // ₦ credited to the customer's wallet

// Adds points to a user's running loyalty balance and, if the goal is hit,
// credits the reward to their wallet and rolls any leftover points into the
// next cycle. Shared by booking completions and referral bonuses so the
// reward-trigger logic only ever lives in one place.
async function addLoyaltyPoints(userId, points, { bookingId = null } = {}) {
  if (!points || points <= 0) return;
  const { rows } = await db.query(
    "UPDATE users SET loyalty_bookings_since_reward = loyalty_bookings_since_reward + $2 WHERE id = $1 RETURNING loyalty_bookings_since_reward",
    [userId, points]
  );
  const total = rows[0]?.loyalty_bookings_since_reward || 0;
  if (total >= LOYALTY_GOAL) {
    await db.query(
      "UPDATE users SET loyalty_bookings_since_reward = loyalty_bookings_since_reward - $2 WHERE id = $1",
      [userId, LOYALTY_GOAL]
    );
    await creditWallet(userId, LOYALTY_REWARD, { type: "reward", bookingId });
    await notifyUser(userId, {
      type: "loyalty_reward",
      title: "Reward unlocked! \ud83c\udf89",
      body: `You've earned ${LOYALTY_GOAL} loyalty points through TheHub \u2014 \u20a6${Number(LOYALTY_REWARD).toLocaleString()} has been added to your wallet.`,
      bookingId,
    });
  }
}

module.exports = { addLoyaltyPoints, LOYALTY_GOAL, LOYALTY_REWARD };
