changes = []

schema_path = "backend/db/schema.sql"
with open(schema_path, "r") as f:
    schema = f.read()

new_sql = "\nALTER TABLE bookings ADD COLUMN IF NOT EXISTS checkin_code TEXT;\n"
if "checkin_code" not in schema:
    schema = schema.rstrip("\n") + "\n" + new_sql
    with open(schema_path, "w") as f:
        f.write(schema)
    changes.append("✅ schema.sql — added checkin_code column to bookings")
else:
    changes.append("⏭️  checkin_code column already added")

bookings_path = "backend/routes/bookings.js"
with open(bookings_path, "r") as f:
    bookings = f.read()

old_spam_anchor = '''  try {
    const { rows: serviceRows } = await db.query(
      "SELECT * FROM services WHERE id = $1 AND salon_id = $2",
      [service_id, salon_id]
    );
    const service = serviceRows[0];
    if (!service) return res.status(404).json({ error: "Service not found for this salon" });
    if (loc === "salon" && !service.salon_service_available) {
      return res.status(400).json({ error: "This service is only available as a home visit." });
    }
    if (loc === "home" && service.home_service_price == null) {
      return res.status(400).json({ error: "This service doesn't offer home visits." });
    }
'''
new_spam_check = '''  try {
    const { rows: pendingRows } = await db.query(
      `SELECT b.id, s.name AS salon_name FROM bookings b JOIN salons s ON s.id = b.salon_id
       WHERE b.customer_id = $1 AND b.status = 'confirmed' AND b.owner_response = 'pending'
       LIMIT 1`,
      [req.user.id]
    );
    if (pendingRows[0]) {
      return res.status(400).json({
        error: `You already have a booking waiting on a response from ${pendingRows[0].salon_name}. Wait for them to accept, or cancel it first, before booking somewhere else.`,
      });
    }

    const { rows: serviceRows } = await db.query(
      "SELECT * FROM services WHERE id = $1 AND salon_id = $2",
      [service_id, salon_id]
    );
    const service = serviceRows[0];
    if (!service) return res.status(404).json({ error: "Service not found for this salon" });
    if (loc === "salon" && !service.salon_service_available) {
      return res.status(400).json({ error: "This service is only available as a home visit." });
    }
    if (loc === "home" && service.home_service_price == null) {
      return res.status(400).json({ error: "This service doesn't offer home visits." });
    }
'''
if old_spam_anchor in bookings:
    assert bookings.count(old_spam_anchor) == 1
    bookings = bookings.replace(old_spam_anchor, new_spam_check)
    changes.append("✅ bookings.js — blocked booking a new salon while one is awaiting response")
else:
    changes.append("⏭️  Anti-spam check already added")

old_daily_code_route = '''// GET /bookings/salon/:salonId/daily-code — owner views (or generates) this hour's
// check-in code for their salon. Rotates every hour (not once a day) so a customer
// can't share the same code with someone else, or a second account, later that day.
router.get("/salon/:salonId/daily-code", requireAuth, async (req, res) => {
  try {
    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [req.params.salonId]);
    const salon = salonRows[0];
    if (!salon) return res.status(404).json({ error: "Salon not found" });
    if (salon.owner_id !== req.user.id) return res.status(403).json({ error: "Not your salon" });

    const { rows: existing } = await db.query(
      "SELECT code FROM salon_daily_codes WHERE salon_id = $1 AND code_date = CURRENT_DATE AND code_hour = EXTRACT(HOUR FROM NOW())",
      [salon.id]
    );
    if (existing[0]) return res.json({ code: existing[0].code });

    const code = String(Math.floor(1000 + Math.random() * 9000));
    await db.query(
      "INSERT INTO salon_daily_codes (salon_id, code, code_date, code_hour) VALUES ($1, $2, CURRENT_DATE, EXTRACT(HOUR FROM NOW()))",
      [salon.id, code]
    );
    res.json({ code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't get today's code." });
  }
});'''
new_perbooking_route = '''// GET /bookings/:id/checkin-code — owner views (or generates) the code for THIS
// SPECIFIC booking. Each booking gets its own permanent code, never shared with
// any other booking or client, so there's no window where a code could be reused
// to fake a different visit.
router.get("/:id/checkin-code", requireAuth, async (req, res) => {
  try {
    const { rows: bookingRows } = await db.query(
      `SELECT b.*, s.owner_id AS salon_owner_id FROM bookings b JOIN salons s ON s.id = b.salon_id WHERE b.id = $1`,
      [req.params.id]
    );
    const booking = bookingRows[0];
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.salon_owner_id !== req.user.id) return res.status(403).json({ error: "Not your booking" });

    if (booking.checkin_code) return res.json({ code: booking.checkin_code });

    const code = String(Math.floor(1000 + Math.random() * 9000));
    await db.query("UPDATE bookings SET checkin_code = $1 WHERE id = $2", [code, booking.id]);
    res.json({ code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't get this booking's code." });
  }
});'''
if old_daily_code_route in bookings:
    assert bookings.count(old_daily_code_route) == 1
    bookings = bookings.replace(old_daily_code_route, new_perbooking_route)
    changes.append("✅ bookings.js — replaced salon-wide hourly code with per-booking code")
else:
    changes.append("⏭️  Per-booking code route already added")

old_checkin_full = '''router.post("/:id/check-in", requireAuth, async (req, res) => {
  const { code } = req.body;
  try {
    const { rows: bookingRows } = await db.query("SELECT * FROM bookings WHERE id = $1", [req.params.id]);
    const booking = bookingRows[0];
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.customer_id !== req.user.id) return res.status(403).json({ error: "Not your booking" });
    if (booking.status !== "confirmed") return res.status(400).json({ error: "This booking isn't confirmed yet." });
    if (booking.checked_in_at) return res.status(400).json({ error: "This booking is already checked in." });

    const { rows: codeRows } = await db.query(
      "SELECT code FROM salon_daily_codes WHERE salon_id = $1 AND code_date = CURRENT_DATE AND code_hour = EXTRACT(HOUR FROM NOW())",
      [booking.salon_id]
    );
    const currentCode = codeRows[0]?.code;
    if (!currentCode || !code || String(code).trim() !== currentCode) {
      return res.status(400).json({ error: "That code doesn't match — codes change every hour, double check with the salon." });
    }

    let isRewardVisit = false;
    await db.query("UPDATE bookings SET checked_in_at = NOW() WHERE id = $1", [booking.id]);

    const { rows: loyaltyRows } = await db.query(
      `INSERT INTO salon_loyalty (customer_id, salon_id, visit_count)
       VALUES ($1, $2, 1)
       ON CONFLICT (customer_id, salon_id)
       DO UPDATE SET visit_count = salon_loyalty.visit_count + 1, updated_at = NOW()
       RETURNING visit_count`,
      [booking.customer_id, booking.salon_id]
    );
    const visitCount = loyaltyRows[0].visit_count;

    if (visitCount >= 5) {
      isRewardVisit = true;
      await db.query("UPDATE bookings SET is_loyalty_reward = true WHERE id = $1", [booking.id]);
      await db.query(
        "UPDATE salon_loyalty SET visit_count = 0, updated_at = NOW() WHERE customer_id = $1 AND salon_id = $2",
        [booking.customer_id, booking.salon_id]
      );
    }

    res.json({ ok: true, visitCount: isRewardVisit ? 0 : visitCount, isRewardVisit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't check in that code." });
  }
});'''
new_checkin_full = '''router.post("/:id/check-in", requireAuth, async (req, res) => {
  const { code } = req.body;
  try {
    const { rows: bookingRows } = await db.query("SELECT * FROM bookings WHERE id = $1", [req.params.id]);
    const booking = bookingRows[0];
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.customer_id !== req.user.id) return res.status(403).json({ error: "Not your booking" });
    if (booking.status !== "confirmed") return res.status(400).json({ error: "This booking isn't confirmed yet." });
    if (booking.checked_in_at) return res.status(400).json({ error: "This booking is already checked in." });

    if (!booking.checkin_code || !code || String(code).trim() !== booking.checkin_code) {
      return res.status(400).json({ error: "That code doesn't match. Ask the salon for the code for this specific booking." });
    }

    let isRewardVisit = false;
    await db.query("UPDATE bookings SET checked_in_at = NOW() WHERE id = $1", [booking.id]);

    const { rows: loyaltyRows } = await db.query(
      `INSERT INTO salon_loyalty (customer_id, salon_id, visit_count)
       VALUES ($1, $2, 1)
       ON CONFLICT (customer_id, salon_id)
       DO UPDATE SET visit_count = salon_loyalty.visit_count + 1, updated_at = NOW()
       RETURNING visit_count`,
      [booking.customer_id, booking.salon_id]
    );
    const visitCount = loyaltyRows[0].visit_count;

    if (visitCount >= 5) {
      isRewardVisit = true;
      await db.query("UPDATE bookings SET is_loyalty_reward = true WHERE id = $1", [booking.id]);
      await db.query(
        "UPDATE salon_loyalty SET visit_count = 0, updated_at = NOW() WHERE customer_id = $1 AND salon_id = $2",
        [booking.customer_id, booking.salon_id]
      );
    }

    const { rows: salonForCompletionRows } = await db.query("SELECT * FROM salons WHERE id = $1", [booking.salon_id]);
    await completeBooking(booking, salonForCompletionRows[0]);

    res.json({ ok: true, visitCount: isRewardVisit ? 0 : visitCount, isRewardVisit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't check in that code." });
  }
});'''
if old_checkin_full in bookings:
    assert bookings.count(old_checkin_full) == 1
    bookings = bookings.replace(old_checkin_full, new_checkin_full)
    changes.append("✅ bookings.js — check-in now matches per-booking code and completes the booking")
else:
    changes.append("⏭️  Check-in route already rebuilt")

old_dispute = '''    if (!booking.completion_requested_at || booking.status !== "confirmed") {
      return res.status(400).json({ error: "There's nothing to dispute on this booking yet." });
    }'''
new_dispute = '''    if (!booking.checked_in_at) {
      return res.status(400).json({ error: "There's nothing to dispute on this booking yet." });
    }'''
if old_dispute in bookings:
    assert bookings.count(old_dispute) == 1
    bookings = bookings.replace(old_dispute, new_dispute)
    changes.append("✅ bookings.js — dispute now gates on check-in instead of the old flow")
else:
    changes.append("⏭️  Dispute condition already updated")

with open(bookings_path, "w") as f:
    f.write(bookings)

app_path = "frontend/src/App.jsx"
with open(app_path, "r") as f:
    src = f.read()

old_state = '''  const [dailyCode, setDailyCode] = useState(null);
  const [dailyCodeLoading, setDailyCodeLoading] = useState(false);
  const [dailyCodeError, setDailyCodeError] = useState(null);

  async function fetchDailyCode(salonId) {
    setDailyCodeLoading(true);
    setDailyCodeError(null);
    try {
      const res = await apiFetch(`/bookings/salon/${salonId}/daily-code`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDailyCode(res.code);
    } catch (e) {
      setDailyCodeError("Couldn't load today's code.");
    } finally {
      setDailyCodeLoading(false);
    }
  }

  useEffect(() => {
    if (salon?.id) fetchDailyCode(salon.id);
  }, [salon?.id]);

'''
new_state = '''  const [revealedCodes, setRevealedCodes] = useState({}); // bookingId -> code
  const [revealingCodeId, setRevealingCodeId] = useState(null);
  const [revealCodeErrors, setRevealCodeErrors] = useState({});

  async function revealCode(bookingId) {
    setRevealingCodeId(bookingId);
    setRevealCodeErrors((prev) => ({ ...prev, [bookingId]: null }));
    try {
      const res = await apiFetch(`/bookings/${bookingId}/checkin-code`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRevealedCodes((prev) => ({ ...prev, [bookingId]: res.code }));
    } catch (e) {
      setRevealCodeErrors((prev) => ({ ...prev, [bookingId]: "Couldn't load this booking's code." }));
    } finally {
      setRevealingCodeId(null);
    }
  }

'''
if old_state in src:
    assert src.count(old_state) == 1
    src = src.replace(old_state, new_state)
    changes.append("✅ App.jsx — replaced salon-wide code state with per-booking reveal state")
else:
    changes.append("⏭️  Owner code state already replaced")

old_widget = '''        <div className="rounded-2xl px-4 py-4 mb-4" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
          <p className="text-sm" style={{ color: colors.cream, fontWeight: 700 }}>Today's check-in code</p>
          <p className="text-xs mt-1" style={{ color: colors.creamDim }}>
            Show this to a client once they arrive for their service. Changes every hour, so give it fresh each time.
          </p>
          <div className="mt-3 px-4 py-3 rounded-xl text-center" style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}` }}>
            {dailyCodeLoading ? (
              <Loader2 size={20} className="animate-spin mx-auto" color={colors.creamDim} />
            ) : dailyCodeError ? (
              <p className="text-xs" style={{ color: "#E07A5F" }}>{dailyCodeError}</p>
            ) : (
              <p style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "2rem", fontWeight: 800, letterSpacing: "0.15em" }}>
                {dailyCode || "····"}
              </p>
            )}
          </div>
        </div>
        <p className="text-xs" style={{ color: colors.creamDim }}>{salon.name} · all time</p>'''
new_widget = '''        <p className="text-xs" style={{ color: colors.creamDim }}>{salon.name} · all time</p>'''
if old_widget in src:
    assert src.count(old_widget) == 1
    src = src.replace(old_widget, new_widget)
    changes.append("✅ App.jsx — removed salon-wide 'Today's check-in code' widget")
else:
    changes.append("⏭️  Salon-wide code widget already removed")

old_owner_block = '''                    {a.disputed_at ? (
                      <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ border: `2px solid #E07A5F`, color: "#E07A5F" }}>
                        ⚠️ Disputed
                      </span>
                    ) : a.completion_requested_at ? null : (
                      cancellingId !== a.id && (
                        <button
                          onClick={() => { setCancellingId(a.id); setCancelReason(""); setCancelError(null); }}
                          className="text-xs font-semibold px-3 py-1 rounded-full tap-glass"
                          style={{ border: `2px solid ${colors.hairline}`, color: colors.creamDim }}
                        >
                          Cancel
                        </button>
                      )
                    )}
                    {!a.disputed_at && !a.completion_requested_at && completingId !== a.id && (
                      <button
                        onClick={() => { setCompletingId(a.id); setCompletionPhoto(null); setCompletionError(null); }}
                        className="text-xs font-semibold px-3 py-1 rounded-full tap-glass"
                        style={{ background: colors.hairline, color: "#FFFFFF" }}
                      >
                        Mark as done
                      </button>
                    )}
                  </div>
                  <LocationShareBlock bookingId={a.id} token={token} otherLabel="client" />
                  {completingId === a.id && (
                    <div className="flex flex-col gap-2 w-full">
                      <p className="text-xs" style={{ color: colors.creamDim }}>
                        Add a photo of the finished result — optional, but helps protect you if there's ever a dispute.
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setCompletionPhoto(e.target.files[0] || null)}
                        className="text-xs"
                        style={{ color: colors.creamDim }}
                      />
                      {completionError && <p className="text-xs" style={{ color: "#E07A5F" }}>{completionError}</p>}
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => submitRequestCompletion(a.id)}
                          disabled={completionSubmitting}
                          className="px-4 py-2 rounded-full text-xs font-semibold tap-glass"
                          style={{ background: colors.hairline, color: "#FFFFFF" }}
                        >
                          {completionSubmitting ? "Sending…" : "Request completion"}
                        </button>
                        <button
                          onClick={() => setCompletingId(null)}
                          className="px-4 py-2 rounded-full text-xs font-semibold tap-glass"
                          style={{ border: `2px solid ${colors.hairline}`, color: colors.creamDim }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  {a.completion_requested_at && !a.disputed_at && (
                    <div className="flex flex-col gap-2 w-full">
                      <p className="text-xs" style={{ color: colors.creamDim }}>
                        Code sent to client — enter it below once they give it to you. Auto-confirms in 24 hours if they don't respond.
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <input
                          value={otpInputs[a.id] || ""}
                          onChange={(e) => setOtpInputs((prev) => ({ ...prev, [a.id]: e.target.value.replace(/\\D/g, "").slice(0, 4) }))}
                          placeholder="4-digit code"
                          inputMode="numeric"
                          className="px-3 py-2 rounded-xl text-sm outline-none w-28"
                          style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
                        />
                        <button
                          onClick={() => submitConfirmCompletion(a.id)}
                          disabled={confirmSubmittingId === a.id}
                          className="px-4 py-2 rounded-full text-xs font-semibold tap-glass"
                          style={{ background: colors.hairline, color: "#FFFFFF" }}
                        >
                          {confirmSubmittingId === a.id ? "Confirming…" : "Confirm"}
                        </button>
                      </div>
                      {confirmErrors[a.id] && <p className="text-xs" style={{ color: "#E07A5F" }}>{confirmErrors[a.id]}</p>}
                    </div>
                  )}'''
new_owner_block = '''                    {a.disputed_at ? (
                      <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ border: `2px solid #E07A5F`, color: "#E07A5F" }}>
                        ⚠️ Disputed
                      </span>
                    ) : (
                      cancellingId !== a.id && (
                        <button
                          onClick={() => { setCancellingId(a.id); setCancelReason(""); setCancelError(null); }}
                          className="text-xs font-semibold px-3 py-1 rounded-full tap-glass"
                          style={{ border: `2px solid ${colors.hairline}`, color: colors.creamDim }}
                        >
                          Cancel
                        </button>
                      )
                    )}
                  </div>
                  <LocationShareBlock bookingId={a.id} token={token} otherLabel="client" />
                  {!a.checked_in_at && !a.disputed_at && (
                    <div className="mt-2">
                      {revealedCodes[a.id] ? (
                        <div className="px-3 py-2 rounded-xl text-center inline-block" style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}` }}>
                          <p className="text-xs" style={{ color: colors.creamDim }}>This client's code</p>
                          <p style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.5rem", fontWeight: 800, letterSpacing: "0.15em" }}>
                            {revealedCodes[a.id]}
                          </p>
                        </div>
                      ) : (
                        <button
                          onClick={() => revealCode(a.id)}
                          disabled={revealingCodeId === a.id}
                          className="text-xs font-semibold px-3 py-1 rounded-full tap-glass"
                          style={{ background: colors.hairline, color: "#FFFFFF" }}
                        >
                          {revealingCodeId === a.id ? "Loading…" : "Show check-in code"}
                        </button>
                      )}
                      {revealCodeErrors[a.id] && <p className="text-xs mt-1" style={{ color: "#E07A5F" }}>{revealCodeErrors[a.id]}</p>}
                    </div>
                  )}'''
if old_owner_block in src:
    assert src.count(old_owner_block) == 1
    src = src.replace(old_owner_block, new_owner_block)
    changes.append("✅ App.jsx — owner side now reveals a per-booking code instead of a shared salon code")
else:
    changes.append("⏭️  Owner per-booking code UI already added")

old_customer_block = '''                {b.status === "confirmed" && b.completion_requested_at && !b.disputed_at && (
                  <div className="mt-2 flex flex-col gap-2">
                    <div className="px-3 py-2 rounded-xl text-center" style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}` }}>
                      <p className="text-xs" style={{ color: colors.creamDim }}>Your confirmation code</p>
                      <p className="text-2xl" style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 800, letterSpacing: "0.1em" }}>
                        {b.completion_otp || "····"}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: colors.creamDim }}>Give this to {b.salon_name} once you're happy with the service.</p>
                    </div>
                    {disputingId !== b.id ? ('''
new_customer_block = '''                {b.checked_in_at && !b.disputed_at && (
                  <div className="mt-2 flex flex-col gap-2">
                    {disputingId !== b.id ? ('''
if old_customer_block in src:
    assert src.count(old_customer_block) == 1
    src = src.replace(old_customer_block, new_customer_block)
    changes.append("✅ App.jsx — removed customer-facing completion code, kept dispute option")
else:
    changes.append("⏭️  Customer completion code block already removed")

with open(app_path, "w") as f:
    f.write(src)

for c in changes:
    print(c)
