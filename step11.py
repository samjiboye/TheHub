path = "frontend/src/App.jsx"
with open(path, "r") as f:
    src = f.read()

changes = []

old1 = '''            {role === "customer" && customerAuth && headerWalletBalance !== null && (
              <button
                onClick={() => setView("wallet")}
                className="flex items-center gap-1 mt-0.5 tap-glass"
                style={{ color: colors.creamDim, fontSize: "0.8rem", fontWeight: 700 }}
              >
                <Wallet size={12} /> ₦{Number(headerWalletBalance).toLocaleString()}
              </button>
            )}
'''
if old1 in src:
    assert src.count(old1) == 1
    src = src.replace(old1, "")
    changes.append("✅ Removed header wallet balance display")
else:
    changes.append("⏭️  Header wallet balance already removed")

old2 = '''                {role === "customer" && customerAuth && (
                  <button
                    onClick={() => { setMenuOpen(false); setView("wallet"); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm"
                    style={{ color: colors.cream }}
                  >
                    <Wallet size={16} /> Wallet
                  </button>
                )}
'''
if old2 in src:
    assert src.count(old2) == 1
    src = src.replace(old2, "")
    changes.append("✅ Removed 'Wallet' from hamburger menu")
else:
    changes.append("⏭️  Hamburger wallet link already removed")

old3 = '''            <div className="mt-8 rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }} className="text-lg">Wallet</h3>
                  <p className="text-xs mt-1" style={{ color: colors.creamDim }}>
                    Balance, loyalty points, and your referral code
                  </p>
                </div>
                <button
                  onClick={onOpenWallet}
                  className="shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold tap-glass"
                  style={{ background: colors.hairline, color: "#FFFFFF" }}
                >
                  Open
                </button>
              </div>
            </div>

'''
if old3 in src:
    assert src.count(old3) == 1
    src = src.replace(old3, "")
    changes.append("✅ Removed 'Wallet' card from owner profile")
else:
    changes.append("⏭️  Owner profile wallet card already removed")

old4 = '''            ) : ownerPage === "wallet" ? (
              <WalletView token={ownerAuth.token} onBack={() => setOwnerPage("profile")} />
            ) : ('''
new4 = '''            ) : ('''
if old4 in src:
    assert src.count(old4) == 1
    src = src.replace(old4, new4)
    changes.append("✅ Removed owner 'wallet' page route")
else:
    changes.append("⏭️  Owner wallet route already removed")

old5 = '''            {view === "wallet" && customerAuth && (
              <WalletView
                token={customerAuth.token}
                onBack={() => setView("home")}
              />
            )}
'''
if old5 in src:
    assert src.count(old5) == 1
    src = src.replace(old5, "")
    changes.append("✅ Removed customer 'wallet' view route")
else:
    changes.append("⏭️  Customer wallet route already removed")

old6 = '''  useEffect(() => {
    if (role !== "customer" || !customerAuth?.token) { setHeaderWalletBalance(null); return; }
    const fetchBalance = () => {
      apiFetch("/wallet/me", { headers: { Authorization: `Bearer ${customerAuth.token}` } })
        .then((data) => setHeaderWalletBalance(data.balance || 0))
        .catch(() => {});
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 15000);
    return () => clearInterval(interval);
  }, [role, customerAuth?.token, view]);
'''
if old6 in src:
    assert src.count(old6) == 1
    src = src.replace(old6, "")
    changes.append("✅ Removed header wallet balance polling")
else:
    changes.append("⏭️  Header balance polling already removed")

old7 = '''    } else if (params.get("wallet_success")) {
      setRole("customer");
      setView("wallet");
'''
new7 = '''    } else if (params.get("wallet_success")) {
      setRole("customer");
'''
if old7 in src:
    assert src.count(old7) == 1
    src = src.replace(old7, new7)
    changes.append("✅ Cleaned up leftover wallet_success redirect")
else:
    changes.append("⏭️  wallet_success redirect already cleaned up")

with open(path, "w") as f:
    f.write(src)

for c in changes:
    print(c)
