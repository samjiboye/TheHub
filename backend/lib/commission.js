const db = require("../db");

// Commission drops as a salon completes more bookings through the app — the more
// volume they send our way, the less we take per booking. Rates are locked in on
// each booking at checkout time (stored on the booking row), so a salon's tier
// only ever affects bookings made after they've earned it, never retroactively.
const TIERS = [
  { minCompleted: 200, rate: 0.05 },
  { minCompleted: 100, rate: 0.10 },
  { minCompleted: 50, rate: 0.12 },
  { minCompleted: 0, rate: 0.15 },
];

async function getCompletedCount(salonId) {
  const { rows } = await db.query(
    "SELECT COUNT(*) AS count FROM bookings WHERE salon_id = $1 AND status = 'completed'",
    [salonId]
  );
  return Number(rows[0]?.count || 0);
}

async function getCommissionRate(salonId) {
  const completedCount = await getCompletedCount(salonId);
  const tier = TIERS.find((t) => completedCount >= t.minCompleted);
  return tier.rate;
}

module.exports = { getCommissionRate, getCompletedCount, TIERS };
