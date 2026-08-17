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


edit(
    "backend/routes/adminAnalytics.js",
    [(
        "module.exports = router;",
        '// GET /admin/users - every user on the platform, with basic activity counts\n'
        'router.get("/users", requireAuth, requireAdmin, async (req, res) => {\n'
        '  try {\n'
        '    const { rows } = await db.query(\n'
        '      `SELECT\n'
        '         u.id, u.name, u.email, u.phone, u.role, u.created_at,\n'
        '         (SELECT COUNT(*) FROM bookings WHERE customer_id = u.id) AS bookings_made,\n'
        '         (SELECT COUNT(*) FROM salons WHERE owner_id = u.id) AS salons_owned\n'
        '       FROM users u\n'
        '       ORDER BY u.created_at DESC`\n'
        '    );\n'
        '    res.json(\n'
        '      rows.map((r) => ({\n'
        '        id: r.id,\n'
        '        name: r.name,\n'
        '        email: r.email,\n'
        '        phone: r.phone,\n'
        '        role: r.role,\n'
        '        createdAt: r.created_at,\n'
        '        bookingsMade: Number(r.bookings_made),\n'
        '        salonsOwned: Number(r.salons_owned),\n'
        '      }))\n'
        '    );\n'
        '  } catch (err) {\n'
        '    console.error(err);\n'
        '    res.status(500).json({ error: "Couldn\'t load users." });\n'
        '  }\n'
        '});\n\n'
        '// GET /admin/users/:id - one user\'s profile plus their real activity\n'
        'router.get("/users/:id", requireAuth, requireAdmin, async (req, res) => {\n'
        '  try {\n'
        '    const { rows: userRows } = await db.query(\n'
        '      "SELECT id, name, email, phone, role, created_at, profile_photo_url, address_state, address_city, address_street, referral_code FROM users WHERE id = $1",\n'
        '      [req.params.id]\n'
        '    );\n'
        '    const user = userRows[0];\n'
        '    if (!user) return res.status(404).json({ error: "User not found" });\n\n'
        '    if (user.role === "owner") {\n'
        '      const { rows: salons } = await db.query("SELECT id, name, category FROM salons WHERE owner_id = $1", [user.id]);\n'
        '      const salonIds = salons.map((s) => s.id);\n'
        '      let bookings = [];\n'
        '      if (salonIds.length > 0) {\n'
        '        const { rows } = await db.query(\n'
        '          `SELECT b.id, b.status, b.payment_status, b.service_price, b.created_at,\n'
        '                  s.name AS service_name, sa.name AS salon_name, u.name AS customer_name\n'
        '           FROM bookings b\n'
        '           JOIN services s ON s.id = b.service_id\n'
        '           JOIN salons sa ON sa.id = b.salon_id\n'
        '           JOIN users u ON u.id = b.customer_id\n'
        '           WHERE b.salon_id = ANY($1)\n'
        '           ORDER BY b.created_at DESC`,\n'
        '          [salonIds]\n'
        '        );\n'
        '        bookings = rows;\n'
        '      }\n'
        '      res.json({ user, salons, bookings });\n'
        '    } else {\n'
        '      const { rows: bookings } = await db.query(\n'
        '        `SELECT b.id, b.status, b.payment_status, b.service_price, b.created_at,\n'
        '                s.name AS service_name, sa.name AS salon_name\n'
        '         FROM bookings b\n'
        '         JOIN services s ON s.id = b.service_id\n'
        '         JOIN salons sa ON sa.id = b.salon_id\n'
        '         WHERE b.customer_id = $1\n'
        '         ORDER BY b.created_at DESC`,\n'
        '        [user.id]\n'
        '      );\n'
        '      res.json({ user, bookings });\n'
        '    }\n'
        '  } catch (err) {\n'
        '    console.error(err);\n'
        '    res.status(500).json({ error: "Couldn\'t load that user." });\n'
        '  }\n'
        '});\n\n'
        '// GET /admin/bookings - every booking platform-wide: who booked who,\n'
        '// what they paid, whether it went through and whether it\'s done\n'
        'router.get("/bookings", requireAuth, requireAdmin, async (req, res) => {\n'
        '  try {\n'
        '    const { rows } = await db.query(\n'
        '      `SELECT b.id, b.status, b.payment_status, b.service_price, b.commission_amount, b.created_at,\n'
        '              s.name AS service_name, sa.name AS salon_name, u.name AS customer_name, u.id AS customer_id, sa.id AS salon_id\n'
        '       FROM bookings b\n'
        '       JOIN services s ON s.id = b.service_id\n'
        '       JOIN salons sa ON sa.id = b.salon_id\n'
        '       JOIN users u ON u.id = b.customer_id\n'
        '       ORDER BY b.created_at DESC\n'
        '       LIMIT 200`\n'
        '    );\n'
        '    res.json(rows);\n'
        '  } catch (err) {\n'
        '    console.error(err);\n'
        '    res.status(500).json({ error: "Couldn\'t load bookings." });\n'
        '  }\n'
        '});\n\n'
        "module.exports = router;",
    )],
    "adminAnalytics.js: add users + bookings visibility endpoints",
)

print("\nALL DONE. Review with: git diff")
print('Then: git add -A && git commit -m "Admin: add users and bookings visibility endpoints" && git push')
