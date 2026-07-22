const express = require("express");
const crypto = require("crypto");
const db = require("../db");

const router = express.Router();

router.post("/", (req, res) => {
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
    if (bookingId) {
      db.prepare(
        `UPDATE bookings SET payment_status = 'paid', status = 'confirmed'
         WHERE id = ? AND paystack_reference = ?`
      ).run(bookingId, event.data.reference);
    }
  }

  res.sendStatus(200);
});

module.exports = router;
