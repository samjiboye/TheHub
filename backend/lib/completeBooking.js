const db = require("../db");
const { notifyUser } = require("./notify");

// Marks a booking completed. No money moves here anymore — customers pay
// salons directly, off-platform. This used to also fire a Paystack payout,
// award ₦-spend loyalty points, and pay referral bonuses; all removed since
// none of that applies now. Loyalty is handled separately by the per-salon
// check-in code system (see /bookings/:id/check-in in routes/bookings.js).
async function completeBooking(booking, salon, { auto = false } = {}) {
  await db.query("UPDATE bookings SET status = 'completed' WHERE id = $1", [booking.id]);

  const { rows: serviceRows } = await db.query("SELECT name FROM services WHERE id = $1", [booking.service_id]);
  const serviceName = serviceRows[0]?.name || "your service";
  await notifyUser(booking.customer_id, {
    type: "booking_completed",
    title: auto ? "Booking auto-confirmed" : "Service completed",
    body: auto
      ? `Your ${serviceName} appointment${salon ? ` at ${salon.name}` : ""} was automatically confirmed after 24 hours with no response. Tap to leave a review!`
      : `Your ${serviceName} appointment${salon ? ` at ${salon.name}` : ""} is marked complete. Tap to leave a review!`,
    bookingId: booking.id,
  });

  // Owner-referral boost: fires once, only when the referred owner's salon gets
  // its first-ever completed booking (real activity, not just a signup). The
  // referring owner earns free featured placement instead of cash/points —
  // capped at MAX_BOOST_WEEKS total, ever, no matter how many owners they refer.
  try {
    if (salon) {
      const MAX_BOOST_WEEKS = 6;
      const WEEKS_PER_REFERRAL = 2;

      const { rows: ownerRows } = await db.query("SELECT referred_by FROM users WHERE id = $1", [salon.owner_id]);
      const referringOwnerId = ownerRows[0]?.referred_by;

      if (referringOwnerId) {
        const { rows: alreadyBoosted } = await db.query(
          "SELECT 1 FROM owner_referral_boosts WHERE referred_owner_id = $1",
          [salon.owner_id]
        );
        if (!alreadyBoosted[0]) {
          const { rows: salonCountRows } = await db.query(
            "SELECT COUNT(*) AS count FROM bookings WHERE salon_id = $1 AND status = 'completed'",
            [salon.id]
          );
          if (Number(salonCountRows[0].count) === 1) {
            const { rows: soFarRows } = await db.query(
              "SELECT COALESCE(SUM(weeks_granted), 0) AS total FROM owner_referral_boosts WHERE referring_owner_id = $1",
              [referringOwnerId]
            );
            const weeksSoFar = Number(soFarRows[0].total);
            const weeksToGrant = Math.max(0, Math.min(WEEKS_PER_REFERRAL, MAX_BOOST_WEEKS - weeksSoFar));

            if (weeksToGrant > 0) {
              await db.query(
                "INSERT INTO owner_referral_boosts (referring_owner_id, referred_owner_id, weeks_granted) VALUES ($1, $2, $3)",
                [referringOwnerId, salon.owner_id, weeksToGrant]
              );
              await db.query(
                `UPDATE salons SET featured_until = GREATEST(COALESCE(featured_until, NOW()), NOW()) + ($1 || ' weeks')::INTERVAL
                 WHERE owner_id = $2`,
                [weeksToGrant, referringOwnerId]
              );
              await notifyUser(referringOwnerId, {
                type: "referral_boost",
                title: "Referral bonus! 🎉",
                body: `An owner you referred just got their first booking — your salon gets ${weeksToGrant} week(s) of featured placement.`,
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error(`Owner referral boost failed for booking #${booking.id}:`, err);
  }
}

module.exports = { completeBooking };
