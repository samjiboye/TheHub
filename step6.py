path = "backend/lib/completeBooking.js"

new_content = '''const db = require("../db");
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
}

module.exports = { completeBooking };
'''

with open(path, "r") as f:
    current = f.read()

if current.strip() == new_content.strip():
    print("⏭️  completeBooking.js already stripped — skipped")
else:
    with open(path, "w") as f:
        f.write(new_content)
    print("✅ completeBooking.js stripped — Paystack payout, old loyalty points, and referral bonuses removed")

autorelease_path = "backend/lib/autoRelease.js"
with open(autorelease_path, "r") as f:
    ar = f.read()

old_line = '          body: `Booking #${booking.id} was auto-confirmed after 24 hours with no client response. Your payout has been processed if applicable.`,'
new_line = '          body: `Booking #${booking.id} was auto-confirmed after 24 hours with no client response.`,'

if old_line in ar:
    assert ar.count(old_line) == 1
    ar = ar.replace(old_line, new_line)
    with open(autorelease_path, "w") as f:
        f.write(ar)
    print("✅ autoRelease.js — removed outdated payout mention from notification")
else:
    print("⏭️  autoRelease.js already updated — skipped")
