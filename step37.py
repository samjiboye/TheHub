path = "frontend/src/App.jsx"
with open(path, "r") as f:
    src = f.read()

old = '''        {locationTag(salon) && (
          <p className="text-xs mt-0.5 text-right" style={{ color: colors.creamDim }}>
            {locationTag(salon)}
          </p>
        )}
        {salon.services && salon.services.length > 0 && (
          <p className="text-sm mt-1" style={{ color: colors.creamDim }}>
            {salon.services.slice(0, 3).map((s) => s.name).join(" · ")}
            {salon.services.length > 3 ? ` +${salon.services.length - 3} more` : ""}
          </p>
        )}'''
new = '''        {salon.services && salon.services.length > 0 && (
          <p className="text-sm mt-1" style={{ color: colors.creamDim }}>
            {salon.services.slice(0, 3).map((s) => s.name).join(" · ")}
            {salon.services.length > 3 ? ` +${salon.services.length - 3} more` : ""}
          </p>
        )}
        {locationTag(salon) && (
          <p className="text-xs mt-0.5 text-right" style={{ color: colors.creamDim }}>
            {locationTag(salon)}
          </p>
        )}'''

if old in src:
    assert src.count(old) == 1
    src = src.replace(old, new)
    with open(path, "w") as f:
        f.write(src)
    print("✅ App.jsx — service list now sits right under the name, location tag moved below it")
else:
    print("⏭️  Already updated")
