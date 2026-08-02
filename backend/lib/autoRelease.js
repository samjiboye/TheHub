const db = require("../db");
const { notifyUser } = require("./notify");
const { completeBooking } = require("./completeBooking");

// If an owner has requested completion and the client hasn't confirmed with their
// code or filed a dispute within 24 hours, auto-complete it. Protects owners from
// a client who got the service but never bothers (or refuses) to give the code.
async function checkPendingCompletions() {
  try {
    const { rows: bookings } = await db.query(
      `SELECT * FROM bookings
       WHERE status = 'confirmed' AND completion_requested_at IS NOT NULL
         AND disputed_at IS NULL
         AND completion_requested_at <= NOW() - INTERVAL '24 hours'`
    );
    for (const booking of bookings) {
      const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [booking.salon_id]);
      const salon = salonRows[0];
      await completeBooking(booking, salon, { auto: true });
      if (salon) {
        await notifyUser(salon.owner_id, {
          type: "booking_completed",
          title: "Booking auto-confirmed",
          body: `Booking #${booking.id} was auto-confirmed after 24 hours with no client response. Your payout has been processed if applicable.`,
          bookingId: booking.id,
        });
      }
    }
  } catch (err) {
    console.error("Auto-release job failed:", err);
  }
}

function startAutoReleaseJob() {
  checkPendingCompletions();
  setInterval(checkPendingCompletions, 30 * 60 * 1000);
}

module.exports = { startAutoReleaseJob };
