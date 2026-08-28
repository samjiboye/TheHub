path = "frontend/src/App.jsx"
with open(path, "r") as f:
    src = f.read()

old = '''        <div className="grid grid-cols-1 gap-3 mt-3">
          <div className="rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide" style={{ color: colors.creamDim, fontFamily: FONT_MONO }}>
              <TrendingUp size={13} /> Gross bookings
            </div>
            <p style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.6rem" }} className="mt-1">
              ₦{data.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl px-4 py-3" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
              <p className="text-xs" style={{ color: colors.creamDim }}>Platform commission ({Math.round((data.commissionRate ?? 0.10) * 100)}%)</p>
              <p style={{ color: colors.cream }} className="text-lg mt-1">-₦{data.commission.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl px-4 py-3" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
              <p className="text-xs" style={{ color: colors.creamDim }}>Your payout</p>
              <p style={{ color: colors.cream }} className="text-lg mt-1">₦{data.payout.toFixed(2)}</p>
            </div>
          </div>
        </div>'''

new = '''        <div className="grid grid-cols-1 gap-3 mt-3">
          <div className="rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide" style={{ color: colors.creamDim, fontFamily: FONT_MONO }}>
              <TrendingUp size={13} /> Completed bookings
            </div>
            <p style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.6rem" }} className="mt-1">
              {data.completedCount ?? 0}
            </p>
            <p className="text-xs mt-1" style={{ color: colors.creamDim }}>
              How many clients TheHub has sent your way, all time.
            </p>
          </div>
        </div>'''

if old in src:
    assert src.count(old) == 1
    src = src.replace(old, new)
    with open(path, "w") as f:
        f.write(src)
    print("✅ App.jsx updated — owner dashboard now shows a real completed-bookings count instead of ₦0 money cards")
else:
    print("⏭️  Already updated or text not found — skipped")
