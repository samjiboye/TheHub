#!/usr/bin/env python3
import sys

path = "frontend/src/App.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = [
    (
        '      const formData = new FormData();\n'
        '      formData.append("file", file);\n'
        '      const data = await apiFetch("/users/me/photo", {\n'
        '        method: "POST",\n'
        '        headers: { Authorization: `Bearer ${token}` },\n'
        '        body: formData,\n'
        '      });\n'
        '      setProfile((prev) => ({ ...prev, profile_photo_url: data.profile_photo_url }));',
        '      const formData = new FormData();\n'
        '      formData.append("file", file);\n'
        '      const res = await fetch(`${API_BASE}/users/me/photo`, {\n'
        '        method: "POST",\n'
        '        headers: { Authorization: `Bearer ${token}` },\n'
        '        body: formData,\n'
        '      });\n'
        '      const data = await res.json().catch(() => ({}));\n'
        '      if (!res.ok) throw new Error(data.error || "Upload failed");\n'
        '      setProfile((prev) => ({ ...prev, profile_photo_url: data.profile_photo_url }));',
    ),
    (
        '  const [headerWalletBalance, setHeaderWalletBalance] = useState(null);',
        '  const [headerWalletBalance, setHeaderWalletBalance] = useState(null);\n'
        '  const [customerPhotoUrl, setCustomerPhotoUrl] = useState(null);',
    ),
    (
        '    fetchBalance();\n'
        '    const interval = setInterval(fetchBalance, 15000);\n'
        '    return () => clearInterval(interval);\n'
        '  }, [role, customerAuth?.token, view]);',
        '    fetchBalance();\n'
        '    const interval = setInterval(fetchBalance, 15000);\n'
        '    return () => clearInterval(interval);\n'
        '  }, [role, customerAuth?.token, view]);\n'
        '  useEffect(() => {\n'
        '    if (role !== "customer" || !customerAuth?.token) { setCustomerPhotoUrl(null); return; }\n'
        '    apiFetch("/users/me", { headers: { Authorization: `Bearer ${customerAuth.token}` } })\n'
        '      .then((data) => setCustomerPhotoUrl(data.profile_photo_url || null))\n'
        '      .catch(() => {});\n'
        '  }, [role, customerAuth?.token, view]);',
    ),
    (
        '          <div>\n'
        '            <span style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.3rem", fontWeight: 700 }}>\n'
        '              TheHub\n'
        '            </span>',
        '          <div>\n'
        '            {role === "customer" && customerAuth && customerPhotoUrl ? (\n'
        '              <button onClick={() => setView("profile")} className="tap-glass block">\n'
        '                <img\n'
        '                  src={customerPhotoUrl}\n'
        '                  alt="Your profile"\n'
        '                  className="w-9 h-9 rounded-full object-cover"\n'
        '                  style={{ border: `2px solid ${colors.hairline}` }}\n'
        '                />\n'
        '              </button>\n'
        '            ) : (\n'
        '              <span style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.3rem", fontWeight: 700 }}>\n'
        '                TheHub\n'
        '              </span>\n'
        '            )}',
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

print("OK: patched 4 spots in App.jsx")
print("Review with: git diff")
print('Then: git add -A && git commit -m "Fix profile photo upload, show it in the header once uploaded" && git push')
