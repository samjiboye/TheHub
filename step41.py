path = "backend/routes/adminSeed.js"
with open(path, "r") as f:
    src = f.read()

changes = []

old_full = '''// GET /admin/seed?key=<JWT_SECRET>
// A shell-free way to populate demo data on hosts (like Render's free tier) that
// don't offer shell access. Reuses JWT_SECRET as a simple shared key so no new
// environment variable is needed. Safe to leave in place — it's idempotent and
// does nothing once the demo owner already has salons.
router.get("/seed", async (req, res) => {
  if (!process.env.ADMIN_KEY || req.query.key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: "Missing or incorrect key" });
  }'''
new_full = '''// POST /admin/seed  { key: <ADMIN_KEY> }
// A shell-free way to populate demo data on hosts (like Render's free tier) that
// don't offer shell access. Gated by ADMIN_KEY, a separate secret set in Render's
// environment variables — set it to a long random value there, it isn't in code.
// POST (not GET) so the key never ends up in a URL, access log, or browser history.
// Safe to leave in place — it's idempotent and does nothing once the demo owner
// already has salons.
router.post("/seed", async (req, res) => {
  if (!process.env.ADMIN_KEY || req.body.key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: "Missing or incorrect key" });
  }'''
if old_full in src:
    assert src.count(old_full) == 1
    src = src.replace(old_full, new_full)
    changes.append("✅ /admin/seed moved from GET to POST, key no longer in the URL")
else:
    changes.append("⏭️  /admin/seed already hardened")

old_response = '''    res.json({
      ok: true,
      message: `Seeded ${SALONS.length} salons. Demo owner login: ${DEMO_OWNER_EMAIL} / ${DEMO_OWNER_PASSWORD}`,
    });'''
new_response = '''    res.json({
      ok: true,
      message: `Seeded ${SALONS.length} salons for demo owner ${DEMO_OWNER_EMAIL}.`,
    });'''
if old_response in src:
    assert src.count(old_response) == 1
    src = src.replace(old_response, new_response)
    changes.append("✅ /admin/seed no longer echoes the demo password back in the response")
else:
    changes.append("⏭️  Response already hardened")

old_promote_full = '''// GET /admin/promote?key=<JWT_SECRET>&email=<email>
// A shell-free way to flag an account as admin (needed to manage the marketplace
// catalog and orders) on hosts that don't offer shell access. Reuses JWT_SECRET
// as a shared key, same convention as /admin/seed above.
router.get("/promote", async (req, res) => {
  if (!process.env.ADMIN_KEY || req.query.key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: "Missing or incorrect key" });
  }
  const { email } = req.query;'''
new_promote_full = '''// POST /admin/promote  { key: <ADMIN_KEY>, email: <email> }
// A shell-free way to flag an account as admin (needed to manage the marketplace
// catalog and orders) on hosts that don't offer shell access. Gated by ADMIN_KEY,
// same convention as /admin/seed above. POST (not GET) so the key never ends up
// in a URL, access log, or browser history.
router.post("/promote", async (req, res) => {
  if (!process.env.ADMIN_KEY || req.body.key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: "Missing or incorrect key" });
  }
  const { email } = req.body;'''
if old_promote_full in src:
    assert src.count(old_promote_full) == 1
    src = src.replace(old_promote_full, new_promote_full)
    changes.append("✅ /admin/promote moved from GET to POST, key no longer in the URL")
else:
    changes.append("⏭️  /admin/promote already hardened")

with open(path, "w") as f:
    f.write(src)

server_path = "backend/server.js"
with open(server_path, "r") as f:
    server = f.read()

old_cors = '''const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: corsOrigin }));'''
new_cors = '''const corsOrigin = process.env.CORS_ORIGIN || "*";
if (corsOrigin === "*") {
  console.warn("CORS_ORIGIN is not set — accepting requests from any origin. Set it to your real frontend URL(s) in production.");
}
app.use(cors({ origin: corsOrigin }));'''
if old_cors in server:
    assert server.count(old_cors) == 1
    server = server.replace(old_cors, new_cors)
    with open(server_path, "w") as f:
        f.write(server)
    changes.append("✅ server.js — now warns loudly in logs if CORS is wide open")
else:
    changes.append("⏭️  CORS warning already added")

for c in changes:
    print(c)
