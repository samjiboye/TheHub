const express = require("express");
const db = require("../db");
const stripe = require("../lib/stripe");

const router = express.Router();

// Mounted with express.raw() in server.js — Stripe's signature check needs the
// untouched request body, not JSON already parsed by express.json().
router.post("/", (req, res) => {
  const signature = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const bookingId = session.metadata?.booking_id;
      if (bookingId) {
        db.prepare(
          `UPDATE bookings SET payment_status = 'paid', status = 'confirmed', stripe_payment_intent_id = ?
           WHERE id = ?`
        ).run(session.payment_intent, bookingId);
      }
      break;
    }
    case "account.updated": {
      const account = event.data.object;
      db.prepare("UPDATE salons SET stripe_payouts_enabled = ? WHERE stripe_account_id = ?").run(
        account.payouts_enabled ? 1 : 0,
        account.id
      );
      break;
    }
    default:
      break; // ignore events we don't act on
  }

  res.json({ received: true });
});

module.exports = router;
