changes_summary = []

bookings_path = "backend/routes/bookings.js"
with open(bookings_path, "r") as f:
    bookings = f.read()

old_comment_and_route = '''// POST /bookings — creates a booking with NO payment attached (status stays 'pending',
// payment_status stays 'unpaid'). Useful for testing or manual/free bookings, but the
// real customer flow is POST /payments/checkout, which creates the booking AND a
// Paystack transaction together, then a webhook confirms it once paid.
router.post("/", requireAuth, async (req, res) => {
  const { salon_id, service_id, time_slot, booking_date, location_type, customer_address } = req.body;
  if (!salon_id || !service_id || !time_slot) {
    return res.status(400).json({ error: "salon_id, service_id, and time_slot are required" });
  }
  const loc = location_type === "home" ? "home" : "salon";
  if (loc === "home" && !customer_address) {
    return res.status(400).json({ error: "An address is required for home service bookings." });
  }
  try {
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

    const price = loc === "home" ? service.home_service_price : service.price;
    const commissionRate = await getCommissionRate(salon_id);
    const commission_amount = Math.round(price * commissionRate * 100) / 100;
    const payout_amount = Math.round((price - commission_amount) * 100) / 100;

    const { rows } = await db.query(
      `INSERT INTO bookings
        (customer_id, salon_id, service_id, time_slot, booking_date, location_type, customer_address, service_price, booking_fee, commission_rate, commission_amount, payout_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [req.user.id, salon_id, service_id, time_slot, booking_date || null, loc, loc === "home" ? customer_address : null, price, BOOKING_FEE, commissionRate, commission_amount, payout_amount]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't create that booking." });
  }
});'''

new_comment_and_route = '''// POST /bookings — creates the booking directly, no payment involved. Customers
// pay the salon in person; this just sends the request to the owner to accept
// or decline, the same way the old Paystack webhook used to once a payment
// cleared. Confirms immediately since there's no payment step to wait on.
router.post("/", requireAuth, async (req, res) => {
  const { salon_id, service_id, time_slot, booking_date, location_type, customer_address } = req.body;
  if (!salon_id || !service_id || !time_slot) {
    return res.status(400).json({ error: "salon_id, service_id, and time_slot are required" });
  }
  const loc = location_type === "home" ? "home" : "salon";
  if (loc === "home" && !customer_address) {
    return res.status(400).json({ error: "An address is required for home service bookings." });
  }
  try {
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

    const price = loc === "home" ? service.home_service_price : service.price;
    const commissionRate = await getCommissionRate(salon_id);
    const commission_amount = Math.round(price * commissionRate * 100) / 100;
    const payout_amount = Math.round((price - commission_amount) * 100) / 100;

    const { rows } = await db.query(
      `INSERT INTO bookings
        (customer_id, salon_id, service_id, time_slot, booking_date, location_type, customer_address, service_price, booking_fee, commission_rate, commission_amount, payout_amount, status, owner_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'confirmed', 'pending') RETURNING *`,
      [req.user.id, salon_id, service_id, time_slot, booking_date || null, loc, loc === "home" ? customer_address : null, price, BOOKING_FEE, commissionRate, commission_amount, payout_amount]
    );
    const booking = rows[0];

    const { rows: salonRows } = await db.query("SELECT name, owner_id FROM salons WHERE id = $1", [salon_id]);
    const salonInfo = salonRows[0];

    await notifyUser(booking.customer_id, {
      type: "booking_confirmed",
      title: "Booking sent",
      body: `Your booking${salonInfo ? ` at ${salonInfo.name}` : ""} for ${service.name} at ${booking.time_slot} is in — waiting for the salon to accept.`,
      bookingId: booking.id,
    });
    if (salonInfo) {
      await notifyUser(salonInfo.owner_id, {
        type: "new_booking",
        title: "New booking received",
        body: `You have a new booking for ${service.name} at ${booking.time_slot}. Accept or decline it from your dashboard.`,
        bookingId: booking.id,
      });
    }

    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't create that booking." });
  }
});'''

if old_comment_and_route in bookings:
    assert bookings.count(old_comment_and_route) == 1, "bookings.js POST / anchor not unique"
    bookings = bookings.replace(old_comment_and_route, new_comment_and_route)
    with open(bookings_path, "w") as f:
        f.write(bookings)
    changes_summary.append("✅ bookings.js — POST /bookings now confirms immediately and notifies both sides")
else:
    changes_summary.append("⏭️  bookings.js already updated — skipped")

app_path = "frontend/src/App.jsx"
with open(app_path, "r") as f:
    src = f.read()

old_state = '''  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [payMethod, setPayMethod] = useState("card");

  useEffect(() => {
    if (!token) return;
    apiFetch("/wallet/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => setWalletBalance(data.balance || 0))
      .catch(() => {});
  }, [token]);

  const price = location === "home" ? service.home_service_price : service.price;
  const total = (price + BOOKING_FEE).toFixed(2);
  const todayStr = new Date().toISOString().slice(0, 10);
  const canSubmit = time && date && (location !== "home" || address.trim().length > 0);
  const walletCanCover = walletBalance >= parseFloat(total);

  const handleBook = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (payMethod === "wallet") {
        await apiFetch("/payments/checkout-wallet", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            salon_id: salon.id,
            service_id: service.id,
            time_slot: time,
            booking_date: date,
            location_type: location,
            customer_address: location === "home" ? address.trim() : undefined,
          }),
        });
        onPaidWithWallet();
        return;
      }
      const { url } = await apiFetch("/payments/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          salon_id: salon.id,
          service_id: service.id,
          time_slot: time,
          booking_date: date,
          location_type: location,
          customer_address: location === "home" ? address.trim() : undefined,
        }),
      });
      window.location.href = url; // hand off to Stripe's hosted checkout page
    } catch (e) {
      setError(e.message || "Couldn't start checkout — try again.");
      setSubmitting(false);
    }
  };'''

new_state = '''  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const price = location === "home" ? service.home_service_price : service.price;
  const total = (price + BOOKING_FEE).toFixed(2);
  const todayStr = new Date().toISOString().slice(0, 10);
  const canSubmit = time && date && (location !== "home" || address.trim().length > 0);

  const handleBook = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/bookings", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          salon_id: salon.id,
          service_id: service.id,
          time_slot: time,
          booking_date: date,
          location_type: location,
          customer_address: location === "home" ? address.trim() : undefined,
        }),
      });
      onPaidWithWallet();
    } catch (e) {
      setError(e.message || "Couldn't send that booking — try again.");
      setSubmitting(false);
    }
  };'''

if old_state in src:
    assert src.count(old_state) == 1, "BookingView state block anchor not unique"
    src = src.replace(old_state, new_state)
    changes_summary.append("✅ App.jsx — BookingView now books directly via POST /bookings, no payment step")
else:
    changes_summary.append("⏭️  App.jsx BookingView state already updated — skipped")

old_pay_section = '''        <h3 className="mt-6 mb-3 text-xl" style={{ fontFamily: FONT_DISPLAY, color: textColor, fontWeight: 700 }}>
          How do you want to pay?
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-2">
          <button
            onClick={() => setPayMethod("card")}
            className="py-4 px-3 rounded-2xl text-base tap-glass"
            style={{
              background: payMethod === "card" ? colors.hairline : colors.panelLight,
              color: payMethod === "card" ? "#FFFFFF" : colors.cream,
              border: `3px solid ${colors.hairline}`,
              fontWeight: 700,
            }}
          >
            Pay by card
          </button>
          <button
            onClick={() => walletCanCover && setPayMethod("wallet")}
            disabled={!walletCanCover}
            className="py-4 px-3 rounded-2xl text-base tap-glass"
            style={{
              background: payMethod === "wallet" ? colors.hairline : colors.panelLight,
              color: payMethod === "wallet" ? "#FFFFFF" : colors.cream,
              border: `3px solid ${colors.hairline}`,
              fontWeight: 700,
              opacity: walletCanCover ? 1 : 0.5,
            }}
          >
            Pay from wallet<br /><span className="text-sm font-normal">₦{Number(walletBalance).toLocaleString()} available</span>
          </button>
        </div>

<SwipeToPay onConfirm={handleBook} disabled={!canSubmit} submitting={submitting} />'''

new_pay_section = '''<SwipeToPay onConfirm={handleBook} disabled={!canSubmit} submitting={submitting} />'''

if old_pay_section in src:
    assert src.count(old_pay_section) == 1, "Pay method section anchor not unique"
    src = src.replace(old_pay_section, new_pay_section)
    changes_summary.append("✅ App.jsx — removed 'Pay by card' / 'Pay from wallet' section entirely")
else:
    changes_summary.append("⏭️  App.jsx pay method section already removed — skipped")

old_slide_text = '{submitting ? "Processing..." : "Tap or slide to pay & book"}'
new_slide_text = '{submitting ? "Booking..." : "Tap or slide to book"}'

if old_slide_text in src:
    assert src.count(old_slide_text) == 1, "Slide text anchor not unique"
    src = src.replace(old_slide_text, new_slide_text)
    changes_summary.append("✅ App.jsx — slider now says 'Tap or slide to book'")
else:
    changes_summary.append("⏭️  App.jsx slider text already updated — skipped")

with open(app_path, "w") as f:
    f.write(src)

for line in changes_summary:
    print(line)
