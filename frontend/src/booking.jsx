import React, { useState, useRef, useEffect } from "react";
import {
  MapPin, MessageCircle, CheckCircle2, ArrowRight, Loader2,
} from "lucide-react";
import { API_BASE, apiFetch } from "./api";
import { LocationShareBlock } from "./chat";
import { StarSlideRating } from "./ratings";
import { Header, formatBookingDate } from "./shared";
import { CATEGORY_THEMES, FONT_BODY, FONT_DISPLAY, NEUTRAL_HERO_GRADIENT, TIME_SLOTS, colors, BOOKING_FEE, inputStyle, CUSTOMER_CANCEL_REASONS } from "./theme";

function BookingView({ salon, service, onBack, token, onPaidWithWallet }) {
  const homeOnly = service.salon_service_available === false;
  const hasHomeOption = service.home_service_price != null;
  const [time, setTime] = useState(null);
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState(homeOnly ? "home" : "salon");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
  };

  const heroTheme = CATEGORY_THEMES[salon.category] || null;
  const textColor = heroTheme ? "#FFFFFF" : colors.cream;

  return (
    <div
      className="pb-8 relative overflow-hidden transition-[background] duration-500"
      style={{ background: heroTheme ? heroTheme.gradient : NEUTRAL_HERO_GRADIENT }}
    >
      <Header title={service.name} onBack={onBack} />
      <div className="px-4 relative max-w-xl mx-auto w-full">
        {hasHomeOption && !homeOnly && (
          <>
            <h3 className="mt-4 mb-3 text-xl" style={{ fontFamily: FONT_DISPLAY, color: textColor, fontWeight: 700 }}>
              Where should this happen?
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <button
                onClick={() => setLocation("salon")}
                className="py-4 px-3 rounded-2xl text-base tap-glass"
                style={{
                  background: location === "salon" ? colors.hairline : colors.panelLight,
                  color: location === "salon" ? "#FFFFFF" : colors.cream,
                  border: `3px solid ${colors.hairline}`,
                  fontWeight: 700,
                }}
              >
                At the salon<br /><span className="text-sm font-normal">₦{service.price.toFixed(2)}</span>
              </button>
              <button
                onClick={() => setLocation("home")}
                className="py-4 px-3 rounded-2xl text-base tap-glass"
                style={{
                  background: location === "home" ? colors.hairline : colors.panelLight,
                  color: location === "home" ? "#FFFFFF" : colors.cream,
                  border: `3px solid ${colors.hairline}`,
                  fontWeight: 700,
                }}
              >
                At your location<br /><span className="text-sm font-normal">₦{service.home_service_price.toFixed(2)}</span>
              </button>
            </div>
          </>
        )}

        {homeOnly && (
          <p className="mt-4 mb-2 text-sm" style={{ color: textColor }}>
            🏠 This is a home-visit service — ₦{service.home_service_price.toFixed(2)}
          </p>
        )}

        {location === "salon" && (salon.address || salon.city || salon.state) && (
          <div className="mb-4 px-4 py-3 rounded-xl flex items-start gap-2" style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}` }}>
            <MapPin size={16} color={colors.hairline} className="mt-0.5 shrink-0" />
            <p className="text-sm" style={{ color: colors.cream }}>
              {salon.address || "Address not set"}{salon.city ? `, ${salon.city}` : ""}{salon.state ? `, ${salon.state}` : ""}
            </p>
          </div>
        )}

        {location === "home" && (
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Your address (where should they come?)"
            className="w-full mb-4 px-4 py-3 rounded-xl text-base outline-none"
            style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
          />
        )}

        <h3 className="mt-2 mb-3 text-xl" style={{ fontFamily: FONT_DISPLAY, color: textColor, fontWeight: 700 }}>
          Pick a date
        </h3>
        <div className="w-full mb-6 rounded-xl overflow-hidden" style={{ border: `2px solid ${colors.hairline}` }}>
          <input
            type="date"
            min={todayStr}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="outline-none block"
            style={{
              background: colors.panelLight,
              color: colors.cream,
              boxSizing: "border-box",
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              padding: "10px 8px",
              fontSize: "0.9rem",
              border: "none",
            }}
          />
        </div>

        <h3 className="mb-3 text-xl" style={{ fontFamily: FONT_DISPLAY, color: textColor, fontWeight: 700 }}>
          Pick a time
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {TIME_SLOTS.map((t) => {
            const active = !useCustomTime && time === t;
            return (
              <button
                key={t}
                onClick={() => { setUseCustomTime(false); setTime(t); }}
                className="py-4 rounded-2xl text-lg tap-glass"
                style={{
                  background: active ? colors.hairline : colors.panelLight,
                  color: active ? "#FFFFFF" : colors.cream,
                  border: `3px solid ${colors.hairline}`,
                  fontWeight: 700,
                }}
              >
                {t}
              </button>
            );
          })}
        </div>

        {!useCustomTime ? (
          <button
            onClick={() => { setUseCustomTime(true); setTime(null); }}
            className="w-full mt-3 py-3 rounded-2xl text-sm tap-glass"
            style={{ border: `2px dashed ${colors.hairline}`, color: textColor, fontWeight: 600 }}
          >
            None of these work — pick my own time
          </button>
        ) : (
          <div className="mt-3 rounded-2xl overflow-hidden" style={{ border: `2px solid ${colors.hairline}` }}>
            <input
              type="time"
              value={customTimeInput}
              onChange={(e) => {
                const val = e.target.value;
                setCustomTimeInput(val);
                if (val) {
                  const [h, m] = val.split(":").map(Number);
                  const period = h >= 12 ? "PM" : "AM";
                  const hour12 = h % 12 === 0 ? 12 : h % 12;
                  setTime(`${hour12}:${String(m).padStart(2, "0")} ${period}`);
                } else {
                  setTime(null);
                }
              }}
              className="outline-none block"
              style={{
                background: colors.panelLight,
                color: colors.cream,
                boxSizing: "border-box",
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
                padding: "10px 8px",
                fontSize: "0.9rem",
                border: "none",
              }}
            />
          </div>
        )}
        {useCustomTime && (
          <button
            onClick={() => { setUseCustomTime(false); setTime(null); setCustomTimeInput(""); }}
            className="mt-2 text-sm underline"
            style={{ color: textColor }}
          >
            Use a fixed time slot instead
          </button>
        )}

        <div className="mt-6 rounded-2xl px-5 py-4" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
          <div className="flex justify-between text-sm" style={{ color: colors.creamDim }}>
            <span>{location === "home" ? "Home visit price" : "Service price"}</span>
            <span>₦{price.toFixed(2)}</span>
          </div>
          {BOOKING_FEE > 0 && (
            <div className="flex justify-between text-sm mt-1" style={{ color: colors.creamDim }}>
              <span>Booking fee</span>
              <span>₦{BOOKING_FEE.toFixed(2)}</span>
            </div>
          )}
          <div className="mt-2 pt-2 flex justify-between text-lg" style={{ color: colors.cream, borderTop: `2px solid ${colors.hairline}` }}>
            <span>Total</span>
            <span style={{ fontWeight: 700 }}>₦{total}</span>
          </div>
        </div>

        {error && (
          <p className="text-base text-center mt-4" style={{ color: heroTheme ? "rgba(255,255,255,0.85)" : colors.creamDim }}>{error}</p>
        )}

<SwipeToPay onConfirm={handleBook} disabled={!canSubmit} submitting={submitting} />
      </div>
    </div>
  );
}


function ConfirmationView({ salon, service, time, onDone }) {
  return (
    <div className="px-4 pt-16 pb-8 flex flex-col items-center text-center">
      <div className="rounded-full p-6" style={{ border: `4px solid ${colors.hairline}` }}>
        <CheckCircle2 size={64} color={colors.hairline} strokeWidth={2} />
      </div>
      <h2 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "2rem", fontWeight: 700 }} className="mt-6">
        All set!
      </h2>
      <p className="text-xl mt-2" style={{ color: colors.creamDim }}>
        {salon.name} · {time}
      </p>
      <button
        onClick={onDone}
        className="mt-10 px-8 py-5 rounded-2xl text-xl w-full"
        style={{ background: colors.hairline, color: "#FFFFFF", fontWeight: 700 }}
      >
        Done
      </button>
    </div>
  );
}


function SwipeToComplete({ onComplete }) {
  const trackRef = useRef(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);
  const startXRef = useRef(0);
  const trackWidthRef = useRef(0);
  const handleSize = 36;

  function handlePointerDown(e) {
    if (done) return;
    e.target.setPointerCapture?.(e.pointerId);
    setDragging(true);
    trackWidthRef.current = trackRef.current.offsetWidth;
    startXRef.current = e.clientX - dragX;
  }
  function handlePointerMove(e) {
    if (!dragging) return;
    const maxX = trackWidthRef.current - handleSize;
    let next = e.clientX - startXRef.current;
    next = Math.max(0, Math.min(next, maxX));
    setDragX(next);
  }
  function handlePointerUp() {
    if (!dragging) return;
    setDragging(false);
    const maxX = trackWidthRef.current - handleSize;
    if (maxX > 0 && dragX >= maxX * 0.8) {
      setDragX(maxX);
      setDone(true);
      onComplete();
    } else {
      setDragX(0);
    }
  }

  return (
    <div
      ref={trackRef}
      className="relative rounded-full overflow-hidden select-none"
      style={{ width: 160, height: 36, background: colors.panelLight, border: `2px solid ${colors.hairline}`, touchAction: "none" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={handleTrackClick}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: dragX + handleSize, background: colors.green, opacity: 0.35, transition: dragging ? "none" : "width 0.2s ease" }}
      />
      <div
        className="absolute inset-0 flex items-center justify-center text-xs font-semibold pointer-events-none"
        style={{ color: colors.creamDim }}
      >
        {done ? "Completed" : "Slide to complete"}
      </div>
      <div
        onPointerDown={handlePointerDown}
        className="absolute top-0 flex items-center justify-center rounded-full cursor-pointer"
        style={{ left: dragX, width: handleSize, height: handleSize, background: colors.green, transition: dragging ? "none" : "left 0.2s ease" }}
      >
        <CheckCircle2 size={18} color="#FFFFFF" />
      </div>
    </div>
  );
}


function SwipeToPay({ onConfirm, disabled, submitting }) {
  const trackRef = useRef(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const trackWidthRef = useRef(0);
  const dragStartXRef = useRef(0);
  const movedRef = useRef(false);
  const handleSize = 56;

  function handlePointerDown(e) {
    if (disabled || submitting) return;
    e.target.setPointerCapture?.(e.pointerId);
    setDragging(true);
    trackWidthRef.current = trackRef.current.offsetWidth;
    startXRef.current = e.clientX - dragX;
    dragStartXRef.current = dragX;
    movedRef.current = false;
  }
  function handlePointerMove(e) {
    if (!dragging) return;
    const maxX = trackWidthRef.current - handleSize;
    let next = e.clientX - startXRef.current;
    next = Math.max(0, Math.min(next, maxX));
    if (Math.abs(next - dragStartXRef.current) > 5) movedRef.current = true;
    setDragX(next);
  }
  function handlePointerUp() {
    if (!dragging) return;
    setDragging(false);
    const maxX = trackWidthRef.current - handleSize;
    if (maxX > 0 && dragX >= maxX * 0.8) {
      setDragX(maxX);
      onConfirm();
    } else {
      setDragX(0);
    }
  }
  function handleTrackClick() {
    if (disabled || submitting || movedRef.current) return;
    const maxX = trackWidthRef.current - handleSize;
    setDragX(maxX);
    onConfirm();
  }

  return (
    <div
      ref={trackRef}
      className="relative rounded-2xl overflow-hidden select-none w-full mt-6"
      style={{
        height: 64,
        background: colors.panelLight,
        border: `3px solid ${colors.hairline}`,
        touchAction: "none",
        opacity: disabled && !submitting ? 0.6 : 1,
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-2xl"
        style={{ width: dragX + handleSize, background: colors.hairline, transition: dragging ? "none" : "width 0.2s ease" }}
      />
      <div
        className="absolute inset-0 flex items-center justify-center text-lg font-bold pointer-events-none"
        style={{ color: colors.cream }}
      >
        {submitting ? "Booking..." : "Tap or slide to book"}
      </div>
      <div
        onPointerDown={handlePointerDown}
        className="absolute top-0 flex items-center justify-center rounded-2xl"
        style={{ left: dragX, width: handleSize, height: handleSize, background: colors.hairline, cursor: disabled ? "not-allowed" : "pointer" }}
      >
        {submitting ? <Loader2 size={22} className="animate-spin" color="#FFFFFF" /> : <ArrowRight size={22} color="#FFFFFF" />}
      </div>
    </div>
  );
}


function MyBookingsView({ token, onBack, onOpenSalon, onOpenChat: onOpenChatProp }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState(null);
  const [disputingId, setDisputingId] = useState(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeError, setDisputeError] = useState(null);
  const [activeBookingTab, setActiveBookingTab] = useState("Pending");
  const [checkInInputs, setCheckInInputs] = useState({}); // bookingId -> code string
  const [checkInSubmittingId, setCheckInSubmittingId] = useState(null);
  const [checkInErrors, setCheckInErrors] = useState({});
  const [checkInSuccess, setCheckInSuccess] = useState({}); // bookingId -> { visitCount, isRewardVisit }

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiFetch("/bookings/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((rows) => {
        setBookings(rows);
        setError(null);
      })
      .catch(() => setError("Couldn't load your bookings."))
      .finally(() => setLoading(false));
  }, [token, refreshKey]);

  async function submitDispute(bookingId) {
    setDisputeSubmitting(true);
    setDisputeError(null);
    try {
      await apiFetch(`/bookings/${bookingId}/dispute`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: disputeReason.trim() || null }),
      });
      setDisputingId(null);
      setDisputeReason("");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setDisputeError(e.message || "Couldn't file that dispute — try again.");
    } finally {
      setDisputeSubmitting(false);
    }
  }

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

  const [openingChatId, setOpeningChatId] = useState(null);
  const [openChatErrors, setOpenChatErrors] = useState({});

  async function openChatFor(booking) {
    setOpeningChatId(booking.id);
    setOpenChatErrors((prev) => ({ ...prev, [booking.id]: null }));
    try {
      const convo = await apiFetch("/conversations/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ salon_id: booking.salon_id }),
      });
      onOpenChatProp && onOpenChatProp(convo.id);
    } catch (e) {
      setOpenChatErrors((prev) => ({ ...prev, [booking.id]: e.message || "Couldn't open this chat." }));
    } finally {
      setOpeningChatId(null);
    }
  }
  const onOpenChat = onOpenChatProp ? openChatFor : null;

  async function submitCheckIn(bookingId) {
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

  // Grouped so pending (awaiting acceptance or awaiting check-in) and
  // completed bookings are easy to browse separately, as switchable tabs
  // instead of one long mixed list or a long stacked scroll.
  const bookingSections = [
    { label: "Pending", items: bookings.filter((b) => b.status === "confirmed") },
    { label: "Completed", items: bookings.filter((b) => b.status === "completed") },
    { label: "Cancelled", items: bookings.filter((b) => b.status === "cancelled") },
  ];
  const activeSection = bookingSections.find((s) => s.label === activeBookingTab) || bookingSections[0];

  return (
    <div className="pb-8 transition-[background] duration-500" style={{ background: NEUTRAL_HERO_GRADIENT }}>
      <Header title="My bookings" onBack={onBack} />
      <div className="px-4 max-w-xl mx-auto w-full">
        {loading && (
          <div className="flex justify-center pt-8">
            <Loader2 size={28} className="animate-spin" color={colors.creamDim} />
          </div>
        )}
        {error && (
          <p className="text-sm text-center mt-4" style={{ color: colors.creamDim }}>{error}</p>
        )}
        {!loading && !error && bookings.length === 0 && (
          <p className="text-sm py-4" style={{ color: colors.creamDim }}>
            No bookings yet — go find a salon and book something.
          </p>
        )}
        {bookings.length > 0 && (
          <div className="flex gap-2 mt-4">
            {bookingSections.map((section) => (
              <button
                key={section.label}
                onClick={() => setActiveBookingTab(section.label)}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold tap-glass"
                style={{
                  background: activeBookingTab === section.label ? colors.hairline : colors.panelLight,
                  color: activeBookingTab === section.label ? "#FFFFFF" : colors.creamDim,
                  border: `2px solid ${colors.hairline}`,
                }}
              >
                {section.label} ({section.items.length})
              </button>
            ))}
          </div>
        )}
        {bookings.length > 0 && activeSection.items.length === 0 && (
          <p className="text-sm py-6 text-center" style={{ color: colors.creamDim }}>
            Nothing in {activeSection.label.toLowerCase()} yet.
          </p>
        )}
        <div className="flex flex-col gap-2 mt-3">
          {activeSection.items.map((b) => (
            <div
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
                    disabled={openingChatId === b.id}
                    className="shrink-0 p-2 rounded-full tap-glass"
                    style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}` }}
                    aria-label="Message this salon"
                  >
                    {openingChatId === b.id ? (
                      <Loader2 size={16} className="animate-spin" color={colors.cream} />
                    ) : (
                      <MessageCircle size={16} color={colors.cream} />
                    )}
                  </button>
                )}
              </div>
              {openChatErrors[b.id] && (
                <p className="text-xs mt-1" style={{ color: "#E07A5F" }}>{openChatErrors[b.id]}</p>
              )}

              {b.status === "cancelled" && (
                <p className="text-xs mt-2" style={{ color: "#E07A5F" }}>
                  Cancelled by {b.cancelled_by === "owner" ? "salon" : "you"}
                  {b.cancel_reason ? ` — ${b.cancel_reason}` : ""}
                </p>
              )}
                {b.status === "confirmed" && b.owner_response === "pending" && (
                  <p className="text-xs mt-2" style={{ color: colors.gold }}>
                    Booking sent — waiting for {b.salon_name} to accept.
                  </p>
                )}
                {b.status === "confirmed" && b.disputed_at && (
                  <p className="text-xs mt-2" style={{ color: "#E07A5F" }}>
                    ⚠️ You disputed this booking — TheHub is reviewing it.
                  </p>
                )}
                {b.status === "confirmed" && (
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
                        onChange={(e) => setCheckInInputs((prev) => ({ ...prev, [b.id]: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
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
                )}
                {b.checked_in_at && !b.disputed_at && (
                  <div className="mt-2 flex flex-col gap-2">
                    {disputingId !== b.id ? (
                      <button
                        onClick={() => { setDisputingId(b.id); setDisputeReason(""); setDisputeError(null); }}
                        className="self-start text-xs font-semibold px-3 py-1 rounded-full tap-glass"
                        style={{ border: `2px solid #E07A5F`, color: "#E07A5F" }}
                      >
                        Something wrong? Dispute this booking
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={disputeReason}
                          onChange={(e) => setDisputeReason(e.target.value)}
                          placeholder="What went wrong? (optional)"
                          rows={2}
                          className="px-3 py-2 rounded-xl text-sm outline-none resize-none"
                          style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
                        />
                        {disputeError && <p className="text-xs" style={{ color: "#E07A5F" }}>{disputeError}</p>}
                        <div className="flex gap-2">
                          <button
                            onClick={() => submitDispute(b.id)}
                            disabled={disputeSubmitting}
                            className="px-4 py-2 rounded-full text-xs font-semibold tap-glass"
                            style={{ background: "#E07A5F", color: "#FFFFFF" }}
                          >
                            {disputeSubmitting ? "Filing…" : "File dispute"}
                          </button>
                          <button
                            onClick={() => setDisputingId(null)}
                            className="px-4 py-2 rounded-full text-xs font-semibold tap-glass"
                            style={{ border: `2px solid ${colors.hairline}`, color: colors.creamDim }}
                          >
                            Never mind
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {b.status === "completed" && b.already_rated && (
                  <p className="text-xs mt-2" style={{ color: colors.green }}>
                    Completed — you rated it {"★".repeat(b.given_rating)}{"☆".repeat(5 - b.given_rating)}
                  </p>
                )}
                {b.status === "completed" && !b.already_rated && (
                  <StarSlideRating
                    booking={b}
                    token={token}
                    onDone={() => setBookings((prev) => prev.map((x) => (x.id === b.id ? { ...x, already_rated: true } : x)))}
                  />
                )}

              {(b.status === "pending" || b.status === "confirmed") && !b.completion_requested_at && cancellingId !== b.id && (
                <button
                  onClick={() => { setCancellingId(b.id); setCancelReason(""); setCancelError(null); }}
                  className="mt-2 self-start text-xs font-semibold px-3 py-1 rounded-full tap-glass"
                  style={{ border: `2px solid ${colors.hairline}`, color: colors.creamDim }}
                >
                  Cancel
                </button>
              )}

              {cancellingId === b.id && (
                <div className="mt-2 flex flex-col gap-2">
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
                  >
                    <option value="">Select a reason</option>
                    {CUSTOMER_CANCEL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {cancelError && <p className="text-xs" style={{ color: "#E07A5F" }}>{cancelError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => submitCancel(b.id)}
                      className="px-4 py-2 rounded-full text-xs font-semibold tap-glass"
                      style={{ background: colors.hairline, color: "#FFFFFF" }}
                    >
                      Confirm cancel
                    </button>
                    <button
                      onClick={() => setCancellingId(null)}
                      className="px-4 py-2 rounded-full text-xs font-semibold tap-glass"
                      style={{ border: `2px solid ${colors.hairline}`, color: colors.creamDim }}
                    >
                      Keep booking
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { BookingView, ConfirmationView, SwipeToComplete, SwipeToPay, MyBookingsView };