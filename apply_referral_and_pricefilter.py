#!/usr/bin/env python3
import os, sys

def edit(path, replacements, label):
    if not os.path.exists(path):
        print(f"FAILED: {label} - file not found: {path}")
        sys.exit(1)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    for old, new in replacements:
        count = content.count(old)
        if count != 1:
            print(f"FAILED: {label} - anchor not found exactly once (found {count}) in {path}")
            print("----- anchor -----")
            print(old[:300])
            print("------------------")
            sys.exit(1)
        content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"OK: {label}")


schema_path = "backend/db/schema.sql"
with open(schema_path, "r", encoding="utf-8") as f:
    schema_content = f.read()
marker = "-- Referral program: shareable code per user, who referred them, and"
if marker in schema_content:
    print("OK: schema.sql - referral migration already present, skipping")
else:
    schema_content += (
        "\n\n" + marker + "\n"
        "-- a guard so the bonus can only ever be awarded once per referred user.\n"
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;\n"
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by INTEGER REFERENCES users(id);\n"
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_bonus_awarded BOOLEAN NOT NULL DEFAULT false;\n"
        "UPDATE users SET referral_code = 'HUB' || LPAD(id::text, 5, '0') WHERE referral_code IS NULL;\n"
    )
    with open(schema_path, "w", encoding="utf-8") as f:
        f.write(schema_content)
    print("OK: schema.sql - referral migration appended")

loyalty_path = "backend/lib/loyalty.js"
if os.path.exists(loyalty_path):
    print("OK: loyalty.js already exists, skipping")
else:
    with open(loyalty_path, "w", encoding="utf-8") as f:
        f.write(
'''const db = require("../db");
const { creditWallet } = require("./wallet");
const { notifyUser } = require("./notify");

const LOYALTY_GOAL = 150; // points needed for a reward (\u2248\u20a615,000 spent, ~5 bookings at \u20a63,000)
const LOYALTY_REWARD = 500; // \u20a6 credited to the customer's wallet

// Adds points to a user's running loyalty balance and, if the goal is hit,
// credits the reward to their wallet and rolls any leftover points into the
// next cycle. Shared by booking completions and referral bonuses so the
// reward-trigger logic only ever lives in one place.
async function addLoyaltyPoints(userId, points, { bookingId = null } = {}) {
  if (!points || points <= 0) return;
  const { rows } = await db.query(
    "UPDATE users SET loyalty_bookings_since_reward = loyalty_bookings_since_reward + $2 WHERE id = $1 RETURNING loyalty_bookings_since_reward",
    [userId, points]
  );
  const total = rows[0]?.loyalty_bookings_since_reward || 0;
  if (total >= LOYALTY_GOAL) {
    await db.query(
      "UPDATE users SET loyalty_bookings_since_reward = loyalty_bookings_since_reward - $2 WHERE id = $1",
      [userId, LOYALTY_GOAL]
    );
    await creditWallet(userId, LOYALTY_REWARD, { type: "reward", bookingId });
    await notifyUser(userId, {
      type: "loyalty_reward",
      title: "Reward unlocked! \\ud83c\\udf89",
      body: `You've earned ${LOYALTY_GOAL} loyalty points through TheHub \\u2014 \\u20a6${Number(LOYALTY_REWARD).toLocaleString()} has been added to your wallet.`,
      bookingId,
    });
  }
}

module.exports = { addLoyaltyPoints, LOYALTY_GOAL, LOYALTY_REWARD };
'''
        )
    print("OK: created backend/lib/loyalty.js")

edit(
    "backend/lib/completeBooking.js",
    [
        (
            'const { creditWallet } = require("./wallet");\n\n'
            'const POINTS_PER_NAIRA = 0.01; // 1 point per \u20a6100 spent\n'
            'const LOYALTY_GOAL = 150; // points needed for a reward (\u2248\u20a615,000 spent, ~5 bookings at \u20a63,000)\n'
            'const LOYALTY_REWARD = 500; // \u20a6 credited to the customer\'s wallet',
            'const { creditWallet } = require("./wallet");\n'
            'const { addLoyaltyPoints } = require("./loyalty");\n\n'
            'const POINTS_PER_NAIRA = 0.01; // 1 point per \u20a6100 spent\n'
            '// Referral bonus: sized against a typical \u20a63,000 booking earning \u20a6450 at\n'
            '// 15% commission, so paying both sides out still leaves margin on booking #1\n'
            '// alone, even if the referred customer never books again.\n'
            'const REFERRAL_REFERRER_POINTS = 60; // \u2248\u20a6200\n'
            'const REFERRAL_REFERRED_POINTS = 30; // \u2248\u20a6100',
        ),
        (
            '  // Loyalty: earn points proportional to what was actually spent (1 point per\n'
            '  // \u20a6100), so a bigger booking earns more than a smaller one. Leftover points\n'
            '  // past the goal roll over into the next reward instead of being wiped.\n'
            '  try {\n'
            '    const pointsEarned = Math.floor(booking.service_price * POINTS_PER_NAIRA);\n'
            '    const { rows: userRows } = await db.query(\n'
            '      "UPDATE users SET loyalty_bookings_since_reward = loyalty_bookings_since_reward + $2 WHERE id = $1 RETURNING loyalty_bookings_since_reward",\n'
            '      [booking.customer_id, pointsEarned]\n'
            '    );\n'
            '    const points = userRows[0]?.loyalty_bookings_since_reward || 0;\n'
            '    if (points >= LOYALTY_GOAL) {\n'
            '      await db.query(\n'
            '        "UPDATE users SET loyalty_bookings_since_reward = loyalty_bookings_since_reward - $2 WHERE id = $1",\n'
            '        [booking.customer_id, LOYALTY_GOAL]\n'
            '      );\n'
            '      await creditWallet(booking.customer_id, LOYALTY_REWARD, { type: "reward", bookingId: booking.id });\n'
            '      await notifyUser(booking.customer_id, {\n'
            '        type: "loyalty_reward",\n'
            '        title: "Reward unlocked! \U0001f389",\n'
            '        body: `You\'ve earned ${LOYALTY_GOAL} loyalty points through TheHub \u2014 \u20a6${LOYALTY_REWARD.toLocaleString()} has been added to your wallet.`,\n'
            '        bookingId: booking.id,\n'
            '      });\n'
            '    }\n'
            '  } catch (err) {\n'
            '    console.error(`Loyalty reward tracking failed for booking #${booking.id}:`, err);\n'
            '  }\n'
            '}',
            '  // Loyalty: earn points proportional to what was actually spent (1 point per\n'
            '  // \u20a6100), so a bigger booking earns more than a smaller one.\n'
            '  try {\n'
            '    const pointsEarned = Math.floor(booking.service_price * POINTS_PER_NAIRA);\n'
            '    await addLoyaltyPoints(booking.customer_id, pointsEarned, { bookingId: booking.id });\n'
            '  } catch (err) {\n'
            '    console.error(`Loyalty reward tracking failed for booking #${booking.id}:`, err);\n'
            '  }\n\n'
            '  // Referral bonus: fires once, only when the referred customer completes their\n'
            '  // very first paid booking (not on signup) - ties the reward to real revenue\n'
            '  // instead of free signups, and referral_bonus_awarded guards against it ever\n'
            '  // firing twice for the same person.\n'
            '  try {\n'
            '    const { rows: customerRows } = await db.query(\n'
            '      "SELECT referred_by, referral_bonus_awarded FROM users WHERE id = $1",\n'
            '      [booking.customer_id]\n'
            '    );\n'
            '    const customerRow = customerRows[0];\n'
            '    if (customerRow?.referred_by && !customerRow.referral_bonus_awarded) {\n'
            '      const { rows: countRows } = await db.query(\n'
            '        "SELECT COUNT(*) AS count FROM bookings WHERE customer_id = $1 AND status = \'completed\'",\n'
            '        [booking.customer_id]\n'
            '      );\n'
            '      if (Number(countRows[0].count) === 1) {\n'
            '        await db.query("UPDATE users SET referral_bonus_awarded = true WHERE id = $1", [booking.customer_id]);\n'
            '        await addLoyaltyPoints(booking.customer_id, REFERRAL_REFERRED_POINTS, { bookingId: booking.id });\n'
            '        await addLoyaltyPoints(customerRow.referred_by, REFERRAL_REFERRER_POINTS, { bookingId: booking.id });\n'
            '        await notifyUser(booking.customer_id, {\n'
            '          type: "referral_bonus",\n'
            '          title: "Referral bonus! \U0001f381",\n'
            '          body: `You earned ${REFERRAL_REFERRED_POINTS} loyalty points for completing your first booking through a referral.`,\n'
            '          bookingId: booking.id,\n'
            '        });\n'
            '        await notifyUser(customerRow.referred_by, {\n'
            '          type: "referral_bonus",\n'
            '          title: "Your referral just booked! \U0001f389",\n'
            '          body: `Someone you referred completed their first booking \u2014 you earned ${REFERRAL_REFERRER_POINTS} loyalty points.`,\n'
            '          bookingId: booking.id,\n'
            '        });\n'
            '      }\n'
            '    }\n'
            '  } catch (err) {\n'
            '    console.error(`Referral bonus tracking failed for booking #${booking.id}:`, err);\n'
            '  }\n'
            '}',
        ),
    ],
    "completeBooking.js: shared loyalty helper + referral bonus",
)

edit(
    "backend/routes/auth.js",
    [
        (
            'router.post("/signup", async (req, res) => {\n'
            '  const { name, email, phone, password, role } = req.body;\n'
            '  if (!name || !email || !password) {\n'
            '    return res.status(400).json({ error: "name, email, and password are required" });\n'
            '  }\n'
            '  try {\n'
            '    const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);\n'
            '    if (existing.rows.length > 0) {\n'
            '      return res.status(409).json({ error: "An account with that email already exists" });\n'
            '    }\n'
            '    const password_hash = bcrypt.hashSync(password, 10);\n'
            '    const result = await db.query(\n'
            '      "INSERT INTO users (name, email, phone, role, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id",\n'
            '      [name, email, phone || null, role === "owner" ? "owner" : "customer", password_hash]\n'
            '    );\n'
            '    const user = { id: result.rows[0].id, name, email, role: role === "owner" ? "owner" : "customer", isAdmin: false };\n'
            '    const token = jwt.sign(user, JWT_SECRET, { expiresIn: "30d" });\n'
            '    res.status(201).json({ user, token });\n'
            '  } catch (err) {\n'
            '    console.error(err);\n'
            '    res.status(500).json({ error: "Couldn\'t create that account." });\n'
            '  }\n'
            '});',
            'router.post("/signup", async (req, res) => {\n'
            '  const { name, email, phone, password, role, referralCode } = req.body;\n'
            '  if (!name || !email || !password) {\n'
            '    return res.status(400).json({ error: "name, email, and password are required" });\n'
            '  }\n'
            '  try {\n'
            '    const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);\n'
            '    if (existing.rows.length > 0) {\n'
            '      return res.status(409).json({ error: "An account with that email already exists" });\n'
            '    }\n'
            '    const password_hash = bcrypt.hashSync(password, 10);\n'
            '    const result = await db.query(\n'
            '      "INSERT INTO users (name, email, phone, role, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id",\n'
            '      [name, email, phone || null, role === "owner" ? "owner" : "customer", password_hash]\n'
            '    );\n'
            '    const newUserId = result.rows[0].id;\n\n'
            '    // Every user gets their own shareable code. If they entered someone else\'s\n'
            '    // code at signup, we remember who referred them - but no points are awarded\n'
            '    // yet, that only happens once this new user completes their first booking.\n'
            '    let referredBy = null;\n'
            '    if (referralCode) {\n'
            '      const { rows: referrerRows } = await db.query(\n'
            '        "SELECT id FROM users WHERE referral_code = $1",\n'
            '        [String(referralCode).trim().toUpperCase()]\n'
            '      );\n'
            '      if (referrerRows[0] && referrerRows[0].id !== newUserId) {\n'
            '        referredBy = referrerRows[0].id;\n'
            '      }\n'
            '    }\n'
            '    const ownReferralCode = `HUB${String(newUserId).padStart(5, "0")}`;\n'
            '    await db.query(\n'
            '      "UPDATE users SET referral_code = $1, referred_by = $2 WHERE id = $3",\n'
            '      [ownReferralCode, referredBy, newUserId]\n'
            '    );\n\n'
            '    const user = { id: newUserId, name, email, role: role === "owner" ? "owner" : "customer", isAdmin: false };\n'
            '    const token = jwt.sign(user, JWT_SECRET, { expiresIn: "30d" });\n'
            '    res.status(201).json({ user, token });\n'
            '  } catch (err) {\n'
            '    console.error(err);\n'
            '    res.status(500).json({ error: "Couldn\'t create that account." });\n'
            '  }\n'
            '});',
        ),
        (
            '      const insertResult = await db.query(\n'
            '        "INSERT INTO users (name, email, phone, role, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role",\n'
            '        [name || email.split("@")[0], email, null, "customer", password_hash]\n'
            '      );\n'
            '      row = insertResult.rows[0];\n'
            '    }',
            '      const insertResult = await db.query(\n'
            '        "INSERT INTO users (name, email, phone, role, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role",\n'
            '        [name || email.split("@")[0], email, null, "customer", password_hash]\n'
            '      );\n'
            '      row = insertResult.rows[0];\n'
            '      const ownReferralCode = `HUB${String(row.id).padStart(5, "0")}`;\n'
            '      await db.query("UPDATE users SET referral_code = $1 WHERE id = $2", [ownReferralCode, row.id]);\n'
            '    }',
        ),
    ],
    "auth.js: referral code generation + capture",
)

edit(
    "backend/routes/wallet.js",
    [(
        '    const { rows: loyaltyRows } = await db.query(\n'
        '      "SELECT loyalty_bookings_since_reward FROM users WHERE id = $1",\n'
        '      [req.user.id]\n'
        '    );\n'
        '    res.json({\n'
        '      balance,\n'
        '      transactions,\n'
        '      loyaltyCount: loyaltyRows[0]?.loyalty_bookings_since_reward || 0,\n'
        '      loyaltyGoal: LOYALTY_GOAL,\n'
        '      loyaltyReward: LOYALTY_REWARD,\n'
        '    });',
        '    const { rows: loyaltyRows } = await db.query(\n'
        '      "SELECT loyalty_bookings_since_reward, referral_code FROM users WHERE id = $1",\n'
        '      [req.user.id]\n'
        '    );\n'
        '    const { rows: referralCountRows } = await db.query(\n'
        '      "SELECT COUNT(*) AS count FROM users WHERE referred_by = $1 AND referral_bonus_awarded = true",\n'
        '      [req.user.id]\n'
        '    );\n'
        '    res.json({\n'
        '      balance,\n'
        '      transactions,\n'
        '      loyaltyCount: loyaltyRows[0]?.loyalty_bookings_since_reward || 0,\n'
        '      loyaltyGoal: LOYALTY_GOAL,\n'
        '      loyaltyReward: LOYALTY_REWARD,\n'
        '      referralCode: loyaltyRows[0]?.referral_code || null,\n'
        '      referralsCompleted: Number(referralCountRows[0]?.count || 0),\n'
        '    });',
    )],
    "wallet.js: expose referral code + referral count",
)

app_replacements = [
    (
        "const CATEGORIES = [",
        "// Typical booking on TheHub runs about \u20a63,000, so these buckets are\n"
        "// centered around that rather than generic round numbers.\n"
        "const PRICE_BUCKETS = [\n"
        '  { id: "u2k", label: "Under \u20a62,000", min: 0, max: 2000 },\n'
        '  { id: "2to5k", label: "\u20a62,000\u2013\u20a65,000", min: 2000, max: 5000 },\n'
        '  { id: "5to10k", label: "\u20a65,000\u2013\u20a610,000", min: 5000, max: 10000 },\n'
        '  { id: "10kplus", label: "\u20a610,000+", min: 10000, max: Infinity },\n'
        "];\n\n"
        "const CATEGORIES = [",
    ),
    (
        "function HomeView({ salons, category, setCategory, searchQuery, setSearchQuery, searchState, setSearchState, searchCity, setSearchCity, locationStatus, onRequestLocation, onSelectSalon }) {",
        "function HomeView({ salons, category, setCategory, priceFilter, setPriceFilter, searchQuery, setSearchQuery, searchState, setSearchState, searchCity, setSearchCity, locationStatus, onRequestLocation, onSelectSalon }) {",
    ),
    (
        "  const filtered = salons\n"
        "    .filter((s) => (category ? s.category === category : true))\n"
        "    .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));",
        "  const filtered = salons\n"
        "    .filter((s) => (category ? s.category === category : true))\n"
        "    .filter((s) => {\n"
        "      if (!priceFilter) return true;\n"
        "      const bucket = PRICE_BUCKETS.find((b) => b.id === priceFilter);\n"
        "      if (!bucket) return true;\n"
        "      return (s.services || []).some((svc) => svc.price >= bucket.min && svc.price < bucket.max);\n"
        "    })\n"
        "    .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));",
    ),
    (
        '          ))}\n'
        '        </div>\n'
        '      </div>\n\n'
        '      <div className="px-4 pt-5 pb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">',
        '          ))}\n'
        '        </div>\n\n'
        '        <div className="flex gap-2 overflow-x-auto pb-1 mt-2">\n'
        '          {PRICE_BUCKETS.map((b) => (\n'
        '            <button\n'
        '              key={b.id}\n'
        '              onClick={() => setPriceFilter(priceFilter === b.id ? null : b.id)}\n'
        '              className="px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap tap-glass shrink-0"\n'
        '              style={{\n'
        '                background: priceFilter === b.id ? colors.gold : colors.panelLight,\n'
        '                color: priceFilter === b.id ? "#FFFFFF" : colors.cream,\n'
        '                border: `2px solid ${priceFilter === b.id ? colors.gold : colors.hairline}`,\n'
        '              }}\n'
        '            >\n'
        '              {b.label}\n'
        '            </button>\n'
        '          ))}\n'
        '        </div>\n'
        '      </div>\n\n'
        '      <div className="px-4 pt-5 pb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">',
    ),
    (
        "  const [category, setCategory] = useState(null);",
        "  const [category, setCategory] = useState(null);\n"
        "  const [priceFilter, setPriceFilter] = useState(null);",
    ),
    (
        "              <HomeView\n"
        "                salons={salons}\n"
        "                category={category} setCategory={setCategory}",
        "              <HomeView\n"
        "                salons={salons}\n"
        "                category={category} setCategory={setCategory}\n"
        "                priceFilter={priceFilter} setPriceFilter={setPriceFilter}",
    ),
    (
        '      const body =\n'
        '        mode === "login" ? { email, password } : { name, email, password, role };',
        '      const body =\n'
        '        mode === "login"\n'
        '          ? { email, password }\n'
        '          : { name, email, password, role, referralCode: referralCode || undefined };',
    ),
    (
        '        {mode === "signup" && (\n'
        '          <input\n'
        '            required\n'
        '            value={name}\n'
        '            onChange={(e) => setName(e.target.value)}\n'
        '            placeholder="Your name"\n'
        '            className="pb-2 text-base outline-none"\n'
        '            style={inputStyle}\n'
        '          />\n'
        '        )}',
        '        {mode === "signup" && (\n'
        '          <input\n'
        '            required\n'
        '            value={name}\n'
        '            onChange={(e) => setName(e.target.value)}\n'
        '            placeholder="Your name"\n'
        '            className="pb-2 text-base outline-none"\n'
        '            style={inputStyle}\n'
        '          />\n'
        '        )}\n'
        '        {mode === "signup" && role === "customer" && (\n'
        '          <input\n'
        '            value={referralCode}\n'
        '            onChange={(e) => setReferralCode(e.target.value)}\n'
        '            placeholder="Referral code (optional)"\n'
        '            className="pb-2 text-base outline-none"\n'
        '            style={inputStyle}\n'
        '          />\n'
        '        )}',
    ),
    (
        "  const [resetSent, setResetSent] = useState(false);\n"
        "  const [showResetForm, setShowResetForm] = useState(false);",
        "  const [resetSent, setResetSent] = useState(false);\n"
        "  const [showResetForm, setShowResetForm] = useState(false);\n"
        "  const [referralCode, setReferralCode] = useState(\"\");",
    ),
    (
        "        setLoyaltyReward(data.loyaltyReward || 1000);\n"
        "        setError(null);",
        "        setLoyaltyReward(data.loyaltyReward || 1000);\n"
        "        setReferralCode(data.referralCode || \"\");\n"
        "        setReferralsCompleted(data.referralsCompleted || 0);\n"
        "        setError(null);",
    ),
    (
        "  const [loyaltyReward, setLoyaltyReward] = useState(1000);",
        "  const [loyaltyReward, setLoyaltyReward] = useState(1000);\n"
        "  const [referralCode, setReferralCode] = useState(\"\");\n"
        "  const [referralsCompleted, setReferralsCompleted] = useState(0);\n"
        "  const [referralCopied, setReferralCopied] = useState(false);",
    ),
    (
        '        <h3 className="mt-6 mb-3 text-lg" style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }}>\n'
        '          Top up\n'
        '        </h3>',
        '        {referralCode && (\n'
        '          <div className="mt-4 rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>\n'
        '            <p className="text-sm font-bold mb-1" style={{ color: colors.cream }}>\U0001f465 Invite friends, earn points</p>\n'
        '            <p className="text-xs mb-3" style={{ color: colors.creamDim }}>\n'
        '              You earn 60 points and they earn 30 once their first booking is complete.\n'
        '              {referralsCompleted > 0 ? ` ${referralsCompleted} friend${referralsCompleted === 1 ? \'\' : \'s\'} joined so far.` : ""}\n'
        '            </p>\n'
        '            <div className="flex items-center gap-2">\n'
        '              <div\n'
        '                className="flex-1 px-4 py-3 rounded-xl text-base font-bold text-center tracking-wide"\n'
        '                style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}\n'
        '              >\n'
        '                {referralCode}\n'
        '              </div>\n'
        '              <button\n'
        '                onClick={() => {\n'
        '                  navigator.clipboard.writeText(referralCode).then(() => {\n'
        '                    setReferralCopied(true);\n'
        '                    setTimeout(() => setReferralCopied(false), 2000);\n'
        '                  });\n'
        '                }}\n'
        '                className="px-4 py-3 rounded-xl text-sm font-bold shrink-0"\n'
        '                style={{ background: colors.hairline, color: "#FFFFFF" }}\n'
        '              >\n'
        '                {referralCopied ? "Copied!" : "Copy"}\n'
        '              </button>\n'
        '            </div>\n'
        '          </div>\n'
        '        )}\n\n'
        '        <h3 className="mt-6 mb-3 text-lg" style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }}>\n'
        '          Top up\n'
        '        </h3>',
    ),
]

edit("frontend/src/App.jsx", app_replacements, "App.jsx: price filter + referral UI")

print("\nALL DONE. Review with: git diff")
print('Then: git add -A && git commit -m "Add price filter and referral program" && git push')
