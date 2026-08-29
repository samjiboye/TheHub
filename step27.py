path = "backend/routes/conversations.js"
with open(path, "r") as f:
    src = f.read()

old = '''  if (!salon_id) return res.status(400).json({ error: "salon_id is required" });
  try {
    const { rows: salonRows } = await db.query("SELECT id, owner_id FROM salons WHERE id = $1", [salon_id]);
    const salon = salonRows[0];
    if (!salon) return res.status(404).json({ error: "Salon not found" });

    if (req.user.role === "customer") {
      customer_id = req.user.id;
    } else if (req.user.role === "owner") {
      if (salon.owner_id !== req.user.id) return res.status(403).json({ error: "Not your salon." });
      if (!customer_id) return res.status(400).json({ error: "customer_id is required" });
    } else {
      return res.status(403).json({ error: "You can't start a conversation." });
    }

    const { rows: hasBookedRows } = await db.query(
      "SELECT 1 FROM bookings WHERE customer_id = $1 AND salon_id = $2 LIMIT 1",
      [customer_id, salon_id]
    );'''
new = '''  if (!salon_id) return res.status(400).json({ error: "salon_id is required" });
  try {
    const { rows: salonRows } = await db.query("SELECT id, owner_id FROM salons WHERE id = $1", [salon_id]);
    const salon = salonRows[0];
    if (!salon) return res.status(404).json({ error: "Salon not found" });

    if (req.user.role === "customer") {
      customer_id = req.user.id;
    } else if (req.user.role === "owner") {
      if (salon.owner_id !== req.user.id) {
        const { rows: dbUserRows } = await db.query("SELECT id, name, email, role FROM users WHERE id = $1", [req.user.id]);
        const dbUser = dbUserRows[0];
        return res.status(403).json({
          error: `Not your salon. [DEBUG: token says id=${req.user.id} role=${req.user.role}; DB says name="${dbUser?.name}" email="${dbUser?.email}" role="${dbUser?.role}"; salon.owner_id=${salon.owner_id}]`,
        });
      }
      if (!customer_id) return res.status(400).json({ error: "customer_id is required" });
    } else {
      return res.status(403).json({ error: "You can't start a conversation." });
    }

    const { rows: hasBookedRows } = await db.query(
      "SELECT 1 FROM bookings WHERE customer_id = $1 AND salon_id = $2 LIMIT 1",
      [customer_id, salon_id]
    );'''
if old in src:
    assert src.count(old) == 1
    src = src.replace(old, new)
    with open(path, "w") as f:
        f.write(src)
    print("✅ conversations.js — error now shows diagnostic info (token vs database)")
else:
    print("⏭️  Already updated")
