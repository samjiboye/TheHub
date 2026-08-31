path = "backend/routes/auth.js"
with open(path, "r") as f:
    src = f.read()

old = '''// GET /auth/google/callback - handle Google's redirect back
router.get("/google/callback", async (req, res) => {'''
new = '''// GET /auth/google/callback - handle Google's redirect back
router.get("/google/callback", authLimiter, async (req, res) => {'''

if old in src:
    assert src.count(old) == 1
    src = src.replace(old, new)
    with open(path, "w") as f:
        f.write(src)
    print("✅ auth.js — Google login callback now rate-limited too")
else:
    print("⏭️  Already updated")
