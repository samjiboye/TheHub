path = "frontend/src/App.jsx"
with open(path, "r") as f:
    src = f.read()

old = '''        {locationTag(salon) && (
          <p className="text-xs mt-0.5" style={{ color: colors.creamDim }}>
            {locationTag(salon)}
          </p>
        )}'''
new = '''        {locationTag(salon) && (
          <p className="text-xs mt-0.5 text-right" style={{ color: colors.creamDim }}>
            {locationTag(salon)}
          </p>
        )}'''

if old in src:
    assert src.count(old) == 1
    src = src.replace(old, new)
    with open(path, "w") as f:
        f.write(src)
    print("✅ App.jsx — location tag now right-aligned under the star rating")
else:
    print("⏭️  Already updated")
