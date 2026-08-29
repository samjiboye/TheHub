changes = []

conv_path = "backend/routes/conversations.js"
with open(conv_path, "r") as f:
    conv = f.read()

old_start = '''// POST /conversations/start — customer only. Finds the existing thread with
// this salon, or creates one if this is their first message ever to it.
router.post("/start", requireAuth, async (req, res) => {
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

    const { rows } = await db.query(
      `INSERT INTO conversations (customer_id, salon_id) VALUES ($1, $2)
       ON CONFLICT (customer_id, salon_id) DO UPDATE SET customer_id = EXCLUDED.customer_id
       RETURNING *`,
      [req.user.id, salon_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't start that conversation." });
  }
});'''
new_start = '''// POST /conversations/start — either a customer or a salon owner can start
// the thread, as long as a real booking connects them. Customers just pass
// salon_id (their own id is used automatically); owners pass both salon_id
// (their salon) and customer_id (whoever they're messaging).
router.post("/start", requireAuth, async (req, res) => {
  let { salon_id, customer_id } = req.body;
  if (!salon_id) return res.status(400).json({ error: "salon_id is required" });
  try {
    const { rows: salonRows } = await db.query("SELECT id, owner_id FROM salons WHERE id = $1", [salon_id]);
    const salon = salonRows[0];
    if (!salon) return res.status(404).json({ error: "Salon not found" });

    if (req.user.role === "customer") {
      customer_id = req.user.id;
    } else if (req.user.role === "owner") {
      if (salon.owner_id !== req.user.id) return res.status(403).json({ error: "Not your salon." });
      if (!customer_id) return res.status(400).json({ error: "customer_id is required" });
    } else {
      return res.status(403).json({ error: "You can't start a conversation." });
    }

    const { rows: hasBookedRows } = await db.query(
      "SELECT 1 FROM bookings WHERE customer_id = $1 AND salon_id = $2 LIMIT 1",
      [customer_id, salon_id]
    );
    if (!hasBookedRows[0]) {
      return res.status(403).json({ error: "This person hasn't booked this salon yet." });
    }

    const { rows } = await db.query(
      `INSERT INTO conversations (customer_id, salon_id) VALUES ($1, $2)
       ON CONFLICT (customer_id, salon_id) DO UPDATE SET customer_id = EXCLUDED.customer_id
       RETURNING *`,
      [customer_id, salon_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't start that conversation." });
  }
});'''
if old_start in conv:
    assert conv.count(old_start) == 1
    conv = conv.replace(old_start, new_start)
    with open(conv_path, "w") as f:
        f.write(conv)
    changes.append("✅ conversations.js — both customers and owners can now start a conversation")
else:
    changes.append("⏭️  Backend already allows both roles to start a conversation")

app_path = "frontend/src/App.jsx"
with open(app_path, "r") as f:
    src = f.read()

old_ownerdash_sig = "function OwnerDashboard({ token }) {"
new_ownerdash_sig = "function OwnerDashboard({ token, onOpenChat: onOpenChatProp }) {"
if old_ownerdash_sig in src:
    assert src.count(old_ownerdash_sig) == 1
    src = src.replace(old_ownerdash_sig, new_ownerdash_sig)
    changes.append("✅ App.jsx — OwnerDashboard now accepts onOpenChat")
else:
    changes.append("⏭️  OwnerDashboard signature already updated")

old_owner_state_anchor = '''  const [viewingCustomer, setViewingCustomer] = useState(null); // { id, name } | null'''
new_owner_state_anchor = '''  const [viewingCustomer, setViewingCustomer] = useState(null); // { id, name } | null
  const [openingChatId, setOpeningChatId] = useState(null);
  const [openChatErrors, setOpenChatErrors] = useState({});

  async function openChatWithCustomer(booking) {
    setOpeningChatId(booking.id);
    setOpenChatErrors((prev) => ({ ...prev, [booking.id]: null }));
    try {
      const convo = await apiFetch("/conversations/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ salon_id: booking.salon_id, customer_id: booking.customer_id }),
      });
      onOpenChatProp && onOpenChatProp(convo.id);
    } catch (e) {
      setOpenChatErrors((prev) => ({ ...prev, [booking.id]: e.message || "Couldn't open this chat." }));
    } finally {
      setOpeningChatId(null);
    }
  }'''
if old_owner_state_anchor in src:
    assert src.count(old_owner_state_anchor) == 1
    src = src.replace(old_owner_state_anchor, new_owner_state_anchor)
    changes.append("✅ App.jsx — added owner-side chat-opening state and handler")
else:
    changes.append("⏭️  Owner chat state already added")

old_owner_top_row = '''              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setViewingCustomer({ id: a.customer_id, name: a.customer_name })}
                  className="flex items-center gap-3 text-left tap-glass"
                >
                  {a.customer_photo_url ? (
                    <img
                      src={a.customer_photo_url}
                      alt={a.customer_name}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                      style={{ border: `2px solid ${colors.hairline}` }}
                    />
                  ) : (
                    <div className="p-2 rounded-full" style={{ background: colors.panelLight }}>
                      <Users size={14} color={colors.hairline} />
                    </div>
                  )}
                  <div>
                    <p className="text-sm" style={{ color: colors.cream }}>{a.service_name}</p>
                    <p className="text-xs underline" style={{ color: colors.creamDim }}>{a.customer_name}</p>
                    {a.location_type === "home" && (
                      <p className="text-xs mt-0.5" style={{ color: colors.gold }}>🏠 {a.customer_address}</p>
                    )}
                  </div>
                </button>
                <span className="text-xs text-right shrink-0" style={{ color: colors.creamDim }}>
                  {formatBookingDate(a.booking_date) && <>{formatBookingDate(a.booking_date)}<br /></>}
                  {a.time_slot}
                </span>
              </div>
'''
new_owner_top_row = '''              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setViewingCustomer({ id: a.customer_id, name: a.customer_name })}
                  className="flex items-center gap-3 text-left tap-glass"
                >
                  {a.customer_photo_url ? (
                    <img
                      src={a.customer_photo_url}
                      alt={a.customer_name}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                      style={{ border: `2px solid ${colors.hairline}` }}
                    />
                  ) : (
                    <div className="p-2 rounded-full" style={{ background: colors.panelLight }}>
                      <Users size={14} color={colors.hairline} />
                    </div>
                  )}
                  <div>
                    <p className="text-sm" style={{ color: colors.cream }}>{a.service_name}</p>
                    <p className="text-xs underline" style={{ color: colors.creamDim }}>{a.customer_name}</p>
                    {a.location_type === "home" && (
                      <p className="text-xs mt-0.5" style={{ color: colors.gold }}>🏠 {a.customer_address}</p>
                    )}
                  </div>
                </button>
                <div className="flex items-start gap-2 shrink-0">
                  <span className="text-xs text-right" style={{ color: colors.creamDim }}>
                    {formatBookingDate(a.booking_date) && <>{formatBookingDate(a.booking_date)}<br /></>}
                    {a.time_slot}
                  </span>
                  {onOpenChatProp && (
                    <button
                      onClick={() => openChatWithCustomer(a)}
                      disabled={openingChatId === a.id}
                      className="p-2 rounded-full tap-glass"
                      style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}` }}
                      aria-label="Message this client"
                    >
                      {openingChatId === a.id ? (
                        <Loader2 size={16} className="animate-spin" color={colors.cream} />
                      ) : (
                        <MessageCircle size={16} color={colors.cream} />
                      )}
                    </button>
                  )}
                </div>
              </div>
              {openChatErrors[a.id] && (
                <p className="text-xs" style={{ color: "#E07A5F" }}>{openChatErrors[a.id]}</p>
              )}
'''
if old_owner_top_row in src:
    assert src.count(old_owner_top_row) == 1
    src = src.replace(old_owner_top_row, new_owner_top_row)
    changes.append("✅ App.jsx — added message icon to owner's booking list")
else:
    changes.append("⏭️  Owner message icon already added")

old_ownerdash_callsite = '''              <OwnerDashboard token={ownerAuth.token} />'''
new_ownerdash_callsite = '''              <OwnerDashboard
                token={ownerAuth.token}
                onOpenChat={(convoId) => {
                  setActiveConversationId(convoId);
                  setOwnerPage("chatThread");
                }}
              />'''
if old_ownerdash_callsite in src:
    assert src.count(old_ownerdash_callsite) == 1
    src = src.replace(old_ownerdash_callsite, new_ownerdash_callsite)
    changes.append("✅ App.jsx — wired owner's message icon to open the chat thread directly")
else:
    changes.append("⏭️  OwnerDashboard call site already wired")

with open(app_path, "w") as f:
    f.write(src)

for c in changes:
    print(c)
