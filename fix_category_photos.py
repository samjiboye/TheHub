#!/usr/bin/env python3
import sys

path = "frontend/src/App.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '  { name: "Piercing", icon: Gem, photo: null },\n  { name: "Tattoos", icon: PenTool, photo: null },'
new = (
    '  { name: "Piercing", icon: Gem, photo: "https://images.pexels.com/photos/10005259/pexels-photo-10005259.jpeg" },\n'
    '  { name: "Tattoos", icon: PenTool, photo: "https://images.pexels.com/photos/35714996/pexels-photo-35714996.jpeg" },'
)

count = content.count(old)
if count != 1:
    print(f"FAILED: anchor not found exactly once (found {count})")
    sys.exit(1)

content = content.replace(old, new)
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK: added real photos for Piercing and Tattoos")
print("Review with: git diff")
print('Then: git add -A && git commit -m "Add real photos for Piercing and Tattoos categories" && git push')
