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
    "frontend/src/App.jsx",
    [
        (
            '  const [editingPayout, setEditingPayout] = useState(false);\n'
            '  const [banks, setBanks] = useState([]);\n'
            '  const [businessName, setBusinessName] = useState("");\n'
            '  const [bankCode, setBankCode] = useState("");\n'
            '  const [accountNumber, setAccountNumber] = useState("");',
            '  const [editingPayout, setEditingPayout] = useState(false);\n'
            '  const [banks, setBanks] = useState([]);\n'
            '  const [businessName, setBusinessName] = useState("");\n'
            '  const [bankCode, setBankCode] = useState("");\n'
            '  const [accountNumber, setAccountNumber] = useState("");\n\n'
            '  // The edit form used to always open blank, which made it look like saved\n'
            '  // payout details had vanished even when they hadn\'t. Pre-fill from what\'s\n'
            '  // actually on the salon record every time editing opens.\n'
            '  useEffect(() => {\n'
            '    if (!editingPayout || !salon) return;\n'
            '    setBusinessName(salon.name || "");\n'
            '    setBankCode(salon.bank_code || "");\n'
            '    setAccountNumber(salon.account_number || "");\n'
            '  }, [editingPayout, salon]);',
        ),
        (
            '              {!editingPayout ? (\n'
            '                <p className="text-sm" style={{ color: colors.creamDim }}>\n'
            '                  {salon.paystack_payouts_enabled\n'
            '                    ? "Payouts are connected. You can update your bank details anytime — for example if your account number changes, or after switching from test to live payments."\n'
            '                    : "Not connected yet — you won\'t receive automatic payouts until this is set up."}\n'
            '                </p>\n'
            '              ) : (',
            '              {!editingPayout ? (\n'
            '                <p className="text-sm" style={{ color: colors.creamDim }}>\n'
            '                  {salon.paystack_payouts_enabled\n'
            '                    ? `Payouts are connected${salon.account_number ? ` — account ending in ${salon.account_number.slice(-4)}` : ""}. You can update your bank details anytime — for example if your account number changes, or after switching from test to live payments.`\n'
            '                    : "Not connected yet — you won\'t receive automatic payouts until this is set up."}\n'
            '                </p>\n'
            '              ) : (',
        ),
    ],
    "App.jsx: pre-fill payout edit form + show verifiable account info",
)

print("\nALL DONE. Review with: git diff")
print('Then: git add -A && git commit -m "Fix payout details appearing to vanish on Profile" && git push')
