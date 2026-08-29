path = "frontend/src/App.jsx"
with open(path, "r") as f:
    src = f.read()

old = '''            <div className="mt-4 rounded-2xl px-4 py-4" style={{ border: `2px solid ${colors.hairline}` }}>
              <div className="flex items-center justify-between mb-2">
                <h3 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }} className="text-lg">Payout details</h3>
                {!editingPayout && (
                  <button onClick={() => { setEditingPayout(true); setConnectError(null); }} className="text-sm font-semibold" style={{ color: colors.hairline }}>
                    {salon.paystack_payouts_enabled ? "Update" : "Set up"}
                  </button>
                )}
              </div>

              {!editingPayout ? (
                <p className="text-sm" style={{ color: colors.creamDim }}>
                  {salon.paystack_payouts_enabled
                    ? `Payouts are connected${salon.account_number ? ` — account ending in ${salon.account_number.slice(-4)}` : ""}. You can update your bank details anytime — for example if your account number changes, or after switching from test to live payments.`
                    : "Not connected yet — you won't receive automatic payouts until this is set up."}
                </p>
              ) : (
                <div className="space-y-2">
                  <input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Business name"
                    className="w-full pb-2 text-base outline-none"
                    style={inputStyle}
                  />
                  <BankSelect
                    banks={banks}
                    value={bankCode}
                    onChange={(code) => { setBankCode(code); setResolvedName(null); }}
                    placeholder="Select bank"
                    className="w-full pb-2 text-base outline-none text-left"
                    style={inputStyle}
                  />
                  <input
                    value={accountNumber}
                    onChange={(e) => { setAccountNumber(e.target.value); setResolvedName(null); }}
                    onBlur={verifyPayoutAccount}
                    placeholder="Account number"
                    maxLength={10}
                    className="w-full pb-2 text-base outline-none"
                    style={inputStyle}
                  />
                  {resolving && <p className="text-xs" style={{ color: colors.creamDim }}>Verifying...</p>}
                  {resolvedName && <p className="text-xs font-semibold" style={{ color: colors.hairline }}>{resolvedName}</p>}
                  {connectError && <p className="text-sm" style={{ color: "#E07A5F" }}>{connectError}</p>}
                  <div className="flex gap-2 pt-1">
                    <button onClick={connectPayouts} disabled={connecting}
                      className="flex-1 py-2 rounded-full text-sm tap-glass"
                      style={{ background: colors.hairline, color: "#FFFFFF", fontWeight: 700 }}>
                      {connecting ? <Loader2 size={16} className="animate-spin" /> : "Save"}
                    </button>
                    <button onClick={() => setEditingPayout(false)}
                      className="flex-1 py-2 rounded-full text-sm tap-glass"
                      style={{ border: `2px solid ${colors.hairline}`, color: colors.creamDim }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}'''
new = '''          </>
        )}'''

if old in src:
    assert src.count(old) == 1
    src = src.replace(old, new)
    with open(path, "w") as f:
        f.write(src)
    print("✅ App.jsx — removed Payout details section from owner profile")
else:
    print("⏭️  Already removed")
