changes = []

conv_path = "backend/routes/conversations.js"
with open(conv_path, "r") as f:
    conv = f.read()

old_start = '''router.post("/start", requireAuth, async (req, res) => {
  if (req.user.role !== "customer") return res.status(403).json({ error: "Only customers can start a conversation." });
  const { salon_id } = req.body;
  if (!salon_id) return res.status(400).json({ error: "salon_id is required" });
  try {
    const { rows: salonRows } = await db.query("SELECT id FROM salons WHERE id = $1", [salon_id]);
    if (!salonRows[0]) return res.status(404).json({ error: "Salon not found" });

    const { rows } = await db.query('''
new_start = '''router.post("/start", requireAuth, async (req, res) => {
  if (req.user.role !== "customer") return res.status(403).json({ error: "Only customers can start a conversation." });
  const { salon_id } = req.body;
  if (!salon_id) return res.status(400).json({ error: "salon_id is required" });
  try {
    const { rows: salonRows } = await db.query("SELECT id FROM salons WHERE id = $1", [salon_id]);
    if (!salonRows[0]) return res.status(404).json({ error: "Salon not found" });

    const { rows: hasBookedRows } = await db.query(
      "SELECT 1 FROM bookings WHERE customer_id = $1 AND salon_id = $2 LIMIT 1",
      [req.user.id, salon_id]
    );
    if (!hasBookedRows[0]) {
      return res.status(403).json({ error: "You can message a salon once you've booked with them." });
    }

    const { rows } = await db.query('''
if old_start in conv:
    assert conv.count(old_start) == 1
    conv = conv.replace(old_start, new_start)
    with open(conv_path, "w") as f:
        f.write(conv)
    changes.append("✅ conversations.js — chat now requires an existing booking with that salon")
else:
    changes.append("⏭️  Backend chat restriction already added")

app_path = "frontend/src/App.jsx"
with open(app_path, "r") as f:
    src = f.read()

old_sig = "function ProfileView({ salon, onBack, onBook, onMessage }) {"
new_sig = "function ProfileView({ salon, onBack, onBook }) {"
if old_sig in src:
    assert src.count(old_sig) == 1
    src = src.replace(old_sig, new_sig)
    changes.append("✅ App.jsx — ProfileView no longer accepts onMessage")
else:
    changes.append("⏭️  ProfileView signature already reverted")

old_button = '''
        {onMessage && (
          <button
            onClick={onMessage}
            className="flex items-center gap-2 mt-4 px-4 py-2.5 rounded-full text-sm font-semibold tap-glass"
            style={{ background: colors.panelLight, color: textColor, border: `2px solid ${heroTheme ? "rgba(255,255,255,0.4)" : colors.hairline}` }}
          >
            <MessageCircle size={16} /> Message this salon
          </button>
        )}
'''
if old_button in src:
    assert src.count(old_button) == 1
    src = src.replace(old_button, "\n")
    changes.append("✅ App.jsx — removed 'Message this salon' button from salon profile")
else:
    changes.append("⏭️  Message button already removed")

old_callsite = '''            {view === "salonDetail" && selectedSalon && (
              <ProfileView
                salon={selectedSalon}
                onBack={() => setView("home")}
                onBook={(svc) => { setSelectedService(svc); setView(customerAuth ? "booking" : "auth"); }}
                onMessage={
                  customerAuth
                    ? async () => {
                        if (startingChat) return;
                        setStartingChat(true);
                        try {
                          const convo = await apiFetch("/conversations/start", {
                            method: "POST",
                            headers: { Authorization: `Bearer ${customerAuth.token}` },
                            body: JSON.stringify({ salon_id: selectedSalon.id }),
                          });
                          setActiveConversationId(convo.id);
                          setChatBackView("salonDetail");
                          setView("chat");
                        } catch (e) {
                          console.error(e);
                        } finally {
                          setStartingChat(false);
                        }
                      }
                    : () => setView("auth")
                }
              />
            )}'''
new_callsite = '''            {view === "salonDetail" && selectedSalon && (
              <ProfileView
                salon={selectedSalon}
                onBack={() => setView("home")}
                onBook={(svc) => { setSelectedService(svc); setView(customerAuth ? "booking" : "auth"); }}
              />
            )}'''
if old_callsite in src:
    assert src.count(old_callsite) == 1
    src = src.replace(old_callsite, new_callsite)
    changes.append("✅ App.jsx — removed message wiring from salon profile call site")
else:
    changes.append("⏭️  ProfileView call site already reverted")

old_top_row = '''            <div
              key={b.id}
              className="flex flex-col px-4 py-3 rounded-xl"
              style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}
            >
              <div
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
              </div>
'''
new_top_row = '''            <div
              key={b.id}
              className="flex flex-col px-4 py-3 rounded-xl"
              style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className="flex items-center justify-between tap-glass flex-1"
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
                </div>
                {onOpenChat && (
                  <button
                    onClick={() => onOpenChat(b)}
                    className="shrink-0 p-2 rounded-full tap-glass"
                    style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}` }}
                    aria-label="Message this salon"
                  >
                    <MessageCircle size={16} color={colors.cream} />
                  </button>
                )}
              </div>
'''
if old_top_row in src:
    assert src.count(old_top_row) == 1
    src = src.replace(old_top_row, new_top_row)
    changes.append("✅ App.jsx — added message icon to each booking on My Bookings")
else:
    changes.append("⏭️  Message icon already added to booking cards")

old_view_sig = "function MyBookingsView({ token, onBack, onOpenSalon }) {"
new_view_sig = "function MyBookingsView({ token, onBack, onOpenSalon, onOpenChat: onOpenChatProp }) {"
if old_view_sig in src:
    assert src.count(old_view_sig) == 1
    src = src.replace(old_view_sig, new_view_sig)
    changes.append("✅ App.jsx — MyBookingsView now accepts onOpenChat")
else:
    changes.append("⏭️  MyBookingsView signature already updated")

old_checkin_fn_anchor = '''  async function submitCheckIn(bookingId) {'''
new_checkin_fn_anchor = '''  async function openChatFor(booking) {
    try {
      const convo = await apiFetch("/conversations/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ salon_id: booking.salon_id }),
      });
      onOpenChatProp && onOpenChatProp(convo.id);
    } catch (e) {
      console.error(e);
    }
  }
  const onOpenChat = onOpenChatProp ? openChatFor : null;

  async function submitCheckIn(bookingId) {'''
if old_checkin_fn_anchor in src:
    assert src.count(old_checkin_fn_anchor) == 1
    src = src.replace(old_checkin_fn_anchor, new_checkin_fn_anchor)
    changes.append("✅ App.jsx — added openChatFor handler in My Bookings")
else:
    changes.append("⏭️  openChatFor handler already added")

old_mybookings_callsite = '''            {view === "myBookings" && customerAuth && (
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
new_mybookings_callsite = '''            {view === "myBookings" && customerAuth && (
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
                onOpenChat={(convoId) => {
                  setActiveConversationId(convoId);
                  setChatBackView("myBookings");
                  setView("chat");
                }}
              />
            )}'''
if old_mybookings_callsite in src:
    assert src.count(old_mybookings_callsite) == 1
    src = src.replace(old_mybookings_callsite, new_mybookings_callsite)
    changes.append("✅ App.jsx — wired chat icon to open the conversation directly")
else:
    changes.append("⏭️  MyBookingsView call site already wired for chat")

with open(app_path, "w") as f:
    f.write(src)

for c in changes:
    print(c)
