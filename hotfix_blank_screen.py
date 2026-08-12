#!/usr/bin/env python3
import sys

path = "frontend/src/App.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = "const cat = CATEGORIES.find((c) => c.name === salon.category);"
new = "const cat = CATEGORIES.find((c) => c.name === salon.category) || { icon: Sparkles };"

count = content.count(old)
if count != 2:
    print(f"FAILED: expected 2 occurrences, found {count}")
    sys.exit(1)

content = content.replace(old, new)
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"OK: patched {count} occurrences in {path}")
