import React, { useState, useRef, useEffect } from "react";
import {
  X, TrendingUp, MessageCircle, Users, ArrowRight, Loader2, WifiOff, Plus, Play, Trash2, Upload, UserCircle,
} from "lucide-react";
import { NIGERIA_LOCATIONS } from "./nigeriaLocations";
import { API_BASE, apiFetch } from "./api";
import { LocationShareBlock } from "./chat";
import { BankSelect, Header, formatBookingDate } from "./shared";
import { CATEGORIES, FONT_DISPLAY, FONT_MONO, OWNER_THEME_GRADIENT, colors, inputStyle, CUSTOMER_CANCEL_REASONS } from "./theme";

function CreateSalonView({ token, onDone }) {
  const [step, setStep] = useState("salon");
  const [salonId, setSalonId] = useState(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].name);
  const [serviceType, setServiceType] = useState("unisex");
  const [address, setAddress] = useState("");
  const [salonState, setSalonState] = useState("");
  const [salonCity, setSalonCity] = useState("");
  const [salonNeighborhood, setSalonNeighborhood] = useState("");
  const [services, setServices] = useState([]);
  const [svcName, setSvcName] = useState("");
  const [svcDuration, setSvcDuration] = useState("");
  const [svcPrice, setSvcPrice] = useState("");
  const [svcHomePrice, setSvcHomePrice] = useState("");
  const [svcHomeOnly, setSvcHomeOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createSalon = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { id } = await apiFetch("/salons", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, category, address, service_type: serviceType, state: salonState, city: salonCity, neighborhood: salonNeighborhood }),
      });
      setSalonId(id);
      setStep("services");
    } catch (err) {
      setError(err.message || "Couldn't create that salon.");
    } finally {
      setLoading(false);
    }
  };

  const addService = async (e) => {
    e.preventDefault();
    if (!svcName || !svcDuration || !svcPrice) return;
    if (svcHomeOnly && !svcHomePrice) {
      setError("Add a home-visit price — this service is marked as home-visit only.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/salons/${salonId}/services`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: svcName,
          duration_min: Number(svcDuration),
          price: Number(svcPrice),
          home_service_price: svcHomePrice ? Number(svcHomePrice) : null,
          salon_service_available: !svcHomeOnly,
        }),
      });
      setServices((prev) => [...prev, {
        name: svcName,
        duration_min: svcDuration,
        price: svcPrice,
        home_service_price: svcHomePrice || null,
        salon_service_available: !svcHomeOnly,
      }]);
      setSvcName(""); setSvcDuration(""); setSvcPrice(""); setSvcHomePrice(""); setSvcHomeOnly(false);
    } catch (err) {
      setError(err.message || "Couldn't add that service.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "salon") {
    return (
      <div className="px-4 pt-6 pb-10 max-w-xl mx-auto w-full">
        <h2 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.5rem", fontWeight: 700 }} className="text-center mb-6">
          Set up your salon
        </h2>
        <form onSubmit={createSalon} className="flex flex-col gap-3">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Salon name"
            className="pb-2 text-base outline-none" style={inputStyle} />
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="pb-2 text-base outline-none" style={inputStyle}>
            {CATEGORIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
              <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}
                className="pb-2 text-base outline-none" style={inputStyle}>
                <option value="unisex">Unisex — all genders</option>
                <option value="male">Male only</option>
                <option value="female">Female only</option>
              </select>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address"
            className="pb-2 text-base outline-none" style={inputStyle} />
              <select
                value={salonState}
                onChange={(e) => { setSalonState(e.target.value); setSalonCity(""); }}
                className="pb-2 text-base outline-none"
                style={inputStyle}
              >
                <option value="">Select state</option>
                {NIGERIA_LOCATIONS.map((s) => <option key={s.state} value={s.state}>{s.state}</option>)}
              </select>
              <select
                value={salonCity}
                onChange={(e) => setSalonCity(e.target.value)}
                disabled={!salonState}
                className="pb-2 text-base outline-none"
                style={inputStyle}
              >
                <option value="">Select city</option>
                {(NIGERIA_LOCATIONS.find((s) => s.state === salonState)?.cities || []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
          <input value={salonNeighborhood} onChange={(e) => setSalonNeighborhood(e.target.value)} placeholder="Neighborhood / area (e.g. Akobo)"
            className="pb-2 text-base outline-none" style={inputStyle} />
          {error && <p className="text-sm text-center" style={{ color: colors.creamDim }}>{error}</p>}
          <button type="submit" disabled={loading}
            className="mt-2 py-4 rounded-2xl text-lg flex items-center justify-center gap-2 tap-glass"
            style={{ background: colors.hairline, color: "#FFFFFF", fontWeight: 700 }}>
            {loading ? <Loader2 size={20} className="animate-spin" /> : <>Next <ArrowRight size={18} /></>}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-10 max-w-xl mx-auto w-full">
      <h2 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.5rem", fontWeight: 700 }} className="text-center mb-2">
        Add your services
      </h2>
      <p className="text-sm text-center mb-5" style={{ color: colors.creamDim }}>Add at least one so customers can book.</p>

      {services.length > 0 && (
        <div className="flex flex-col gap-2 mb-5">
          {services.map((s, i) => (
            <div key={i} className="flex flex-col px-4 py-3 rounded-xl" style={{ border: `2px solid ${colors.hairline}` }}>
              <div className="flex items-center justify-between">
                <span style={{ color: colors.cream, fontWeight: 600 }}>{s.name}</span>
                <span style={{ color: colors.creamDim }}>
                  {s.duration_min} min{s.salon_service_available !== false ? ` · ₦${s.price}` : ""}
                </span>
              </div>
              {s.home_service_price && (
                <span className="text-sm mt-1" style={{ color: colors.gold }}>
                  🏠 Home visit — ₦{s.home_service_price}
                  {s.salon_service_available === false ? " (home visits only)" : ""}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addService} className="flex flex-col gap-3">
        <input value={svcName} onChange={(e) => setSvcName(e.target.value)} placeholder="Service name (e.g. Skin Fade)"
          className="pb-2 text-base outline-none" style={inputStyle} />
        <div className="flex gap-3">
          <input value={svcDuration} onChange={(e) => setSvcDuration(e.target.value)} type="number" placeholder="Minutes"
            className="flex-1 pb-2 text-base outline-none" style={inputStyle} />
          <input value={svcPrice} onChange={(e) => setSvcPrice(e.target.value)} type="number" placeholder="Price ₦ (at salon)"
            className="flex-1 pb-2 text-base outline-none" style={inputStyle} />
        </div>

        <label className="flex items-center gap-2 text-sm mt-1" style={{ color: colors.creamDim }}>
          <input type="checkbox" checked={svcHomeOnly} onChange={(e) => setSvcHomeOnly(e.target.checked)} />
          I don't have a shop — this is a home-visit-only service
        </label>

        <input
          value={svcHomePrice}
          onChange={(e) => setSvcHomePrice(e.target.value)}
          type="number"
          placeholder={svcHomeOnly ? "Home visit price ₦ (required)" : "Home visit price ₦ (optional)"}
          className="pb-2 text-base outline-none"
          style={inputStyle}
        />
        {svcHomePrice && !svcHomeOnly && (
          <p className="text-xs" style={{ color: colors.creamDim }}>
            Clients will be able to choose "at the salon" or "at their home" for this service.
          </p>
        )}

        {error && <p className="text-sm text-center" style={{ color: colors.creamDim }}>{error}</p>}
        <button type="submit" disabled={loading}
          className="py-3.5 rounded-2xl text-base flex items-center justify-center gap-2 tap-glass"
          style={{ border: `3px solid ${colors.hairline}`, color: colors.cream, fontWeight: 700 }}>
          <Plus size={18} /> Add service
        </button>
      </form>

      <button
        onClick={() => onDone()}
        disabled={services.length === 0}
        className="w-full mt-5 py-4 rounded-2xl text-lg"
        style={{
          background: services.length ? colors.hairline : colors.panelLight,
          color: services.length ? "#FFFFFF" : colors.creamDim,
          fontWeight: 700,
        }}
      >
        Done
      </button>
    </div>
  );
}


  

function MediaManager({ salonId, token }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const loadMedia = () => {
    setLoading(true);
    apiFetch(`/salons/${salonId}/media`)
      .then((data) => setMedia(Array.isArray(data) ? data : (data.media || [])))
      .catch(() => setError("Couldn't load photos/videos."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!salonId) return;
    loadMedia();
  }, [salonId]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/salons/${salonId}/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      loadMedia();
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (mediaId) => {
    try {
      await apiFetch(`/salons/${salonId}/media/${mediaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
    } catch (err) {
      setError("Couldn't delete that item.");
    }
  };

  return (
    <div className="mt-6">
      <h3 className="mb-2 text-xs uppercase tracking-wide" style={{ color: colors.creamDim, fontFamily: FONT_DISPLAY }}>
        Photos & Videos
      </h3>
      {error && (
        <p className="text-xs mb-2" style={{ color: '#E07A5F' }}>{error}</p>
      )}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {media.map((m) => (
          <div key={m.id} className="relative rounded-xl overflow-hidden aspect-square" style={{ background: colors.panelLight }}>
            {m.media_type === 'video' ? (
              <>
                <video src={m.url} className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
                </div>
              </>
            ) : (
              <img src={m.url} alt="" className="w-full h-full object-cover" />
            )}
            <button
              onClick={() => handleDelete(m.id)}
              className="absolute top-1 right-1 p-1 rounded-full"
              style={{ background: 'rgba(0,0,0,0.5)' }}
            >
              <Trash2 size={14} color="#FFFFFF" />
            </button>
          </div>
        ))}
        {loading && <p className="text-xs col-span-3" style={{ color: colors.creamDim }}>Loading...</p>}
        {!loading && media.length === 0 && (
          <p className="text-xs col-span-3 py-2" style={{ color: colors.creamDim }}>No photos or videos yet.</p>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <button
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold tap-glass"
        style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
      >
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        {uploading ? 'Uploading...' : 'Add photo or video'}
      </button>
    </div>
  );
}


function MediaGallery({ salonId, textColor }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);

  useEffect(() => {
    if (!salonId) return;
    apiFetch(`/salons/${salonId}/media`)
      .then((data) => setMedia(Array.isArray(data) ? data : (data.media || [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [salonId]);

  if (loading || media.length === 0) return null;

  return (
    <div className="mt-7">
      <h3 className="mb-3 text-xl" style={{ fontFamily: FONT_DISPLAY, color: textColor || colors.cream, fontWeight: 700 }}>
        Gallery
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {media.map((m) => (
          <button
            key={m.id}
            onClick={() => setActive(m)}
            className="relative rounded-xl overflow-hidden aspect-square"
            style={{ background: colors.panelLight }}
          >
            {m.media_type === 'video' ? (
              <>
                <video src={m.url} className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
                </div>
              </>
            ) : (
              <img src={m.url} alt="" className="w-full h-full object-cover" />
            )}
          </button>
        ))}
      </div>
      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setActive(null)}
        >
          {active.media_type === 'video' ? (
            <video src={active.url} controls autoPlay className="max-w-full max-h-full rounded-xl" onClick={(e) => e.stopPropagation()} />
          ) : (
            <img src={active.url} alt="" className="max-w-full max-h-full rounded-xl" onClick={(e) => e.stopPropagation()} />
          )}
          <button
            onClick={() => setActive(null)}
            className="absolute top-4 right-4 p-2 rounded-full"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <X size={20} color="#FFFFFF" />
          </button>
        </div>
      )}
    </div>
  );
}


function OwnerDashboard({ token, onOpenChat: onOpenChatProp }) {
  const [salon, setSalon] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);
  const [decliningId, setDecliningId] = useState(null);
  const [declineSubmitting, setDeclineSubmitting] = useState(false);
  const [respondErrors, setRespondErrors] = useState({});
  const [completingId, setCompletingId] = useState(null); // booking whose "mark as done" panel is open
  const [completionPhoto, setCompletionPhoto] = useState(null);
  const [completionSubmitting, setCompletionSubmitting] = useState(false);
  const [completionError, setCompletionError] = useState(null);
  const [otpInputs, setOtpInputs] = useState({}); // bookingId -> code string
  const [confirmSubmittingId, setConfirmSubmittingId] = useState(null);
  const [confirmErrors, setConfirmErrors] = useState({});
  const [viewingCustomer, setViewingCustomer] = useState(null); // { id, name } | null
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
  }
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

  async function submitAccept(bookingId) {
    setAcceptingId(bookingId);
    setRespondErrors((prev) => ({ ...prev, [bookingId]: null }));
    try {
      await apiFetch(`/bookings/${bookingId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setRespondErrors((prev) => ({ ...prev, [bookingId]: e.message || "Couldn't accept — try again." }));
    } finally {
      setAcceptingId(null);
    }
  }

  async function submitDecline(bookingId) {
    setDeclineSubmitting(true);
    setRespondErrors((prev) => ({ ...prev, [bookingId]: null }));
    try {
      await apiFetch(`/bookings/${bookingId}/decline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setDecliningId(null);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setRespondErrors((prev) => ({ ...prev, [bookingId]: e.message || "Couldn't decline — try again." }));
    } finally {
      setDeclineSubmitting(false);
    }
  }

  async function submitRequestCompletion(bookingId) {
    setCompletionSubmitting(true);
    setCompletionError(null);
    try {
      const form = new FormData();
      if (completionPhoto) form.append("photo", completionPhoto);
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/request-completion`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setCompletionError(err.error || "Couldn't request completion.");
        return;
      }
      setCompletingId(null);
      setCompletionPhoto(null);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setCompletionError("Network error. Please try again.");
    } finally {
      setCompletionSubmitting(false);
    }
  }

  async function submitConfirmCompletion(bookingId) {
    const otp = (otpInputs[bookingId] || "").trim();
    if (!otp) {
      setConfirmErrors((prev) => ({ ...prev, [bookingId]: "Enter the client's code." }));
      return;
    }
    setConfirmSubmittingId(bookingId);
    setConfirmErrors((prev) => ({ ...prev, [bookingId]: null }));
    try {
      await apiFetch(`/bookings/${bookingId}/confirm-completion`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ otp }),
      });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setConfirmErrors((prev) => ({ ...prev, [bookingId]: e.message || "Couldn't confirm — check the code." }));
    } finally {
      setConfirmSubmittingId(null);
    }
  }
  const [connecting, setConnecting] = useState(false);

  const [banks, setBanks] = useState([]);
  const [businessName, setBusinessName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [resolvedName, setResolvedName] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [connectError, setConnectError] = useState(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const mine = await apiFetch("/salons/mine", { headers: { Authorization: `Bearer ${token}` } });
        if (cancelled) return;
        if (mine.length === 0) {
          setNeedsSetup(true);
          return;
        }
        setNeedsSetup(false);
        setSalon(mine[0]);
        const [dashboard, connectStatus] = await Promise.all([
          apiFetch(`/salons/${mine[0].id}/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
          apiFetch(`/payments/connect/status?salon_id=${mine[0].id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        ]);
        if (cancelled) return;
        setData(dashboard);
        if (connectStatus) setSalon((prev) => ({ ...prev, paystack_payouts_enabled: connectStatus.payoutsEnabled ? 1 : 0 }));
      } catch (e) {
        if (!cancelled) setError("Couldn't reach TheHub server.");
      }
    })();
    return () => { cancelled = true; };
  }, [token, refreshKey]);

  useEffect(() => {
    if (!token) return;
    apiFetch("/payments/banks", { headers: { Authorization: `Bearer ${token}` } })
      .then(setBanks)
      .catch(() => {});
  }, [token]);

  const verifyAccount = async () => {
    if (!bankCode || accountNumber.length !== 10) return;
    setResolving(true);
    setResolvedName(null);
    try {
      const { account_name } = await apiFetch(
        `/payments/resolve-account?account_number=${accountNumber}&bank_code=${bankCode}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResolvedName(account_name);
    } catch (e) {
      setResolvedName(null);
    } finally {
      setResolving(false);
    }
  };

  const connectPayouts = async () => {
    if (!salon || connecting) return;
    if (!businessName || !bankCode || !accountNumber) {
      setConnectError("Fill in business name, bank, and account number.");
      return;
    }
    setConnecting(true);
    setConnectError(null);
    try {
      await apiFetch("/payments/connect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          salon_id: salon.id,
          business_name: businessName,
          bank_code: bankCode,
          account_number: accountNumber,
        }),
      });
      setSalon((prev) => ({ ...prev, paystack_payouts_enabled: 1 }));
    } catch (e) {
      setConnectError(e.message || "Couldn't set up payouts for this salon.");
    } finally {
      setConnecting(false);
    }
  };

  if (needsSetup) {
    return <CreateSalonView token={token} onDone={() => setRefreshKey((k) => k + 1)} />;
  }
  if (viewingCustomer && salon) {
    return (
      <OwnerCustomerProfileView
        token={token}
        salonId={salon.id}
        customerId={viewingCustomer.id}
        onBack={() => setViewingCustomer(null)}
      />
    );
  }
  if (error) {
    return (
      <div className="pb-10 transition-[background] duration-500" style={{ background: OWNER_THEME_GRADIENT }}>
        <Header title="Owner dashboard" />
        <div className="px-4 pt-10 flex flex-col items-center text-center gap-3">
          <WifiOff size={36} color={colors.creamDim} />
          <p className="text-base" style={{ color: colors.creamDim }}>{error}</p>
        </div>
      </div>
    );
  }
  if (!data || !salon) {
    return (
      <div className="pb-10 transition-[background] duration-500" style={{ background: OWNER_THEME_GRADIENT }}>
        <Header title="Owner dashboard" />
        <div className="px-4 pt-10 flex justify-center">
          <Loader2 size={28} className="animate-spin" color={colors.creamDim} />
        </div>
      </div>
    );
  }
  return (
    <div className="pb-10 transition-[background] duration-500" style={{ background: OWNER_THEME_GRADIENT }}>
      <Header title="Owner dashboard" />
      <div className="px-4 max-w-xl mx-auto w-full">
        {!salon.paystack_payouts_enabled && (
          <div className="mb-5 px-4 py-4 rounded-2xl" style={{ border: `3px solid ${colors.hairline}` }}>
            <p className="text-base" style={{ color: colors.cream, fontWeight: 700 }}>Connect payouts to go live</p>
            <p className="text-sm mt-1" style={{ color: colors.creamDim }}>
              Customers can't pay you until you add your bank details below.
            </p>

            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Business name"
              className="w-full mt-3 px-4 py-3 rounded-xl text-base outline-none"
              style={inputStyle}
            />

            <BankSelect
              banks={banks}
              value={bankCode}
              onChange={(code) => { setBankCode(code); setResolvedName(null); }}
              placeholder="Select your bank"
              className="w-full mt-3 px-4 py-3 rounded-xl text-base outline-none text-left"
              style={inputStyle}
            />

            <input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
              onBlur={verifyAccount}
              placeholder="10-digit account number"
              className="w-full mt-3 px-4 py-3 rounded-xl text-base outline-none"
              style={inputStyle}
            />

            {resolving && <p className="text-sm mt-2" style={{ color: colors.creamDim }}>Checking account…</p>}
            {resolvedName && <p className="text-sm mt-2" style={{ color: colors.cream }}>Account holder: {resolvedName}</p>}
            {connectError && <p className="text-sm mt-2" style={{ color: colors.creamDim }}>{connectError}</p>}

            <button
              onClick={connectPayouts}
              disabled={connecting}
              className="w-full mt-3 py-3.5 rounded-2xl text-base flex items-center justify-center gap-2 tap-glass"
              style={{ background: colors.hairline, color: "#FFFFFF", fontWeight: 700 }}
            >
              {connecting ? <Loader2 size={18} className="animate-spin" /> : "Save bank details"}
            </button>
          </div>
        )}
        <p className="text-xs" style={{ color: colors.creamDim }}>{salon.name} · all time</p>
        <div className="grid grid-cols-1 gap-3 mt-3">
          <div className="rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide" style={{ color: colors.creamDim, fontFamily: FONT_MONO }}>
              <TrendingUp size={13} /> Completed bookings
            </div>
            <p style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.6rem" }} className="mt-1">
              {data.completedCount ?? 0}
            </p>
            <p className="text-xs mt-1" style={{ color: colors.creamDim }}>
              How many clients TheHub has sent your way, all time.
            </p>
          </div>
        </div>
        <div className="mt-6 rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
          <h3 className="text-sm font-bold mb-1" style={{ color: colors.cream }}>Your booking QR code</h3>
          <p className="text-xs mb-3" style={{ color: colors.creamDim }}>
            Print this or stick it up in your shop — clients scan it to book you directly, even walk-ins.
          </p>
          <div className="flex flex-col items-center gap-3">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/?salon=${salon.id}`)}`}
              alt="Your TheHub booking QR code"
              className="rounded-xl"
              style={{ width: 200, height: 200, border: `2px solid ${colors.hairline}` }}
            />
            <a
              href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(`${window.location.origin}/?salon=${salon.id}`)}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-full text-xs font-semibold tap-glass"
              style={{ background: colors.hairline, color: "#FFFFFF" }}
            >
              Open large version (tap to save)
            </a>
            <p className="text-xs break-all text-center" style={{ color: colors.creamDim }}>
              {window.location.origin}/?salon={salon.id}
            </p>
          </div>
        </div>

        <MediaManager salonId={salon.id} token={token} />

        <h3 className="mt-6 mb-2 text-xs uppercase tracking-wide" style={{ color: colors.creamDim, fontFamily: FONT_MONO }}>
          Upcoming appointments
        </h3>
        <div className="flex flex-col gap-2">
          {data.upcoming.length === 0 && (
            <p className="text-sm py-4" style={{ color: colors.creamDim }}>No bookings yet — try booking one from the customer app.</p>
          )}
          {data.upcoming.map((a) => (
            <div key={a.id} className="flex flex-col gap-2 px-4 py-3 rounded-xl" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>
              <div className="flex items-center justify-between gap-2">
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

              {a.owner_response === "pending" ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold" style={{ color: colors.gold }}>New booking — accept or decline</p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => submitAccept(a.id)}
                      disabled={acceptingId === a.id}
                      className="px-4 py-2 rounded-full text-xs font-semibold tap-glass"
                      style={{ background: colors.hairline, color: "#FFFFFF" }}
                    >
                      {acceptingId === a.id ? "Accepting…" : "Accept"}
                    </button>
                    {decliningId !== a.id && (
                      <button
                        onClick={() => setDecliningId(a.id)}
                        className="px-4 py-2 rounded-full text-xs font-semibold tap-glass"
                        style={{ border: `2px solid #E07A5F`, color: "#E07A5F" }}
                      >
                        Decline
                      </button>
                    )}
                  </div>
                  {decliningId === a.id && (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => submitDecline(a.id)}
                        disabled={declineSubmitting}
                        className="px-4 py-2 rounded-full text-xs font-semibold tap-glass"
                        style={{ background: "#E07A5F", color: "#FFFFFF" }}
                      >
                        {declineSubmitting ? "Declining…" : "Confirm decline"}
                      </button>
                      <button
                        onClick={() => setDecliningId(null)}
                        className="px-4 py-2 rounded-full text-xs font-semibold tap-glass"
                        style={{ border: `2px solid ${colors.hairline}`, color: colors.creamDim }}
                      >
                        Never mind
                      </button>
                    </div>
                  )}
                  {respondErrors[a.id] && <p className="text-xs" style={{ color: "#E07A5F" }}>{respondErrors[a.id]}</p>}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.disputed_at ? (
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
                  )}
                  {cancellingId === a.id && (
                    <div className="flex flex-col gap-2">
                      <select
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="px-3 py-2 rounded-xl text-sm outline-none"
                        style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
                      >
                        <option value="">Select a reason</option>
                        {OWNER_CANCEL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      {cancelError && <p className="text-xs" style={{ color: "#E07A5F" }}>{cancelError}</p>}
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => submitCancel(a.id)}
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
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const OWNER_CANCEL_REASONS = [
  "Client no-show",
  "Owner unavailable",
  "Schedule conflict",
  "Emergency",
  "Other",
];


function OwnerProfileView({ token, onBack, onDeleted, onOpenWallet }) {
  const [salon, setSalon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  const [editingServiceId, setEditingServiceId] = useState(null);
  const [serviceForm, setServiceForm] = useState(null);
  const [savingService, setSavingService] = useState(false);
  const [serviceError, setServiceError] = useState(null);
  const [confirmDeleteServiceId, setConfirmDeleteServiceId] = useState(null);

  const [addingService, setAddingService] = useState(false);
  const [newSvc, setNewSvc] = useState({ name: "", duration_min: "", price: "", home_service_price: "", home_only: false });
  const [savingNewSvc, setSavingNewSvc] = useState(false);

  const [confirmDeleteSalon, setConfirmDeleteSalon] = useState(false);
  const [deletingSalon, setDeletingSalon] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const [editingPayout, setEditingPayout] = useState(false);
  const [banks, setBanks] = useState([]);
  const [businessName, setBusinessName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  // The edit form used to always open blank, which made it look like saved
  // payout details had vanished even when they hadn't. Pre-fill from what's
  // actually on the salon record every time editing opens.
  useEffect(() => {
    if (!editingPayout || !salon) return;
    setBusinessName(salon.name || "");
    setBankCode(salon.bank_code || "");
    setAccountNumber(salon.account_number || "");
  }, [editingPayout, salon]);
  const [resolvedName, setResolvedName] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState(null);

  useEffect(() => {
    if (!token || !editingPayout || banks.length > 0) return;
    apiFetch("/payments/banks", { headers: { Authorization: `Bearer ${token}` } })
      .then(setBanks)
      .catch(() => {});
  }, [token, editingPayout]);

  const verifyPayoutAccount = async () => {
    if (!bankCode || accountNumber.length !== 10) return;
    setResolving(true);
    setResolvedName(null);
    try {
      const { account_name } = await apiFetch(
        `/payments/resolve-account?account_number=${accountNumber}&bank_code=${bankCode}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResolvedName(account_name);
    } catch (e) {
      setResolvedName(null);
    } finally {
      setResolving(false);
    }
  };

  const connectPayouts = async () => {
    if (!salon || connecting) return;
    if (!businessName || !bankCode || !accountNumber) {
      setConnectError("Fill in business name, bank, and account number.");
      return;
    }
    setConnecting(true);
    setConnectError(null);
    try {
      await apiFetch("/payments/connect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          salon_id: salon.id,
          business_name: businessName,
          bank_code: bankCode,
          account_number: accountNumber,
        }),
      });
      setSalon((prev) => ({ ...prev, paystack_payouts_enabled: 1 }));
      setEditingPayout(false);
    } catch (e) {
      setConnectError(e.message || "Couldn't update payout details.");
    } finally {
      setConnecting(false);
    }
  };

  const loadSalon = () => {
    setLoading(true);
    apiFetch("/salons/mine", { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => setSalon(data[0] || null))
      .catch(() => setError("Couldn't load your profile."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) return;
    loadSalon();
  }, [token]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !salon) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/salons/${salon.id}/profile-picture`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setSalon((prev) => ({ ...prev, profile_image_url: data.profile_image_url }));
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!salon) return;
    try {
      await apiFetch(`/salons/${salon.id}/profile-picture`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSalon((prev) => ({ ...prev, profile_image_url: null }));
    } catch (err) {
      setError("Couldn't remove photo.");
    }
  };

  const startEditDetails = () => {
    setDetailsForm({
      name: salon.name, category: salon.category, service_type: salon.service_type || "unisex",
      address: salon.address || "", state: salon.state || "", city: salon.city || "",
      neighborhood: salon.neighborhood || "",
    });
    setDetailsError(null);
    setEditingDetails(true);
  };

  const saveDetails = async () => {
    setSavingDetails(true);
    setDetailsError(null);
    try {
      const updated = await apiFetch(`/salons/${salon.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(detailsForm),
      });
      setSalon((prev) => ({ ...prev, ...updated }));
      setEditingDetails(false);
    } catch (err) {
      setDetailsError(err.message || "Couldn't save those changes.");
    } finally {
      setSavingDetails(false);
    }
  };

  const startEditService = (svc) => {
    setServiceForm({
      name: svc.name, duration_min: svc.duration_min, price: svc.price,
      home_service_price: svc.home_service_price ?? "", salon_service_available: svc.salon_service_available !== false,
    });
    setServiceError(null);
    setEditingServiceId(svc.id);
  };

  const saveService = async () => {
    setSavingService(true);
    setServiceError(null);
    try {
      const updated = await apiFetch(`/salons/${salon.id}/services/${editingServiceId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...serviceForm,
          duration_min: Number(serviceForm.duration_min),
          price: Number(serviceForm.price),
          home_service_price: serviceForm.home_service_price ? Number(serviceForm.home_service_price) : null,
        }),
      });
      setSalon((prev) => ({ ...prev, services: prev.services.map((s) => (s.id === updated.id ? updated : s)) }));
      setEditingServiceId(null);
    } catch (err) {
      setServiceError(err.message || "Couldn't save that service.");
    } finally {
      setSavingService(false);
    }
  };

  const deleteService = async (id) => {
    try {
      await apiFetch(`/salons/${salon.id}/services/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSalon((prev) => ({ ...prev, services: prev.services.filter((s) => s.id !== id) }));
      setConfirmDeleteServiceId(null);
    } catch (err) {
      setServiceError(err.message || "Couldn't remove that service.");
    }
  };

  const addService = async () => {
    if (!newSvc.name || !newSvc.duration_min || !newSvc.price) return;
    if (newSvc.home_only && !newSvc.home_service_price) {
      setServiceError("Add a home-visit price — this service is marked as home-visit only.");
      return;
    }
    setSavingNewSvc(true);
    setServiceError(null);
    try {
      const created = await apiFetch(`/salons/${salon.id}/services`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newSvc.name,
          duration_min: Number(newSvc.duration_min),
          price: Number(newSvc.price),
          home_service_price: newSvc.home_service_price ? Number(newSvc.home_service_price) : null,
          salon_service_available: !newSvc.home_only,
        }),
      });
      setSalon((prev) => ({
        ...prev,
        services: [...prev.services, {
          id: created.id, name: newSvc.name, duration_min: Number(newSvc.duration_min), price: Number(newSvc.price),
          home_service_price: newSvc.home_service_price ? Number(newSvc.home_service_price) : null,
          salon_service_available: !newSvc.home_only,
        }],
      }));
      setNewSvc({ name: "", duration_min: "", price: "", home_service_price: "", home_only: false });
      setAddingService(false);
    } catch (err) {
      setServiceError(err.message || "Couldn't add that service.");
    } finally {
      setSavingNewSvc(false);
    }
  };

  const handleDeleteSalon = async () => {
    setDeletingSalon(true);
    setDeleteError(null);
    try {
      await apiFetch(`/salons/${salon.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      onDeleted && onDeleted();
    } catch (err) {
      setDeleteError(err.message || "Couldn't delete this salon.");
      setDeletingSalon(false);
    }
  };

  return (
    <div className="pb-8 transition-[background] duration-500" style={{ background: OWNER_THEME_GRADIENT }}>
      <Header title="My Profile" onBack={onBack} />
      <div className="px-4 max-w-xl mx-auto w-full">
        {loading && (
          <div className="flex justify-center pt-8">
            <Loader2 size={28} className="animate-spin" color={colors.creamDim} />
          </div>
        )}
        {error && (
          <p className="text-sm mt-4" style={{ color: "#E07A5F" }}>{error}</p>
        )}
        {!loading && salon && (
          <>
            <div className="mt-4 flex flex-col items-center">
              <div
                className="w-32 h-32 rounded-full overflow-hidden flex items-center justify-center mb-4"
                style={{ background: colors.panelLight, border: `3px solid ${colors.hairline}` }}
              >
                {salon.profile_image_url ? (
                  <img src={salon.profile_image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserCircle size={64} strokeWidth={1.6} color={colors.hairline} />
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: "none" }} />
              <button
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold tap-glass"
                style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {uploading ? "Uploading..." : salon.profile_image_url ? "Change photo" : "Add photo"}
              </button>
              {salon.profile_image_url && (
                <button onClick={handleRemove} className="mt-3 text-xs" style={{ color: "#E07A5F" }}>
                  Remove photo
                </button>
              )}
            </div>

            <div className="mt-8 rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>
              <h3 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }} className="text-lg mb-1">Your booking link</h3>
              <p className="text-xs mb-3" style={{ color: colors.creamDim }}>
                Share this with clients — it takes them straight to booking you, no searching needed.
              </p>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}` }}>
                <p className="flex-1 text-xs break-all" style={{ color: colors.cream }}>
                  {window.location.origin}/?salon={salon.id}
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/?salon=${salon.id}`);
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2000);
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold tap-glass"
                  style={{ background: colors.hairline, color: "#FFFFFF" }}
                >
                  {linkCopied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div className="mt-8 rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>
              <div className="flex items-center justify-between mb-3">
                <h3 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }} className="text-lg">Business details</h3>
                {!editingDetails && (
                  <button onClick={startEditDetails} className="text-sm font-semibold" style={{ color: colors.hairline }}>Edit</button>
                )}
              </div>
              {!editingDetails ? (
                <div className="flex flex-col gap-1 text-sm" style={{ color: colors.creamDim }}>
                  <p><b style={{ color: colors.cream }}>{salon.name}</b></p>
                  <p>{salon.category} · {salon.service_type === "unisex" ? "Unisex" : salon.service_type === "male" ? "Male only" : "Female only"}</p>
                  <p>{salon.address || "No address set"}{salon.city ? `, ${salon.city}` : ""}{salon.state ? `, ${salon.state}` : ""}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <input value={detailsForm.name} onChange={(e) => setDetailsForm({ ...detailsForm, name: e.target.value })}
                    placeholder="Salon name" className="pb-2 text-base outline-none" style={inputStyle} />
                  <select value={detailsForm.category} onChange={(e) => setDetailsForm({ ...detailsForm, category: e.target.value })}
                    className="pb-2 text-base outline-none" style={inputStyle}>
                    {CATEGORIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                  <select value={detailsForm.service_type} onChange={(e) => setDetailsForm({ ...detailsForm, service_type: e.target.value })}
                    className="pb-2 text-base outline-none" style={inputStyle}>
                    <option value="unisex">Unisex — all genders</option>
                    <option value="male">Male only</option>
                    <option value="female">Female only</option>
                  </select>
                  <input value={detailsForm.address} onChange={(e) => setDetailsForm({ ...detailsForm, address: e.target.value })}
                    placeholder="Address" className="pb-2 text-base outline-none" style={inputStyle} />
                  <select value={detailsForm.state} onChange={(e) => setDetailsForm({ ...detailsForm, state: e.target.value, city: "" })}
                    className="pb-2 text-base outline-none" style={inputStyle}>
                    <option value="">Select state</option>
                    {NIGERIA_LOCATIONS.map((s) => <option key={s.state} value={s.state}>{s.state}</option>)}
                  </select>
                  <select value={detailsForm.city} onChange={(e) => setDetailsForm({ ...detailsForm, city: e.target.value })}
                    disabled={!detailsForm.state} className="pb-2 text-base outline-none" style={inputStyle}>
                    <option value="">Select city</option>
                    {(NIGERIA_LOCATIONS.find((s) => s.state === detailsForm.state)?.cities || []).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input value={detailsForm.neighborhood || ""} onChange={(e) => setDetailsForm({ ...detailsForm, neighborhood: e.target.value })}
                    placeholder="Neighborhood / area (e.g. Akobo)" className="pb-2 text-base outline-none" style={inputStyle} />
                  {detailsError && <p className="text-sm" style={{ color: "#E07A5F" }}>{detailsError}</p>}
                  <div className="flex gap-2">
                    <button onClick={saveDetails} disabled={savingDetails}
                      className="flex-1 py-2.5 rounded-full text-sm tap-glass"
                      style={{ background: colors.hairline, color: "#FFFFFF", fontWeight: 700 }}>
                      {savingDetails ? <Loader2 size={16} className="animate-spin" /> : "Save"}
                    </button>
                    <button onClick={() => setEditingDetails(false)}
                      className="flex-1 py-2.5 rounded-full text-sm tap-glass"
                      style={{ border: `2px solid ${colors.hairline}`, color: colors.creamDim, fontWeight: 600 }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>
              <h3 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }} className="text-lg mb-3">Services & pricing</h3>
              <div className="flex flex-col gap-2">
                {(salon.services || []).map((svc) => (
                  <div key={svc.id} className="rounded-xl px-3 py-3" style={{ border: `2px solid ${colors.hairline}` }}>
                    {editingServiceId === svc.id ? (
                      <div className="flex flex-col gap-2">
                        <input value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                          placeholder="Service name" className="pb-2 text-base outline-none" style={inputStyle} />
                        <div className="flex gap-2">
                          <input value={serviceForm.duration_min} onChange={(e) => setServiceForm({ ...serviceForm, duration_min: e.target.value })}
                            type="number" placeholder="Minutes" className="flex-1 pb-2 text-base outline-none" style={inputStyle} />
                          <input value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                            type="number" placeholder="Price ₦" className="flex-1 pb-2 text-base outline-none" style={inputStyle} />
                        </div>
                        <label className="flex items-center gap-2 text-sm" style={{ color: colors.creamDim }}>
                          <input type="checkbox" checked={!serviceForm.salon_service_available}
                            onChange={(e) => setServiceForm({ ...serviceForm, salon_service_available: !e.target.checked })} />
                          Home-visit only (no shop)
                        </label>
                        <input value={serviceForm.home_service_price} onChange={(e) => setServiceForm({ ...serviceForm, home_service_price: e.target.value })}
                          type="number" placeholder="Home visit price ₦ (optional)" className="pb-2 text-base outline-none" style={inputStyle} />
                        {serviceError && <p className="text-sm" style={{ color: "#E07A5F" }}>{serviceError}</p>}
                        <div className="flex gap-2">
                          <button onClick={saveService} disabled={savingService}
                            className="flex-1 py-2 rounded-full text-sm tap-glass"
                            style={{ background: colors.hairline, color: "#FFFFFF", fontWeight: 700 }}>
                            {savingService ? <Loader2 size={16} className="animate-spin" /> : "Save"}
                          </button>
                          <button onClick={() => setEditingServiceId(null)}
                            className="flex-1 py-2 rounded-full text-sm tap-glass"
                            style={{ border: `2px solid ${colors.hairline}`, color: colors.creamDim }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p style={{ color: colors.cream, fontWeight: 600 }}>{svc.name}</p>
                          <p className="text-sm" style={{ color: colors.creamDim }}>
                            {svc.duration_min} min{svc.salon_service_available !== false ? ` · ₦${svc.price}` : ""}
                          </p>
                          {svc.home_service_price != null && (
                            <p className="text-sm" style={{ color: colors.gold }}>
                              🏠 ₦{svc.home_service_price}{svc.salon_service_available === false ? " (home only)" : ""}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => startEditService(svc)} className="text-sm font-semibold" style={{ color: colors.hairline }}>Edit</button>
                          {confirmDeleteServiceId === svc.id ? (
                            <button onClick={() => deleteService(svc.id)} className="text-sm font-semibold" style={{ color: "#E07A5F" }}>Confirm?</button>
                          ) : (
                            <button onClick={() => setConfirmDeleteServiceId(svc.id)} className="text-sm" style={{ color: colors.creamDim }}>Remove</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {addingService ? (
                <div className="flex flex-col gap-2 mt-3 rounded-xl px-3 py-3" style={{ border: `2px dashed ${colors.hairline}` }}>
                  <input value={newSvc.name} onChange={(e) => setNewSvc({ ...newSvc, name: e.target.value })}
                    placeholder="Service name" className="pb-2 text-base outline-none" style={inputStyle} />
                  <div className="flex gap-2">
                    <input value={newSvc.duration_min} onChange={(e) => setNewSvc({ ...newSvc, duration_min: e.target.value })}
                      type="number" placeholder="Minutes" className="flex-1 pb-2 text-base outline-none" style={inputStyle} />
                    <input value={newSvc.price} onChange={(e) => setNewSvc({ ...newSvc, price: e.target.value })}
                      type="number" placeholder="Price ₦" className="flex-1 pb-2 text-base outline-none" style={inputStyle} />
                  </div>
                  <label className="flex items-center gap-2 text-sm" style={{ color: colors.creamDim }}>
                    <input type="checkbox" checked={newSvc.home_only} onChange={(e) => setNewSvc({ ...newSvc, home_only: e.target.checked })} />
                    I don't have a shop — home-visit only
                  </label>
                  <input value={newSvc.home_service_price} onChange={(e) => setNewSvc({ ...newSvc, home_service_price: e.target.value })}
                    type="number" placeholder="Home visit price ₦ (optional)" className="pb-2 text-base outline-none" style={inputStyle} />
                  {serviceError && <p className="text-sm" style={{ color: "#E07A5F" }}>{serviceError}</p>}
                  <div className="flex gap-2">
                    <button onClick={addService} disabled={savingNewSvc}
                      className="flex-1 py-2 rounded-full text-sm tap-glass"
                      style={{ background: colors.hairline, color: "#FFFFFF", fontWeight: 700 }}>
                      {savingNewSvc ? <Loader2 size={16} className="animate-spin" /> : "Add"}
                    </button>
                    <button onClick={() => setAddingService(false)}
                      className="flex-1 py-2 rounded-full text-sm tap-glass"
                      style={{ border: `2px solid ${colors.hairline}`, color: colors.creamDim }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingService(true)} className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 tap-glass"
                  style={{ border: `2px solid ${colors.hairline}`, color: colors.cream }}>
                  <Plus size={16} /> Add a service
                </button>
              )}
            </div>

          </>
        )}
      </div>
    </div>
  );
}



function OwnerCustomerProfileView({ token, salonId, customerId, onBack }) {
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
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch(`/salons/${salonId}/customers/${customerId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => { if (!cancelled) setProfile(data); })
      .catch((e) => { if (!cancelled) setError(e.message || "Couldn't load this customer's profile."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [salonId, customerId, token]);

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;

  return (
    <div className="pb-8" style={{ background: OWNER_THEME_GRADIENT, minHeight: "100vh" }}>
      <Header title="Customer" onBack={onBack} />
      <div className="px-4 max-w-xl mx-auto w-full">
        {loading && (
          <div className="flex justify-center pt-8">
            <Loader2 size={28} className="animate-spin" color={colors.creamDim} />
          </div>
        )}
        {error && <p className="text-sm text-center mt-4" style={{ color: colors.creamDim }}>{error}</p>}
        {profile && (
          <div className="flex flex-col items-center gap-3 pt-6">
            {profile.profile_photo_url ? (
              <img
                src={profile.profile_photo_url}
                alt={profile.name}
                className="w-24 h-24 rounded-full object-cover"
                style={{ border: `3px solid ${colors.hairline}` }}
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center"
                style={{ background: colors.panelLight, border: `3px solid ${colors.hairline}` }}
              >
                <Users size={36} color={colors.hairline} />
              </div>
            )}
            <h2 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.4rem", fontWeight: 700 }}>
              {profile.name}
            </h2>
            {memberSince && (
              <p className="text-xs" style={{ color: colors.creamDim }}>On TheHub since {memberSince}</p>
            )}

            <div className="w-full grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl p-4 text-center" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>
                <p style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.6rem", fontWeight: 700 }}>
                  {profile.completedBookingsHere}
                </p>
                <p className="text-xs" style={{ color: colors.creamDim }}>Completed with you</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>
                <p style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.6rem", fontWeight: 700 }}>
                  {profile.totalBookingsHere}
                </p>
                <p className="text-xs" style={{ color: colors.creamDim }}>Total bookings with you</p>
              </div>
            </div>

            {profile.review && (
              <div className="w-full rounded-xl p-4 mt-2" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>
                <p className="text-xs font-semibold mb-1" style={{ color: colors.gold }}>
                  Their review of your salon — {"★".repeat(profile.review.rating)}{"☆".repeat(5 - profile.review.rating)}
                </p>
                {profile.review.comment && (
                  <p className="text-sm" style={{ color: colors.cream }}>"{profile.review.comment}"</p>
                )}
              </div>
            )}

            {profile.activeBookings && profile.activeBookings.length === 0 && (
              <p className="text-sm mt-4" style={{ color: colors.creamDim }}>No upcoming bookings with you right now.</p>
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
        )}
      </div>
    </div>
  );
}


function CompletedAppointmentsView({ token, onBack }) {
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const mine = await apiFetch("/salons/mine", { headers: { Authorization: `Bearer ${token}` } });
        const salon = mine[0];
        if (!salon) {
          setError("No salon found.");
          setLoading(false);
          return;
        }
        const data = await apiFetch(`/salons/${salon.id}/completed-bookings`, { headers: { Authorization: `Bearer ${token}` } });
        setCompleted(data.completed);
      } catch (e) {
        setError("Couldn't load completed appointments.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <div className="pb-8 transition-[background] duration-500" style={{ background: OWNER_THEME_GRADIENT }}>
      <Header title="Completed Appointments" onBack={onBack} />
      <div className="px-4 max-w-xl mx-auto w-full">
        {loading && (
          <div className="flex justify-center pt-8">
            <Loader2 size={28} className="animate-spin" color={colors.creamDim} />
          </div>
        )}
        {error && (
          <p className="text-sm text-center mt-4" style={{ color: colors.creamDim }}>{error}</p>
        )}
        {!loading && !error && completed.length === 0 && (
          <p className="text-sm py-4" style={{ color: colors.creamDim }}>
            No completed appointments yet.
          </p>
        )}
        <div className="flex flex-col gap-2 mt-2">
          {completed.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}
            >
              <div className="flex items-center gap-3">
                {b.customer_photo_url ? (
                  <img
                    src={b.customer_photo_url}
                    alt={b.customer_name}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                    style={{ border: `2px solid ${colors.hairline}` }}
                  />
                ) : (
                  <div className="p-2 rounded-full" style={{ background: colors.panelLight }}>
                    <Users size={14} color={colors.hairline} />
                  </div>
                )}
                <div>
                  <p className="text-sm" style={{ color: colors.cream }}>{b.service_name}</p>
                  <p className="text-xs" style={{ color: colors.creamDim }}>{b.customer_name}</p>
                  {b.location_type === "home" && (
                    <p className="text-xs mt-0.5" style={{ color: colors.gold }}>🏠 {b.customer_address}</p>
                  )}
                </div>
              </div>
              <span className="text-xs text-right" style={{ color: colors.creamDim }}>
                {formatBookingDate(b.booking_date) && <>{formatBookingDate(b.booking_date)}<br /></>}
                {b.time_slot}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { CreateSalonView, MediaManager, MediaGallery, OwnerDashboard, OwnerProfileView, OwnerCustomerProfileView, CompletedAppointmentsView };