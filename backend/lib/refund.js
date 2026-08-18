const db = require("../db");
const paystack = require("./paystack");
const { creditWallet } = require("./wallet");

// Refunds a paid booking: wallet-paid bookings get credited straight back
// (instant, no external dependency), card-paid bookings go through Paystack's
// refund API (5–10 business days). Returns a status plus a customer-facing
// note describing what happened, or "none" if there was nothing to refund.
async function refundBooking(booking) {
  let refundStatus = "none"; // none | refunded | pending
  if (booking.payment_status === "paid" && booking.payment_method === "wallet") {
    await creditWallet(booking.customer_id, booking.service_price + booking.booking_fee, {
      type: "refund",
      bookingId: booking.id,
    });
    await db.query("UPDATE bookings SET payment_status = 'refunded' WHERE id = $1", [booking.id]);
    refundStatus = "refunded";
  } else if (booking.payment_status === "paid" && booking.paystack_reference) {
    try {
      await paystack.post("/refund", { transaction: booking.paystack_reference });
      await db.query("UPDATE bookings SET payment_status = 'refunded' WHERE id = $1", [booking.id]);
      refundStatus = "refunded";
    } catch (err) {
      console.error(`Refund failed for booking #${booking.id}:`, err.paystackResponse || err.message);
      refundStatus = "pending";
    }
  }

  const refundNote =
    refundStatus === "refunded" && booking.payment_method === "wallet"
      ? " The full amount has been added back to your wallet."
      : refundStatus === "refunded"
      ? " Your payment has been refunded — it should reflect in your account within 5–10 business days."
      : refundStatus === "pending"
      ? " We're processing your refund manually and will confirm once it's issued."
      : "";

  return { refundStatus, refundNote };
}

module.exports = { refundBooking, refundOrder };

// Refunds a paid marketplace product order — same pattern as refundBooking:
// wallet-paid orders get credited straight back (instant), card-paid orders
// go through Paystack's refund API (5–10 business days).
async function refundOrder(order) {
  let refundStatus = "none"; // none | refunded | pending
  if (order.payment_status === "paid" && order.payment_method === "wallet") {
    await creditWallet(order.customer_id, order.total, {
      type: "refund",
      orderId: order.id,
    });
    await db.query("UPDATE product_orders SET payment_status = 'refunded' WHERE id = $1", [order.id]);
    refundStatus = "refunded";
  } else if (order.payment_status === "paid" && order.paystack_reference) {
    try {
      await paystack.post("/refund", { transaction: order.paystack_reference });
      await db.query("UPDATE product_orders SET payment_status = 'refunded' WHERE id = $1", [order.id]);
      refundStatus = "refunded";
    } catch (err) {
      console.error(`Refund failed for order #${order.id}:`, err.paystackResponse || err.message);
      refundStatus = "pending";
    }
  }

  const refundNote =
    refundStatus === "refunded" && order.payment_method === "wallet"
      ? " The full amount has been added back to your wallet."
      : refundStatus === "refunded"
      ? " Your payment has been refunded — it should reflect in your account within 5–10 business days."
      : refundStatus === "pending"
      ? " We're processing your refund manually and will confirm once it's issued."
      : "";

  return { refundStatus, refundNote };
}
