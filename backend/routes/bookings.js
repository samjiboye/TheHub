const express = require("express");
const multer = require("multer");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { uploadLimiter } = require("../middleware/rateLimiters");
const { notifyUser } = require("../lib/notify");
const { sendNotificationEmail } = require("../lib/email");
const paystack = require("../lib/paystack");
const cloudinary = require("../lib/cloudinary");
const { completeBooking } = require("../lib/completeBooking");
const { refundBooking } = require("../lib/refund");
const { getCommissionRate } = require("../lib/commission");
const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, file.mimetype.startsWith("image/"));
  },
});
const BOOKING_FEE = 0; // set above 0 to reintroduce a booking fee later

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image", folder: "thehub/completions" },
      (err, result) => {
        if (err) return reject(err);
        // Serve a compressed, auto-format version instead of the original upload —
        // meaningfully smaller downloads on the mobile data most customers are on.
        result.secure_url = result.secure_url.replace("/upload/", "/upload/f_auto,q_auto/");
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

// POST /bookings — creates a booking with NO payment attached (status stays 'pending',
// payment_status stays 'unpaid'). Useful for testing or manual/free bookings, but the
// real customer flow is POST /payments/checkout, which creates the booking AND a
// Paystack transaction together, then a webhook confirms it once paid.
router.post("/", requireAuth, async (req, res) => {
  const { salon_id, service_id, time_slot, booking_date, location_type, customer_address } = req.body;
  if (!salon_id || !service_id || !time_slot) {
    return res.status(400).json({ error: "salon_id, service_id, and time_slot are required" });
  }
  const loc = location_type === "home" ? "home" : "salon";
  if (loc === "home" && !customer_address) {
    return res.status(400).json({ error: "An address is required for home service bookings." });
  }
  try {
    const { rows: serviceRows } = await db.query(
      "SELECT * FROM services WHERE id = $1 AND salon_id = $2",
      [service_id, salon_id]
    );
    const service = serviceRows[0];
    if (!service) return res.status(404).json({ error: "Service not found for this salon" });
    if (loc === "salon" && !service.salon_service_available) {
      return res.status(400).json({ error: "This service is only available as a home visit." });
    }
    if (loc === "home" && service.home_service_price == null) {
      return res.status(400).json({ error: "This service doesn't offer home visits." });
    }

    const price = loc === "home" ? service.home_service_price : service.price;
    const commissionRate = await getCommissionRate(salon_id);
    const commission_amount = Math.round(price * commissionRate * 100) / 100;
    const payout_amount = Math.round((price - commission_amount) * 100) / 100;

    const { rows } = await db.query(
      `INSERT INTO bookings
        (customer_id, salon_id, service_id, time_slot, booking_date, location_type, customer_address, service_price, booking_fee, commission_rate, commission_amount, payout_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [req.user.id, salon_id, service_id, time_slot, booking_date || null, loc, loc === "home" ? customer_address : null, price, BOOKING_FEE, commissionRate, commission_amount, payout_amount]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't create that booking." });
  }
});

// GET /bookings/me (customer's own bookings)
router.get("/me", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT b.*, s.name AS salon_name, sv.name AS service_name,
              (r.id IS NOT NULL) AS already_rated, r.rating AS given_rating
       FROM bookings b
       JOIN salons s ON s.id = b.salon_id
       JOIN services sv ON sv.id = b.service_id
       LEFT JOIN reviews r ON r.booking_id = b.id
       WHERE b.customer_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load your bookings." });
  }
});

// PATCH /bookings/:id/cancel
const OWNER_CANCEL_REASONS = [
  "Client no-show",
  "Owner unavailable",
  "Schedule conflict",
  "Emergency",
  "Other",
];

const CUSTOMER_CANCEL_REASONS = [
  "Schedule conflict",
  "Found another appointment",
  "No longer needed",
  "Booked by mistake",
  "Change of plans",
  "Other",
];

function parseAppointmentDateTime(booking) {
  // time_slot is a time-of-day string like "9:00 AM"; the appointment is always
  // on the same calendar day the booking was created.
  const created = new Date(booking.created_at);
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(booking.time_slot.trim());
  if (!match) return created;
  let [, hourStr, minuteStr, period] = match;
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  if (/PM/i.test(period) && hour !== 12) hour += 12;
  if (/AM/i.test(period) && hour === 12) hour = 0;
  const appt = new Date(created);
  appt.setHours(hour, minute, 0, 0);
  return appt;
}

router.patch("/:id/cancel", requireAuth, async (req, res) => {
  const { reason, note } = req.body;
  try {
    const { rows: bookingRows } = await db.query("SELECT * FROM bookings WHERE id = $1", [req.params.id]);
    const booking = bookingRows[0];
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [booking.salon_id]);
    const salon = salonRows[0];

    const isCustomer = booking.customer_id === req.user.id;
    const isOwner = salon && salon.owner_id === req.user.id;
    if (!isCustomer && !isOwner) return res.status(403).json({ error: "Not your booking" });

    const allowedReasons = isOwner ? OWNER_CANCEL_REASONS : CUSTOMER_CANCEL_REASONS;
    if (!reason || !allowedReasons.includes(reason)) {
      return res.status(400).json({ error: `reason is required and must be one of: ${allowedReasons.join(", ")}` });
    }

    if (booking.status !== "pending" && booking.status !== "confirmed") {
      return res.status(400).json({ error: "This booking can no longer be cancelled." });
    }

    const appointmentTime = parseAppointmentDateTime(booking);
    if (Date.now() >= appointmentTime.getTime()) {
      return res.status(400).json({ error: "This appointment time has already passed and can no longer be cancelled." });
    }

    const cancelledBy = isOwner ? "owner" : "customer";

    await db.query(
      "UPDATE bookings SET status = 'cancelled', cancelled_by = $1, cancel_reason = $2, cancel_note = $3 WHERE id = $4",
      [cancelledBy, reason, note || null, booking.id]
    );

    if (cancelledBy === "owner") {
      await db.query("UPDATE salons SET cancellation_count = cancellation_count + 1 WHERE id = $1", [booking.salon_id]);
    }

    let refundStatus = "none"; // none | refunded | pending
    let refundNote = "";
    if (booking.payment_status === "paid") {
      const result = await refundBooking(booking);
      refundStatus = result.refundStatus;
      refundNote = result.refundNote;
    }

    const { rows: serviceRows } = await db.query("SELECT name FROM services WHERE id = $1", [booking.service_id]);
    const serviceName = serviceRows[0]?.name || "your service";

    if (cancelledBy === "owner") {
      await notifyUser(booking.customer_id, {
        type: "booking_cancelled",
        title: "Booking cancelled",
        body: `Your booking for ${serviceName}${salon ? ` at ${salon.name}` : ""} at ${booking.time_slot} was cancelled by the owner. Reason: ${reason}.${refundNote}`,
        bookingId: booking.id,
      });
    } else {
      if (refundNote) {
        await notifyUser(booking.customer_id, {
          type: "booking_cancelled",
          title: "Booking cancelled",
          body: `Your booking for ${serviceName} at ${booking.time_slot} was cancelled.${refundNote}`,
          bookingId: booking.id,
        });
      }
      if (salon) {
        await notifyUser(salon.owner_id, {
          type: "booking_cancelled",
          title: "Booking cancelled",
          body: `A client cancelled their booking for ${serviceName} at ${booking.time_slot}. Reason: ${reason}.`,
          bookingId: booking.id,
        });
      }
    }

    res.json({ ok: true, refundStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't cancel that booking." });
  }
});


// POST /bookings/:id/accept — owner accepts a newly-paid booking.
router.post("/:id/accept", requireAuth, async (req, res) => {
  try {
    const { rows: bookingRows } = await db.query("SELECT * FROM bookings WHERE id = $1", [req.params.id]);
    const booking = bookingRows[0];
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [booking.salon_id]);
    const salon = salonRows[0];
    const isOwner = salon && salon.owner_id === req.user.id;
    if (!isOwner) return res.status(403).json({ error: "Not your booking" });

    if (booking.status !== "confirmed" || booking.owner_response !== "pending") {
      return res.status(400).json({ error: "This booking isn't awaiting a response." });
    }

    await db.query("UPDATE bookings SET owner_response = 'accepted' WHERE id = $1", [booking.id]);

    const { rows: serviceRows } = await db.query("SELECT name FROM services WHERE id = $1", [booking.service_id]);
    const serviceName = serviceRows[0]?.name || "your service";
    await notifyUser(booking.customer_id, {
      type: "booking_accepted",
      title: "Booking accepted",
      body: `${salon?.name || "The salon"} accepted your booking for ${serviceName} at ${booking.time_slot}. See you then!`,
      bookingId: booking.id,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't accept that booking." });
  }
});

// POST /bookings/:id/decline — owner declines a newly-paid booking; customer is refunded.
router.post("/:id/decline", requireAuth, async (req, res) => {
  const { reason } = req.body;
  try {
    const { rows: bookingRows } = await db.query("SELECT * FROM bookings WHERE id = $1", [req.params.id]);
    const booking = bookingRows[0];
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [booking.salon_id]);
    const salon = salonRows[0];
    const isOwner = salon && salon.owner_id === req.user.id;
    if (!isOwner) return res.status(403).json({ error: "Not your booking" });

    if (booking.status !== "confirmed" || booking.owner_response !== "pending") {
      return res.status(400).json({ error: "This booking isn't awaiting a response." });
    }

    await db.query(
      "UPDATE bookings SET status = 'cancelled', owner_response = 'declined', cancelled_by = 'owner', cancel_reason = $1 WHERE id = $2",
      [reason || "Declined by owner", booking.id]
    );

    const { refundNote } = await refundBooking(booking);

    const { rows: serviceRows } = await db.query("SELECT name FROM services WHERE id = $1", [booking.service_id]);
    const serviceName = serviceRows[0]?.name || "your service";
    await notifyUser(booking.customer_id, {
      type: "booking_declined",
      title: "Booking declined",
      body: `${salon?.name || "The salon"} wasn't able to accept your booking for ${serviceName} at ${booking.time_slot}.${refundNote}`,
      bookingId: booking.id,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't decline that booking." });
  }
});


// POST /bookings/:id/request-completion — owner says the service is done.
// Optionally attaches a photo, generates a 4-digit code, and sends it to the
// customer. The booking only becomes 'completed' once the owner enters that
// code back via /confirm-completion, or 24 hours pass with no dispute filed.
router.post("/:id/request-completion", requireAuth, uploadLimiter, upload.single("photo"), async (req, res) => {
  try {
    const { rows: bookingRows } = await db.query("SELECT * FROM bookings WHERE id = $1", [req.params.id]);
    const booking = bookingRows[0];
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [booking.salon_id]);
    const salon = salonRows[0];
    const isOwner = salon && salon.owner_id === req.user.id;
    if (!isOwner) return res.status(403).json({ error: "Not your booking" });

    if (booking.status !== "confirmed") {
      return res.status(400).json({ error: "Only confirmed bookings can be marked as done." });
    }
    if (booking.owner_response === "pending") {
      return res.status(400).json({ error: "Accept this booking before marking it done." });
    }
    if (booking.disputed_at) {
      return res.status(400).json({ error: "This booking is under dispute review." });
    }

    const appointmentTime = parseAppointmentDateTime(booking);
    if (Date.now() < appointmentTime.getTime()) {
      return res.status(400).json({ error: "This appointment hasn't happened yet." });
    }

    let photoUrl = booking.completion_photo_url;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      photoUrl = result.secure_url;
    }

    const otp = String(Math.floor(1000 + Math.random() * 9000));
    await db.query(
      `UPDATE bookings SET
         completion_otp = $1,
         completion_otp_expires_at = NOW() + INTERVAL '2 hours',
         completion_requested_at = COALESCE(completion_requested_at, NOW()),
         completion_photo_url = $2
       WHERE id = $3`,
      [otp, photoUrl, booking.id]
    );

    await notifyUser(booking.customer_id, {
      type: "completion_requested",
      title: "Confirm your appointment",
      body: `${salon?.name || "The salon"} says your service is done. Give them this code to confirm: ${otp}. If something's wrong, you can dispute it instead from My Bookings.`,
      bookingId: booking.id,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't request completion." });
  }
});

// POST /bookings/:id/confirm-completion — owner enters the code the customer gave them.
router.post("/:id/confirm-completion", requireAuth, async (req, res) => {
  const { otp } = req.body;
  try {
    const { rows: bookingRows } = await db.query("SELECT * FROM bookings WHERE id = $1", [req.params.id]);
    const booking = bookingRows[0];
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [booking.salon_id]);
    const salon = salonRows[0];
    const isOwner = salon && salon.owner_id === req.user.id;
    if (!isOwner) return res.status(403).json({ error: "Not your booking" });

    if (booking.status !== "confirmed" || !booking.completion_requested_at) {
      return res.status(400).json({ error: "Request completion first before confirming." });
    }
    if (booking.disputed_at) {
      return res.status(400).json({ error: "This booking is under dispute review." });
    }
    if (!otp || String(otp).trim() !== booking.completion_otp) {
      return res.status(400).json({ error: "That code doesn't match. Double check with your client." });
    }
    if (new Date(booking.completion_otp_expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: "That code has expired — tap 'request completion' again to get a new one." });
    }

    await db.query("UPDATE bookings SET completion_otp = NULL WHERE id = $1", [booking.id]);
    await completeBooking(booking, salon);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't confirm completion." });
  }
});

// POST /bookings/:id/dispute — customer says the owner's completion claim is wrong.
router.post("/:id/dispute", requireAuth, async (req, res) => {
  const { reason } = req.body;
  try {
    const { rows: bookingRows } = await db.query("SELECT * FROM bookings WHERE id = $1", [req.params.id]);
    const booking = bookingRows[0];
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.customer_id !== req.user.id) return res.status(403).json({ error: "Not your booking" });

    if (!booking.completion_requested_at || booking.status !== "confirmed") {
      return res.status(400).json({ error: "There's nothing to dispute on this booking yet." });
    }
    if (booking.disputed_at) {
      return res.status(400).json({ error: "This booking is already under review." });
    }

    await db.query("UPDATE bookings SET disputed_at = NOW(), dispute_reason = $1 WHERE id = $2", [reason || null, booking.id]);

    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [booking.salon_id]);
    const salon = salonRows[0];

    if (salon) {
      await notifyUser(salon.owner_id, {
        type: "booking_disputed",
        title: "Booking disputed",
        body: `A client disputed booking #${booking.id}. The Hub team will review it — please don't request completion again until it's resolved.`,
        bookingId: booking.id,
      });
    }

    if (process.env.ADMIN_EMAIL) {
      await sendNotificationEmail(
        process.env.ADMIN_EMAIL,
        `Dispute filed — booking #${booking.id}`,
        `A customer disputed booking #${booking.id} at ${salon?.name || "a salon"}.<br>
         Reason: ${reason || "No reason given"}<br>
         Completion photo: ${booking.completion_photo_url ? `<a href="${booking.completion_photo_url}">view</a>` : "none provided"}<br>
         Customer ID: ${booking.customer_id} &middot; Owner ID: ${salon?.owner_id || "unknown"}`
      ).catch((e) => console.error("Failed to email admin about dispute:", e));
    } else {
      console.warn(`ADMIN_EMAIL not set — dispute email not sent for booking #${booking.id}`);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't file that dispute." });
  }
});

// GET /bookings/salon/:salonId/daily-code — owner views (or generates) today's
// check-in code for their salon. Same code all day, changes at midnight, so the
// owner can never "run out" of chances to give it to a customer who's present.
router.get("/salon/:salonId/daily-code", requireAuth, async (req, res) => {
  try {
    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [req.params.salonId]);
    const salon = salonRows[0];
    if (!salon) return res.status(404).json({ error: "Salon not found" });
    if (salon.owner_id !== req.user.id) return res.status(403).json({ error: "Not your salon" });

    const { rows: existing } = await db.query(
      "SELECT code FROM salon_daily_codes WHERE salon_id = $1 AND code_date = CURRENT_DATE",
      [salon.id]
    );
    if (existing[0]) return res.json({ code: existing[0].code });

    const code = String(Math.floor(1000 + Math.random() * 9000));
    await db.query(
      "INSERT INTO salon_daily_codes (salon_id, code, code_date) VALUES ($1, $2, CURRENT_DATE)",
      [salon.id, code]
    );
    res.json({ code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't get today's code." });
  }
});

// POST /bookings/:id/check-in — customer enters the code the owner showed them in
// person. Verifies it matches today's code for that salon, marks this booking
// checked in, and moves the customer's per-salon loyalty count (5th visit = 50% off,
// funded by the owner, then resets to 0). Loyalty count is ONLY ever touched here —
// never by referrals or anything else — so it always matches real verified visits.
router.post("/:id/check-in", requireAuth, async (req, res) => {
  const { code } = req.body;
  try {
    const { rows: bookingRows } = await db.query("SELECT * FROM bookings WHERE id = $1", [req.params.id]);
    const booking = bookingRows[0];
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.customer_id !== req.user.id) return res.status(403).json({ error: "Not your booking" });
    if (booking.status !== "confirmed") return res.status(400).json({ error: "This booking isn't confirmed yet." });
    if (booking.checked_in_at) return res.status(400).json({ error: "This booking is already checked in." });

    const { rows: codeRows } = await db.query(
      "SELECT code FROM salon_daily_codes WHERE salon_id = $1 AND code_date = CURRENT_DATE",
      [booking.salon_id]
    );
    const todaysCode = codeRows[0]?.code;
    if (!todaysCode || !code || String(code).trim() !== todaysCode) {
      return res.status(400).json({ error: "That code doesn't match today's code. Double check with the salon." });
    }

    let isRewardVisit = false;
    await db.query("UPDATE bookings SET checked_in_at = NOW() WHERE id = $1", [booking.id]);

    const { rows: loyaltyRows } = await db.query(
      `INSERT INTO salon_loyalty (customer_id, salon_id, visit_count)
       VALUES ($1, $2, 1)
       ON CONFLICT (customer_id, salon_id)
       DO UPDATE SET visit_count = salon_loyalty.visit_count + 1, updated_at = NOW()
       RETURNING visit_count`,
      [booking.customer_id, booking.salon_id]
    );
    const visitCount = loyaltyRows[0].visit_count;

    if (visitCount >= 5) {
      isRewardVisit = true;
      await db.query("UPDATE bookings SET is_loyalty_reward = true WHERE id = $1", [booking.id]);
      await db.query(
        "UPDATE salon_loyalty SET visit_count = 0, updated_at = NOW() WHERE customer_id = $1 AND salon_id = $2",
        [booking.customer_id, booking.salon_id]
      );
    }

    res.json({ ok: true, visitCount: isRewardVisit ? 0 : visitCount, isRewardVisit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't check in that code." });
  }
});

// POST /bookings/:id/location - share your current position once (customer or owner side
// of the booking). Expires after 1 hour - not continuous tracking, a fresh explicit share.
router.post("/:id/location", requireAuth, async (req, res) => {
  const { lat, lng } = req.body;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ error: "lat and lng are required" });
  }
  try {
    const { rows: bookingRows } = await db.query("SELECT * FROM bookings WHERE id = $1", [req.params.id]);
    const booking = bookingRows[0];
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [booking.salon_id]);
    const salon = salonRows[0];
    const isCustomer = booking.customer_id === req.user.id;
    const isOwner = salon && salon.owner_id === req.user.id;
    if (!isCustomer && !isOwner) return res.status(403).json({ error: "Not your booking" });

    const existing = await db.query(
      "SELECT id FROM location_shares WHERE booking_id = $1 AND shared_by = $2",
      [booking.id, req.user.id]
    );
    const isFirstShare = existing.rows.length === 0;
    if (!isFirstShare) {
      await db.query(
        "UPDATE location_shares SET lat = $1, lng = $2, expires_at = NOW() + INTERVAL '1 hour', updated_at = NOW() WHERE id = $3",
        [lat, lng, existing.rows[0].id]
      );
    } else {
      await db.query(
        "INSERT INTO location_shares (booking_id, shared_by, lat, lng, expires_at) VALUES ($1, $2, $3, $4, NOW() + INTERVAL '1 hour')",
        [booking.id, req.user.id, lat, lng]
      );
    }

    // Only notify on the first share, not every refresh - otherwise updating your pin
    // a few times would spam the other person with notifications.
    if (isFirstShare) {
      const otherUserId = isCustomer ? salon?.owner_id : booking.customer_id;
      if (otherUserId) {
        await notifyUser(otherUserId, {
          type: "location_shared",
          title: "Live location shared",
          body: `${isCustomer ? "The client" : "The salon"} shared their live location for booking #${booking.id}.`,
          bookingId: booking.id,
        });
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't share your location." });
  }
});

// GET /bookings/:id/location - any active (non-expired) shares for this booking
router.get("/:id/location", requireAuth, async (req, res) => {
  try {
    const { rows: bookingRows } = await db.query("SELECT * FROM bookings WHERE id = $1", [req.params.id]);
    const booking = bookingRows[0];
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [booking.salon_id]);
    const salon = salonRows[0];
    const isCustomer = booking.customer_id === req.user.id;
    const isOwner = salon && salon.owner_id === req.user.id;
    if (!isCustomer && !isOwner) return res.status(403).json({ error: "Not your booking" });

    const { rows } = await db.query(
      "SELECT shared_by, lat, lng, updated_at, expires_at FROM location_shares WHERE booking_id = $1 AND expires_at > NOW()",
      [booking.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load shared locations." });
  }
});

// DELETE /bookings/:id/location - stop sharing your own location for this booking
router.delete("/:id/location", requireAuth, async (req, res) => {
  try {
    await db.query("DELETE FROM location_shares WHERE booking_id = $1 AND shared_by = $2", [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't stop sharing." });
  }
});

module.exports = router;
