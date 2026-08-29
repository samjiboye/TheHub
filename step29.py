path = "frontend/src/App.jsx"
with open(path, "r") as f:
    src = f.read()

changes = []

old_block = '''  const [customerAuth, setCustomerAuth] = useState(() => {
    try {
      const saved = localStorage.getItem("customerAuth");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }); // { token, user }
  const [unratedQueue, setUnratedQueue] = useState([]);
  const [ratingPopupDismissed, setRatingPopupDismissed] = useState(false);

  useEffect(() => {
    if (!customerAuth?.token) return;
    apiFetch("/reviews/unrated", { headers: { Authorization: `Bearer ${customerAuth.token}` } })
      .then((data) => setUnratedQueue(data.unrated || []))
      .catch(() => {});
  }, [customerAuth?.token]);

  const [ownerAuth, setOwnerAuth] = useState(() => {
    try {
      const saved = localStorage.getItem("ownerAuth");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }); // { token, user }'''
new_block = '''  // One unified account works as BOTH customer and owner — no more
  // separate logins. "role" below is purely a UI-mode toggle for which
  // screens show; it no longer determines which account is logged in.
  // Old separate "customerAuth"/"ownerAuth" localStorage keys are read
  // as a fallback so existing logged-in sessions aren't signed out by
  // this change.
  const [auth, setAuth] = useState(() => {
    try {
      const saved = localStorage.getItem("auth") || localStorage.getItem("customerAuth") || localStorage.getItem("ownerAuth");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }); // { token, user }
  function persistAuth(value) {
    setAuth(value);
    try {
      if (value) localStorage.setItem("auth", JSON.stringify(value));
      else localStorage.removeItem("auth");
    } catch (e) {}
  }
  const customerAuth = auth;
  const ownerAuth = auth;
  const setCustomerAuth = persistAuth;
  const setOwnerAuth = persistAuth;

  const [unratedQueue, setUnratedQueue] = useState([]);
  const [ratingPopupDismissed, setRatingPopupDismissed] = useState(false);

  useEffect(() => {
    if (!customerAuth?.token) return;
    apiFetch("/reviews/unrated", { headers: { Authorization: `Bearer ${customerAuth.token}` } })
      .then((data) => setUnratedQueue(data.unrated || []))
      .catch(() => {});
  }, [customerAuth?.token]);'''
if old_block in src:
    assert src.count(old_block) == 1
    src = src.replace(old_block, new_block)
    changes.append("✅ Unified customerAuth and ownerAuth into a single shared account")
else:
    changes.append("⏭️  Auth already unified")

old_logout1 = '''                        localStorage.removeItem("customerAuth");'''
new_logout1 = '''                        localStorage.removeItem("customerAuth");
                        localStorage.removeItem("auth");'''
if 'localStorage.removeItem("customerAuth");\n                        localStorage.removeItem("auth");' not in src and old_logout1 in src:
    src = src.replace(old_logout1, new_logout1, 1)
    changes.append("✅ Logout now clears the unified auth key")
else:
    changes.append("⏭️  Logout already clears unified key")

old_logout2 = '''              onDeleted={() => {
                localStorage.removeItem("ownerAuth");
                setOwnerAuth(null);
              }}'''
new_logout2 = '''              onDeleted={() => {
                localStorage.removeItem("ownerAuth");
                localStorage.removeItem("auth");
                setOwnerAuth(null);
              }}'''
if old_logout2 in src:
    assert src.count(old_logout2) == 1
    src = src.replace(old_logout2, new_logout2)
    changes.append("✅ Owner profile delete-account flow also clears unified auth key")
else:
    changes.append("⏭️  Owner delete-account flow already updated")

old_lsb = '''      const saved = JSON.parse(localStorage.getItem("customerAuth") || localStorage.getItem("ownerAuth") || "null");'''
new_lsb = '''      const saved = JSON.parse(localStorage.getItem("auth") || localStorage.getItem("customerAuth") || localStorage.getItem("ownerAuth") || "null");'''
if old_lsb in src:
    assert src.count(old_lsb) == 1
    src = src.replace(old_lsb, new_lsb)
    changes.append("✅ LocationShareBlock reads the unified auth key")
else:
    changes.append("⏭️  LocationShareBlock already updated")

old_settings = '''function SettingsView({ onBack, onWatchIntro }) {
  const savedCustomer = JSON.parse(localStorage.getItem("customerAuth") || "null");
  const savedOwner = JSON.parse(localStorage.getItem("ownerAuth") || "null");
  const user = savedCustomer?.user || savedOwner?.user || {};
  const ownerToken = savedOwner?.token;
'''
new_settings = '''function SettingsView({ onBack, onWatchIntro }) {
  const saved = JSON.parse(localStorage.getItem("auth") || localStorage.getItem("customerAuth") || localStorage.getItem("ownerAuth") || "null");
  const user = saved?.user || {};
  const ownerToken = saved?.token;
'''
if old_settings in src:
    assert src.count(old_settings) == 1
    src = src.replace(old_settings, new_settings)
    changes.append("✅ SettingsView reads the single unified account")
else:
    changes.append("⏭️  SettingsView already updated")

with open(path, "w") as f:
    f.write(src)

for c in changes:
    print(c)
