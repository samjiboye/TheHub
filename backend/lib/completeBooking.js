const db = require("../db");
const paystack = require("./paystack");
const { notifyUser } = require("./notify");
const { creditWallet } = require("./wallet");
const { addLoyaltyPoints } = require("./loyalty");

const POINTS_PER_NAIRA = 0.01; // 1 point per ₦100 spent
// Referral bonus: sized against a typical ₦3,000 booking earning ₦450 at
// 15% commission, so paying both sides out still leaves margin on booking #1
// alone, even if the referred customer never books again.
const REFERRAL_REFERRER_POINTS = 60; // ≈₦200
const REFERRAL_REFERRED_POINTS = 30; // ≈₦100
// Owner-to-owner referrals pay more than customer ones since bringing a whole
// new salon onto the platform is worth more than one customer - but the reward
// never shows side-by-side with the customer numbers, so there's no framing
// that nudges people to register as an owner just to chase a bigger number.
const OWNER_REFERRAL_REFERRER_POINTS = 100; // ≈₦330
const OWNER_REFERRAL_REFERRED_POINTS = 50; // ≈₦165

// Marks a booking completed and releases the owner's payout — held until now regardless
// of how the customer paid, so cancellations/disputes before completion never require
// clawing money back from the owner. Shared by the owner's manual confirm-completion
// route and the 24-hour auto-release job so payout logic only lives in one place.
async function completeBooking(booking, salon, { auto = false } = {}) {
  await db.query("UPDATE bookings SET status = 'completed' WHERE id = $1", [booking.id]);

  if (booking.payout_status !== "paid" && salon) {
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

  // Loyalty: earn points proportional to what was actually spent (1 point per
  // ₦100), so a bigger booking earns more than a smaller one.
  try {
    const pointsEarned = Math.floor(booking.service_price * POINTS_PER_NAIRA);
    await addLoyaltyPoints(booking.customer_id, pointsEarned, { bookingId: booking.id });
  } catch (err) {
    console.error(`Loyalty reward tracking failed for booking #${booking.id}:`, err);
  }

  // Referral bonus: fires once, only when the referred customer completes their
  // very first paid booking (not on signup) - ties the reward to real revenue
  // instead of free signups, and referral_bonus_awarded guards against it ever
  // firing twice for the same person.
  try {
    const { rows: customerRows } = await db.query(
      "SELECT referred_by, referral_bonus_awarded FROM users WHERE id = $1",
      [booking.customer_id]
    );
    const customerRow = customerRows[0];
    if (customerRow?.referred_by && !customerRow.referral_bonus_awarded) {
      const { rows: countRows } = await db.query(
        "SELECT COUNT(*) AS count FROM bookings WHERE customer_id = $1 AND status = 'completed'",
        [booking.customer_id]
      );
      if (Number(countRows[0].count) === 1) {
        await db.query("UPDATE users SET referral_bonus_awarded = true WHERE id = $1", [booking.customer_id]);
        await addLoyaltyPoints(booking.customer_id, REFERRAL_REFERRED_POINTS, { bookingId: booking.id });
        await addLoyaltyPoints(customerRow.referred_by, REFERRAL_REFERRER_POINTS, { bookingId: booking.id });
        await notifyUser(booking.customer_id, {
          type: "referral_bonus",
          title: "Referral bonus! 🎁",
          body: `You earned ${REFERRAL_REFERRED_POINTS} loyalty points for completing your first booking through a referral.`,
          bookingId: booking.id,
        });
        await notifyUser(customerRow.referred_by, {
          type: "referral_bonus",
          title: "Your referral just booked! 🎉",
          body: `Someone you referred completed their first booking — you earned ${REFERRAL_REFERRER_POINTS} loyalty points.`,
          bookingId: booking.id,
        });
      }
    }
  } catch (err) {
    console.error(`Referral bonus tracking failed for booking #${booking.id}:`, err);
  }

  // Owner-to-owner referral bonus: fires once, only when the referred owner's
  // salon gets its first-ever completed booking - i.e. once they've actually
  // brought in real, paying business, not just registered an account.
  try {
    if (salon) {
      const { rows: ownerRows } = await db.query(
        "SELECT referred_by, referral_bonus_awarded FROM users WHERE id = $1",
        [salon.owner_id]
      );
      const ownerRow = ownerRows[0];
      if (ownerRow?.referred_by && !ownerRow.referral_bonus_awarded) {
        const { rows: salonCountRows } = await db.query(
          "SELECT COUNT(*) AS count FROM bookings WHERE salon_id = $1 AND status = 'completed'",
          [salon.id]
        );
        if (Number(salonCountRows[0].count) === 1) {
          await db.query("UPDATE users SET referral_bonus_awarded = true WHERE id = $1", [salon.owner_id]);
          await addLoyaltyPoints(salon.owner_id, OWNER_REFERRAL_REFERRED_POINTS, { bookingId: booking.id });
          await addLoyaltyPoints(ownerRow.referred_by, OWNER_REFERRAL_REFERRER_POINTS, { bookingId: booking.id });
          await notifyUser(salon.owner_id, {
            type: "referral_bonus",
            title: "Referral bonus! 🎁",
            body: `You earned ${OWNER_REFERRAL_REFERRED_POINTS} loyalty points for your salon's first completed booking.`,
            bookingId: booking.id,
          });
          await notifyUser(ownerRow.referred_by, {
            type: "referral_bonus",
            title: "The salon you referred just booked! 🎉",
            body: `A salon you referred completed its first booking — you earned ${OWNER_REFERRAL_REFERRER_POINTS} loyalty points.`,
            bookingId: booking.id,
          });
        }
      }
    }
  } catch (err) {
    console.error(`Owner referral bonus tracking failed for booking #${booking.id}:`, err);
  }
}

module.exports = { completeBooking };
