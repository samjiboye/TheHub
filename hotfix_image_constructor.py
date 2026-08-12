#!/usr/bin/env python3
import sys

path = "frontend/src/App.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = "const img = new Image();"
new = "const img = new window.Image();"

count = content.count(old)
if count != 1:
    print(f"FAILED: expected 1 occurrence, found {count}")
    sys.exit(1)

content = content.replace(old, new)
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"OK: patched {count} occurrence in {path}")
