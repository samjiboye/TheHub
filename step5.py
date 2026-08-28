path = "frontend/src/App.jsx"
with open(path, "r") as f:
    lines = f.readlines()

edits = {
    4963: ('          setView("profile");\n', '          setView("salonDetail");\n'),
    5401: ('                onSelectSalon={(s) => { setSelectedSalon(s); setView("profile"); }}\n',
           '                onSelectSalon={(s) => { setSelectedSalon(s); setView("salonDetail"); }}\n'),
    5405: ('            {view === "profile" && selectedSalon && (\n',
           '            {view === "salonDetail" && selectedSalon && (\n'),
    5414: ('                <Header title="Sign in to book" onBack={() => setView("profile")} />\n',
           '                <Header title="Sign in to book" onBack={() => setView("salonDetail")} />\n'),
    5431: ('                onBack={() => setView("profile")}\n',
           '                onBack={() => setView("salonDetail")}\n'),
    5485: ('          onSelectSalon={(s) => { setSelectedSalon(s); setRole("customer"); setView("profile"); }}\n',
           '          onSelectSalon={(s) => { setSelectedSalon(s); setRole("customer"); setView("salonDetail"); }}\n'),
}

already_done = all(lines[ln - 1] == new for ln, (old, new) in edits.items())
if already_done:
    print("⏭️  Already patched — skipped")
else:
    applied = 0
    for ln, (old, new) in edits.items():
        idx = ln - 1
        if lines[idx] == old:
            lines[idx] = new
            applied += 1
        elif lines[idx] == new:
            pass
        else:
            raise SystemExit(f"❌ Line {ln} doesn't match expected content — stopping to avoid breaking anything.\nExpected: {old!r}\nFound:    {lines[idx]!r}")
    with open(path, "w") as f:
        f.writelines(lines)
    print(f"✅ App.jsx updated — {applied} line(s) fixed. Salon detail page and 'My Profile' no longer collide.")
