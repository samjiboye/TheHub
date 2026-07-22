import React, { useState, useRef, useEffect } from "react";
import {
  Search, MapPin, Star, Clock, Scissors, Wand2, Palette, Sparkles, Flower2,
  ChevronLeft, X, Send, Calendar, TrendingUp, MessageCircle, CheckCircle2,
  Users, ArrowRight, ShieldCheck, Loader2, WifiOff, User, LogIn, UserPlus, Store, Plus
} from "lucide-react";

// Set VITE_API_BASE in your deploy environment (e.g. Vercel project settings) to your
// deployed backend's URL. Falls back to localhost for local development.
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

// Fixed demo accounts so a kid tapping through the app never has to type an email or
// password. The backend seed script (`npm run seed`) creates the owner account below.
const DEMO_CUSTOMER = { name: "Guest", email: "guest@salonconnect.demo", password: "guest1234" };
const DEMO_OWNER = { email: "owner@salonconnect.demo", password: "demo1234" };

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Logs in a demo account, creating it on first run (signup), then reusing it after.
async function ensureDemoAuth({ name, email, password, role }) {
  try {
    const { token } = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    return token;
  } catch (e) {
    const { token } = await apiFetch("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role }),
    });
    return token;
  }
}

const colors = {
  bg: "#FFFFFF",
  panel: "#FFFFFF",
  panelLight: "#F2F2F2",
  hairline: "#111111",
  cream: "#111111",
  creamDim: "#555555",
  gold: "#111111",
  goldDim: "#111111",
  rose: "#111111",
  green: "#111111",
};

const FONT_DISPLAY = "'Baloo 2', sans-serif";
const FONT_BODY = "'Baloo 2', sans-serif";
const FONT_MONO = "'Baloo 2', sans-serif";

const CATEGORIES = [
  { name: "Barbing", icon: Scissors },
  { name: "Hairdressing", icon: Wand2 },
  { name: "Nails", icon: Palette },
  { name: "Makeup", icon: Sparkles },
  { name: "Spa", icon: Flower2 },
];

const SALONS = [
  {
    id: 1, name: "Cutting Room", category: "Barbing", rating: 4.8, reviews: 212,
    distance: 0.8, priceRange: "$15–35", hue: 32, address: "14 Kelso Ave",
    hours: "9:00 AM – 7:00 PM",
    bio: "Sharp fades and old-school straight-razor lineups in a no-fuss space built for regulars.",
    services: [
      { name: "Skin Fade", duration: 30, price: 25 },
      { name: "Beard Trim", duration: 15, price: 12 },
      { name: "Classic Cut", duration: 25, price: 20 },
    ],
  },
  {
    id: 2, name: "Bloom & Brush", category: "Hairdressing", rating: 4.9, reviews: 340,
    distance: 1.2, priceRange: "$40–150", hue: 340, address: "88 Vireo Street",
    hours: "10:00 AM – 8:00 PM",
    bio: "Colour specialists and precision cuts, with a consult before every chemical service.",
    services: [
      { name: "Cut & Style", duration: 60, price: 55 },
      { name: "Silk Press", duration: 90, price: 85 },
      { name: "Full Colour", duration: 150, price: 150 },
    ],
  },
  {
    id: 3, name: "Nailed It Studio", category: "Nails", rating: 4.7, reviews: 188,
    distance: 0.5, priceRange: "$20–60", hue: 350, address: "21 Marchmont Rd",
    hours: "10:00 AM – 6:30 PM",
    bio: "Hand-painted sets and long-wear gel, done by appointment so you're never rushed.",
    services: [
      { name: "Gel Manicure", duration: 45, price: 35 },
      { name: "Classic Pedicure", duration: 40, price: 30 },
      { name: "Full Set Acrylic", duration: 75, price: 55 },
    ],
  },
  {
    id: 4, name: "Aura Makeup Co.", category: "Makeup", rating: 4.9, reviews: 97,
    distance: 2.1, priceRange: "$45–150", hue: 300, address: "5 Halden Court",
    hours: "By appointment",
    bio: "Editorial-trained artists for everyday glam, events, and bridal trials.",
    services: [
      { name: "Everyday Glam", duration: 45, price: 65 },
      { name: "Full Glam", duration: 60, price: 85 },
      { name: "Bridal Trial", duration: 90, price: 120 },
    ],
  },
  {
    id: 5, name: "The Fade Lounge", category: "Barbing", rating: 4.6, reviews: 156,
    distance: 1.5, priceRange: "$10–30", hue: 40, address: "102 Corrie Rd",
    hours: "8:00 AM – 6:00 PM",
    bio: "Fast, clean lineups and fades — walk-ins welcome but booking skips the wait.",
    services: [
      { name: "Skin Fade", duration: 30, price: 22 },
      { name: "Line Up", duration: 10, price: 10 },
    ],
  },
  {
    id: 6, name: "Serenity Spa & Wellness", category: "Spa", rating: 4.8, reviews: 265,
    distance: 3.0, priceRange: "$50–180", hue: 150, address: "9 Thistle Row",
    hours: "9:00 AM – 9:00 PM",
    bio: "Massage, facials, and quiet rooms — a reset built into your week, not just a treat.",
    services: [
      { name: "Facial", duration: 45, price: 75 },
      { name: "Swedish Massage", duration: 60, price: 90 },
      { name: "Deep Tissue", duration: 60, price: 110 },
    ],
  },
];

const TIME_SLOTS = ["9:00 AM", "10:30 AM", "12:00 PM", "1:30 PM", "3:00 PM", "4:30 PM", "6:00 PM"];
const BOOKING_FEE = 2.5;
const COMMISSION_RATE = 0.15;

function SalonPhoto({ hue, icon: Icon, size = "h-40" }) {
  return (
    <div
      className={`${size} w-full rounded-t-2xl relative overflow-hidden flex items-center justify-center`}
      style={{ background: colors.panelLight, border: `3px solid ${colors.hairline}`, borderBottom: "none" }}
    >
      <Icon size={64} strokeWidth={1.6} color={colors.hairline} />
    </div>
  );
}

function TicketNotch({ top }) {
  return (
    <div
      className="absolute w-5 h-5 rounded-full left-1/2"
      style={{
        background: colors.bg,
        border: `3px solid ${colors.hairline}`,
        transform: "translateX(-50%)",
        [top ? "top" : "bottom"]: "-11px",
      }}
    />
  );
}

function SalonCard({ salon, onClick }) {
  const cat = CATEGORIES.find((c) => c.name === salon.category);
  return (
    <button
      onClick={onClick}
      className="text-left rounded-3xl overflow-hidden w-full transition-transform active:scale-[0.97]"
      style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}
    >
      <SalonPhoto hue={salon.hue} icon={cat.icon} size="h-32" />
      <div className="relative px-4 pt-5 pb-4">
        <TicketNotch top />
        <div className="flex items-center justify-between gap-2">
          <h3 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }} className="text-2xl leading-tight">
            {salon.name}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <Star size={20} fill={colors.gold} color={colors.gold} />
            <span className="text-lg font-bold" style={{ color: colors.cream }}>{salon.rating ?? "New"}</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          {salon.distance != null && (
            <span
              className="text-base px-3 py-1.5 rounded-full"
              style={{ border: `2px solid ${colors.hairline}`, color: colors.cream, fontWeight: 600 }}
            >
              {salon.distance} mi
            </span>
          )}
          <span
            className="w-14 h-14 rounded-full flex items-center justify-center ml-auto"
            style={{ background: colors.hairline }}
          >
            <ArrowRight size={24} color="#FFFFFF" />
          </span>
        </div>
      </div>
    </button>
  );
}

function Header({ title, onBack, right }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-5 sticky top-0 z-10"
      style={{ background: colors.bg, borderBottom: `3px solid ${colors.hairline}` }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 -ml-1 shrink-0 rounded-full flex items-center justify-center"
            style={{ border: `3px solid ${colors.hairline}`, width: 48, height: 48 }}
          >
            <ChevronLeft size={26} color={colors.cream} />
          </button>
        )}
        <h1
          className="truncate"
          style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.5rem", fontWeight: 700 }}
        >
          {title}
        </h1>
      </div>
      {right}
    </div>
  );
}

function HomeView({ salons, category, setCategory, onSelectSalon }) {
  const filtered = salons
    .filter((s) => (category ? s.category === category : true))
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

  if (!category) {
    return (
      <div className="px-4 pt-2 pb-10">
        <h2
          style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.9rem", fontWeight: 700 }}
          className="mt-2 mb-5 text-center"
        >
          What do you want today?
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.name}
                onClick={() => setCategory(c.name)}
                className="flex flex-col items-center justify-center gap-3 rounded-3xl py-8 transition-transform active:scale-95"
                style={{ border: `3px solid ${colors.hairline}`, background: colors.panelLight }}
              >
                <Icon size={44} strokeWidth={1.8} color={colors.hairline} />
                <span style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }} className="text-lg">
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const cat = CATEGORIES.find((c) => c.name === category);
  const Icon = cat.icon;

  return (
    <div className="pb-24">
      <div className="px-4 pt-2 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ border: `3px solid ${colors.hairline}` }}
          >
            <Icon size={22} color={colors.hairline} />
          </div>
          <h2 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.4rem", fontWeight: 700 }}>
            {category}
          </h2>
        </div>
        <button
          onClick={() => setCategory(null)}
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ border: `3px solid ${colors.hairline}` }}
        >
          <X size={20} color={colors.cream} />
        </button>
      </div>

      <div className="px-4 grid grid-cols-1 gap-5 mt-1">
        {filtered.length === 0 && (
          <p className="text-lg text-center py-10" style={{ color: colors.creamDim }}>
            No one here yet.
          </p>
        )}
        {filtered.map((s) => (
          <SalonCard key={s.id} salon={s} onClick={() => onSelectSalon(s)} />
        ))}
      </div>
    </div>
  );
}

function ProfileView({ salon, onBack, onBook }) {
  const cat = CATEGORIES.find((c) => c.name === salon.category);
  return (
    <div className="pb-8">
      <Header title={salon.name} onBack={onBack} />
      <SalonPhoto hue={salon.hue} icon={cat.icon} size="h-44" />
      <div className="px-4 pt-5">
        <div className="flex items-center justify-between">
          <h2 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.7rem", fontWeight: 700 }}>{salon.name}</h2>
          <div className="flex items-center gap-1">
            <Star size={22} fill={colors.gold} color={colors.gold} />
            <span className="text-xl font-bold" style={{ color: colors.cream }}>{salon.rating ?? "New"}</span>
          </div>
        </div>

        {salon.distance != null && (
          <div className="flex items-center gap-2 mt-3 text-base" style={{ color: colors.creamDim }}>
            <MapPin size={18} />{salon.distance} mi away
          </div>
        )}

        <h3 className="mt-7 mb-3 text-xl" style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }}>
          Pick a service
        </h3>
        <div className="flex flex-col gap-3">
          {salon.services.map((svc) => (
            <button
              key={svc.id ?? svc.name}
              onClick={() => onBook(svc)}
              className="flex items-center justify-between px-5 py-5 rounded-2xl transition-transform active:scale-[0.97]"
              style={{ background: colors.panelLight, border: `3px solid ${colors.hairline}` }}
            >
              <div className="text-left">
                <p style={{ color: colors.cream, fontFamily: FONT_DISPLAY, fontWeight: 700 }} className="text-xl">{svc.name}</p>
                <p className="text-base mt-1" style={{ color: colors.creamDim }}>{svc.duration_min ?? svc.duration} min</p>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ color: colors.cream, fontWeight: 700 }} className="text-2xl">${svc.price}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function BookingView({ salon, service, onBack, token }) {
  const [time, setTime] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const total = (service.price + BOOKING_FEE).toFixed(2);

  const handleBook = async () => {
    if (!time || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { url } = await apiFetch("/payments/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ salon_id: salon.id, service_id: service.id, time_slot: time }),
      });
      window.location.href = url; // hand off to Stripe's hosted checkout page
    } catch (e) {
      setError(e.message || "Couldn't start checkout — try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-8">
      <Header title={service.name} onBack={onBack} />
      <div className="px-4">
        <h3 className="mt-4 mb-3 text-xl" style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }}>
          Pick a time
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {TIME_SLOTS.map((t) => {
            const active = time === t;
            return (
              <button
                key={t}
                onClick={() => setTime(t)}
                className="py-4 rounded-2xl text-lg transition-transform active:scale-95"
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

        <div className="mt-6 rounded-2xl px-5 py-4" style={{ border: `3px solid ${colors.hairline}` }}>
          <div className="flex justify-between text-lg" style={{ color: colors.cream }}>
            <span>Total</span>
            <span style={{ fontWeight: 700 }}>${total}</span>
          </div>
        </div>

        {error && (
          <p className="text-base text-center mt-4" style={{ color: colors.creamDim }}>{error}</p>
        )}

        <button
          disabled={!time || submitting}
          onClick={handleBook}
          className="w-full mt-6 py-5 rounded-2xl text-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
          style={{
            background: time ? colors.hairline : colors.panelLight,
            color: time ? "#FFFFFF" : colors.creamDim,
            fontWeight: 700,
            border: `3px solid ${colors.hairline}`,
          }}
        >
          {submitting ? <Loader2 size={22} className="animate-spin" /> : <>Pay & book <ArrowRight size={22} /></>}
        </button>
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

const inputStyle = {
  border: `3px solid ${colors.hairline}`,
  color: colors.cream,
  fontFamily: FONT_BODY,
  background: colors.bg,
};

function AuthGate({ role, onAuthed, allowGuest }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const body =
        mode === "login" ? { email, password } : { name, email, password, role };
      const { token, user } = await apiFetch(mode === "login" ? "/auth/login" : "/auth/signup", {
        method: "POST",
        body: JSON.stringify(body),
      });
      onAuthed(token, user);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const guest = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await ensureDemoAuth({ ...DEMO_CUSTOMER, role: "customer" });
      onAuthed(token, { name: DEMO_CUSTOMER.name });
    } catch (err) {
      setError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-10">
      <div className="flex justify-center mb-5">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ border: `3px solid ${colors.hairline}` }}>
          {role === "owner" ? <Store size={28} color={colors.hairline} /> : <User size={28} color={colors.hairline} />}
        </div>
      </div>
      <h2 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.6rem", fontWeight: 700 }} className="text-center">
        {role === "owner" ? "Salon owner sign in" : "Welcome"}
      </h2>

      <div className="flex gap-2 mt-6 mb-4">
        <button
          onClick={() => setMode("login")}
          className="flex-1 py-2.5 rounded-full text-sm"
          style={{
            background: mode === "login" ? colors.hairline : "transparent",
            color: mode === "login" ? "#FFFFFF" : colors.creamDim,
            border: `2px solid ${colors.hairline}`,
            fontWeight: 700,
          }}
        >
          Log in
        </button>
        <button
          onClick={() => setMode("signup")}
          className="flex-1 py-2.5 rounded-full text-sm"
          style={{
            background: mode === "signup" ? colors.hairline : "transparent",
            color: mode === "signup" ? "#FFFFFF" : colors.creamDim,
            border: `2px solid ${colors.hairline}`,
            fontWeight: 700,
          }}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        {mode === "signup" && (
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="px-4 py-3 rounded-xl text-base outline-none"
            style={inputStyle}
          />
        )}
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="px-4 py-3 rounded-xl text-base outline-none"
          style={inputStyle}
        />
        <input
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="px-4 py-3 rounded-xl text-base outline-none"
          style={inputStyle}
        />

        {error && <p className="text-sm text-center" style={{ color: colors.creamDim }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 py-4 rounded-2xl text-lg flex items-center justify-center gap-2"
          style={{ background: colors.hairline, color: "#FFFFFF", fontWeight: 700 }}
        >
          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : mode === "login" ? (
            <><LogIn size={18} /> Log in</>
          ) : (
            <><UserPlus size={18} /> Sign up</>
          )}
        </button>
      </form>

      {allowGuest && (
        <button
          onClick={guest}
          disabled={loading}
          className="w-full mt-4 py-3 rounded-2xl text-base"
          style={{ border: `2px solid ${colors.hairline}`, color: colors.creamDim, fontWeight: 600 }}
        >
          Continue as guest
        </button>
      )}
    </div>
  );
}

function CreateSalonView({ token, onDone }) {
  const [step, setStep] = useState("salon");
  const [salonId, setSalonId] = useState(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].name);
  const [address, setAddress] = useState("");
  const [services, setServices] = useState([]);
  const [svcName, setSvcName] = useState("");
  const [svcDuration, setSvcDuration] = useState("");
  const [svcPrice, setSvcPrice] = useState("");
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
        body: JSON.stringify({ name, category, address }),
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
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/salons/${salonId}/services`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: svcName, duration_min: Number(svcDuration), price: Number(svcPrice) }),
      });
      setServices((prev) => [...prev, { name: svcName, duration_min: svcDuration, price: svcPrice }]);
      setSvcName(""); setSvcDuration(""); setSvcPrice("");
    } catch (err) {
      setError(err.message || "Couldn't add that service.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "salon") {
    return (
      <div className="px-4 pt-6 pb-10">
        <h2 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.5rem", fontWeight: 700 }} className="text-center mb-6">
          Set up your salon
        </h2>
        <form onSubmit={createSalon} className="flex flex-col gap-3">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Salon name"
            className="px-4 py-3 rounded-xl text-base outline-none" style={inputStyle} />
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-3 rounded-xl text-base outline-none" style={inputStyle}>
            {CATEGORIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address"
            className="px-4 py-3 rounded-xl text-base outline-none" style={inputStyle} />
          {error && <p className="text-sm text-center" style={{ color: colors.creamDim }}>{error}</p>}
          <button type="submit" disabled={loading}
            className="mt-2 py-4 rounded-2xl text-lg flex items-center justify-center gap-2"
            style={{ background: colors.hairline, color: "#FFFFFF", fontWeight: 700 }}>
            {loading ? <Loader2 size={20} className="animate-spin" /> : <>Next <ArrowRight size={18} /></>}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-10">
      <h2 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.5rem", fontWeight: 700 }} className="text-center mb-2">
        Add your services
      </h2>
      <p className="text-sm text-center mb-5" style={{ color: colors.creamDim }}>Add at least one so customers can book.</p>

      {services.length > 0 && (
        <div className="flex flex-col gap-2 mb-5">
          {services.map((s, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ border: `2px solid ${colors.hairline}` }}>
              <span style={{ color: colors.cream, fontWeight: 600 }}>{s.name}</span>
              <span style={{ color: colors.creamDim }}>{s.duration_min} min · ${s.price}</span>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addService} className="flex flex-col gap-3">
        <input value={svcName} onChange={(e) => setSvcName(e.target.value)} placeholder="Service name (e.g. Skin Fade)"
          className="px-4 py-3 rounded-xl text-base outline-none" style={inputStyle} />
        <div className="flex gap-3">
          <input value={svcDuration} onChange={(e) => setSvcDuration(e.target.value)} type="number" placeholder="Minutes"
            className="flex-1 px-4 py-3 rounded-xl text-base outline-none" style={inputStyle} />
          <input value={svcPrice} onChange={(e) => setSvcPrice(e.target.value)} type="number" placeholder="Price $"
            className="flex-1 px-4 py-3 rounded-xl text-base outline-none" style={inputStyle} />
        </div>
        {error && <p className="text-sm text-center" style={{ color: colors.creamDim }}>{error}</p>}
        <button type="submit" disabled={loading}
          className="py-3.5 rounded-2xl text-base flex items-center justify-center gap-2"
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

function OwnerDashboard({ token }) {
  const [salon, setSalon] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [connecting, setConnecting] = useState(false);

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
        if (!cancelled) setError("Couldn't reach the SalonConnect server.");
      }
    })();
    return () => { cancelled = true; };
  }, [token, refreshKey]);

  const connectStripe = async () => {
    if (!salon || connecting) return;
    setConnecting(true);
    try {
      const { url } = await apiFetch("/payments/connect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ salon_id: salon.id }),
      });
      window.location.href = url; // hand off to Stripe's hosted onboarding page
    } catch (e) {
      setConnecting(false);
    }
  };

  if (needsSetup) {
    return <CreateSalonView token={token} onDone={() => setRefreshKey((k) => k + 1)} />;
  }

  if (error) {
    return (
      <div className="pb-10">
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
      <div className="pb-10">
        <Header title="Owner dashboard" />
        <div className="px-4 pt-10 flex justify-center">
          <Loader2 size={28} className="animate-spin" color={colors.creamDim} />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <Header title="Owner dashboard" />
      <div className="px-4">
        {!salon.paystack_payouts_enabled && (
          <div className="mb-5 px-4 py-4 rounded-2xl" style={{ border: `3px solid ${colors.hairline}` }}>
            <p className="text-base" style={{ color: colors.cream, fontWeight: 700 }}>Connect payouts to go live</p>
            <p className="text-sm mt-1" style={{ color: colors.creamDim }}>
              Customers can't pay you until you finish Stripe's setup — bank details, quick identity check.
            </p>
            <button
              onClick={connectpayouts}
              disabled={connecting}
              className="w-full mt-3 py-3.5 rounded-2xl text-base flex items-center justify-center gap-2"
              style={{ background: colors.hairline, color: "#FFFFFF", fontWeight: 700 }}
            >
              {connecting ? <Loader2 size={18} className="animate-spin" /> : "Connect with Stripe"}
            </button>
          </div>
        )}
        <p className="text-xs" style={{ color: colors.creamDim }}>{salon.name} · all time</p>
        <div className="grid grid-cols-1 gap-3 mt-3">
          <div className="rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide" style={{ color: colors.creamDim, fontFamily: FONT_MONO }}>
              <TrendingUp size={13} /> Gross bookings
            </div>
            <p style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.6rem" }} className="mt-1">
              ${data.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl px-4 py-3" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
              <p className="text-xs" style={{ color: colors.creamDim }}>Platform commission (15%)</p>
              <p style={{ color: colors.cream }} className="text-lg mt-1">-${data.commission.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl px-4 py-3" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
              <p className="text-xs" style={{ color: colors.creamDim }}>Your payout</p>
              <p style={{ color: colors.cream }} className="text-lg mt-1">${data.payout.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-4 text-xs" style={{ color: colors.creamDim }}>
          <ShieldCheck size={13} />
          Commission is only taken on completed bookings — no charge for empty chairs.
        </div>

        <h3 className="mt-6 mb-2 text-xs uppercase tracking-wide" style={{ color: colors.creamDim, fontFamily: FONT_MONO }}>
          Upcoming appointments
        </h3>
        <div className="flex flex-col gap-2">
          {data.upcoming.length === 0 && (
            <p className="text-sm py-4" style={{ color: colors.creamDim }}>No bookings yet — try booking one from the customer app.</p>
          )}
          {data.upcoming.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full" style={{ background: colors.panelLight }}>
                  <Users size={14} color={colors.hairline} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: colors.cream }}>{a.service_name}</p>
                  <p className="text-xs" style={{ color: colors.creamDim }}>{a.customer_name}</p>
                </div>
              </div>
              <span className="text-xs" style={{ color: colors.creamDim }}>{a.time_slot}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Concierge({ open, onClose }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi, I'm Aria. Tell me what you're after — a service, a budget, how far you'll travel — and I'll point you to the right place." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", text: input };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      // The backend builds the live salon list and holds the Anthropic API key —
      // the browser never talks to Anthropic directly.
      const { text } = await apiFetch("/concierge", {
        method: "POST",
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.text })),
        }),
      });
      setMessages((prev) => [...prev, { role: "assistant", text }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", text: "Aria's having trouble connecting right now — try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center sm:items-center" style={{ background: "rgba(10,7,9,0.6)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl flex flex-col"
        style={{ background: colors.panel, border: `3px solid ${colors.hairline}`, height: "70vh", maxHeight: "600px" }}
      >
        <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: `3px solid ${colors.hairline}` }}>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full" style={{ border: `2px solid ${colors.hairline}` }}>
              <Sparkles size={16} color={colors.hairline} />
            </div>
            <span style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700, fontSize: "1.1rem" }}>Ask Aria</span>
          </div>
          <button onClick={onClose}><X size={22} color={colors.creamDim} /></button>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className="max-w-[85%] px-4 py-2.5 rounded-2xl text-base"
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                background: m.role === "user" ? colors.hairline : colors.panelLight,
                color: m.role === "user" ? "#FFFFFF" : colors.cream,
                border: m.role === "user" ? "none" : `2px solid ${colors.hairline}`,
                fontFamily: FONT_BODY,
              }}
            >
              {m.text}
            </div>
          ))}
          {loading && (
            <div className="text-sm px-1" style={{ color: colors.creamDim }}>Aria is typing…</div>
          )}
        </div>
        <div className="flex items-center gap-2 px-3 py-3" style={{ borderTop: `3px solid ${colors.hairline}` }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="I need a cut under $30..."
            className="flex-1 bg-transparent outline-none text-base px-4 py-2.5 rounded-full"
            style={{ border: `2px solid ${colors.hairline}`, color: colors.cream, fontFamily: FONT_BODY }}
          />
          <button onClick={send} className="p-3 rounded-full" style={{ background: colors.hairline }}>
            <Send size={18} color="#FFFFFF" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("home");
  const [role, setRole] = useState("customer");
  const [category, setCategory] = useState(null);
  const [selectedSalon, setSelectedSalon] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  const [customerAuth, setCustomerAuth] = useState(null); // { token, user }
  const [ownerAuth, setOwnerAuth] = useState(null); // { token, user }
  const [salons, setSalons] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | offline
  const [checkoutResult, setCheckoutResult] = useState(null); // "success" | "cancelled" | null

  const reset = () => {
    setView("home");
    setSelectedSalon(null);
    setSelectedService(null);
  };

  // Salons are public to browse — load them regardless of who's logged in.
  useEffect(() => {
    apiFetch("/salons")
      .then((list) => { setSalons(list); setStatus("ready"); })
      .catch(() => setStatus("offline"));
  }, []);

  // Stripe redirects back here after Checkout (and after Connect onboarding). Since this
  // is a full page navigation, any in-memory login is gone — read the result from the
  // URL instead of relying on app state, then clean the URL up.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("booking_success")) {
      setCheckoutResult("success");
      setRole("customer");
    } else if (params.get("booking_cancelled")) {
      setCheckoutResult("cancelled");
      setRole("customer");
    } else if (params.get("stripe_return") || params.get("stripe_refresh")) {
      setRole("owner");
    }
    if (params.toString()) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  if (checkoutResult) {
    return (
      <div className="min-h-screen w-full flex justify-center items-center" style={{ background: colors.bg, fontFamily: FONT_BODY }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&display=swap');`}</style>
        <div className="w-full max-w-md px-4 pt-16 pb-8 flex flex-col items-center text-center">
          <div className="rounded-full p-6" style={{ border: `4px solid ${colors.hairline}` }}>
            <CheckCircle2 size={64} color={colors.hairline} strokeWidth={2} />
          </div>
          <h2 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "2rem", fontWeight: 700 }} className="mt-6">
            {checkoutResult === "success" ? "Payment received!" : "No charge made"}
          </h2>
          <p className="text-lg mt-2" style={{ color: colors.creamDim }}>
            {checkoutResult === "success"
              ? "Your appointment is booked. The salon has been notified."
              : "Checkout was cancelled — nothing was charged."}
          </p>
          <button
            onClick={() => setCheckoutResult(null)}
            className="mt-10 px-8 py-5 rounded-2xl text-xl w-full"
            style={{ background: colors.hairline, color: "#FFFFFF", fontWeight: 700 }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ background: colors.bg, fontFamily: FONT_BODY }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&display=swap');
        input::placeholder { color: ${colors.creamDim}; opacity: 0.7; }
        * { -webkit-tap-highlight-color: transparent; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
      <div className="w-full max-w-md relative" style={{ minHeight: "100vh" }}>
        <div className="flex px-4 pt-4 gap-2">
          <button
            onClick={() => { setRole("customer"); reset(); }}
            className="flex-1 text-sm py-2.5 rounded-full"
            style={{
              background: role === "customer" ? colors.hairline : "transparent",
              color: role === "customer" ? "#FFFFFF" : colors.creamDim,
              border: `2px solid ${colors.hairline}`,
              fontWeight: 700,
            }}
          >
            Book
          </button>
          <button
            onClick={() => { setRole("owner"); setView("owner"); }}
            className="flex-1 text-sm py-2.5 rounded-full"
            style={{
              background: role === "owner" ? colors.hairline : "transparent",
              color: role === "owner" ? "#FFFFFF" : colors.creamDim,
              border: `2px solid ${colors.hairline}`,
              fontWeight: 700,
            }}
          >
            Owner
          </button>
          {(role === "customer" ? customerAuth : ownerAuth) && (
            <button
              onClick={() => {
                if (role === "customer") { setCustomerAuth(null); reset(); }
                else setOwnerAuth(null);
              }}
              className="px-4 py-2.5 rounded-full text-sm"
              style={{ border: `2px solid ${colors.hairline}`, color: colors.creamDim, fontWeight: 700 }}
            >
              Log out
            </button>
          )}
        </div>

        {status === "offline" && (
          <div className="mx-4 mt-4 px-4 py-3 rounded-2xl flex items-start gap-2" style={{ border: `3px solid ${colors.hairline}` }}>
            <WifiOff size={20} color={colors.hairline} className="shrink-0 mt-0.5" />
            <p className="text-sm" style={{ color: colors.cream }}>
              Can't reach the SalonConnect server at {API_BASE}. Run <b>npm start</b> in the backend
              folder, then reload this page.
            </p>
          </div>
        )}

        {role === "owner" ? (
          ownerAuth ? (
            <OwnerDashboard token={ownerAuth.token} />
          ) : (
            <AuthGate role="owner" allowGuest={false} onAuthed={(token, user) => setOwnerAuth({ token, user })} />
          )
        ) : status === "loading" ? (
          <div className="px-4 pt-16 flex justify-center">
            <Loader2 size={28} className="animate-spin" color={colors.creamDim} />
          </div>
        ) : (
          <>
            {view === "home" && (
              <HomeView
                salons={salons}
                category={category} setCategory={setCategory}
                onSelectSalon={(s) => { setSelectedSalon(s); setView("profile"); }}
              />
            )}
            {view === "profile" && selectedSalon && (
              <ProfileView
                salon={selectedSalon}
                onBack={() => setView("home")}
                onBook={(svc) => { setSelectedService(svc); setView(customerAuth ? "booking" : "auth"); }}
              />
            )}
            {view === "auth" && (
              <>
                <Header title="Sign in to book" onBack={() => setView("profile")} />
                <AuthGate
                  role="customer"
                  allowGuest
                  onAuthed={(token, user) => { setCustomerAuth({ token, user }); setView("booking"); }}
                />
              </>
            )}
            {view === "booking" && selectedSalon && selectedService && customerAuth && (
              <BookingView
                salon={selectedSalon}
                service={selectedService}
                token={customerAuth.token}
                onBack={() => setView("profile")}
              />
            )}
          </>
        )}

        {role === "customer" && !chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="fixed bottom-6 flex items-center gap-2 px-5 py-4 rounded-full shadow-lg"
            style={{
              background: colors.hairline,
              color: "#FFFFFF",
              right: "max(1.5rem, calc(50% - 14rem))",
              fontWeight: 700,
              fontSize: "1.05rem",
            }}
          >
            <MessageCircle size={20} /> Ask Aria
          </button>
        )}
        <Concierge open={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
    </div>
  );
}
