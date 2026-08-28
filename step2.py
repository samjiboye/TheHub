path = "frontend/src/App.jsx"
with open(path, "r") as f:
    src = f.read()

changes = 0

# ---------------------------------------------------------------
# OWNER SIDE: state + fetch function
# ---------------------------------------------------------------
anchor1 = '  const [viewingCustomer, setViewingCustomer] = useState(null); // { id, name } | null'
addition1 = anchor1 + '''
  const [dailyCode, setDailyCode] = useState(null);
  const [dailyCodeLoading, setDailyCodeLoading] = useState(false);
  const [dailyCodeError, setDailyCodeError] = useState(null);'''

if "dailyCode, setDailyCode" not in src:
    assert src.count(anchor1) == 1, "owner state anchor not unique"
    src = src.replace(anchor1, addition1)
    changes += 1

anchor2 = '''  async function submitCancel(bookingId) {
    if (!cancelReason) {
      setCancelError("Please select a reason.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: cancelReason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setCancelError(err.error || "Failed to cancel booking.");
        return;
      }
      setCancellingId(null);
      setCancelReason("");
      setCancelError(null);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setCancelError("Network error. Please try again.");
    }
  }

  async function submitAccept(bookingId) {'''

addition2 = '''  async function fetchDailyCode(salonId) {
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

  async function submitCancel(bookingId) {
    if (!cancelReason) {
      setCancelError("Please select a reason.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: cancelReason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setCancelError(err.error || "Failed to cancel booking.");
        return;
      }
      setCancellingId(null);
      setCancelReason("");
      setCancelError(null);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setCancelError("Network error. Please try again.");
    }
  }

  async function submitAccept(bookingId) {'''

if "async function fetchDailyCode" not in src:
    assert src.count(anchor2) == 1, "owner submitCancel anchor not unique"
    src = src.replace(anchor2, addition2)
    changes += 1

# ---------------------------------------------------------------
# OWNER SIDE: UI card showing today's code
# ---------------------------------------------------------------
anchor3 = '        <p className="text-xs" style={{ color: colors.creamDim }}>{salon.name} · all time</p>'
addition3 = '''        <div className="rounded-2xl px-4 py-4 mb-4" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
          <p className="text-sm" style={{ color: colors.cream, fontWeight: 700 }}>Today's check-in code</p>
          <p className="text-xs mt-1" style={{ color: colors.creamDim }}>
            Show this to a client once they arrive for their service. Same code all day, changes tomorrow.
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

if "Today's check-in code" not in src:
    assert src.count(anchor3) == 1, "owner UI anchor not unique"
    src = src.replace(anchor3, addition3)
    changes += 1

# ---------------------------------------------------------------
# CUSTOMER SIDE: state
# ---------------------------------------------------------------
anchor4 = '  const [disputeError, setDisputeError] = useState(null);\n\n  useEffect(() => {\n    if (!token) return;'
addition4 = '''  const [disputeError, setDisputeError] = useState(null);
  const [checkInInputs, setCheckInInputs] = useState({}); // bookingId -> code string
  const [checkInSubmittingId, setCheckInSubmittingId] = useState(null);
  const [checkInErrors, setCheckInErrors] = useState({});
  const [checkInSuccess, setCheckInSuccess] = useState({}); // bookingId -> { visitCount, isRewardVisit }

  useEffect(() => {
    if (!token) return;'''

if "checkInInputs, setCheckInInputs" not in src:
    assert src.count(anchor4) == 1, "customer state anchor not unique"
    src = src.replace(anchor4, addition4)
    changes += 1

# ---------------------------------------------------------------
# CUSTOMER SIDE: submitCheckIn function, right before the component's return
# ---------------------------------------------------------------
anchor5 = '''  return (
    <div className="pb-8 transition-[background] duration-500" style={{ background: NEUTRAL_HERO_GRADIENT }}>
      <Header title="My bookings" onBack={onBack} />'''

addition5 = '''  async function submitCheckIn(bookingId) {
    const code = (checkInInputs[bookingId] || "").trim();
    if (!code) {
      setCheckInErrors((prev) => ({ ...prev, [bookingId]: "Enter the code the salon gave you." }));
      return;
    }
    setCheckInSubmittingId(bookingId);
    setCheckInErrors((prev) => ({ ...prev, [bookingId]: null }));
    try {
      const res = await apiFetch(`/bookings/${bookingId}/check-in`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code }),
      });
      setCheckInSuccess((prev) => ({ ...prev, [bookingId]: res }));
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setCheckInErrors((prev) => ({ ...prev, [bookingId]: e.message || "That code didn't work — try again." }));
    } finally {
      setCheckInSubmittingId(null);
    }
  }

  return (
    <div className="pb-8 transition-[background] duration-500" style={{ background: NEUTRAL_HERO_GRADIENT }}>
      <Header title="My bookings" onBack={onBack} />'''

if "async function submitCheckIn" not in src:
    assert src.count(anchor5) == 1, "customer return anchor not unique"
    src = src.replace(anchor5, addition5)
    changes += 1

# ---------------------------------------------------------------
# CUSTOMER SIDE: UI — enter code box on each confirmed, not-yet-checked-in booking
# ---------------------------------------------------------------
anchor6 = '                {b.status === "confirmed" && (\n                  <LocationShareBlock bookingId={b.id} token={token} otherLabel="salon" />\n                )}'
addition6 = '''                {b.status === "confirmed" && (
                  <LocationShareBlock bookingId={b.id} token={token} otherLabel="salon" />
                )}
                {b.status === "confirmed" && !b.disputed_at && !b.checked_in_at && !checkInSuccess[b.id] && (
                  <div className="mt-2 flex flex-col gap-2">
                    <p className="text-xs" style={{ color: colors.creamDim }}>
                      When you arrive, ask {b.salon_name} for today's code and enter it here.
                    </p>
                    <div className="flex gap-2">
                      <input
                        value={checkInInputs[b.id] || ""}
                        onChange={(e) => setCheckInInputs((prev) => ({ ...prev, [b.id]: e.target.value.replace(/\\D/g, "").slice(0, 6) }))}
                        placeholder="Enter code"
                        className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                        style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
                      />
                      <button
                        onClick={() => submitCheckIn(b.id)}
                        disabled={checkInSubmittingId === b.id}
                        className="px-4 py-2 rounded-xl text-xs font-semibold tap-glass"
                        style={{ background: colors.hairline, color: "#FFFFFF" }}
                      >
                        {checkInSubmittingId === b.id ? "Checking…" : "Check in"}
                      </button>
                    </div>
                    {checkInErrors[b.id] && <p className="text-xs" style={{ color: "#E07A5F" }}>{checkInErrors[b.id]}</p>}
                  </div>
                )}
                {checkInSuccess[b.id] && (
                  <div className="mt-2 px-3 py-2 rounded-xl text-center" style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}` }}>
                    {checkInSuccess[b.id].isRewardVisit ? (
                      <p className="text-sm" style={{ color: colors.gold, fontWeight: 700 }}>
                        🎉 Checked in! This is your 5th visit — 50% off this time.
                      </p>
                    ) : (
                      <p className="text-sm" style={{ color: colors.cream }}>
                        Checked in! {checkInSuccess[b.id].visitCount}/5 visits at {b.salon_name}.
                      </p>
                    )}
                  </div>
                )}'''

if "When you arrive, ask" not in src:
    assert src.count(anchor6) == 1, "customer UI anchor not unique"
    src = src.replace(anchor6, addition6)
    changes += 1

with open(path, "w") as f:
    f.write(src)

print(f"✅ App.jsx updated — {changes} change(s) applied")
