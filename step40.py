path = "frontend/src/App.jsx"
with open(path, "r") as f:
    src = f.read()

old = "                  {m.body}"
new = '''                  {m.body}
                  <p
                    className="text-[10px] mt-1"
                    style={{ color: mine ? "rgba(255,255,255,0.7)" : colors.creamDim, textAlign: "right" }}
                  >
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </p>'''

if old in src:
    assert src.count(old) == 1
    src = src.replace(old, new)
    with open(path, "w") as f:
        f.write(src)
    print("✅ App.jsx — chat messages now show a timestamp")
else:
    print("⏭️  Already updated")
