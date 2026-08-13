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
            "function OwnerProfileView({ token, onBack, onDeleted }) {",
            "function OwnerProfileView({ token, onBack, onDeleted, onOpenWallet }) {",
        ),
        (
            '            </div>\n\n'
            '            <div className="mt-8 rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>\n'
            '              <div className="flex items-center justify-between mb-3">\n'
            '                <h3 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }} className="text-lg">Business details</h3>',
            '            </div>\n\n'
            '            <div className="mt-8 rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>\n'
            '              <div className="flex items-center justify-between">\n'
            '                <div>\n'
            '                  <h3 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }} className="text-lg">Wallet</h3>\n'
            '                  <p className="text-xs mt-1" style={{ color: colors.creamDim }}>\n'
            '                    Balance, loyalty points, and your referral code\n'
            '                  </p>\n'
            '                </div>\n'
            '                <button\n'
            '                  onClick={onOpenWallet}\n'
            '                  className="shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold tap-glass"\n'
            '                  style={{ background: colors.hairline, color: "#FFFFFF" }}\n'
            '                >\n'
            '                  Open\n'
            '                </button>\n'
            '              </div>\n'
            '            </div>\n\n'
            '            <div className="mt-8 rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>\n'
            '              <div className="flex items-center justify-between mb-3">\n'
            '                <h3 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }} className="text-lg">Business details</h3>',
        ),
        (
            '            ) : ownerPage === "profile" ? (\n'
            '              <OwnerProfileView\n'
            '              token={ownerAuth.token}\n'
            '              onBack={() => setOwnerPage("dashboard")}\n'
            '              onDeleted={() => {\n'
            '                localStorage.removeItem("ownerAuth");\n'
            '                setOwnerAuth(null);\n'
            '              }}\n'
            '            />\n'
            '            ) : ownerPage === "marketplace" ? (\n'
            '              <MarketplaceView token={ownerAuth.token} onBack={() => setOwnerPage("dashboard")} />\n'
            '            ) : (\n'
            '              <OwnerDashboard token={ownerAuth.token} />\n'
            '            )',
            '            ) : ownerPage === "profile" ? (\n'
            '              <OwnerProfileView\n'
            '              token={ownerAuth.token}\n'
            '              onBack={() => setOwnerPage("dashboard")}\n'
            '              onDeleted={() => {\n'
            '                localStorage.removeItem("ownerAuth");\n'
            '                setOwnerAuth(null);\n'
            '              }}\n'
            '              onOpenWallet={() => setOwnerPage("wallet")}\n'
            '            />\n'
            '            ) : ownerPage === "marketplace" ? (\n'
            '              <MarketplaceView token={ownerAuth.token} onBack={() => setOwnerPage("dashboard")} />\n'
            '            ) : ownerPage === "wallet" ? (\n'
            '              <WalletView token={ownerAuth.token} onBack={() => setOwnerPage("profile")} />\n'
            '            ) : (\n'
            '              <OwnerDashboard token={ownerAuth.token} />\n'
            '            )',
        ),
    ],
    "App.jsx: Wallet card in owner Profile, opens full Wallet screen",
)

print("\nALL DONE. Review with: git diff")
print('Then: git add -A && git commit -m "Add Wallet card to owner Profile" && git push')
