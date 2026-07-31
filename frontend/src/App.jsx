import React, { useState, useRef, useEffect } from "react";
import { NIGERIA_LOCATIONS } from "./nigeriaLocations";
import {
  Search, MapPin, Star, Clock, Scissors, Wand2, Palette, Sparkles, Flower2,
  ChevronLeft, X, Send, Calendar, TrendingUp, MessageCircle, CheckCircle2,
  Users, ArrowRight, ShieldCheck, Loader2, WifiOff, User, LogIn, UserPlus, Store, Plus, Eye, EyeOff, Image, Video, Play, Trash2, Upload, Menu, Settings, LogOut, CalendarCheck,
  UserCircle,
} from "lucide-react";

// Set VITE_API_BASE in your deploy environment (e.g. Vercel project settings) to your
// deployed backend's URL. Falls back to localhost for local development.
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

// Fixed demo accounts so a kid tapping through the app never has to type an email or
// password. The backend seed script (`npm run seed`) creates the owner account below.
const DEMO_CUSTOMER = { name: "Guest", email: "guest@thehub.demo", password: "guest1234" };
const DEMO_OWNER = { email: "owner@thehub.demo", password: "demo1234" };

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
  hairline: "#D9702E",
  cream: "#241B14",
  creamDim: "#7A6F63",
  gold: "#D9702E",
  goldDim: "#A6532A",
  rose: "#4FA89C",
  green: "#4FA89C",
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

// Category-specific hero background treatments — used behind the search screen
// and salon profile pages so each service type feels distinct. No external
// images are loaded here (kept to CSS gradients + a large watermark icon) so
// there's nothing to break if network access to an image host is unavailable.
const CATEGORY_THEMES = {
  Barbing: { gradient: "linear-gradient(160deg, #1B140F 0%, #4A2E1A 50%, #C97A34 100%)" },
  Hairdressing: { gradient: "linear-gradient(160deg, #241019 0%, #5C2740 50%, #D98CA6 100%)" },
  Nails: { gradient: "linear-gradient(160deg, #241214 0%, #6B333B 50%, #E7A9A0 100%)" },
  Makeup: { gradient: "linear-gradient(160deg, #180E20 0%, #451D54 50%, #C9A0DC 100%)" },
  Spa: { gradient: "linear-gradient(160deg, #0D1C19 0%, #274F49 50%, #8FC9BE 100%)" },
};
const NEUTRAL_HERO_GRADIENT = "linear-gradient(160deg, #FBEEE3 0%, #F6DCC4 55%, #F2C79E 100%)";
// A distinct, muted "business dashboard" gradient for the owner side of the app —
// deliberately different in tone from the customer discovery screens above.
const OWNER_THEME_GRADIENT = "linear-gradient(160deg, #F4F1EA 0%, #E4D9C4 50%, #C9AD7C 100%)";

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

function formatBookingDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
const BOOKING_FEE = 0; // set above 0 to reintroduce a booking fee later — the UI already discloses it if so
const COMMISSION_RATE = 0.15;

function SalonPhoto({ hue, icon: Icon, size = "h-40", imageUrl }) {
  return (
    <div
      className={`${size} w-full rounded-t-2xl relative overflow-hidden flex items-center justify-center`}
      style={{ background: colors.panelLight, border: `3px solid ${colors.hairline}`, borderBottom: "none" }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <Icon size={64} strokeWidth={1.6} color={colors.hairline} />
      )}
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
      <SalonPhoto hue={salon.hue} icon={cat.icon} size="h-32" imageUrl={salon.profile_image_url} />
      <div className="relative px-4 pt-5 pb-4">
        <TicketNotch top />
        <div className="flex items-center justify-between gap-2">
          <h3 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }} className="text-2xl leading-tight">
            {salon.name}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <TierStars fiveStarCount={salon.fiveStarCount} size={16} />
          </div>
        </div>
        {salon.services && salon.services.length > 0 && (
          <p className="text-sm mt-1" style={{ color: colors.creamDim }}>
            {salon.services.slice(0, 3).map((s) => s.name).join(" · ")}
            {salon.services.length > 3 ? ` +${salon.services.length - 3} more` : ""}
          </p>
        )}
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
            className="w-14 h-14 rounded-full flex items-center justify-center ml-auto tap-glass"
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

function HomeView({ salons, category, setCategory, searchQuery, setSearchQuery, searchState, setSearchState, searchCity, setSearchCity, onSelectSalon }) {
  const filtered = salons
    .filter((s) => (category ? s.category === category : true))
    .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));

  const citiesForState = (NIGERIA_LOCATIONS.find((s) => s.state === searchState)?.cities) || [];
  const heroTheme = category ? CATEGORY_THEMES[category] : null;
  const HeroIcon = category ? CATEGORIES.find((c) => c.name === category)?.icon : null;

  // Sliding water-glass indicator that glides between category chips
  const chipRowRef = useRef(null);
  const chipRefs = useRef({});
  const [chipIndicator, setChipIndicator] = useState({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    const el = category ? chipRefs.current[category] : null;
    if (el) {
      setChipIndicator({ left: el.offsetLeft, width: el.offsetWidth, opacity: 1 });
    } else {
      setChipIndicator((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [category]);

  return (
    <div
      className="px-4 pt-2 pb-10 relative overflow-hidden rounded-b-[2.5rem] transition-[background] duration-500"
      style={{ background: heroTheme ? heroTheme.gradient : NEUTRAL_HERO_GRADIENT }}
    >
      {HeroIcon && (
        <HeroIcon
          size={220}
          strokeWidth={1}
          color="#FFFFFF"
          style={{ position: "absolute", right: -36, top: 4, opacity: 0.14, pointerEvents: "none" }}
        />
      )}
      <h2
        style={{ fontFamily: FONT_DISPLAY, color: heroTheme ? "#FFFFFF" : colors.cream, fontSize: "1.9rem", fontWeight: 700 }}
        className="mt-2 mb-4 text-center relative transition-colors duration-500"
      >
        What do you want today?
      </h2>

      <input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search by name or location"
        className="w-full mb-3 px-4 py-3 rounded-xl text-base outline-none"
        style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
      />

      <div className="grid grid-cols-2 gap-2 mb-5">
        <select
          value={searchState}
          onChange={(e) => { setSearchState(e.target.value); setSearchCity(""); }}
          className="px-3 py-3 rounded-xl text-sm outline-none"
          style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
        >
          <option value="">All states</option>
          {NIGERIA_LOCATIONS.map((s) => <option key={s.state} value={s.state}>{s.state}</option>)}
        </select>
        <select
          value={searchCity}
          onChange={(e) => setSearchCity(e.target.value)}
          disabled={!searchState}
          className="px-3 py-3 rounded-xl text-sm outline-none"
          style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
        >
          <option value="">All cities</option>
          {citiesForState.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div ref={chipRowRef} className="flex gap-2 overflow-x-auto pb-2 mb-4 relative">
        <div
          className="water-slide"
          style={{
            left: chipIndicator.left,
            width: chipIndicator.width,
            opacity: chipIndicator.opacity,
          }}
        />
        {CATEGORIES.map((c) => (
          <button
            key={c.name}
            ref={(el) => { chipRefs.current[c.name] = el; }}
            onClick={(e) => {
              setCategory(category === c.name ? null : c.name);
              e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
            }}
            className="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap tap-glass shrink-0 relative"
            style={{
              background: category === c.name ? colors.gold : colors.panelLight,
              color: category === c.name ? "#FFFFFF" : colors.cream,
              border: `2px solid ${category === c.name ? colors.gold : colors.hairline}`,
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5">
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
  const heroTheme = CATEGORY_THEMES[salon.category] || null;
  const textColor = heroTheme ? "#FFFFFF" : colors.cream;
  const textColorDim = heroTheme ? "rgba(255,255,255,0.78)" : colors.creamDim;
  return (
    <div
      className="pb-8 relative overflow-hidden transition-[background] duration-500"
      style={{ background: heroTheme ? heroTheme.gradient : NEUTRAL_HERO_GRADIENT }}
    >
      <cat.icon
        size={260}
        strokeWidth={1}
        color="#FFFFFF"
        style={{ position: "absolute", right: -40, top: 70, opacity: 0.10, pointerEvents: "none" }}
      />
      <Header title={salon.name} onBack={onBack} />
      <div className="pt-3 pb-1 relative">
        <SalonPhoto hue={salon.hue} icon={cat.icon} size="h-44" imageUrl={salon.profile_image_url} />
      </div>
      <div className="px-4 pt-5 relative">
        <div className="flex items-center justify-between">
          <h2 style={{ fontFamily: FONT_DISPLAY, color: textColor, fontSize: "1.7rem", fontWeight: 700 }}>{salon.name}</h2>
          <div className="flex items-center gap-1">
            <TierStars fiveStarCount={salon.fiveStarCount} size={18} />
          </div>
        </div>

        {salon.completedCount > 0 && (
          <p className="text-sm mt-1" style={{ color: textColorDim }}>
            {salon.completedCount} clients served
          </p>
        )}
        {salon.distance != null && (
          <div className="flex items-center gap-2 mt-3 text-base" style={{ color: textColorDim }}>
            <MapPin size={18} />{salon.distance} mi away
          </div>
        )}

        <MediaGallery salonId={salon.id} textColor={textColor} />

        <h3 className="mt-7 mb-3 text-xl" style={{ fontFamily: FONT_DISPLAY, color: textColor, fontWeight: 700 }}>
          Pick a service
        </h3>
        <div className="flex flex-col gap-3">
          {(salon.services || []).map((svc) => (
            <button
              key={svc.id ?? svc.name}
              onClick={() => onBook(svc)}
              className="flex items-center justify-between px-5 py-5 rounded-2xl tap-glass"
              style={{ background: colors.panelLight, border: `3px solid ${colors.hairline}` }}
            >
              <div className="text-left">
                <p style={{ color: colors.cream, fontFamily: FONT_DISPLAY, fontWeight: 700 }} className="text-xl">{svc.name}</p>
                <p className="text-base mt-1" style={{ color: colors.creamDim }}>{svc.duration_min ?? svc.duration} min</p>
                {svc.home_service_price != null && (
                  <p className="text-sm mt-1" style={{ color: colors.gold, fontWeight: 600 }}>
                    🏠 {svc.salon_service_available === false ? "Home visits only" : "Home visits available"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span style={{ color: colors.cream, fontWeight: 700 }} className="text-2xl">
                  {svc.salon_service_available === false ? `$${svc.home_service_price}` : `$${svc.price}`}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function BookingView({ salon, service, onBack, token }) {
  const homeOnly = service.salon_service_available === false;
  const hasHomeOption = service.home_service_price != null;
  const [time, setTime] = useState(null);
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
  };

  const heroTheme = CATEGORY_THEMES[salon.category] || null;
  const textColor = heroTheme ? "#FFFFFF" : colors.cream;

  return (
    <div
      className="pb-8 relative overflow-hidden transition-[background] duration-500"
      style={{ background: heroTheme ? heroTheme.gradient : NEUTRAL_HERO_GRADIENT }}
    >
      <Header title={service.name} onBack={onBack} />
      <div className="px-4 relative">
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
                At the salon<br /><span className="text-sm font-normal">${service.price.toFixed(2)}</span>
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
                At your location<br /><span className="text-sm font-normal">${service.home_service_price.toFixed(2)}</span>
              </button>
            </div>
          </>
        )}

        {homeOnly && (
          <p className="mt-4 mb-2 text-sm" style={{ color: textColor }}>
            🏠 This is a home-visit service — ${service.home_service_price.toFixed(2)}
          </p>
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
        <input
          type="date"
          min={todayStr}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full mb-6 px-4 py-3 rounded-xl text-base outline-none"
          style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
        />

        <h3 className="mb-3 text-xl" style={{ fontFamily: FONT_DISPLAY, color: textColor, fontWeight: 700 }}>
          Pick a time
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {TIME_SLOTS.map((t) => {
            const active = time === t;
            return (
              <button
                key={t}
                onClick={() => setTime(t)}
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

        <div className="mt-6 rounded-2xl px-5 py-4" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
          <div className="flex justify-between text-sm" style={{ color: colors.creamDim }}>
            <span>{location === "home" ? "Home visit price" : "Service price"}</span>
            <span>${price.toFixed(2)}</span>
          </div>
          {BOOKING_FEE > 0 && (
            <div className="flex justify-between text-sm mt-1" style={{ color: colors.creamDim }}>
              <span>Booking fee</span>
              <span>${BOOKING_FEE.toFixed(2)}</span>
            </div>
          )}
          <div className="mt-2 pt-2 flex justify-between text-lg" style={{ color: colors.cream, borderTop: `2px solid ${colors.hairline}` }}>
            <span>Total</span>
            <span style={{ fontWeight: 700 }}>${total}</span>
          </div>
        </div>

        {error && (
          <p className="text-base text-center mt-4" style={{ color: heroTheme ? "rgba(255,255,255,0.85)" : colors.creamDim }}>{error}</p>
        )}

        <button
          disabled={!canSubmit || submitting}
          onClick={handleBook}
          className="w-full mt-6 py-5 rounded-2xl text-xl flex items-center justify-center gap-2 tap-glass"
          style={{
            background: canSubmit ? colors.hairline : colors.panelLight,
            color: canSubmit ? "#FFFFFF" : colors.creamDim,
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
  border: "none",
  borderBottom: `3px solid ${colors.hairline}`,
  borderRadius: 0,
  color: colors.cream,
  fontFamily: FONT_BODY,
  background: "transparent",
  paddingLeft: 0,
};

function AuthGate({ role, onAuthed, allowGuest }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [savePassword, setSavePassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState(null);
  const [resetSent, setResetSent] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);

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

  const requestReset = async (e) => {
    e.preventDefault();
    if (resetLoading) return;
    setResetLoading(true);
    setResetError(null);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: resetEmail }),
      });
      setResetSent(true);
    } catch (err) {
      setResetError(err.message || "Something went wrong.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-10">
      <div className="flex justify-center mb-5">
        <div
          className="px-6 py-4 rounded-[50%_50%_50%_10%/60%_60%_40%_40%] flex items-center justify-center shadow-lg"
          style={{ background: colors.hairline }}>
          <span className="text-lg font-extrabold" style={{ color: "#FFFFFF", fontFamily: FONT_DISPLAY }}>TheHub</span>
        </div>
      </div>
      <h2 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.6rem", fontWeight: 700 }} className="text-center">
        "Hello there!"
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
            className="pb-2 text-base outline-none"
            style={inputStyle}
          />
        )}
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="pb-2 text-base outline-none"
          style={inputStyle}
        />
        <div className="relative">
          <input
            required
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full pb-2 text-base outline-none"
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: colors.creamDim }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

            {mode === "login" && !showResetForm && (
              <div className="flex items-center justify-between">
                <label
                  className="flex items-center gap-2 text-sm cursor-pointer"
                  style={{ color: colors.creamDim }}
                >
                  <input
                    type="checkbox"
                    checked={savePassword}
                    onChange={(e) => setSavePassword(e.target.checked)}
                    style={{ accentColor: colors.gold }}
                  />
                  Save Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowResetForm(true)}
                  className="text-sm text-right"
                  style={{ color: colors.creamDim }}
                >
                  Forgot password?
                </button>
              </div>
            )}

        {mode === "login" && showResetForm && (
          resetSent ? (
            <p className="text-sm text-center" style={{ color: colors.creamDim }}>
              If that email exists, we've sent a reset link.
            </p>
          ) : (
            <div className="flex flex-col gap-2 mt-1">
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Your account email"
                className="pb-2 text-base outline-none"
                style={inputStyle}
              />
              {resetError && <p className="text-sm text-center" style={{ color: colors.creamDim }}>{resetError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={resetLoading}
                  onClick={requestReset}
                  className="flex-1 py-2.5 rounded-full text-sm tap-glass"
                  style={{ background: colors.hairline, color: "#FFFFFF", fontWeight: 700 }}
                >
                  {resetLoading ? <Loader2 size={16} className="animate-spin" /> : "Send reset link"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetForm(false)}
                  className="flex-1 py-2.5 rounded-full text-sm tap-glass"
                  style={{ border: `2px solid ${colors.hairline}`, color: colors.creamDim, fontWeight: 600 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )
        )}

        {error && <p className="text-sm text-center" style={{ color: colors.creamDim }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 py-4 rounded-2xl text-lg flex items-center justify-center gap-2 tap-glass"
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

      <a
        href="https://thehub-api.onrender.com/auth/google"
        className="w-full mt-4 py-3 rounded-2xl text-base flex items-center justify-center gap-2"
        style={{ border: `2px solid ${colors.hairline}`, color: colors.cream, fontWeight: 600, textDecoration: "none" }}
      >
        Sign in with Google
      </a>

      {allowGuest && (
        <button
          onClick={guest}
          disabled={loading}
          className="w-full mt-4 py-3 rounded-2xl text-base tap-glass"
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
  const [serviceType, setServiceType] = useState("unisex");
  const [address, setAddress] = useState("");
  const [salonState, setSalonState] = useState("");
  const [salonCity, setSalonCity] = useState("");
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
        body: JSON.stringify({ name, category, address, service_type: serviceType, state: salonState, city: salonCity }),
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
      <div className="px-4 pt-6 pb-10">
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
    <div className="px-4 pt-6 pb-10">
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
                  {s.duration_min} min{s.salon_service_available !== false ? ` · $${s.price}` : ""}
                </span>
              </div>
              {s.home_service_price && (
                <span className="text-sm mt-1" style={{ color: colors.gold }}>
                  🏠 Home visit — ${s.home_service_price}
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
          <input value={svcPrice} onChange={(e) => setSvcPrice(e.target.value)} type="number" placeholder="Price $ (at salon)"
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
          placeholder={svcHomeOnly ? "Home visit price $ (required)" : "Home visit price $ (optional)"}
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
      <div className="px-4">
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
                <div className="p-2 rounded-full" style={{ background: colors.panelLight }}>
                  <Users size={14} color={colors.hairline} />
                </div>
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

function OwnerDashboard({ token }) {
  const [salon, setSalon] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState(null);
  const [completeError, setCompleteError] = useState(null);

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

  async function submitComplete(bookingId) {
    setCompleteError(null);
    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/complete`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setCompleteError(err.error || "Failed to mark as completed.");
        return;
      }
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setCompleteError("Network error. Please try again.");
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
      <div className="px-4">
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

            <select
              value={bankCode}
              onChange={(e) => { setBankCode(e.target.value); setResolvedName(null); }}
              className="w-full mt-3 px-4 py-3 rounded-xl text-base outline-none"
              style={inputStyle}
            >
              <option value="">Select your bank</option>
              {banks.map((b) => (
                <option key={b.code} value={b.code}>{b.name}</option>
              ))}
            </select>

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
        <MediaManager salonId={salon.id} token={token} />

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
                  {a.location_type === "home" && (
                    <p className="text-xs mt-0.5" style={{ color: colors.gold }}>🏠 {a.customer_address}</p>
                  )}
                </div>
              </div>
              <span className="text-xs text-right" style={{ color: colors.creamDim }}>
                {formatBookingDate(a.booking_date) && <>{formatBookingDate(a.booking_date)}<br /></>}
                {a.time_slot}
              </span>
                {cancellingId !== a.id && (
                  <button
                    onClick={() => { setCancellingId(a.id); setCancelReason(""); setCancelError(null); }}
                    className="ml-3 text-xs font-semibold px-3 py-1 rounded-full tap-glass"
                    style={{ border: `2px solid ${colors.hairline}`, color: colors.creamDim }}
                  >
                    Cancel
                  </button>
                )}
                <SwipeToComplete onComplete={() => submitComplete(a.id)} />
              
              {cancellingId === a.id && (
                <div className="mt-2 flex flex-col gap-2">
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
                  <div className="flex gap-2">
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

const CUSTOMER_CANCEL_REASONS = [
  "Schedule conflict",
  "Found another appointment",
  "No longer needed",
  "Booked by mistake",
  "Change of plans",
  "Other",
];

function RatingPopup({ booking, token, onDone, onLater }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.5)", zIndex: 50 }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-5"
        style={{ background: colors.bg, border: `2px solid ${colors.hairline}` }}
      >
        <h3 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.2rem", fontWeight: 700 }}>
          How was your visit?
        </h3>
        <p className="text-sm mt-1" style={{ color: colors.creamDim }}>
          {booking.salon_name} \u2014 {booking.service_name}
        </p>
        <div className="mt-4">
          <StarSlideRating booking={booking} token={token} onDone={onDone} />
        </div>
        <button
          onClick={onLater}
          className="mt-4 text-xs underline"
          style={{ color: colors.creamDim }}
        >
          Later
        </button>
      </div>
    </div>
  );
}


function TierStars({ fiveStarCount = 0, size = 20 }) {
  const tiers = [20, 50, 100, 200, 400];
  const filled = tiers.filter((t) => fiveStarCount >= t).length;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          fill={i <= filled ? colors.gold : "none"}
          color={i <= filled ? colors.gold : colors.hairline}
        />
      ))}
    </div>
  );
}


function OwnerProfileView({ token, onBack, onDeleted }) {
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
      <div className="px-4">
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
                            type="number" placeholder="Price $" className="flex-1 pb-2 text-base outline-none" style={inputStyle} />
                        </div>
                        <label className="flex items-center gap-2 text-sm" style={{ color: colors.creamDim }}>
                          <input type="checkbox" checked={!serviceForm.salon_service_available}
                            onChange={(e) => setServiceForm({ ...serviceForm, salon_service_available: !e.target.checked })} />
                          Home-visit only (no shop)
                        </label>
                        <input value={serviceForm.home_service_price} onChange={(e) => setServiceForm({ ...serviceForm, home_service_price: e.target.value })}
                          type="number" placeholder="Home visit price $ (optional)" className="pb-2 text-base outline-none" style={inputStyle} />
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
                            {svc.duration_min} min{svc.salon_service_available !== false ? ` · $${svc.price}` : ""}
                          </p>
                          {svc.home_service_price != null && (
                            <p className="text-sm" style={{ color: colors.gold }}>
                              🏠 ${svc.home_service_price}{svc.salon_service_available === false ? " (home only)" : ""}
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
                      type="number" placeholder="Price $" className="flex-1 pb-2 text-base outline-none" style={inputStyle} />
                  </div>
                  <label className="flex items-center gap-2 text-sm" style={{ color: colors.creamDim }}>
                    <input type="checkbox" checked={newSvc.home_only} onChange={(e) => setNewSvc({ ...newSvc, home_only: e.target.checked })} />
                    I don't have a shop — home-visit only
                  </label>
                  <input value={newSvc.home_service_price} onChange={(e) => setNewSvc({ ...newSvc, home_service_price: e.target.value })}
                    type="number" placeholder="Home visit price $ (optional)" className="pb-2 text-base outline-none" style={inputStyle} />
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

            <div className="mt-4 rounded-2xl px-4 py-4" style={{ border: `2px solid #E07A5F` }}>
              <h3 style={{ fontFamily: FONT_DISPLAY, color: "#E07A5F", fontWeight: 700 }} className="text-lg mb-2">Danger zone</h3>
              <p className="text-sm mb-3" style={{ color: colors.creamDim }}>
                Permanently delete this salon listing. This only works if it has no booking history.
              </p>
              {deleteError && <p className="text-sm mb-3" style={{ color: "#E07A5F" }}>{deleteError}</p>}
              {confirmDeleteSalon ? (
                <div className="flex gap-2">
                  <button onClick={handleDeleteSalon} disabled={deletingSalon}
                    className="flex-1 py-2.5 rounded-full text-sm tap-glass"
                    style={{ background: "#E07A5F", color: "#FFFFFF", fontWeight: 700 }}>
                    {deletingSalon ? <Loader2 size={16} className="animate-spin" /> : "Yes, delete permanently"}
                  </button>
                  <button onClick={() => setConfirmDeleteSalon(false)}
                    className="flex-1 py-2.5 rounded-full text-sm tap-glass"
                    style={{ border: `2px solid ${colors.hairline}`, color: colors.creamDim }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDeleteSalon(true)}
                  className="w-full py-2.5 rounded-full text-sm font-semibold tap-glass"
                  style={{ border: `2px solid #E07A5F`, color: "#E07A5F" }}>
                  Delete my salon profile
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}


function RatingsReviewsView({ token, onBack }) {
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);
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
        const data = await apiFetch(`/salons/${salon.id}/reviews`, { headers: { Authorization: `Bearer ${token}` } });
        setStats({ rating: data.rating, reviewCount: data.reviewCount, fiveStarCount: data.fiveStarCount });
        setReviews(data.reviews);
      } catch (e) {
        setError("Couldn't load ratings.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <div className="pb-8 transition-[background] duration-500" style={{ background: OWNER_THEME_GRADIENT }}>
      <Header title="Ratings & Reviews" onBack={onBack} />
      <div className="px-4">
        {loading && (
          <div className="flex justify-center pt-8">
            <Loader2 size={28} className="animate-spin" color={colors.creamDim} />
          </div>
        )}
        {error && (
          <p className="text-sm mt-4" style={{ color: "#E07A5F" }}>{error}</p>
        )}
        {stats && (
          <div className="mt-4 rounded-2xl p-4" style={{ border: `2px solid ${colors.hairline}` }}>
            <TierStars fiveStarCount={stats.fiveStarCount} size={26} />
            <p className="text-sm mt-2" style={{ color: colors.creamDim }}>
              {stats.fiveStarCount} five-star rating{stats.fiveStarCount !== 1 ? "s" : ""} received
            </p>
            <p className="text-xs mt-1" style={{ color: colors.creamDim }}>
              Your real average: {stats.rating ?? "No ratings yet"} {stats.rating ? `(${stats.reviewCount} review${stats.reviewCount !== 1 ? "s" : ""})` : ""}
            </p>
          </div>
        )}
        {!loading && !error && reviews.length === 0 && (
          <p className="text-sm mt-6" style={{ color: colors.creamDim }}>No reviews yet.</p>
        )}
        <div className="mt-4 flex flex-col gap-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl p-3" style={{ border: `2px solid ${colors.hairline}` }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: colors.cream }}>{r.customer_name}</span>
                <span className="text-xs" style={{ color: colors.gold }}>
                  {"\u2605".repeat(r.rating)}{"\u2606".repeat(5 - r.rating)}
                </span>
              </div>
              {r.comment && (
                <p className="text-sm mt-1" style={{ color: colors.creamDim }}>{r.comment}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



function StarSlideRating({ booking, token, onDone }) {
  const [stars, setStars] = useState(5);
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [phase, setPhase] = useState("slide"); // slide | comment | done
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const trackRef = useRef(null);
  const trackWidthRef = useRef(0);
  const handleSize = 28;
  const numStars = 5;

  function xFromStars(s, maxX) {
    if (maxX <= 0) return 0;
    return ((s - 1) / (numStars - 1)) * maxX;
  }

  function starsFromX(x, maxX) {
    if (maxX <= 0) return 5;
    const ratio = Math.max(0, Math.min(1, x / maxX));
    return Math.max(1, Math.min(5, Math.round(ratio * (numStars - 1)) + 1));
  }

  useEffect(() => {
    if (trackRef.current) {
      trackWidthRef.current = trackRef.current.offsetWidth;
      setDragX(xFromStars(5, trackWidthRef.current - handleSize));
    }
  }, []);

  function handlePointerDown() {
    setDragging(true);
  }

  function handlePointerMove(e) {
    if (!dragging) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - handleSize / 2;
    const maxX = trackWidthRef.current - handleSize;
    const clampedX = Math.max(0, Math.min(maxX, x));
    setDragX(clampedX);
    setStars(starsFromX(clampedX, maxX));
  }

  function handlePointerUp() {
    if (!dragging) return;
    setDragging(false);
    const maxX = trackWidthRef.current - handleSize;
    setDragX(xFromStars(stars, maxX));
    setPhase("comment");
  }

  async function submitRating(finalComment) {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/reviews", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          salon_id: booking.salon_id,
          booking_id: booking.id,
          rating: stars,
          comment: finalComment || undefined,
        }),
      });
      setPhase("done");
      onDone && onDone(stars);
    } catch (e) {
      setError("Couldn't save that rating. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === "done") {
    return (
      <p className="text-xs mt-2" style={{ color: colors.green }}>
        Thanks for rating {booking.salon_name}! You gave {stars} star{stars !== 1 ? "s" : ""}.
      </p>
    );
  }

  if (phase === "comment") {
    return (
      <div className="mt-2">
        <p className="text-xs mb-1" style={{ color: colors.creamDim }}>
          You rated {booking.salon_name} {stars} star{stars !== 1 ? "s" : ""}. Add a comment? (optional)
        </p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full text-xs p-2 rounded-lg"
          style={{ border: `2px solid ${colors.hairline}` }}
          rows={2}
          placeholder="Write a review..."
        />
        {error && (
          <p className="text-xs mt-1" style={{ color: "#E07A5F" }}>{error}</p>
        )}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => submitRating(comment)}
            disabled={submitting}
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: colors.green, color: "#FFFFFF" }}
          >
            Submit
          </button>
          <button
            onClick={() => submitRating("")}
            disabled={submitting}
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ border: `2px solid ${colors.hairline}`, color: colors.creamDim }}
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <p className="text-xs mb-1" style={{ color: colors.creamDim }}>
        Rate {booking.salon_name}: {"★".repeat(stars)}{"☆".repeat(5 - stars)}
      </p>
      <div
        ref={trackRef}
        className="relative rounded-full overflow-hidden select-none"
        style={{ width: 160, height: 36, background: colors.panelLight, border: `2px solid ${colors.hairline}`, touchAction: "none" }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: dragX + handleSize, background: colors.green, opacity: 0.35, transition: dragging ? "none" : "width 0.2s ease" }}
        />
        <div
          onPointerDown={handlePointerDown}
          className="absolute top-0 flex items-center justify-center rounded-full cursor-pointer"
          style={{ left: dragX, width: handleSize, height: handleSize, background: colors.green, transition: dragging ? "none" : "left 0.2s ease" }}
        >
          <Star size={16} color="#FFFFFF" />
        </div>
      </div>
    </div>
  );
}


function MyBookingsView({ token, onBack }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState(null);

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

  return (
    <div className="pb-8 transition-[background] duration-500" style={{ background: NEUTRAL_HERO_GRADIENT }}>
      <Header title="My bookings" onBack={onBack} />
      <div className="px-4">
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
        <div className="flex flex-col gap-2 mt-2">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="flex flex-col px-4 py-3 rounded-xl"
              style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}
            >
              <div className="flex items-center justify-between">
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

              {b.status === "cancelled" && (
                <p className="text-xs mt-2" style={{ color: "#E07A5F" }}>
                  Cancelled by {b.cancelled_by === "owner" ? "salon" : "you"}
                  {b.cancel_reason ? ` — ${b.cancel_reason}` : ""}
                </p>
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

              {(b.status === "pending" || b.status === "confirmed") && cancellingId !== b.id && (
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

function SettingsView({ onBack }) {
  const savedCustomer = JSON.parse(localStorage.getItem("customerAuth") || "null");
  const savedOwner = JSON.parse(localStorage.getItem("ownerAuth") || "null");
  const user = savedCustomer?.user || savedOwner?.user || {};

  return (
    <div className="pb-8 transition-[background] duration-500" style={{ background: NEUTRAL_HERO_GRADIENT }}>
      <Header title="Settings" onBack={onBack} />
      <div className="px-4 mt-4 flex flex-col gap-3">
        <div
          className="px-4 py-3 rounded-xl"
          style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}
        >
          <p className="text-xs mb-1" style={{ color: colors.creamDim }}>Name</p>
          <p className="text-sm" style={{ color: colors.cream }}>{user.name || "—"}</p>
        </div>
        <div
          className="px-4 py-3 rounded-xl"
          style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}
        >
          <p className="text-xs mb-1" style={{ color: colors.creamDim }}>Email</p>
          <p className="text-sm" style={{ color: colors.cream }}>{user.email || "—"}</p>
        </div>
        <div
          className="px-4 py-3 rounded-xl"
          style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}
        >
          <p className="text-xs mb-1" style={{ color: colors.creamDim }}>Phone</p>
          <p className="text-sm" style={{ color: colors.cream }}>{user.phone || "—"}</p>
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
          <button onClick={send} className="p-3 rounded-full tap-glass" style={{ background: colors.hairline }}>
            <Send size={18} color="#FFFFFF" />
          </button>
        </div>
      </div>
    </div>
  );
}
function ResetPasswordView({ token, onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-10 flex flex-col items-center">
      <h2 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.6rem", fontWeight: 700 }} className="mb-6">
        Reset your password
      </h2>

      {done ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-base text-center" style={{ color: colors.creamDim }}>
            Your password has been reset. You can now log in.
          </p>
          <button
            onClick={onDone}
            className="py-3 px-6 rounded-2xl text-lg"
            style={{ background: colors.hairline, color: "#FFFFFF", fontWeight: 700 }}
          >
            Go to login
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3 w-full max-w-sm">
          <div className="relative">
            <input
              required
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="w-full pb-2 text-base outline-none"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: colors.creamDim }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <input
            required
            type={showPassword ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            className="pb-2 text-base outline-none"
            style={inputStyle}
          />

          {error && <p className="text-sm text-center" style={{ color: colors.creamDim }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 py-4 rounded-2xl text-lg flex items-center justify-center gap-2 tap-glass"
            style={{ background: colors.hairline, color: "#FFFFFF", fontWeight: 700 }}
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : "Reset password"}
          </button>
        </form>
      )}
    </div>
  );
}

const ONBOARDING_SLIDES = [
  {
    title: "Find what you're looking for",
    body: "Aim to efficiently attract specific individuals or groups likely to be interested in a product or service through focused marketing strategies.",
    photo: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80",
  },
  {
    title: "Targeted User Acquisition Campaigns",
    body: "Aim to efficiently attract specific individuals or groups likely to be interested in a product or service through focused marketing strategies.",
    photo: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=80",
  },
  {
    title: "Building Trust and Credibility",
    body: "Emphasizing security measures, highlighting positive user experiences or reviews, and providing transparent information about the sellers and their products/services.",
    photo: "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=800&q=80",
  },
];

function OnboardingView({ onDone }) {
  const [slide, setSlide] = useState(0);
  const isLast = slide === ONBOARDING_SLIDES.length - 1;
  const current = ONBOARDING_SLIDES[slide];

  const next = () => {
    if (isLast) onDone();
    else setSlide((s) => s + 1);
  };

  const prev = () => {
    if (slide > 0) setSlide((s) => s - 1);
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col justify-between px-6 pt-10 pb-10 relative overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(160deg, rgba(201,122,61,0.75), rgba(166,83,42,0.85)), url(${current.photo})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="flex justify-between items-center">
        <div
          className="px-5 py-4 rounded-[50%_50%_50%_10%/60%_60%_40%_40%] flex items-center justify-center shadow-lg"
          style={{ background: "#FFFFFF" }}
        >
          <span
            className="text-sm font-extrabold tracking-wide"
            style={{ color: colors.hairline, fontFamily: FONT_DISPLAY }}
          >
            TheHub
          </span>
        </div>
        {!isLast && (
          <button onClick={onDone} className="text-white text-base font-semibold">
            Skip
          </button>
        )}
      </div>

      <div className="mt-8">
        <h1
          className="text-3xl font-extrabold text-white leading-tight mb-4"
          style={{ fontFamily: FONT_DISPLAY }}
        >
          {current.title}
        </h1>
        <p className="text-white text-base leading-relaxed" style={{ opacity: 0.9 }}>
          {current.body}
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center py-10">
        <div
          className="w-44 h-36 rounded-[50%_50%_50%_10%/60%_60%_40%_40%] flex items-center justify-center shadow-2xl"
          style={{ background: "#FFFFFF" }}
        >
          <span
            className="text-2xl font-extrabold"
            style={{ color: colors.hairline, fontFamily: FONT_DISPLAY }}
          >
            TheHub
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {slide > 0 ? (
          <button onClick={prev} className="text-white text-base font-semibold">
            Prev
          </button>
        ) : (
          <span />
        )}

        <div className="flex gap-2">
          {ONBOARDING_SLIDES.map((_, i) => (
            <div
              key={i}
              className={i === slide ? "w-6 h-2 rounded-full" : "w-2 h-2 rounded-full"}
              style={{ background: i === slide ? "#FFFFFF" : "rgba(255,255,255,0.5)" }}
            />
          ))}
        </div>

        {isLast ? (
          <button
            onClick={onDone}
            className="px-6 py-3 rounded-full text-base font-bold"
            style={{ background: "#4FA89C", color: "#FFFFFF" }}
          >
            Get Started
          </button>
        ) : (
          <button
            onClick={next}
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: "#4FA89C" }}
          >
            <ArrowRight size={20} color="#FFFFFF" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("home");
  const [ownerPage, setOwnerPage] = useState("dashboard");
  const [role, setRole] = useState("customer");
  const [category, setCategory] = useState(null);
  const [selectedSalon, setSelectedSalon] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [customerAuth, setCustomerAuth] = useState(() => {
    try {
      const saved = localStorage.getItem("customerAuth");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }); // { token, user }
  const [unratedQueue, setUnratedQueue] = useState([]);
  const [ratingPopupDismissed, setRatingPopupDismissed] = useState(false);

  useEffect(() => {
    if (!customerAuth?.token) return;
    apiFetch("/reviews/unrated", { headers: { Authorization: `Bearer ${customerAuth.token}` } })
      .then((data) => setUnratedQueue(data.unrated || []))
      .catch(() => {});
  }, [customerAuth?.token]);

  const [ownerAuth, setOwnerAuth] = useState(() => {
    try {
      const saved = localStorage.getItem("ownerAuth");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }); // { token, user }
  const [salons, setSalons] = useState([]);
    const [userLocation, setUserLocation] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchState, setSearchState] = useState("");
    const [searchCity, setSearchCity] = useState("");
  const [status, setStatus] = useState("loading"); // loading | ready | offline
  const [checkoutResult, setCheckoutResult] = useState(null); // "success" | "cancelled" | null
  const [resetToken, setResetToken] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("onboardingSeen"));
  const reset = () => {
    setView("home");
    setSelectedSalon(null);
    setSelectedService(null);
  };
  useEffect(() => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { timeout: 8000 }
      );
    }, []);
    useEffect(() => {
      const params = new URLSearchParams();
      if (userLocation) {
        params.set("lat", userLocation.lat);
        params.set("lng", userLocation.lng);
      }
      if (searchQuery) params.set("q", searchQuery);
      if (searchState) params.set("state", searchState);
      if (searchCity) params.set("city", searchCity);
      const qs = params.toString();
      apiFetch(`/salons${qs ? `?${qs}` : ""}`)
        .then((list) => { setSalons(list); setStatus("ready"); })
        .catch(() => setStatus("offline"));
    }, [userLocation, searchQuery, searchState, searchCity]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleToken = params.get("token");
    if (googleToken) {
      try {
        const payload = JSON.parse(atob(googleToken.split(".")[1]));
        const user = { name: payload.name, email: payload.email, role: payload.role };
        localStorage.setItem("customerAuth", JSON.stringify({ token: googleToken, user }));
        setCustomerAuth({ token: googleToken, user });
        window.history.replaceState({}, "", window.location.pathname);
      } catch (e) {
        console.error("Failed to parse Google auth token", e);
      }
    }
  }, []);
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
    } else if (params.get("token")) {
      setResetToken(params.get("token"));
      setView("resetPassword");
    }
    if (params.toString()) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);
  if (view === "resetPassword") {
    return <ResetPasswordView token={resetToken} onDone={() => setView("home")} />;
  }

  if (showOnboarding && !checkoutResult) {
    return (
      <OnboardingView
        onDone={() => {
          localStorage.setItem("onboardingSeen", "1");
          setShowOnboarding(false);
          setView("home");
        }}
      />
    );
  }

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
            className="mt-10 px-8 py-5 rounded-2xl text-xl w-full tap-glass"
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

        /* Glassy, springy, water-like tap treatment used across the app's buttons */
        .tap-glass {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          backdrop-filter: blur(6px) saturate(200%) brightness(1.04);
          -webkit-backdrop-filter: blur(6px) saturate(200%) brightness(1.04);
          transition: transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 220ms ease;
          box-shadow:
            0 8px 20px rgba(36,27,20,0.18),
            inset 0 1px 0 rgba(255,255,255,0.9),
            inset 0 -4px 8px rgba(0,0,0,0.12),
            inset 0 0 0 1px rgba(255,255,255,0.4);
        }
        .tap-glass::before {
          content: "";
          position: absolute;
          left: 5%;
          right: 5%;
          top: 3%;
          height: 55%;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.4) 55%, rgba(255,255,255,0) 100%);
          filter: blur(1.5px);
          mix-blend-mode: screen;
          pointer-events: none;
          z-index: 1;
        }
        .tap-glass::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background:
            radial-gradient(130% 70% at 12% -10%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 55%),
            radial-gradient(100% 70% at 105% 120%, rgba(140,190,255,0.3) 0%, rgba(140,190,255,0) 60%);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.6), inset 0 -8px 12px rgba(0,0,0,0.08);
          mix-blend-mode: overlay;
          pointer-events: none;
          z-index: 1;
        }
        .tap-glass > * {
          position: relative;
          z-index: 2;
        }
        .tap-glass:active {
          transform: scale(0.86);
          box-shadow:
            0 1px 4px rgba(36,27,20,0.16),
            inset 0 1px 3px rgba(0,0,0,0.22),
            inset 0 0 0 1px rgba(255,255,255,0.55);
        }
        .tap-glass:active::before {
          opacity: 0.6;
        }

        /* The floating water-glass blob that glides between selected category chips */
        .water-slide {
          position: absolute;
          top: 0;
          bottom: 0;
          border-radius: 999px;
          pointer-events: none;
          z-index: 0;
          transition: left 480ms cubic-bezier(0.22, 1, 0.36, 1), width 480ms cubic-bezier(0.22, 1, 0.36, 1), opacity 250ms ease;
          backdrop-filter: blur(4px) saturate(220%) brightness(1.08);
          -webkit-backdrop-filter: blur(4px) saturate(220%) brightness(1.08);
          background:
            radial-gradient(130% 80% at 18% 0%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0) 55%),
            linear-gradient(160deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 55%, rgba(255,255,255,0) 100%);
          box-shadow:
            0 8px 20px rgba(0,0,0,0.2),
            inset 0 1px 0 rgba(255,255,255,0.8),
            inset 0 0 0 1.5px rgba(255,255,255,0.5),
            inset 0 0 12px rgba(120,200,255,0.3);
        }
      `}</style>
      <div className="w-full max-w-md relative" style={{ minHeight: "100vh", overflowX: "hidden" }}>
        <div className="flex px-4 pt-4 justify-between items-center">
          <span style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.3rem", fontWeight: 700 }}>
            TheHub
          </span>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="p-2.5 rounded-full tap-glass"
              style={{ border: `2px solid ${colors.hairline}`, color: colors.creamDim }}
            >
              <Menu size={20} />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-60 rounded-2xl shadow-lg z-50 overflow-hidden"
                style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}` }}
              >
                <button
                  onClick={() => { setMenuOpen(false); setRole("customer"); reset(); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm"
                  style={{
                    color: colors.cream,
                    background: role === "customer" ? colors.panel : "transparent",
                    fontWeight: role === "customer" ? 700 : 500,
                  }}
                >
                  <CalendarCheck size={16} /> Book an appointment
                </button>
                <button
                  onClick={() => { setMenuOpen(false); setRole("owner"); setView("owner"); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm"
                  style={{
                    color: colors.cream,
                    background: role === "owner" ? colors.panel : "transparent",
                    fontWeight: role === "owner" ? 700 : 500,
                  }}
                >
                  <Store size={16} /> I run a salon
                </button>
                <div style={{ borderTop: `2px solid ${colors.hairline}` }} />
                {role === "customer" && customerAuth && (
                  <button
                    onClick={() => { setMenuOpen(false); setView("myBookings"); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm"
                    style={{ color: colors.cream }}
                  >
                    <CalendarCheck size={16} /> My bookings
                  </button>
                )}
                {(role === "customer" ? customerAuth : ownerAuth) && (
                  <button
                    onClick={() => { setMenuOpen(false); setView("settings"); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm"
                    style={{ color: colors.cream }}
                  >
                    <Settings size={16} /> Settings
                  </button>
                )}
                {role === "owner" && ownerAuth && (
                  <button
                    onClick={() => { setMenuOpen(false); setOwnerPage("completed"); }}
                    className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <CheckCircle2 size={16} /> Completed Appointments
                  </button>
                )}
                {role === "owner" && ownerAuth && (
                  <button
                    onClick={() => { setMenuOpen(false); setOwnerPage("ratings"); }}
                    className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <Star size={16} /> Ratings &amp; Reviews
                  </button>
                )}
                {role === "owner" && ownerAuth && (
                  <button
                    onClick={() => { setMenuOpen(false); setOwnerPage("profile"); }}
                    className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <UserCircle size={16} /> My Profile
                  </button>
                )}
                {(role === "customer" ? customerAuth : ownerAuth) && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      if (role === "customer") {
                        localStorage.removeItem("customerAuth");
                        setCustomerAuth(null);
                        reset();
                      } else {
                        localStorage.removeItem("ownerAuth");
                        setOwnerAuth(null);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm"
                    style={{ color: "#E07A5F" }}
                  >
                    <LogOut size={16} /> Log out
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {status === "offline" && (
          <div className="mx-4 mt-4 px-4 py-3 rounded-2xl flex items-start gap-2" style={{ border: `3px solid ${colors.hairline}` }}>
            <WifiOff size={20} color={colors.hairline} className="shrink-0 mt-0.5" />
            <p className="text-sm" style={{ color: colors.cream }}>
              Can't reach TheHub's server at {API_BASE}. Run <b>npm start</b> in the backend
              folder, then reload this page.
            </p>
          </div>
        )}
        {role === "owner" ? (
          ownerAuth ? (
            ownerPage === "completed" ? (
              <CompletedAppointmentsView token={ownerAuth.token} onBack={() => setOwnerPage("dashboard")} />
            ) : ownerPage === "ratings" ? (
              <RatingsReviewsView token={ownerAuth.token} onBack={() => setOwnerPage("dashboard")} />
            ) : ownerPage === "profile" ? (
              <OwnerProfileView
              token={ownerAuth.token}
              onBack={() => setOwnerPage("dashboard")}
              onDeleted={() => {
                localStorage.removeItem("ownerAuth");
                setOwnerAuth(null);
              }}
            />
            ) : (
              <OwnerDashboard token={ownerAuth.token} />
            )
          ) : (
            <AuthGate
              role="owner"
              allowGuest={false}
              onAuthed={(token, user) => {
                localStorage.setItem("ownerAuth", JSON.stringify({ token, user }));
                setOwnerAuth({ token, user });
              }}
            />
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
                searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                searchState={searchState} setSearchState={setSearchState}
                searchCity={searchCity} setSearchCity={setSearchCity}
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
                  onAuthed={(token, user) => {
                    localStorage.setItem("customerAuth", JSON.stringify({ token, user }));
                    setCustomerAuth({ token, user });
                    setView("booking");
                  }}
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
            {view === "myBookings" && customerAuth && (
              <MyBookingsView
                token={customerAuth.token}
                onBack={() => setView("home")}
              />
            )}
            {view === "settings" && (
              <SettingsView
                onBack={() => setView("home")}
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
        {customerAuth && unratedQueue.length > 0 && !ratingPopupDismissed && (
          <RatingPopup
            booking={unratedQueue[0]}
            token={customerAuth.token}
            onDone={() => setUnratedQueue((prev) => prev.slice(1))}
            onLater={() => setRatingPopupDismissed(true)}
          />
        )}
      </div>
    </div>
  );
}
