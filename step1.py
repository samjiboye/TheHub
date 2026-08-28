import re

# ---- 1. Schema: new tables for daily codes + per-salon loyalty ----
schema_path = "backend/db/schema.sql"
with open(schema_path, "r") as f:
    schema = f.read()

new_schema_sql = '''

-- Daily salon check-in codes: one active code per salon per calendar day.
-- Owner shows this to the customer in person; customer types it in to
-- confirm they actually received the service that day.
CREATE TABLE IF NOT EXISTS salon_daily_codes (
  id SERIAL PRIMARY KEY,
  salon_id INTEGER NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  code_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (salon_id, code_date)
);
CREATE INDEX IF NOT EXISTS idx_salon_daily_codes_salon_date ON salon_daily_codes(salon_id, code_date);

-- Per-salon loyalty: counts real, code-verified visits at THIS salon only.
-- Resets to 0 after every 5th visit, which is 50% off (owner-funded, not the app).
CREATE TABLE IF NOT EXISTS salon_loyalty (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  salon_id INTEGER NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  visit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (customer_id, salon_id)
);
CREATE INDEX IF NOT EXISTS idx_salon_loyalty_customer_salon ON salon_loyalty(customer_id, salon_id);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_loyalty_reward BOOLEAN NOT NULL DEFAULT false;
'''

if "salon_daily_codes" not in schema:
    schema = schema.rstrip("\n") + "\n" + new_schema_sql
    with open(schema_path, "w") as f:
        f.write(schema)
    print("✅ schema.sql updated")
else:
    print("⏭️  schema.sql already has salon_daily_codes — skipped")

# ---- 2. bookings.js: add check-in-code endpoints ----
bookings_path = "backend/routes/bookings.js"
with open(bookings_path, "r") as f:
    bookings = f.read()

anchor = '''// POST /bookings/:id/location - share your current position once (customer or owner side
// of the booking). Expires after 1 hour - not continuous tracking, a fresh explicit share.'''

new_routes = '''// GET /bookings/salon/:salonId/daily-code — owner views (or generates) today's
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

''' + anchor

if "daily-code" not in bookings:
    bookings = bookings.replace(anchor, new_routes)
    with open(bookings_path, "w") as f:
        f.write(bookings)
    print("✅ bookings.js updated with daily-code + check-in routes")
else:
    print("⏭️  bookings.js already has daily-code routes — skipped")

print("\nDone. Next: run the schema against your database, then restart your backend.")
