path = "frontend/src/App.jsx"
with open(path, "r") as f:
    src = f.read()

changes = []

old_block = '''                <div style={{ borderTop: `2px solid ${colors.hairline}` }} />
                {role === "customer" && customerAuth && (
                  <button
                    onClick={() => { setMenuOpen(false); setView("profile"); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm"
                    style={{ color: colors.cream }}
                  >
                    <UserCircle size={16} /> My Profile
                  </button>
                )}'''
new_block = '''                <div style={{ borderTop: `2px solid ${colors.hairline}` }} />
                {role === "customer" && !customerAuth && (
                  <button
                    onClick={() => { setMenuOpen(false); setView("auth"); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm"
                    style={{ color: colors.cream, fontWeight: 700 }}
                  >
                    <LogIn size={16} /> Log in / Sign up
                  </button>
                )}
                {role === "customer" && customerAuth && (
                  <button
                    onClick={() => { setMenuOpen(false); setView("profile"); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm"
                    style={{ color: colors.cream }}
                  >
                    <UserCircle size={16} /> My Profile
                  </button>
                )}'''
if old_block in src:
    assert src.count(old_block) == 1
    src = src.replace(old_block, new_block)
    changes.append("✅ Added 'Log in / Sign up' to hamburger menu for logged-out customers")
else:
    changes.append("⏭️  Login menu item already added")

with open(path, "w") as f:
    f.write(src)

for c in changes:
    print(c)
