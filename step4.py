path = "frontend/src/App.jsx"
with open(path, "r") as f:
    src = f.read()

old = "Show this to a client once they arrive for their service. Same code all day, changes tomorrow."
new = "Show this to a client once they arrive for their service. Changes every hour, so give it fresh each time."

if old in src:
    assert src.count(old) == 1
    src = src.replace(old, new)
    with open(path, "w") as f:
        f.write(src)
    print("✅ App.jsx updated — fixed owner code card copy")
else:
    print("⏭️  Already updated or text not found — skipped")
