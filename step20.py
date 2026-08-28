changes = []

salons_path = "backend/routes/salons.js"
with open(salons_path, "r") as f:
    salons = f.read()

old_endpoint = '''    const { rows: reviewRows } = await db.query(
      `SELECT rating, comment, created_at FROM reviews
       WHERE customer_id = $1 AND salon_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [req.params.customerId, req.params.id]
    );

    res.json({
      ...customer,
      completedBookingsHere: Number(statsRows[0].completed_count),
      totalBookingsHere: Number(statsRows[0].total_count),
      review: reviewRows[0] || null,
    });'''
new_endpoint = '''    const { rows: reviewRows } = await db.query(
      `SELECT rating, comment, created_at FROM reviews
       WHERE customer_id = $1 AND salon_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [req.params.customerId, req.params.id]
    );

    const { rows: activeBookingRows } = await db.query(
      `SELECT b.id, b.time_slot, b.booking_date, b.location_type, b.customer_address, sv.name AS service_name
       FROM bookings b JOIN services sv ON sv.id = b.service_id
       WHERE b.customer_id = $1 AND b.salon_id = $2 AND b.status = 'confirmed' AND b.checked_in_at IS NULL
       ORDER BY b.booking_date ASC NULLS LAST, b.created_at ASC`,
      [req.params.customerId, req.params.id]
    );

    res.json({
      ...customer,
      completedBookingsHere: Number(statsRows[0].completed_count),
      totalBookingsHere: Number(statsRows[0].total_count),
      review: reviewRows[0] || null,
      activeBookings: activeBookingRows,
    });'''
if old_endpoint in salons:
    assert salons.count(old_endpoint) == 1
    salons = salons.replace(old_endpoint, new_endpoint)
    with open(salons_path, "w") as f:
        f.write(salons)
    changes.append("✅ salons.js — customer profile now includes their active bookings, address, and booking IDs")
else:
    changes.append("⏭️  Backend customer profile endpoint already updated")

app_path = "frontend/src/App.jsx"
with open(app_path, "r") as f:
    src = f.read()

old_component_top = '''function OwnerCustomerProfileView({ token, salonId, customerId, onBack }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);'''
new_component_top = '''function OwnerCustomerProfileView({ token, salonId, customerId, onBack }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revealedCodes, setRevealedCodes] = useState({}); // bookingId -> code
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
  }'''
if old_component_top in src:
    assert src.count(old_component_top) == 1
    src = src.replace(old_component_top, new_component_top)
    changes.append("✅ App.jsx — added reveal-code state to customer profile view")
else:
    changes.append("⏭️  Customer profile state already added")

old_review_block = '''            {profile.review && (
              <div className="w-full rounded-xl p-4 mt-2" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>
                <p className="text-xs font-semibold mb-1" style={{ color: colors.gold }}>
                  Their review of your salon — {"★".repeat(profile.review.rating)}{"☆".repeat(5 - profile.review.rating)}
                </p>
                {profile.review.comment && (
                  <p className="text-sm" style={{ color: colors.cream }}>"{profile.review.comment}"</p>
                )}
              </div>
            )}
          </div>
        )}'''
new_review_block = '''            {profile.review && (
              <div className="w-full rounded-xl p-4 mt-2" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>
                <p className="text-xs font-semibold mb-1" style={{ color: colors.gold }}>
                  Their review of your salon — {"★".repeat(profile.review.rating)}{"☆".repeat(5 - profile.review.rating)}
                </p>
                {profile.review.comment && (
                  <p className="text-sm" style={{ color: colors.cream }}>"{profile.review.comment}"</p>
                )}
              </div>
            )}

            {profile.activeBookings && profile.activeBookings.length > 0 && (
              <div className="w-full mt-4">
                <h3 className="text-sm font-bold mb-2" style={{ color: colors.cream }}>Upcoming with you</h3>
                <div className="flex flex-col gap-2">
                  {profile.activeBookings.map((b) => (
                    <div key={b.id} className="rounded-xl p-4" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm" style={{ color: colors.cream, fontWeight: 700 }}>{b.service_name}</p>
                        <span className="text-xs" style={{ color: colors.creamDim }}>
                          {formatBookingDate(b.booking_date) && <>{formatBookingDate(b.booking_date)} · </>}
                          {b.time_slot}
                        </span>
                      </div>
                      {b.location_type === "home" && b.customer_address && (
                        <p className="text-xs mt-1" style={{ color: colors.gold }}>🏠 {b.customer_address}</p>
                      )}
                      <div className="mt-2">
                        {revealedCodes[b.id] ? (
                          <div className="px-3 py-2 rounded-xl text-center inline-block" style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}` }}>
                            <p className="text-xs" style={{ color: colors.creamDim }}>Their code</p>
                            <p style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.3rem", fontWeight: 800, letterSpacing: "0.15em" }}>
                              {revealedCodes[b.id]}
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() => revealCode(b.id)}
                            disabled={revealingCodeId === b.id}
                            className="text-xs font-semibold px-3 py-1 rounded-full tap-glass"
                            style={{ background: colors.hairline, color: "#FFFFFF" }}
                          >
                            {revealingCodeId === b.id ? "Loading…" : "Show check-in code"}
                          </button>
                        )}
                        {revealCodeErrors[b.id] && <p className="text-xs mt-1" style={{ color: "#E07A5F" }}>{revealCodeErrors[b.id]}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}'''
if old_review_block in src:
    assert src.count(old_review_block) == 1
    src = src.replace(old_review_block, new_review_block)
    changes.append("✅ App.jsx — customer profile now shows upcoming bookings with address and code")
else:
    changes.append("⏭️  Customer profile bookings section already added")

with open(app_path, "w") as f:
    f.write(src)

for c in changes:
    print(c)
