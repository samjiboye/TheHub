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
    "backend/routes/payments.js",
    [
        (
            'const BOOKING_FEE = 0; // set above 0 to reintroduce a booking fee later\n'
            'const BASE_COMMISSION_RATE = 0.10; // used only as Paystack\'s default subaccount split; actual bookings always override this per-transaction based on tier\n',
            'const BOOKING_FEE = 0; // set above 0 to reintroduce a booking fee later\n',
        ),
        (
            'router.post("/connect", requireAuth, requireRole("owner"), async (req, res) => {\n'
            '  const { salon_id, business_name, bank_code, account_number } = req.body;\n'
            '  if (!salon_id || !business_name || !bank_code || !account_number) {\n'
            '    return res.status(400).json({ error: "salon_id, business_name, bank_code, and account_number are required" });\n'
            '  }\n'
            '  try {\n'
            '    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [salon_id]);\n'
            '    const salon = salonRows[0];\n'
            '    if (!salon) return res.status(404).json({ error: "Salon not found" });\n'
            '    if (salon.owner_id !== req.user.id) return res.status(403).json({ error: "Not your salon" });\n\n'
            '    const subaccount = await paystack.post("/subaccount", {\n'
            '      business_name,\n'
            '      bank_code,\n'
            '      account_number,\n'
            '      percentage_charge: BASE_COMMISSION_RATE * 100,\n'
            '    });\n\n'
            '    await db.query(\n'
            '      "UPDATE salons SET paystack_subaccount_code = $1, paystack_payouts_enabled = 1, bank_code = $2, account_number = $3 WHERE id = $4",\n'
            '      [subaccount.subaccount_code, bank_code, account_number, salon.id]\n'
            '    );\n\n'
            '    res.json({ ok: true, subaccount_code: subaccount.subaccount_code, account_name: subaccount.account_name });\n'
            '  } catch (err) {\n'
            '    console.error(err);\n'
            '    res.status(400).json({ error: err.message || "Couldn\'t set up payouts for this salon." });\n'
            '  }\n'
            '});',
            'router.post("/connect", requireAuth, requireRole("owner"), async (req, res) => {\n'
            '  const { salon_id, business_name, bank_code, account_number } = req.body;\n'
            '  if (!salon_id || !business_name || !bank_code || !account_number) {\n'
            '    return res.status(400).json({ error: "salon_id, business_name, bank_code, and account_number are required" });\n'
            '  }\n'
            '  try {\n'
            '    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [salon_id]);\n'
            '    const salon = salonRows[0];\n'
            '    if (!salon) return res.status(404).json({ error: "Salon not found" });\n'
            '    if (salon.owner_id !== req.user.id) return res.status(403).json({ error: "Not your salon" });\n\n'
            '    // No subaccount here - payouts go through Transfer Recipients (created lazily in\n'
            '    // completeBooking.js the first time this salon earns a payout), not subaccounts.\n'
            '    // This just confirms the account is real before saving it.\n'
            '    const resolved = await paystack.get(\n'
            '      `/bank/resolve?account_number=${encodeURIComponent(account_number)}&bank_code=${encodeURIComponent(bank_code)}`\n'
            '    );\n\n'
            '    await db.query(\n'
            '      "UPDATE salons SET paystack_payouts_enabled = 1, bank_code = $1, account_number = $2 WHERE id = $3",\n'
            '      [bank_code, account_number, salon.id]\n'
            '    );\n\n'
            '    res.json({ ok: true, account_name: resolved.account_name });\n'
            '  } catch (err) {\n'
            '    console.error(err);\n'
            '    res.status(400).json({ error: err.message || "Couldn\'t set up payouts for this salon." });\n'
            '  }\n'
            '});',
        ),
    ],
    "payments.js: stop creating unused Paystack subaccounts on connect",
)

print("\nALL DONE. Review with: git diff")
print('Then: git add -A && git commit -m "Stop creating unused Paystack subaccounts on payout connect" && git push')
