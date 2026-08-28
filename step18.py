path = "frontend/src/App.jsx"
with open(path, "r") as f:
    src = f.read()

changes = []

old1 = '''  const [menuOpen, setMenuOpen] = useState(false);
  const iconBarRef = useRef(null);'''
new1 = '''  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const closeMenu = () => setMenuOpen(false);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("touchmove", closeMenu, { passive: true });
    return () => {
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("touchmove", closeMenu);
    };
  }, [menuOpen]);

  const iconBarRef = useRef(null);'''
if old1 in src:
    assert src.count(old1) == 1
    src = src.replace(old1, new1)
    changes.append("✅ Added auto-close on scroll/swipe while menu is open")
else:
    changes.append("⏭️  Scroll-close effect already added")

old2 = '''            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-60 rounded-2xl shadow-lg z-50 overflow-hidden"
                style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}` }}
              >'''
new2 = '''            {menuOpen && (
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            )}
            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-60 rounded-2xl shadow-lg z-50 overflow-hidden"
                style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}` }}
              >'''
if old2 in src:
    assert src.count(old2) == 1
    src = src.replace(old2, new2)
    changes.append("✅ Added tap-outside-to-close backdrop for the hamburger menu")
else:
    changes.append("⏭️  Backdrop already added")

old3 = 'function MyBookingsView({ token, onBack }) {'
new3 = 'function MyBookingsView({ token, onBack, onOpenSalon }) {'
if old3 in src:
    assert src.count(old3) == 1
    src = src.replace(old3, new3)
    changes.append("✅ MyBookingsView now accepts onOpenSalon prop")
else:
    changes.append("⏭️  MyBookingsView signature already updated")

old4 = '''              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: colors.cream }}>{b.service_name}</p>
                  <p className="text-xs" style={{ color: colors.creamDim }}>{b.salon_name}</p>
                  {b.location_type === "home" && (
                    <p className="text-xs mt-0.5" style={{ color: colors.gold }}>🏠 At your address</p>
                  )}
                </div>
                <span className="text-xs text-right" style={{ color: colors.creamDim }}>
                  {formatBookingDate(b.booking_date) && <>{formatBookingDate(b.booking_date)}<br /></>}
                  {b.time_slot}
                </span>
              </div>'''
new4 = '''              <div
                className="flex items-center justify-between tap-glass"
                onClick={() => onOpenSalon && onOpenSalon(b.salon_id)}
                style={{ cursor: onOpenSalon ? "pointer" : "default" }}
              >
                <div>
                  <p className="text-sm" style={{ color: colors.cream }}>{b.service_name}</p>
                  <p className="text-xs" style={{ color: colors.creamDim }}>{b.salon_name}</p>
                  {b.location_type === "home" && (
                    <p className="text-xs mt-0.5" style={{ color: colors.gold }}>🏠 At your address</p>
                  )}
                </div>
                <span className="text-xs text-right" style={{ color: colors.creamDim }}>
                  {formatBookingDate(b.booking_date) && <>{formatBookingDate(b.booking_date)}<br /></>}
                  {b.time_slot}
                </span>
              </div>'''
if old4 in src:
    assert src.count(old4) == 1
    src = src.replace(old4, new4)
    changes.append("✅ Booking rows are now tappable to open the salon's profile")
else:
    changes.append("⏭️  Booking row tap handler already added")

old5 = '''            {view === "myBookings" && customerAuth && (
              <MyBookingsView
                token={customerAuth.token}
                onBack={() => setView("home")}
              />
            )}'''
new5 = '''            {view === "myBookings" && customerAuth && (
              <MyBookingsView
                token={customerAuth.token}
                onBack={() => setView("home")}
                onOpenSalon={async (salonId) => {
                  try {
                    const salon = await apiFetch(`/salons/${salonId}`);
                    setSelectedSalon(salon);
                    setView("salonDetail");
                  } catch (e) {
                    console.error(e);
                  }
                }}
              />
            )}'''
if old5 in src:
    assert src.count(old5) == 1
    src = src.replace(old5, new5)
    changes.append("✅ Wired MyBookingsView to fetch and open the salon's profile on tap")
else:
    changes.append("⏭️  MyBookingsView call site already wired")

with open(path, "w") as f:
    f.write(src)

for c in changes:
    print(c)
