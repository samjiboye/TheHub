schema_path = "backend/db/schema.sql"
with open(schema_path, "r") as f:
    schema = f.read()

new_sql = '''

-- Salon check-in code now rotates every hour instead of once a day — closes
-- a gap where a customer could share/reuse the same code with someone else
-- (or a second account) later in the same day to fake an extra visit.
ALTER TABLE salon_daily_codes ADD COLUMN IF NOT EXISTS code_hour INTEGER NOT NULL DEFAULT 0;
ALTER TABLE salon_daily_codes DROP CONSTRAINT IF EXISTS salon_daily_codes_salon_id_code_date_key;
ALTER TABLE salon_daily_codes DROP CONSTRAINT IF EXISTS salon_daily_codes_salon_id_code_date_code_hour_key;
ALTER TABLE salon_daily_codes ADD CONSTRAINT salon_daily_codes_salon_id_code_date_code_hour_key UNIQUE (salon_id, code_date, code_hour);
'''

if "code rotates every hour" not in schema:
    schema = schema.rstrip("\n") + "\n" + new_sql
    with open(schema_path, "w") as f:
        f.write(schema)
    print("✅ schema.sql updated for hourly code")
else:
    print("⏭️  schema.sql already updated — skipped")

bookings_path = "backend/routes/bookings.js"
with open(bookings_path, "r") as f:
    bookings = f.read()

changes = 0

old_get_comment = '''// GET /bookings/salon/:salonId/daily-code — owner views (or generates) today's
// check-in code for their salon. Same code all day, changes at midnight, so the
// owner can never "run out" of chances to give it to a customer who's present.'''
new_get_comment = '''// GET /bookings/salon/:salonId/daily-code — owner views (or generates) this hour's
// check-in code for their salon. Rotates every hour (not once a day) so a customer
// can't share the same code with someone else, or a second account, later that day.'''

if old_get_comment in bookings:
    assert bookings.count(old_get_comment) == 1
    bookings = bookings.replace(old_get_comment, new_get_comment)
    changes += 1

old_get_query = '''    const { rows: existing } = await db.query(
      "SELECT code FROM salon_daily_codes WHERE salon_id = $1 AND code_date = CURRENT_DATE",
      [salon.id]
    );
    if (existing[0]) return res.json({ code: existing[0].code });

    const code = String(Math.floor(1000 + Math.random() * 9000));
    await db.query(
      "INSERT INTO salon_daily_codes (salon_id, code, code_date) VALUES ($1, $2, CURRENT_DATE)",
      [salon.id, code]
    );
    res.json({ code });'''
new_get_query = '''    const { rows: existing } = await db.query(
      "SELECT code FROM salon_daily_codes WHERE salon_id = $1 AND code_date = CURRENT_DATE AND code_hour = EXTRACT(HOUR FROM NOW())",
      [salon.id]
    );
    if (existing[0]) return res.json({ code: existing[0].code });

    const code = String(Math.floor(1000 + Math.random() * 9000));
    await db.query(
      "INSERT INTO salon_daily_codes (salon_id, code, code_date, code_hour) VALUES ($1, $2, CURRENT_DATE, EXTRACT(HOUR FROM NOW()))",
      [salon.id, code]
    );
    res.json({ code });'''

if old_get_query in bookings:
    assert bookings.count(old_get_query) == 1
    bookings = bookings.replace(old_get_query, new_get_query)
    changes += 1

old_checkin_comment = '''// POST /bookings/:id/check-in — customer enters the code the owner showed them in
// person. Verifies it matches today's code for that salon, marks this booking
// checked in, and moves the customer's per-salon loyalty count (5th visit = 50% off,
// funded by the owner, then resets to 0). Loyalty count is ONLY ever touched here —
// never by referrals or anything else — so it always matches real verified visits.'''
new_checkin_comment = '''// POST /bookings/:id/check-in — customer enters the code the owner showed them in
// person. Verifies it matches the CURRENT HOUR's code for that salon (codes rotate
// hourly), marks this booking checked in, and moves the customer's per-salon loyalty
// count (5th visit = 50% off, funded by the owner, then resets to 0). Loyalty count
// is ONLY ever touched here — never by referrals or anything else — so it always
// matches real verified visits.'''

if old_checkin_comment in bookings:
    assert bookings.count(old_checkin_comment) == 1
    bookings = bookings.replace(old_checkin_comment, new_checkin_comment)
    changes += 1

old_checkin_query = '''    const { rows: codeRows } = await db.query(
      "SELECT code FROM salon_daily_codes WHERE salon_id = $1 AND code_date = CURRENT_DATE",
      [booking.salon_id]
    );
    const todaysCode = codeRows[0]?.code;
    if (!todaysCode || !code || String(code).trim() !== todaysCode) {
      return res.status(400).json({ error: "That code doesn't match today's code. Double check with the salon." });
    }'''
new_checkin_query = '''    const { rows: codeRows } = await db.query(
      "SELECT code FROM salon_daily_codes WHERE salon_id = $1 AND code_date = CURRENT_DATE AND code_hour = EXTRACT(HOUR FROM NOW())",
      [booking.salon_id]
    );
    const currentCode = codeRows[0]?.code;
    if (!currentCode || !code || String(code).trim() !== currentCode) {
      return res.status(400).json({ error: "That code doesn't match — codes change every hour, double check with the salon." });
    }'''

if old_checkin_query in bookings:
    assert bookings.count(old_checkin_query) == 1
    bookings = bookings.replace(old_checkin_query, new_checkin_query)
    changes += 1

with open(bookings_path, "w") as f:
    f.write(bookings)

print(f"✅ bookings.js updated — {changes} change(s) applied")
