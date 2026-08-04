const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const { notifyUser } = require("../lib/notify");
const router = express.Router();

router.post("/", async (req, res) => {
  const signature = req.headers["x-paystack-signature"];
  const expected = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY || "")
    .update(req.body)
    .digest("hex");
  if (!signature || signature !== expected) {
    console.error("Paystack webhook signature verification failed");
    return res.status(400).send("Invalid signature");
  }
  const event = JSON.parse(req.body.toString("utf8"));
  if (event.event === "charge.success") {
    const bookingId = event.data?.metadata?.booking_id;
    const orderId = event.data?.metadata?.order_id;
    const walletFund = event.data?.metadata?.wallet_fund;
    if (orderId) {
      try {
        const { rows } = await db.query(
          `UPDATE product_orders SET payment_status = 'paid', status = 'processing'
           WHERE id = $1 AND paystack_reference = $2 RETURNING *`,
          [orderId, event.data.reference]
        );
        const order = rows[0];
        if (order) {
          const { rows: items } = await db.query(
            "SELECT * FROM product_order_items WHERE order_id = $1",
            [order.id]
          );
          for (const item of items) {
            await db.query(
              "UPDATE products SET stock_quantity = GREATEST(stock_quantity - $1, 0) WHERE id = $2",
              [item.quantity, item.product_id]
            );
          }
          await notifyUser(order.customer_id, {
            type: "order_paid",
            title: "Order confirmed",
            body: `Payment received for order #${order.id}. We're getting it ready for dispatch.`,
          });
        }
      } catch (err) {
        console.error("Failed to update product order from webhook:", err);
      }
    } else if (walletFund) {
      try {
        const { rows } = await db.query(
          `UPDATE wallet_transactions SET status = 'success'
           WHERE paystack_reference = $1 AND status = 'pending' RETURNING *`,
          [event.data.reference]
        );
        const tx = rows[0];
        if (tx) {
          await db.query("UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2", [tx.amount, tx.user_id]);
          await notifyUser(tx.user_id, {
            type: "wallet_funded",
            title: "Wallet funded",
            body: `₦${Number(tx.amount).toLocaleString()} has been added to your TheHub wallet.`,
          });
        }
      } catch (err) {
        console.error("Failed to credit wallet from webhook:", err);
      }
    } else if (bookingId) {
      try {
        const { rows } = await db.query(
          `UPDATE bookings SET payment_status = 'paid', status = 'confirmed', owner_response = 'pending'
           WHERE id = $1 AND paystack_reference = $2 RETURNING *`,
          [bookingId, event.data.reference]
        );
        const booking = rows[0];
        if (booking) {
          const { rows: infoRows } = await db.query(
            `SELECT s.name AS salon_name, s.owner_id, sv.name AS service_name
             FROM salons s JOIN services sv ON sv.id = $2 WHERE s.id = $1`,
            [booking.salon_id, booking.service_id]
          );
          const info = infoRows[0];
          await notifyUser(booking.customer_id, {
            type: "booking_confirmed",
            title: "Payment received",
            body: `Your payment${info ? ` for ${info.service_name} at ${info.salon_name}` : ""} at ${booking.time_slot} went through — waiting for the salon to accept.`,
            bookingId: booking.id,
          });
          if (info) {
            await notifyUser(info.owner_id, {
              type: "new_booking",
              title: "New booking received",
              body: `You have a new booking for ${info.service_name} at ${booking.time_slot}. Accept or decline it from your dashboard.`,
              bookingId: booking.id,
            });
          }
        }
      } catch (err) {
        console.error("Failed to update booking from webhook:", err);
      }
    }
  } else if (event.event === "charge.failed") {
    const bookingId = event.data?.metadata?.booking_id;
    const orderId = event.data?.metadata?.order_id;
    const walletFund = event.data?.metadata?.wallet_fund;
    if (orderId) {
      try {
        const { rows } = await db.query(
          `UPDATE product_orders SET payment_status = 'failed', status = 'cancelled'
           WHERE id = $1 AND paystack_reference = $2 RETURNING *`,
          [orderId, event.data.reference]
        );
        const order = rows[0];
        if (order) {
          await notifyUser(order.customer_id, {
            type: "order_payment_failed",
            title: "Payment failed",
            body: `Your payment for order #${order.id} didn't go through. Please try again from your orders list.`,
          });
        }
      } catch (err) {
        console.error("Failed to handle failed order charge webhook:", err);
      }
    } else if (walletFund) {
      try {
        await db.query(
          `UPDATE wallet_transactions SET status = 'failed' WHERE paystack_reference = $1 AND status = 'pending'`,
          [event.data.reference]
        );
      } catch (err) {
        console.error("Failed to mark wallet funding as failed:", err);
      }
    } else if (bookingId) {
      try {
        const { rows } = await db.query(
          `UPDATE bookings SET payment_status = 'failed'
           WHERE id = $1 AND paystack_reference = $2 RETURNING *`,
          [bookingId, event.data.reference]
        );
        const booking = rows[0];
        if (booking) {
          await notifyUser(booking.customer_id, {
            type: "payment_failed",
            title: "Payment failed",
            body: `Your payment for booking #${booking.id} didn't go through. Please try again from your bookings list.`,
            bookingId: booking.id,
          });
        }
      } catch (err) {
        console.error("Failed to handle failed charge webhook:", err);
      }
    }
  }
  res.sendStatus(200);
});

module.exports = router;
