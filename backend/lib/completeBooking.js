const db = require("../db");
const paystack = require("./paystack");
const { notifyUser } = require("./notify");

// Marks a booking completed, releases the wallet payout to the owner if applicable
// (card-paid bookings were already split at checkout, so there's nothing to send),
// and notifies the customer. Shared by the owner's manual confirm-completion route
// and the 24-hour auto-release job so payout logic only lives in one place.
async function completeBooking(booking, salon, { auto = false } = {}) {
  await db.query("UPDATE bookings SET status = 'completed' WHERE id = $1", [booking.id]);

  if (booking.payment_method === "wallet" && booking.payout_status !== "paid" && salon) {
    try {
      let recipientCode = salon.paystack_recipient_code;
      if (!recipientCode) {
        if (!salon.bank_code || !salon.account_number) {
          throw new Error("This salon connected payouts before wallet support was added — reconnect payouts in My Profile to enable wallet payouts.");
        }
        const recipient = await paystack.post("/transferrecipient", {
          type: "nuban",
          name: salon.name,
          account_number: salon.account_number,
          bank_code: salon.bank_code,
          currency: "NGN",
        });
        recipientCode = recipient.recipient_code;
        await db.query("UPDATE salons SET paystack_recipient_code = $1 WHERE id = $2", [recipientCode, salon.id]);
      }
      await paystack.post("/transfer", {
        source: "balance",
        amount: Math.round(booking.payout_amount * 100),
        recipient: recipientCode,
        reason: `Payout for booking #${booking.id}`,
      });
      await db.query("UPDATE bookings SET payout_status = 'paid' WHERE id = $1", [booking.id]);
    } catch (err) {
      console.error(`Wallet payout failed for booking #${booking.id}:`, err.paystackResponse || err.message);
      await db.query("UPDATE bookings SET payout_status = 'failed' WHERE id = $1", [booking.id]);
      await notifyUser(salon.owner_id, {
        type: "payout_failed",
        title: "Payout couldn't be sent",
        body: `We couldn't send your payout for booking #${booking.id}. If your payout details are outdated, reconnect payouts in My Profile.`,
        bookingId: booking.id,
      });
    }
  }

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
