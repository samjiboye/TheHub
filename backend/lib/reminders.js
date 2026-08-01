const db = require("../db");
const { notifyUser } = require("./notify");

// time_slot is a time-of-day string like "9:00 AM". The appointment date is
// booking_date if the booking has one, otherwise the day the booking was created.
function getAppointmentDateTime(booking) {
  const baseDate = booking.booking_date ? new Date(booking.booking_date) : new Date(booking.created_at);
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((booking.time_slot || "").trim());
  if (!match) return baseDate;
  let [, hourStr, minuteStr, period] = match;
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  if (/PM/i.test(period) && hour !== 12) hour += 12;
  if (/AM/i.test(period) && hour === 12) hour = 0;
  const appt = new Date(baseDate);
  appt.setHours(hour, minute, 0, 0);
  return appt;
}

// Sends a one-time reminder to customers whose confirmed appointment is coming
// up within the next ~75 minutes. Runs on an interval since Render's free tier
// has no separate cron worker — this just piggybacks on the always-on API process.
async function checkUpcomingBookings() {
  try {
    const { rows: bookings } = await db.query(
      `SELECT b.*, s.name AS salon_name FROM bookings b
       JOIN salons s ON s.id = b.salon_id
       WHERE b.status = 'confirmed' AND b.reminder_sent_at IS NULL`
    );
    const now = Date.now();
    for (const booking of bookings) {
      const minutesAway = (getAppointmentDateTime(booking).getTime() - now) / 60000;
      if (minutesAway > 0 && minutesAway <= 75) {
        await notifyUser(booking.customer_id, {
          type: "reminder",
          title: "Upcoming appointment",
          body: `Reminder: your appointment at ${booking.salon_name} is coming up at ${booking.time_slot}.`,
          bookingId: booking.id,
        });
        await db.query("UPDATE bookings SET reminder_sent_at = NOW() WHERE id = $1", [booking.id]);
      }
    }
  } catch (err) {
    console.error("Reminder job failed:", err);
  }
}

function startReminderJob() {
  checkUpcomingBookings();
  setInterval(checkUpcomingBookings, 15 * 60 * 1000);
}

module.exports = { startReminderJob };
