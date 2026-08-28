schema_path = "backend/db/schema.sql"
with open(schema_path, "r") as f:
    schema = f.read()

new_sql = '''

-- Owner-referral growth reward: when an owner you referred gets their salon's
-- first-ever completed booking, you get free featured placement in search —
-- costs the app nothing, unlike a cash/points reward. Capped in code so
-- referring 20 owners doesn't bank up 20x the reward.
ALTER TABLE salons ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP;

CREATE TABLE IF NOT EXISTS owner_referral_boosts (
  id SERIAL PRIMARY KEY,
  referring_owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weeks_granted INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (referred_owner_id)
);
CREATE INDEX IF NOT EXISTS idx_owner_referral_boosts_referring ON owner_referral_boosts(referring_owner_id);
'''

if "Owner-referral growth reward" not in schema:
    schema = schema.rstrip("\n") + "\n" + new_sql
    with open(schema_path, "w") as f:
        f.write(schema)
    print("✅ schema.sql updated with featured_until + owner_referral_boosts")
else:
    print("⏭️  schema.sql already updated — skipped")

cb_path = "backend/lib/completeBooking.js"
with open(cb_path, "r") as f:
    cb = f.read()

old_end = '''  await notifyUser(booking.customer_id, {
    type: "booking_completed",
    title: auto ? "Booking auto-confirmed" : "Service completed",
    body: auto
      ? `Your ${serviceName} appointment${salon ? ` at ${salon.name}` : ""} was automatically confirmed after 24 hours with no response. Tap to leave a review!`
      : `Your ${serviceName} appointment${salon ? ` at ${salon.name}` : ""} is marked complete. Tap to leave a review!`,
    bookingId: booking.id,
  });
}

module.exports = { completeBooking };'''

new_end = '''  await notifyUser(booking.customer_id, {
    type: "booking_completed",
    title: auto ? "Booking auto-confirmed" : "Service completed",
    body: auto
      ? `Your ${serviceName} appointment${salon ? ` at ${salon.name}` : ""} was automatically confirmed after 24 hours with no response. Tap to leave a review!`
      : `Your ${serviceName} appointment${salon ? ` at ${salon.name}` : ""} is marked complete. Tap to leave a review!`,
    bookingId: booking.id,
  });

  // Owner-referral boost: fires once, only when the referred owner's salon gets
  // its first-ever completed booking (real activity, not just a signup). The
  // referring owner earns free featured placement instead of cash/points —
  // capped at MAX_BOOST_WEEKS total, ever, no matter how many owners they refer.
  try {
    if (salon) {
      const MAX_BOOST_WEEKS = 6;
      const WEEKS_PER_REFERRAL = 2;

      const { rows: ownerRows } = await db.query("SELECT referred_by FROM users WHERE id = $1", [salon.owner_id]);
      const referringOwnerId = ownerRows[0]?.referred_by;

      if (referringOwnerId) {
        const { rows: alreadyBoosted } = await db.query(
          "SELECT 1 FROM owner_referral_boosts WHERE referred_owner_id = $1",
          [salon.owner_id]
        );
        if (!alreadyBoosted[0]) {
          const { rows: salonCountRows } = await db.query(
            "SELECT COUNT(*) AS count FROM bookings WHERE salon_id = $1 AND status = 'completed'",
            [salon.id]
          );
          if (Number(salonCountRows[0].count) === 1) {
            const { rows: soFarRows } = await db.query(
              "SELECT COALESCE(SUM(weeks_granted), 0) AS total FROM owner_referral_boosts WHERE referring_owner_id = $1",
              [referringOwnerId]
            );
            const weeksSoFar = Number(soFarRows[0].total);
            const weeksToGrant = Math.max(0, Math.min(WEEKS_PER_REFERRAL, MAX_BOOST_WEEKS - weeksSoFar));

            if (weeksToGrant > 0) {
              await db.query(
                "INSERT INTO owner_referral_boosts (referring_owner_id, referred_owner_id, weeks_granted) VALUES ($1, $2, $3)",
                [referringOwnerId, salon.owner_id, weeksToGrant]
              );
              await db.query(
                `UPDATE salons SET featured_until = GREATEST(COALESCE(featured_until, NOW()), NOW()) + ($1 || ' weeks')::INTERVAL
                 WHERE owner_id = $2`,
                [weeksToGrant, referringOwnerId]
              );
              await notifyUser(referringOwnerId, {
                type: "referral_boost",
                title: "Referral bonus! 🎉",
                body: `An owner you referred just got their first booking — your salon gets ${weeksToGrant} week(s) of featured placement.`,
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error(`Owner referral boost failed for booking #${booking.id}:`, err);
  }
}

module.exports = { completeBooking };'''

if old_end in cb:
    assert cb.count(old_end) == 1, "completeBooking.js anchor not unique or not found"
    cb = cb.replace(old_end, new_end)
    with open(cb_path, "w") as f:
        f.write(cb)
    print("✅ completeBooking.js — owner referral boost logic added")
else:
    print("⏭️  completeBooking.js already has referral boost logic — skipped")

salons_path = "backend/routes/salons.js"
with open(salons_path, "r") as f:
    salons_src = f.read()

old_sql_line = '    let sql = "SELECT * FROM salons WHERE 1=1";'
new_sql_line = '    let sql = "SELECT * FROM salons WHERE 1=1";\n    // Featured (via owner referral boost) salons surface first in the default\n    // listing; distance-based sort (when lat/lng given) overrides this in JS below.\n    const FEATURED_ORDER_SUFFIX = " ORDER BY (featured_until IS NOT NULL AND featured_until > NOW()) DESC, created_at DESC";'

old_query_call = '    const { rows: salons } = await db.query(sql, params);'
new_query_call = '    const { rows: salons } = await db.query(sql + FEATURED_ORDER_SUFFIX, params);'

changes = 0
if old_sql_line in salons_src and "FEATURED_ORDER_SUFFIX" not in salons_src:
    assert salons_src.count(old_sql_line) == 1
    salons_src = salons_src.replace(old_sql_line, new_sql_line)
    changes += 1

if old_query_call in salons_src:
    assert salons_src.count(old_query_call) == 1
    salons_src = salons_src.replace(old_query_call, new_query_call)
    changes += 1

if changes:
    with open(salons_path, "w") as f:
        f.write(salons_src)
    print(f"✅ salons.js — {changes} change(s) applied, featured salons now sort first")
else:
    print("⏭️  salons.js already updated — skipped")
