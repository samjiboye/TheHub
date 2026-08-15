#!/usr/bin/env python3
"""
Part 1 of 2: Customer profile page.

Adds:
  - profile_photo_url, address_state, address_city, address_street on users
  - backend/routes/users.js: GET/PUT /users/me, POST /users/me/photo
  - a real "My Profile" page for customers: photo upload, editable name/phone,
    saved home address, referral code + a working shareable link
  - the referral link actually works now: visiting thehubbooking.com/?ref=CODE
    pre-fills the referral code field at signup
  - customer profile photo now shows next to their name in the owner's
    upcoming/completed booking lists, instead of a generic icon

Run this from the root of your TheHub repo.
"""
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
marker = "-- Customer profile: photo and a saved home address for home-service bookings."
if marker in schema_content:
    print("OK: schema.sql - profile columns already present, skipping")
else:
    schema_content += (
        "\n\n" + marker + "\n"
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;\n"
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS address_state TEXT;\n"
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS address_city TEXT;\n"
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS address_street TEXT;\n"
    )
    with open(schema_path, "w", encoding="utf-8") as f:
        f.write(schema_content)
    print("OK: schema.sql - profile columns appended")

users_route_path = "backend/routes/users.js"
if os.path.exists(users_route_path):
    print("OK: users.js already exists, skipping")
else:
    with open(users_route_path, "w", encoding="utf-8") as f:
        f.write(
'''const express = require("express");
const multer = require("multer");
const db = require("../db");
const cloudinary = require("../lib/cloudinary");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image", folder: "thehub/profiles" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

// GET /users/me - full profile for the logged-in user, any role
router.get("/me", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id, name, email, phone, role, profile_photo_url, address_state, address_city, address_street, referral_code FROM users WHERE id = $1",
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load profile." });
  }
});

// PUT /users/me - update editable fields (email is intentionally not editable here -
// it's the login identifier, changing it needs its own verified flow to stay safe)
router.put("/me", requireAuth, async (req, res) => {
  const { name, phone, address_state, address_city, address_street } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE users SET
         name = COALESCE($1, name),
         phone = $2,
         address_state = $3,
         address_city = $4,
         address_street = $5
       WHERE id = $6
       RETURNING id, name, email, phone, role, profile_photo_url, address_state, address_city, address_street, referral_code`,
      [name || null, phone || null, address_state || null, address_city || null, address_street || null, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't update profile." });
  }
});

// POST /users/me/photo - upload or replace profile photo
router.post("/me/photo", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const result = await uploadToCloudinary(req.file.buffer);
    await db.query("UPDATE users SET profile_photo_url = $1 WHERE id = $2", [result.secure_url, req.user.id]);
    res.json({ profile_photo_url: result.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't upload photo." });
  }
});

module.exports = router;
'''
        )
    print("OK: created backend/routes/users.js")

edit(
    "backend/server.js",
    [(
        'const adminAnalyticsRoutes = require("./routes/adminAnalytics");',
        'const adminAnalyticsRoutes = require("./routes/adminAnalytics");\n'
        'const userRoutes = require("./routes/users");',
    ), (
        'app.use("/admin", adminAnalyticsRoutes);',
        'app.use("/admin", adminAnalyticsRoutes);\n'
        'app.use("/users", userRoutes);',
    )],
    "server.js: mount /users route",
)

edit(
    "backend/routes/salons.js",
    [
        (
            "SELECT b.*, s.name AS service_name, u.name AS customer_name\n"
            "       FROM bookings b\n"
            "       JOIN services s ON s.id = b.service_id\n"
            "       JOIN users u ON u.id = b.customer_id\n"
            "       WHERE b.salon_id = $1 AND b.status = 'confirmed'",
            "SELECT b.*, s.name AS service_name, u.name AS customer_name, u.profile_photo_url AS customer_photo_url\n"
            "       FROM bookings b\n"
            "       JOIN services s ON s.id = b.service_id\n"
            "       JOIN users u ON u.id = b.customer_id\n"
            "       WHERE b.salon_id = $1 AND b.status = 'confirmed'",
        ),
        (
            "SELECT b.*, s.name AS service_name, u.name AS customer_name\n"
            "       FROM bookings b\n"
            "       JOIN services s ON s.id = b.service_id\n"
            "       JOIN users u ON u.id = b.customer_id\n"
            "       WHERE b.salon_id = $1 AND b.status = 'completed'",
            "SELECT b.*, s.name AS service_name, u.name AS customer_name, u.profile_photo_url AS customer_photo_url\n"
            "       FROM bookings b\n"
            "       JOIN services s ON s.id = b.service_id\n"
            "       JOIN users u ON u.id = b.customer_id\n"
            "       WHERE b.salon_id = $1 AND b.status = 'completed'",
        ),
    ],
    "salons.js: include customer profile photo in owner booking lists",
)

app_replacements = [
    (
        '  const [referralCode, setReferralCode] = useState("");\n\n'
        '  const submit = async (e) => {',
        '  const [referralCode, setReferralCode] = useState("");\n\n'
        '  useEffect(() => {\n'
        '    const params = new URLSearchParams(window.location.search);\n'
        '    const ref = params.get("ref");\n'
        '    if (ref) setReferralCode(ref);\n'
        '  }, []);\n\n'
        '  const submit = async (e) => {',
    ),
    (
        "function WalletView({ token, onBack }) {",
        'function CustomerProfileView({ token, onBack }) {\n'
        '  const [profile, setProfile] = useState(null);\n'
        '  const [name, setName] = useState("");\n'
        '  const [phone, setPhone] = useState("");\n'
        '  const [addressState, setAddressState] = useState("");\n'
        '  const [addressCity, setAddressCity] = useState("");\n'
        '  const [addressStreet, setAddressStreet] = useState("");\n'
        '  const [saving, setSaving] = useState(false);\n'
        '  const [saved, setSaved] = useState(false);\n'
        '  const [error, setError] = useState(null);\n'
        '  const [uploadingPhoto, setUploadingPhoto] = useState(false);\n'
        '  const [referralCopied, setReferralCopied] = useState(false);\n'
        '  const [linkCopied, setLinkCopied] = useState(false);\n'
        '  const fileInputRef = useRef(null);\n\n'
        '  useEffect(() => {\n'
        '    if (!token) return;\n'
        '    apiFetch("/users/me", { headers: { Authorization: `Bearer ${token}` } })\n'
        '      .then((data) => {\n'
        '        setProfile(data);\n'
        '        setName(data.name || "");\n'
        '        setPhone(data.phone || "");\n'
        '        setAddressState(data.address_state || "");\n'
        '        setAddressCity(data.address_city || "");\n'
        '        setAddressStreet(data.address_street || "");\n'
        '      })\n'
        '      .catch(() => {});\n'
        '  }, [token]);\n\n'
        '  const handleSave = async () => {\n'
        '    setSaving(true);\n'
        '    setError(null);\n'
        '    setSaved(false);\n'
        '    try {\n'
        '      const data = await apiFetch("/users/me", {\n'
        '        method: "PUT",\n'
        '        headers: { Authorization: `Bearer ${token}` },\n'
        '        body: JSON.stringify({ name, phone, address_state: addressState, address_city: addressCity, address_street: addressStreet }),\n'
        '      });\n'
        '      setProfile(data);\n'
        '      setSaved(true);\n'
        '      setTimeout(() => setSaved(false), 2000);\n'
        '    } catch (err) {\n'
        '      setError(err.message || "Couldn\'t save your profile.");\n'
        '    } finally {\n'
        '      setSaving(false);\n'
        '    }\n'
        '  };\n\n'
        '  const handlePhotoChange = async (e) => {\n'
        '    const file = e.target.files[0];\n'
        '    if (!file) return;\n'
        '    setUploadingPhoto(true);\n'
        '    setError(null);\n'
        '    try {\n'
        '      const formData = new FormData();\n'
        '      formData.append("file", file);\n'
        '      const data = await apiFetch("/users/me/photo", {\n'
        '        method: "POST",\n'
        '        headers: { Authorization: `Bearer ${token}` },\n'
        '        body: formData,\n'
        '      });\n'
        '      setProfile((prev) => ({ ...prev, profile_photo_url: data.profile_photo_url }));\n'
        '    } catch (err) {\n'
        '      setError(err.message || "Couldn\'t upload that photo.");\n'
        '    } finally {\n'
        '      setUploadingPhoto(false);\n'
        '    }\n'
        '  };\n\n'
        '  if (!profile) {\n'
        '    return (\n'
        '      <div className="pb-8" style={{ background: NEUTRAL_HERO_GRADIENT, minHeight: "100vh" }}>\n'
        '        <Header title="My Profile" onBack={onBack} />\n'
        '        <div className="flex justify-center mt-10"><Loader2 size={24} className="animate-spin" color={colors.hairline} /></div>\n'
        '      </div>\n'
        '    );\n'
        '  }\n\n'
        '  const referralLink = `${window.location.origin}/?ref=${profile.referral_code}`;\n\n'
        '  return (\n'
        '    <div className="pb-8 transition-[background] duration-500" style={{ background: NEUTRAL_HERO_GRADIENT }}>\n'
        '      <Header title="My Profile" onBack={onBack} />\n'
        '      <div className="px-4 mt-4 flex flex-col gap-3 max-w-xl mx-auto w-full">\n\n'
        '        <div className="flex flex-col items-center py-4">\n'
        '          <div\n'
        '            className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden shrink-0"\n'
        '            style={{ background: colors.panelLight, border: `3px solid ${colors.hairline}` }}\n'
        '          >\n'
        '            {profile.profile_photo_url ? (\n'
        '              <img src={profile.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />\n'
        '            ) : (\n'
        '              <UserCircle size={48} color={colors.hairline} />\n'
        '            )}\n'
        '          </div>\n'
        '          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />\n'
        '          <button\n'
        '            onClick={() => fileInputRef.current?.click()}\n'
        '            disabled={uploadingPhoto}\n'
        '            className="mt-3 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2"\n'
        '            style={{ border: `2px solid ${colors.hairline}`, color: colors.cream }}\n'
        '          >\n'
        '            {uploadingPhoto ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}\n'
        '            {uploadingPhoto ? "Uploading..." : "Change photo"}\n'
        '          </button>\n'
        '        </div>\n\n'
        '        <div className="rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>\n'
        '          <h3 className="text-lg mb-3" style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }}>Your details</h3>\n'
        '          <input\n'
        '            value={name}\n'
        '            onChange={(e) => setName(e.target.value)}\n'
        '            placeholder="Your name"\n'
        '            className="w-full pb-2 mb-3 text-base outline-none"\n'
        '            style={inputStyle}\n'
        '          />\n'
        '          <input\n'
        '            value={phone}\n'
        '            onChange={(e) => setPhone(e.target.value)}\n'
        '            placeholder="Phone number"\n'
        '            className="w-full pb-2 mb-1 text-base outline-none"\n'
        '            style={inputStyle}\n'
        '          />\n'
        '          <p className="text-xs mt-3" style={{ color: colors.creamDim }}>Email</p>\n'
        '          <p className="text-sm" style={{ color: colors.cream }}>{profile.email}</p>\n'
        '        </div>\n\n'
        '        <div className="rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>\n'
        '          <h3 className="text-lg mb-1" style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }}>Home address</h3>\n'
        '          <p className="text-xs mb-3" style={{ color: colors.creamDim }}>\n'
        '            Save this once so you don\'t have to retype it every time you book a home-service appointment.\n'
        '          </p>\n'
        '          <select\n'
        '            value={addressState}\n'
        '            onChange={(e) => { setAddressState(e.target.value); setAddressCity(""); }}\n'
        '            className="w-full pb-2 mb-3 text-base outline-none"\n'
        '            style={inputStyle}\n'
        '          >\n'
        '            <option value="">Select state</option>\n'
        '            {NIGERIA_LOCATIONS.map((s) => <option key={s.state} value={s.state}>{s.state}</option>)}\n'
        '          </select>\n'
        '          <select\n'
        '            value={addressCity}\n'
        '            onChange={(e) => setAddressCity(e.target.value)}\n'
        '            disabled={!addressState}\n'
        '            className="w-full pb-2 mb-3 text-base outline-none"\n'
        '            style={inputStyle}\n'
        '          >\n'
        '            <option value="">Select city</option>\n'
        '            {(NIGERIA_LOCATIONS.find((s) => s.state === addressState)?.cities || []).map((c) => (\n'
        '              <option key={c} value={c}>{c}</option>\n'
        '            ))}\n'
        '          </select>\n'
        '          <input\n'
        '            value={addressStreet}\n'
        '            onChange={(e) => setAddressStreet(e.target.value)}\n'
        '            placeholder="Street address"\n'
        '            className="w-full pb-2 text-base outline-none"\n'
        '            style={inputStyle}\n'
        '          />\n'
        '        </div>\n\n'
        '        {error && <p className="text-sm" style={{ color: "#E07A5F" }}>{error}</p>}\n\n'
        '        <button\n'
        '          onClick={handleSave}\n'
        '          disabled={saving}\n'
        '          className="w-full py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2"\n'
        '          style={{ background: colors.hairline, color: "#FFFFFF" }}\n'
        '        >\n'
        '          {saving ? <Loader2 size={16} className="animate-spin" /> : null}\n'
        '          {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}\n'
        '        </button>\n\n'
        '        <div className="rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>\n'
        '          <p className="text-sm font-bold mb-1" style={{ color: colors.cream }}>\U0001f465 Invite friends, earn points</p>\n'
        '          <p className="text-xs mb-3" style={{ color: colors.creamDim }}>\n'
        '            You earn 60 points and they earn 30 once their first booking is complete.\n'
        '          </p>\n'
        '          <div className="flex items-center gap-2 mb-2">\n'
        '            <div\n'
        '              className="flex-1 px-4 py-3 rounded-xl text-base font-bold text-center tracking-wide"\n'
        '              style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}\n'
        '            >\n'
        '              {profile.referral_code}\n'
        '            </div>\n'
        '            <button\n'
        '              onClick={() => {\n'
        '                navigator.clipboard.writeText(profile.referral_code).then(() => {\n'
        '                  setReferralCopied(true);\n'
        '                  setTimeout(() => setReferralCopied(false), 2000);\n'
        '                });\n'
        '              }}\n'
        '              className="px-4 py-3 rounded-xl text-sm font-bold shrink-0"\n'
        '              style={{ background: colors.hairline, color: "#FFFFFF" }}\n'
        '            >\n'
        '              {referralCopied ? "Copied!" : "Copy"}\n'
        '            </button>\n'
        '          </div>\n'
        '          <button\n'
        '            onClick={() => {\n'
        '              navigator.clipboard.writeText(referralLink).then(() => {\n'
        '                setLinkCopied(true);\n'
        '                setTimeout(() => setLinkCopied(false), 2000);\n'
        '              });\n'
        '            }}\n'
        '            className="w-full py-2.5 rounded-xl text-sm font-semibold"\n'
        '            style={{ border: `2px solid ${colors.hairline}`, color: colors.cream }}\n'
        '          >\n'
        '            {linkCopied ? "Link copied!" : "Copy shareable link instead"}\n'
        '          </button>\n'
        '        </div>\n'
        '      </div>\n'
        '    </div>\n'
        '  );\n'
        '}\n\n'
        "function WalletView({ token, onBack }) {",
    ),
    (
        '                {role === "customer" && customerAuth && (\n'
        '                  <button\n'
        '                    onClick={() => { setMenuOpen(false); setView("myBookings"); }}\n'
        '                    className="w-full flex items-center gap-2 px-4 py-3 text-sm"\n'
        '                    style={{ color: colors.cream }}\n'
        '                  >\n'
        '                    <CalendarCheck size={16} /> My bookings\n'
        '                  </button>\n'
        '                )}',
        '                {role === "customer" && customerAuth && (\n'
        '                  <button\n'
        '                    onClick={() => { setMenuOpen(false); setView("profile"); }}\n'
        '                    className="w-full flex items-center gap-2 px-4 py-3 text-sm"\n'
        '                    style={{ color: colors.cream }}\n'
        '                  >\n'
        '                    <UserCircle size={16} /> My Profile\n'
        '                  </button>\n'
        '                )}\n'
        '                {role === "customer" && customerAuth && (\n'
        '                  <button\n'
        '                    onClick={() => { setMenuOpen(false); setView("myBookings"); }}\n'
        '                    className="w-full flex items-center gap-2 px-4 py-3 text-sm"\n'
        '                    style={{ color: colors.cream }}\n'
        '                  >\n'
        '                    <CalendarCheck size={16} /> My bookings\n'
        '                  </button>\n'
        '                )}',
    ),
    (
        '            {view === "myBookings" && customerAuth && (\n'
        '              <MyBookingsView\n'
        '                token={customerAuth.token}\n'
        '                onBack={() => setView("home")}\n'
        '              />\n'
        '            )}',
        '            {view === "profile" && customerAuth && (\n'
        '              <CustomerProfileView\n'
        '                token={customerAuth.token}\n'
        '                onBack={() => setView("home")}\n'
        '              />\n'
        '            )}\n'
        '            {view === "myBookings" && customerAuth && (\n'
        '              <MyBookingsView\n'
        '                token={customerAuth.token}\n'
        '                onBack={() => setView("home")}\n'
        '              />\n'
        '            )}',
    ),
    (
        '              <div className="flex items-center gap-3">\n'
        '                <div className="p-2 rounded-full" style={{ background: colors.panelLight }}>\n'
        '                  <Users size={14} color={colors.hairline} />\n'
        '                </div>\n'
        '                <div>\n'
        '                  <p className="text-sm" style={{ color: colors.cream }}>{b.service_name}</p>\n'
        '                  <p className="text-xs" style={{ color: colors.creamDim }}>{b.customer_name}</p>',
        '              <div className="flex items-center gap-3">\n'
        '                {b.customer_photo_url ? (\n'
        '                  <img\n'
        '                    src={b.customer_photo_url}\n'
        '                    alt={b.customer_name}\n'
        '                    className="w-8 h-8 rounded-full object-cover shrink-0"\n'
        '                    style={{ border: `2px solid ${colors.hairline}` }}\n'
        '                  />\n'
        '                ) : (\n'
        '                  <div className="p-2 rounded-full" style={{ background: colors.panelLight }}>\n'
        '                    <Users size={14} color={colors.hairline} />\n'
        '                  </div>\n'
        '                )}\n'
        '                <div>\n'
        '                  <p className="text-sm" style={{ color: colors.cream }}>{b.service_name}</p>\n'
        '                  <p className="text-xs" style={{ color: colors.creamDim }}>{b.customer_name}</p>',
    ),
    (
        '                <div className="flex items-center gap-3">\n'
        '                  <div className="p-2 rounded-full" style={{ background: colors.panelLight }}>\n'
        '                    <Users size={14} color={colors.hairline} />\n'
        '                  </div>\n'
        '                  <div>\n'
        '                    <p className="text-sm" style={{ color: colors.cream }}>{a.service_name}</p>\n'
        '                    <p className="text-xs" style={{ color: colors.creamDim }}>{a.customer_name}</p>',
        '                <div className="flex items-center gap-3">\n'
        '                  {a.customer_photo_url ? (\n'
        '                    <img\n'
        '                      src={a.customer_photo_url}\n'
        '                      alt={a.customer_name}\n'
        '                      className="w-8 h-8 rounded-full object-cover shrink-0"\n'
        '                      style={{ border: `2px solid ${colors.hairline}` }}\n'
        '                    />\n'
        '                  ) : (\n'
        '                    <div className="p-2 rounded-full" style={{ background: colors.panelLight }}>\n'
        '                      <Users size={14} color={colors.hairline} />\n'
        '                    </div>\n'
        '                  )}\n'
        '                  <div>\n'
        '                    <p className="text-sm" style={{ color: colors.cream }}>{a.service_name}</p>\n'
        '                    <p className="text-xs" style={{ color: colors.creamDim }}>{a.customer_name}</p>',
    ),
]

edit("frontend/src/App.jsx", app_replacements, "App.jsx: customer profile page, referral link, avatars")

print("\nALL DONE. Review with: git diff")
print('Then: git add -A && git commit -m "Customer profile: photo, address, referral link + avatars in owner booking lists" && git push')
