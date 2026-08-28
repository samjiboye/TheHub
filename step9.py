path = "frontend/src/App.jsx"
with open(path, "r") as f:
    src = f.read()

old = '''        <div className="flex items-center gap-1.5 mt-4 text-xs" style={{ color: colors.creamDim }}>
          <ShieldCheck size={13} />
          Commission is only taken on completed bookings — no charge for empty chairs.
        </div>

        {data.nextTierAt != null && (
          <div className="mt-4 rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold" style={{ color: colors.cream }}>📉 Lower commission tier</p>
              <p className="text-xs" style={{ color: colors.creamDim }}>{data.completedCount}/{data.nextTierAt} bookings</p>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ background: colors.panelLight, height: 10 }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (data.completedCount / data.nextTierAt) * 100)}%`, background: colors.hairline }}
              />
            </div>
            <p className="text-xs mt-2" style={{ color: colors.creamDim }}>
              {data.nextTierAt - data.completedCount} more completed booking{data.nextTierAt - data.completedCount === 1 ? "" : "s"} drops your commission to {Math.round(data.nextTierRate * 100)}%.
            </p>
          </div>
        )}

        <div className="mt-6 rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
          <h3 className="text-sm font-bold mb-1" style={{ color: colors.cream }}>Your booking QR code</h3>
          <p className="text-xs mb-3" style={{ color: colors.creamDim }}>'''

new = '''        <div className="mt-6 rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
          <h3 className="text-sm font-bold mb-1" style={{ color: colors.cream }}>Your booking QR code</h3>
          <p className="text-xs mb-3" style={{ color: colors.creamDim }}>'''

if old in src:
    assert src.count(old) == 1
    src = src.replace(old, new)
    with open(path, "w") as f:
        f.write(src)
    print("✅ App.jsx updated — removed leftover commission-tier UI")
else:
    print("⏭️  Already updated or text not found — skipped")
