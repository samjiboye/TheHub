#!/usr/bin/env python3
import sys

path = "frontend/src/App.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = [
    (
        '        <div\n'
        '          className="px-5 py-4 rounded-[50%_50%_50%_10%/60%_60%_40%_40%] flex items-center justify-center shadow-lg"\n'
        '          style={{ background: "#FFFFFF" }}\n'
        '        >\n'
        '          <span\n'
        '            className="text-sm font-extrabold tracking-wide"\n'
        '            style={{ color: colors.hairline, fontFamily: FONT_DISPLAY }}\n'
        '          >\n'
        '            TheHub\n'
        '          </span>\n'
        '        </div>',
        '        <div\n'
        '          className="px-4 py-2.5 rounded-[50%_50%_50%_10%/60%_60%_40%_40%] flex items-center gap-2 shadow-lg"\n'
        '          style={{ background: "#FFFFFF" }}\n'
        '        >\n'
        '          <img src="/icon-192.png" alt="" className="w-6 h-6 rounded-lg" />\n'
        '          <span\n'
        '            className="text-sm font-extrabold tracking-wide"\n'
        '            style={{ color: colors.hairline, fontFamily: FONT_DISPLAY }}\n'
        '          >\n'
        '            TheHub\n'
        '          </span>\n'
        '        </div>',
    ),
    (
        '              <div\n'
        '                className="w-44 h-36 rounded-[50%_50%_50%_10%/60%_60%_40%_40%] flex items-center justify-center shadow-2xl"\n'
        '                style={{ background: "#FFFFFF" }}\n'
        '              >\n'
        '                <span\n'
        '                  className="text-2xl font-extrabold"\n'
        '                  style={{ color: colors.hairline, fontFamily: FONT_DISPLAY }}\n'
        '                >\n'
        '                  TheHub\n'
        '                </span>\n'
        '              </div>',
        '              <div\n'
        '                className="w-44 h-36 rounded-[50%_50%_50%_10%/60%_60%_40%_40%] flex flex-col items-center justify-center gap-1.5 shadow-2xl"\n'
        '                style={{ background: "#FFFFFF" }}\n'
        '              >\n'
        '                <img src="/icon-192.png" alt="" className="w-12 h-12 rounded-2xl" />\n'
        '                <span\n'
        '                  className="text-xl font-extrabold"\n'
        '                  style={{ color: colors.hairline, fontFamily: FONT_DISPLAY }}\n'
        '                >\n'
        '                  TheHub\n'
        '                </span>\n'
        '              </div>',
    ),
]

for old, new in replacements:
    count = content.count(old)
    if count != 1:
        print(f"FAILED: anchor not found exactly once (found {count})")
        print("----- anchor -----")
        print(old[:300])
        print("------------------")
        sys.exit(1)
    content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK: patched 2 onboarding badges in App.jsx")
print("Review with: git diff")
print('Then: git add -A && git commit -m "Use real logo icon in onboarding badges" && git push')
