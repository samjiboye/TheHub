#!/usr/bin/env python3
import os, sys

def edit(path, replacements, label):
    if not os.path.exists(path):
        print(f"FAILED: {label} - file not found: {path}")
        sys.exit(1)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    for old, new in replacements:
        count = content.count(old)
        if count != 1:
            print(f"FAILED: {label} - anchor not found exactly once (found {count}) in {path}")
            print("----- anchor -----")
            print(old[:300])
            print("------------------")
            sys.exit(1)
        content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"OK: {label}")


schema_path = "backend/db/schema.sql"
with open(schema_path, "r", encoding="utf-8") as f:
    schema_content = f.read()
marker = "-- Location sharing: one-tap, expiring shares tied to a specific booking,"
if marker in schema_content:
    print("OK: schema.sql - location_shares already present, skipping")
else:
    schema_content += (
        "\n\n" + marker + "\n"
        "-- not continuous background tracking.\n"
        "CREATE TABLE IF NOT EXISTS location_shares (\n"
        "  id SERIAL PRIMARY KEY,\n"
        "  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,\n"
        "  shared_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n"
        "  lat REAL NOT NULL,\n"
        "  lng REAL NOT NULL,\n"
        "  expires_at TIMESTAMP NOT NULL,\n"
        "  updated_at TIMESTAMP DEFAULT NOW()\n"
        ");\n"
        "CREATE INDEX IF NOT EXISTS idx_location_shares_booking ON location_shares(booking_id);\n"
    )
    with open(schema_path, "w", encoding="utf-8") as f:
        f.write(schema_content)
    print("OK: schema.sql - location_shares appended")

edit(
    "backend/routes/bookings.js",
    [(
        "module.exports = router;",
        '// POST /bookings/:id/location - share your current position once (customer or owner side\n'
        '// of the booking). Expires after 1 hour - not continuous tracking, a fresh explicit share.\n'
        'router.post("/:id/location", requireAuth, async (req, res) => {\n'
        '  const { lat, lng } = req.body;\n'
        '  if (typeof lat !== "number" || typeof lng !== "number") {\n'
        '    return res.status(400).json({ error: "lat and lng are required" });\n'
        '  }\n'
        '  try {\n'
        '    const { rows: bookingRows } = await db.query("SELECT * FROM bookings WHERE id = $1", [req.params.id]);\n'
        '    const booking = bookingRows[0];\n'
        '    if (!booking) return res.status(404).json({ error: "Booking not found" });\n\n'
        '    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [booking.salon_id]);\n'
        '    const salon = salonRows[0];\n'
        '    const isCustomer = booking.customer_id === req.user.id;\n'
        '    const isOwner = salon && salon.owner_id === req.user.id;\n'
        '    if (!isCustomer && !isOwner) return res.status(403).json({ error: "Not your booking" });\n\n'
        '    const existing = await db.query(\n'
        '      "SELECT id FROM location_shares WHERE booking_id = $1 AND shared_by = $2",\n'
        '      [booking.id, req.user.id]\n'
        '    );\n'
        '    const isFirstShare = existing.rows.length === 0;\n'
        '    if (!isFirstShare) {\n'
        '      await db.query(\n'
        '        "UPDATE location_shares SET lat = $1, lng = $2, expires_at = NOW() + INTERVAL \'1 hour\', updated_at = NOW() WHERE id = $3",\n'
        '        [lat, lng, existing.rows[0].id]\n'
        '      );\n'
        '    } else {\n'
        '      await db.query(\n'
        '        "INSERT INTO location_shares (booking_id, shared_by, lat, lng, expires_at) VALUES ($1, $2, $3, $4, NOW() + INTERVAL \'1 hour\')",\n'
        '        [booking.id, req.user.id, lat, lng]\n'
        '      );\n'
        '    }\n\n'
        '    // Only notify on the first share, not every refresh - otherwise updating your pin\n'
        '    // a few times would spam the other person with notifications.\n'
        '    if (isFirstShare) {\n'
        '      const otherUserId = isCustomer ? salon?.owner_id : booking.customer_id;\n'
        '      if (otherUserId) {\n'
        '        await notifyUser(otherUserId, {\n'
        '          type: "location_shared",\n'
        '          title: "Live location shared",\n'
        '          body: `${isCustomer ? "The client" : "The salon"} shared their live location for booking #${booking.id}.`,\n'
        '          bookingId: booking.id,\n'
        '        });\n'
        '      }\n'
        '    }\n\n'
        '    res.json({ ok: true });\n'
        '  } catch (err) {\n'
        '    console.error(err);\n'
        '    res.status(500).json({ error: "Couldn\'t share your location." });\n'
        '  }\n'
        '});\n\n'
        '// GET /bookings/:id/location - any active (non-expired) shares for this booking\n'
        'router.get("/:id/location", requireAuth, async (req, res) => {\n'
        '  try {\n'
        '    const { rows: bookingRows } = await db.query("SELECT * FROM bookings WHERE id = $1", [req.params.id]);\n'
        '    const booking = bookingRows[0];\n'
        '    if (!booking) return res.status(404).json({ error: "Booking not found" });\n\n'
        '    const { rows: salonRows } = await db.query("SELECT * FROM salons WHERE id = $1", [booking.salon_id]);\n'
        '    const salon = salonRows[0];\n'
        '    const isCustomer = booking.customer_id === req.user.id;\n'
        '    const isOwner = salon && salon.owner_id === req.user.id;\n'
        '    if (!isCustomer && !isOwner) return res.status(403).json({ error: "Not your booking" });\n\n'
        '    const { rows } = await db.query(\n'
        '      "SELECT shared_by, lat, lng, updated_at, expires_at FROM location_shares WHERE booking_id = $1 AND expires_at > NOW()",\n'
        '      [booking.id]\n'
        '    );\n'
        '    res.json(rows);\n'
        '  } catch (err) {\n'
        '    console.error(err);\n'
        '    res.status(500).json({ error: "Couldn\'t load shared locations." });\n'
        '  }\n'
        '});\n\n'
        '// DELETE /bookings/:id/location - stop sharing your own location for this booking\n'
        'router.delete("/:id/location", requireAuth, async (req, res) => {\n'
        '  try {\n'
        '    await db.query("DELETE FROM location_shares WHERE booking_id = $1 AND shared_by = $2", [req.params.id, req.user.id]);\n'
        '    res.json({ ok: true });\n'
        '  } catch (err) {\n'
        '    console.error(err);\n'
        '    res.status(500).json({ error: "Couldn\'t stop sharing." });\n'
        '  }\n'
        '});\n\n'
        "module.exports = router;",
    )],
    "bookings.js: location share/view/stop endpoints",
)

app_replacements = [
    (
        "function MyBookingsView({ token, onBack }) {",
        'function LocationShareBlock({ bookingId, token, otherLabel }) {\n'
        '  const [shares, setShares] = useState([]);\n'
        '  const [myUserId, setMyUserId] = useState(null);\n'
        '  const [sharing, setSharing] = useState(false);\n'
        '  const [error, setError] = useState(null);\n\n'
        '  useEffect(() => {\n'
        '    try {\n'
        '      const saved = JSON.parse(localStorage.getItem("customerAuth") || localStorage.getItem("ownerAuth") || "null");\n'
        '      setMyUserId(saved?.user?.id || null);\n'
        '    } catch (e) {}\n'
        '  }, []);\n\n'
        '  const fetchShares = () => {\n'
        '    apiFetch(`/bookings/${bookingId}/location`, { headers: { Authorization: `Bearer ${token}` } })\n'
        '      .then((data) => setShares(data))\n'
        '      .catch(() => {});\n'
        '  };\n\n'
        '  useEffect(() => {\n'
        '    fetchShares();\n'
        '    const interval = setInterval(fetchShares, 20000);\n'
        '    return () => clearInterval(interval);\n'
        '  }, [bookingId]);\n\n'
        '  const mine = shares.find((s) => s.shared_by === myUserId);\n'
        '  const theirs = shares.find((s) => s.shared_by !== myUserId);\n\n'
        '  const shareLocation = () => {\n'
        '    if (!navigator.geolocation) {\n'
        '      setError("Location isn\'t available on this device.");\n'
        '      return;\n'
        '    }\n'
        '    setSharing(true);\n'
        '    setError(null);\n'
        '    navigator.geolocation.getCurrentPosition(\n'
        '      async (pos) => {\n'
        '        try {\n'
        '          await apiFetch(`/bookings/${bookingId}/location`, {\n'
        '            method: "POST",\n'
        '            headers: { Authorization: `Bearer ${token}` },\n'
        '            body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),\n'
        '          });\n'
        '          fetchShares();\n'
        '        } catch (err) {\n'
        '          setError(err.message || "Couldn\'t share your location.");\n'
        '        } finally {\n'
        '          setSharing(false);\n'
        '        }\n'
        '      },\n'
        '      () => {\n'
        '        setError("Couldn\'t get your location \u2014 check location permission for this site.");\n'
        '        setSharing(false);\n'
        '      }\n'
        '    );\n'
        '  };\n\n'
        '  const stopSharing = async () => {\n'
        '    try {\n'
        '      await apiFetch(`/bookings/${bookingId}/location`, {\n'
        '        method: "DELETE",\n'
        '        headers: { Authorization: `Bearer ${token}` },\n'
        '      });\n'
        '      fetchShares();\n'
        '    } catch (err) {}\n'
        '  };\n\n'
        '  return (\n'
        '    <div className="mt-2 flex flex-col gap-1.5">\n'
        '      <div className="flex gap-2 flex-wrap">\n'
        '        <button\n'
        '          onClick={shareLocation}\n'
        '          disabled={sharing}\n'
        '          className="text-xs font-semibold px-3 py-1.5 rounded-full tap-glass flex items-center gap-1"\n'
        '          style={{ border: `2px solid ${colors.hairline}`, color: colors.cream }}\n'
        '        >\n'
        '          <MapPin size={12} />\n'
        '          {sharing ? "Sharing\u2026" : mine ? "Update my location" : "Share my location"}\n'
        '        </button>\n'
        '        {mine && (\n'
        '          <button\n'
        '            onClick={stopSharing}\n'
        '            className="text-xs font-semibold px-3 py-1.5 rounded-full tap-glass"\n'
        '            style={{ color: colors.creamDim }}\n'
        '          >\n'
        '            Stop sharing\n'
        '          </button>\n'
        '        )}\n'
        '        {theirs && (\n'
        '          <a\n'
        '            href={`https://maps.google.com/?q=${theirs.lat},${theirs.lng}`}\n'
        '            target="_blank"\n'
        '            rel="noreferrer"\n'
        '            className="text-xs font-semibold px-3 py-1.5 rounded-full tap-glass flex items-center gap-1"\n'
        '            style={{ background: colors.hairline, color: "#FFFFFF" }}\n'
        '          >\n'
        '            <MapPin size={12} /> View {otherLabel}\'s location\n'
        '          </a>\n'
        '        )}\n'
        '      </div>\n'
        '      {error && <p className="text-xs" style={{ color: "#E07A5F" }}>{error}</p>}\n'
        '    </div>\n'
        '  );\n'
        '}\n\n'
        "function MyBookingsView({ token, onBack }) {",
    ),
    (
        '                {b.status === "confirmed" && b.disputed_at && (\n'
        '                  <p className="text-xs mt-2" style={{ color: "#E07A5F" }}>\n'
        '                    \u26a0\ufe0f You disputed this booking \u2014 TheHub is reviewing it.\n'
        '                  </p>\n'
        '                )}\n'
        '                {b.status === "confirmed" && b.completion_requested_at && !b.disputed_at && (',
        '                {b.status === "confirmed" && b.disputed_at && (\n'
        '                  <p className="text-xs mt-2" style={{ color: "#E07A5F" }}>\n'
        '                    \u26a0\ufe0f You disputed this booking \u2014 TheHub is reviewing it.\n'
        '                  </p>\n'
        '                )}\n'
        '                {b.status === "confirmed" && (\n'
        '                  <LocationShareBlock bookingId={b.id} token={token} otherLabel="salon" />\n'
        '                )}\n'
        '                {b.status === "confirmed" && b.completion_requested_at && !b.disputed_at && (',
    ),
    (
        '                    {!a.disputed_at && !a.completion_requested_at && completingId !== a.id && (\n'
        '                      <button\n'
        '                        onClick={() => { setCompletingId(a.id); setCompletionPhoto(null); setCompletionError(null); }}\n'
        '                        className="text-xs font-semibold px-3 py-1 rounded-full tap-glass"\n'
        '                        style={{ background: colors.hairline, color: "#FFFFFF" }}\n'
        '                      >\n'
        '                        Mark as done\n'
        '                      </button>\n'
        '                    )}\n'
        '                  </div>',
        '                    {!a.disputed_at && !a.completion_requested_at && completingId !== a.id && (\n'
        '                      <button\n'
        '                        onClick={() => { setCompletingId(a.id); setCompletionPhoto(null); setCompletionError(null); }}\n'
        '                        className="text-xs font-semibold px-3 py-1 rounded-full tap-glass"\n'
        '                        style={{ background: colors.hairline, color: "#FFFFFF" }}\n'
        '                      >\n'
        '                        Mark as done\n'
        '                      </button>\n'
        '                    )}\n'
        '                  </div>\n'
        '                  <LocationShareBlock bookingId={a.id} token={token} otherLabel="client" />',
    ),
]

edit("frontend/src/App.jsx", app_replacements, "App.jsx: location sharing UI for customer and owner")

print("\nALL DONE. Review with: git diff")
print('Then: git add -A && git commit -m "Add one-tap location sharing for confirmed bookings" && git push')
