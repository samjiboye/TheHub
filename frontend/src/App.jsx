import React, { useState, useRef, useEffect } from "react";
import { NIGERIA_LOCATIONS } from "./nigeriaLocations";
import MarketplaceView from "./Marketplace";
import {
  Search, MapPin, Star, Clock, Scissors, Wand2, Palette, Sparkles, Flower2, Gem, PenTool,
  ChevronLeft, ChevronDown, X, Send, Calendar, TrendingUp, MessageCircle, CheckCircle2,
  Users, ArrowRight, ShieldCheck, Loader2, WifiOff, User, LogIn, UserPlus, Store, Plus, Eye, EyeOff, Image, Video, Play, Trash2, Upload, Menu, Settings, LogOut, CalendarCheck,
  UserCircle, Bell, Wallet, ShoppingBag,
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

// Typical booking on TheHub runs about ₦3,000, so these buckets are
// centered around that rather than generic round numbers.
const PRICE_BUCKETS = [
  { id: "u2k", label: "Under ₦2,000", min: 0, max: 2000 },
  { id: "2to5k", label: "₦2,000–₦5,000", min: 2000, max: 5000 },
  { id: "5to10k", label: "₦5,000–₦10,000", min: 5000, max: 10000 },
  { id: "10kplus", label: "₦10,000+", min: 10000, max: Infinity },
];

const CATEGORIES = [
  { name: "Barbing", icon: Scissors, photo: "https://images.pexels.com/photos/32351040/pexels-photo-32351040.jpeg" },
  { name: "Hairdressing", icon: Wand2, photo: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&q=80" },
  { name: "Lashes & Nails", icon: Palette, photo: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80" },
  { name: "Makeup", icon: Sparkles, photo: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=400&q=80" },
  { name: "Spa", icon: Flower2, photo: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80" },
  { name: "Piercing", icon: Gem, photo: "https://images.pexels.com/photos/10005259/pexels-photo-10005259.jpeg" },
  { name: "Tattoos", icon: PenTool, photo: "https://images.pexels.com/photos/35714996/pexels-photo-35714996.jpeg" },
];

// Category-specific hero background treatments — used behind the search screen
// and salon profile pages so each service type feels distinct. No external
// images are loaded here (kept to CSS gradients + a large watermark icon) so
// there's nothing to break if network access to an image host is unavailable.
const CATEGORY_THEMES = {
  Barbing: { gradient: "linear-gradient(160deg, #0D1B2A 0%, #1B4965 50%, #A9D6E5 100%)" },
  Hairdressing: { gradient: "linear-gradient(160deg, #241019 0%, #5C2740 50%, #D98CA6 100%)" },
  "Lashes & Nails": { gradient: "linear-gradient(160deg, #241214 0%, #6B333B 50%, #E7A9A0 100%)" },
  Piercing: { gradient: "linear-gradient(160deg, #1A1A1D 0%, #4A4E69 50%, #C9CBFF 100%)" },
  Tattoos: { gradient: "linear-gradient(160deg, #1A0F0F 0%, #4A1212 50%, #C97A7A 100%)" },
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
    id: 3, name: "Nailed It Studio", category: "Lashes & Nails", rating: 4.7, reviews: 188,
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

function formatBookingDate(dateInput) {
  if (!dateInput) return null;
  const d = dateInput instanceof Date ? dateInput : new Date(String(dateInput).slice(0, 10) + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
const BOOKING_FEE = 0; // set above 0 to reintroduce a booking fee later — the UI already discloses it if so
const COMMISSION_RATE = 0.10;

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
  const cat = CATEGORIES.find((c) => c.name === salon.category) || { icon: Sparkles };
  return (
    <button
      onClick={onClick}
      className="text-left rounded-3xl overflow-hidden w-full transition-transform active:scale-[0.97]"
      style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}
    >
      <SalonPhoto hue={salon.hue} icon={cat.icon} size="h-48" imageUrl={salon.profile_image_url} />
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

function HomeView({ salons, category, setCategory, priceFilter, setPriceFilter, searchQuery, setSearchQuery, searchState, setSearchState, searchCity, setSearchCity, locationStatus, onRequestLocation, onSelectSalon, topOffset = 64 }) {
  const [searchOpen, setSearchOpen] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      if (y <= 40) {
        setSearchOpen(true);
      } else if (y > lastScrollY.current + 4) {
        setSearchOpen(false);
      }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filtered = salons
    .filter((s) => (category ? s.category === category : true))
    .filter((s) => {
      if (!priceFilter) return true;
      const bucket = PRICE_BUCKETS.find((b) => b.id === priceFilter);
      if (!bucket) return true;
      return (s.services || []).some((svc) => svc.price >= bucket.min && svc.price < bucket.max);
    })
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
    <div className="relative transition-[background] duration-500" style={{ background: heroTheme ? heroTheme.gradient : NEUTRAL_HERO_GRADIENT }}>
      <div
        className="px-4 pt-2 pb-6 relative overflow-hidden rounded-b-[2.5rem]"
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
          className="mt-2 text-center relative transition-colors duration-500"
        >
          What do you want today?
        </h2>
      </div>

      <div
        className="sticky z-20 px-4 pt-4 pb-3 transition-[background] duration-500"
        style={{ top: topOffset, background: heroTheme ? heroTheme.gradient : NEUTRAL_HERO_GRADIENT, borderBottom: `2px solid ${colors.hairline}` }}
      >
        <div
          className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
          style={{ maxHeight: searchOpen ? 420 : 0, opacity: searchOpen ? 1 : 0 }}
        >
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or location"
            className="w-full mb-3 px-4 py-3 rounded-xl text-base outline-none"
            style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
          />

          <button
            onClick={onRequestLocation}
            disabled={locationStatus === "loading"}
            className="w-full mb-1 px-4 py-3 rounded-xl text-sm flex items-center justify-center gap-2 tap-glass"
            style={{
              background: locationStatus === "granted" ? colors.hairline : colors.panelLight,
              border: `2px solid ${colors.hairline}`,
              color: locationStatus === "granted" ? "#FFFFFF" : colors.cream,
              fontWeight: 600,
            }}
          >
            {locationStatus === "loading" ? (
              <><Loader2 size={16} className="animate-spin" /> Finding your location…</>
            ) : locationStatus === "granted" ? (
              <><MapPin size={16} /> Showing results near you — tap to refresh</>
            ) : (
              <><MapPin size={16} /> Find services near me</>
            )}
          </button>
          {locationStatus === "denied" && (
            <p className="text-xs text-center mb-2" style={{ color: colors.creamDim }}>
              Location is blocked. Enable it in your browser's site settings, then tap the button above again.
            </p>
          )}
          {locationStatus === "unsupported" && (
            <p className="text-xs text-center mb-2" style={{ color: colors.creamDim }}>
              Your browser doesn't support location search — try the state/city filters below instead.
            </p>
          )}
          <div className="mb-3" />

          <div className="grid grid-cols-2 gap-2 mb-3">
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
        </div>

        {!searchOpen && (
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Show search and location filters"
            className="w-full flex items-center justify-center mb-2 tap-glass"
            style={{ padding: "4px 0" }}
          >
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 36, height: 22, background: colors.panelLight, border: `2px solid ${colors.hairline}` }}
            >
              <ChevronDown size={16} color={colors.cream} />
            </div>
          </button>
        )}

        <div ref={chipRowRef} className="flex gap-2 overflow-x-auto pb-1 relative">
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
              className="pl-1.5 pr-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap tap-glass shrink-0 relative flex items-center gap-2"
              style={{
                background: category === c.name ? colors.gold : colors.panelLight,
                color: category === c.name ? "#FFFFFF" : colors.cream,
                border: `2px solid ${category === c.name ? colors.gold : colors.hairline}`,
              }}
            >
              {c.photo ? (
                <div
                  className="w-7 h-7 rounded-full shrink-0"
                  style={{
                    backgroundImage: `url(${c.photo})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    border: "2px solid rgba(255,255,255,0.8)",
                  }}
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center"
                  style={{ background: colors.gold, border: "2px solid rgba(255,255,255,0.8)" }}
                >
                  <c.icon size={14} color="#FFFFFF" />
                </div>
              )}
              {c.name}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 mt-2">
          {PRICE_BUCKETS.map((b) => (
            <button
              key={b.id}
              onClick={() => setPriceFilter(priceFilter === b.id ? null : b.id)}
              className="px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap tap-glass shrink-0"
              style={{
                background: priceFilter === b.id ? colors.gold : colors.panelLight,
                color: priceFilter === b.id ? "#FFFFFF" : colors.cream,
                border: `2px solid ${priceFilter === b.id ? colors.gold : colors.hairline}`,
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-5 pb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length === 0 && (
          <p className="text-lg text-center py-10 sm:col-span-2 lg:col-span-3" style={{ color: colors.creamDim }}>
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
  const cat = CATEGORIES.find((c) => c.name === salon.category) || { icon: Sparkles };
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
      <div className="px-4 pt-5 relative max-w-xl mx-auto w-full">
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
                  {svc.salon_service_available === false ? `₦${svc.home_service_price}` : `₦${svc.price}`}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

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

        <h3 className="mt-6 mb-3 text-xl" style={{ fontFamily: FONT_DISPLAY, color: textColor, fontWeight: 700 }}>
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

const inputStyle = {
  border: "none",
  borderBottom: `3px solid ${colors.hairline}`,
  borderRadius: 0,
  color: colors.cream,
  fontFamily: FONT_BODY,
  background: "transparent",
  paddingLeft: 0,
};

function BankSelect({ banks, value, onChange, placeholder = "Select bank", className, style }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = banks.find((b) => b.code === value);
  const filtered = query.trim()
    ? banks.filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase()))
    : banks;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={className || "w-full px-4 py-3 rounded-xl text-base outline-none text-left"}
        style={style || inputStyle}
      >
        {selected ? selected.name : <span style={{ color: "#9CA3AF" }}>{placeholder}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setQuery(""); }} />
          <div
            className="absolute left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 shadow-lg"
            style={{ background: "#FFFFFF", border: `2px solid ${colors.hairline}` }}
          >
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your bank..."
              className="w-full px-3 py-2.5 text-sm outline-none"
              style={{ borderBottom: `2px solid ${colors.hairline}`, color: "#241B14" }}
            />
            <div style={{ maxHeight: 260, overflowY: "auto" }}>
              {filtered.length === 0 ? (
                <p className="px-3 py-3 text-sm" style={{ color: "#7A6F63" }}>No banks match that search.</p>
              ) : (
                filtered.map((b) => (
                  <button
                    key={b.code}
                    type="button"
                    onClick={() => { onChange(b.code); setOpen(false); setQuery(""); }}
                    className="w-full text-left px-3 py-2.5 text-sm tap-glass"
                    style={{ color: "#241B14", borderBottom: "1px solid #F2F2F2" }}
                  >
                    {b.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

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
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setReferralCode(ref);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const body =
        mode === "login"
          ? { email, password }
          : { name, email, password, role, referralCode: referralCode || undefined };
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
    <div className="px-4 pt-6 pb-10 max-w-xl mx-auto w-full">
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
        {mode === "signup" && (
          <input
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            placeholder="Referral code (optional)"
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
        {submitting ? "Processing..." : "Tap or slide to pay & book"}
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

function OwnerCustomerProfileView({ token, salonId, customerId, onBack }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          </div>
        )}
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
  const [dailyCode, setDailyCode] = useState(null);
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
        <div className="rounded-2xl px-4 py-4 mb-4" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
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
        <p className="text-xs" style={{ color: colors.creamDim }}>{salon.name} · all time</p>
        <div className="grid grid-cols-1 gap-3 mt-3">
          <div className="rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide" style={{ color: colors.creamDim, fontFamily: FONT_MONO }}>
              <TrendingUp size={13} /> Gross bookings
            </div>
            <p style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.6rem" }} className="mt-1">
              ₦{data.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl px-4 py-3" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
              <p className="text-xs" style={{ color: colors.creamDim }}>Platform commission ({Math.round((data.commissionRate ?? 0.10) * 100)}%)</p>
              <p style={{ color: colors.cream }} className="text-lg mt-1">-₦{data.commission.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl px-4 py-3" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
              <p className="text-xs" style={{ color: colors.creamDim }}>Your payout</p>
              <p style={{ color: colors.cream }} className="text-lg mt-1">₦{data.payout.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-4 text-xs" style={{ color: colors.creamDim }}>
          <ShieldCheck size={13} />
          Commission is only taken on completed bookings — no charge for empty chairs.
        </div>

        {data.nextTierAt != null && (
          <div className="mt-4 rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold" style={{ color: colors.cream }}>📉 Lower commission tier</p>
              <p className="text-xs" style={{ color: colors.creamDim }}>{data.completedCount}/{data.nextTierAt} bookings</p>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ background: colors.panelLight, height: 10 }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (data.completedCount / data.nextTierAt) * 100)}%`, background: colors.hairline }}
              />
            </div>
            <p className="text-xs mt-2" style={{ color: colors.creamDim }}>
              {data.nextTierAt - data.completedCount} more completed booking{data.nextTierAt - data.completedCount === 1 ? "" : "s"} drops your commission to {Math.round(data.nextTierRate * 100)}%.
            </p>
          </div>
        )}

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
                <span className="text-xs text-right shrink-0" style={{ color: colors.creamDim }}>
                  {formatBookingDate(a.booking_date) && <>{formatBookingDate(a.booking_date)}<br /></>}
                  {a.time_slot}
                </span>
              </div>

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
                          onChange={(e) => setOtpInputs((prev) => ({ ...prev, [a.id]: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
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
              <div className="flex items-center justify-between">
                <div>
                  <h3 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }} className="text-lg">Wallet</h3>
                  <p className="text-xs mt-1" style={{ color: colors.creamDim }}>
                    Balance, loyalty points, and your referral code
                  </p>
                </div>
                <button
                  onClick={onOpenWallet}
                  className="shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold tap-glass"
                  style={{ background: colors.hairline, color: "#FFFFFF" }}
                >
                  Open
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

            <div className="mt-4 rounded-2xl px-4 py-4" style={{ border: `2px solid ${colors.hairline}` }}>
              <div className="flex items-center justify-between mb-2">
                <h3 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }} className="text-lg">Payout details</h3>
                {!editingPayout && (
                  <button onClick={() => { setEditingPayout(true); setConnectError(null); }} className="text-sm font-semibold" style={{ color: colors.hairline }}>
                    {salon.paystack_payouts_enabled ? "Update" : "Set up"}
                  </button>
                )}
              </div>

              {!editingPayout ? (
                <p className="text-sm" style={{ color: colors.creamDim }}>
                  {salon.paystack_payouts_enabled
                    ? `Payouts are connected${salon.account_number ? ` — account ending in ${salon.account_number.slice(-4)}` : ""}. You can update your bank details anytime — for example if your account number changes, or after switching from test to live payments.`
                    : "Not connected yet — you won't receive automatic payouts until this is set up."}
                </p>
              ) : (
                <div className="space-y-2">
                  <input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Business name"
                    className="w-full pb-2 text-base outline-none"
                    style={inputStyle}
                  />
                  <BankSelect
                    banks={banks}
                    value={bankCode}
                    onChange={(code) => { setBankCode(code); setResolvedName(null); }}
                    placeholder="Select bank"
                    className="w-full pb-2 text-base outline-none text-left"
                    style={inputStyle}
                  />
                  <input
                    value={accountNumber}
                    onChange={(e) => { setAccountNumber(e.target.value); setResolvedName(null); }}
                    onBlur={verifyPayoutAccount}
                    placeholder="Account number"
                    maxLength={10}
                    className="w-full pb-2 text-base outline-none"
                    style={inputStyle}
                  />
                  {resolving && <p className="text-xs" style={{ color: colors.creamDim }}>Verifying...</p>}
                  {resolvedName && <p className="text-xs font-semibold" style={{ color: colors.hairline }}>{resolvedName}</p>}
                  {connectError && <p className="text-sm" style={{ color: "#E07A5F" }}>{connectError}</p>}
                  <div className="flex gap-2 pt-1">
                    <button onClick={connectPayouts} disabled={connecting}
                      className="flex-1 py-2 rounded-full text-sm tap-glass"
                      style={{ background: colors.hairline, color: "#FFFFFF", fontWeight: 700 }}>
                      {connecting ? <Loader2 size={16} className="animate-spin" /> : "Save"}
                    </button>
                    <button onClick={() => setEditingPayout(false)}
                      className="flex-1 py-2 rounded-full text-sm tap-glass"
                      style={{ border: `2px solid ${colors.hairline}`, color: colors.creamDim }}>
                      Cancel
                    </button>
                  </div>
                </div>
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
      <div className="px-4 max-w-xl mx-auto w-full">
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
  const [stars, setStars] = useState(1);
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
      setDragX(xFromStars(1, trackWidthRef.current - handleSize));
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


function CustomerProfileView({ token, onBack }) {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    apiFetch("/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => {
        setProfile(data);
        setName(data.name || "");
        setPhone(data.phone || "");
        setAddressState(data.address_state || "");
        setAddressCity(data.address_city || "");
        setAddressStreet(data.address_street || "");
      })
      .catch(() => {});
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const data = await apiFetch("/users/me", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, phone, address_state: addressState, address_city: addressCity, address_street: addressStreet }),
      });
      setProfile(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message || "Couldn't save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/users/me/photo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setProfile((prev) => ({ ...prev, profile_photo_url: data.profile_photo_url }));
    } catch (err) {
      setError(err.message || "Couldn't upload that photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (!profile) {
    return (
      <div className="pb-8" style={{ background: NEUTRAL_HERO_GRADIENT, minHeight: "100vh" }}>
        <Header title="My Profile" onBack={onBack} />
        <div className="flex justify-center mt-10"><Loader2 size={24} className="animate-spin" color={colors.hairline} /></div>
      </div>
    );
  }

  const referralLink = `${window.location.origin}/?ref=${profile.referral_code}`;

  return (
    <div className="pb-8 transition-[background] duration-500" style={{ background: NEUTRAL_HERO_GRADIENT }}>
      <Header title="My Profile" onBack={onBack} />
      <div className="px-4 mt-4 flex flex-col gap-3 max-w-xl mx-auto w-full">

        <div className="flex flex-col items-center py-4">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden shrink-0"
            style={{ background: colors.panelLight, border: `3px solid ${colors.hairline}` }}
          >
            {profile.profile_photo_url ? (
              <img src={profile.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserCircle size={48} color={colors.hairline} />
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="mt-3 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2"
            style={{ border: `2px solid ${colors.hairline}`, color: colors.cream }}
          >
            {uploadingPhoto ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploadingPhoto ? "Uploading..." : "Change photo"}
          </button>
        </div>

        <div className="rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>
          <h3 className="text-lg mb-3" style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }}>Your details</h3>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full pb-2 mb-3 text-base outline-none"
            style={inputStyle}
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
            className="w-full pb-2 mb-1 text-base outline-none"
            style={inputStyle}
          />
          <p className="text-xs mt-3" style={{ color: colors.creamDim }}>Email</p>
          <p className="text-sm" style={{ color: colors.cream }}>{profile.email}</p>
        </div>

        <div className="rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>
          <h3 className="text-lg mb-1" style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }}>Home address</h3>
          <p className="text-xs mb-3" style={{ color: colors.creamDim }}>
            Save this once so you don't have to retype it every time you book a home-service appointment.
          </p>
          <select
            value={addressState}
            onChange={(e) => { setAddressState(e.target.value); setAddressCity(""); }}
            className="w-full pb-2 mb-3 text-base outline-none"
            style={inputStyle}
          >
            <option value="">Select state</option>
            {NIGERIA_LOCATIONS.map((s) => <option key={s.state} value={s.state}>{s.state}</option>)}
          </select>
          <select
            value={addressCity}
            onChange={(e) => setAddressCity(e.target.value)}
            disabled={!addressState}
            className="w-full pb-2 mb-3 text-base outline-none"
            style={inputStyle}
          >
            <option value="">Select city</option>
            {(NIGERIA_LOCATIONS.find((s) => s.state === addressState)?.cities || []).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            value={addressStreet}
            onChange={(e) => setAddressStreet(e.target.value)}
            placeholder="Street address"
            className="w-full pb-2 text-base outline-none"
            style={inputStyle}
          />
        </div>

        {error && <p className="text-sm" style={{ color: "#E07A5F" }}>{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: colors.hairline, color: "#FFFFFF" }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
        </button>

        <div className="rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>
          <p className="text-sm font-bold mb-1" style={{ color: colors.cream }}>👥 Invite friends, earn points</p>
          <p className="text-xs mb-3" style={{ color: colors.creamDim }}>
            You earn 60 points and they earn 30 once their first booking is complete.
          </p>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="flex-1 px-4 py-3 rounded-xl text-base font-bold text-center tracking-wide"
              style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
            >
              {profile.referral_code}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(profile.referral_code).then(() => {
                  setReferralCopied(true);
                  setTimeout(() => setReferralCopied(false), 2000);
                });
              }}
              className="px-4 py-3 rounded-xl text-sm font-bold shrink-0"
              style={{ background: colors.hairline, color: "#FFFFFF" }}
            >
              {referralCopied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(referralLink).then(() => {
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              });
            }}
            className="w-full py-2.5 rounded-xl text-sm font-semibold"
            style={{ border: `2px solid ${colors.hairline}`, color: colors.cream }}
          >
            {linkCopied ? "Link copied!" : "Copy shareable link instead"}
          </button>
        </div>
      </div>
    </div>
  );
}

function WalletView({ token, onBack }) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fundAmount, setFundAmount] = useState("");
  const [funding, setFunding] = useState(false);
  const [fundError, setFundError] = useState(null);
  const [loyaltyCount, setLoyaltyCount] = useState(0);
  const [loyaltyGoal, setLoyaltyGoal] = useState(5);
  const [loyaltyReward, setLoyaltyReward] = useState(1000);
  const [referralCode, setReferralCode] = useState("");
  const [referralsCompleted, setReferralsCompleted] = useState(0);
  const [referralCopied, setReferralCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiFetch("/wallet/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => {
        setBalance(data.balance || 0);
        setTransactions(data.transactions || []);
        setLoyaltyCount(data.loyaltyCount || 0);
        setLoyaltyGoal(data.loyaltyGoal || 5);
        setLoyaltyReward(data.loyaltyReward || 1000);
        setReferralCode(data.referralCode || "");
        setReferralsCompleted(data.referralsCompleted || 0);
        setError(null);
      })
      .catch(() => setError("Couldn't load your wallet."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleFund = async () => {
    const amount = parseFloat(fundAmount);
    if (!amount || amount <= 0) {
      setFundError("Enter a valid amount.");
      return;
    }
    setFunding(true);
    setFundError(null);
    try {
      const { url } = await apiFetch("/wallet/fund", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount }),
      });
      window.location.href = url;
    } catch (e) {
      setFundError(e.message || "Couldn't start funding — try again.");
      setFunding(false);
    }
  };

  const TX_LABELS = { fund: "Wallet top-up", debit: "Booking payment", refund: "Refund", reward: "Loyalty reward" };

  return (
    <div className="pb-8 transition-[background] duration-500" style={{ background: NEUTRAL_HERO_GRADIENT }}>
      <Header title="Wallet" onBack={onBack} />
      <div className="px-4 max-w-xl mx-auto w-full">
        <div className="mt-2 rounded-2xl px-5 py-6 text-center" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
          <p className="text-sm" style={{ color: colors.creamDim }}>Wallet balance</p>
          <p className="text-4xl mt-1" style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 800 }}>
            ₦{Number(balance).toLocaleString()}
          </p>
        </div>

        <div className="mt-4 rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold" style={{ color: colors.cream }}>🎁 Loyalty reward</p>
            <p className="text-xs" style={{ color: colors.creamDim }}>{loyaltyCount}/{loyaltyGoal} points</p>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ background: colors.panelLight, height: 10 }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (loyaltyCount / loyaltyGoal) * 100)}%`, background: colors.hairline }}
            />
          </div>
          <p className="text-xs mt-2" style={{ color: colors.creamDim }}>
            {loyaltyGoal - loyaltyCount > 0
              ? `Earn 1 point per ₦100 you spend through TheHub. ${loyaltyGoal - loyaltyCount} more points unlocks ₦${Number(loyaltyReward).toLocaleString()} in your wallet.`
              : `Reward unlocked on your next completed booking!`}
          </p>
        </div>

        {referralCode && (
          <div className="mt-4 rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
            <p className="text-sm font-bold mb-1" style={{ color: colors.cream }}>👥 Invite friends, earn points</p>
            <p className="text-xs mb-3" style={{ color: colors.creamDim }}>
              You earn 60 points and they earn 30 once their first booking is complete.
              {referralsCompleted > 0 ? ` ${referralsCompleted} friend${referralsCompleted === 1 ? '' : 's'} joined so far.` : ""}
            </p>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 px-4 py-3 rounded-xl text-base font-bold text-center tracking-wide"
                style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
              >
                {referralCode}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(referralCode).then(() => {
                    setReferralCopied(true);
                    setTimeout(() => setReferralCopied(false), 2000);
                  });
                }}
                className="px-4 py-3 rounded-xl text-sm font-bold shrink-0"
                style={{ background: colors.hairline, color: "#FFFFFF" }}
              >
                {referralCopied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}

        <h3 className="mt-6 mb-3 text-lg" style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }}>
          Top up
        </h3>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={fundAmount}
            onChange={(e) => setFundAmount(e.target.value)}
            placeholder="Amount in ₦"
            className="flex-1 px-4 py-3 rounded-xl text-base outline-none"
            style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
          />
          <button
            onClick={handleFund}
            disabled={funding}
            className="px-5 py-3 rounded-xl text-base tap-glass"
            style={{ background: colors.hairline, color: "#FFFFFF", fontWeight: 700 }}
          >
            {funding ? <Loader2 size={18} className="animate-spin" /> : "Fund"}
          </button>
        </div>
        {fundError && <p className="text-sm mt-2" style={{ color: colors.creamDim }}>{fundError}</p>}

        <h3 className="mt-8 mb-3 text-lg" style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }}>
          History
        </h3>
        {loading && (
          <div className="flex justify-center pt-4">
            <Loader2 size={24} className="animate-spin" color={colors.creamDim} />
          </div>
        )}
        {error && <p className="text-sm text-center mt-4" style={{ color: colors.creamDim }}>{error}</p>}
        {!loading && !error && transactions.length === 0 && (
          <p className="text-sm py-4" style={{ color: colors.creamDim }}>No wallet activity yet.</p>
        )}
        <div className="flex flex-col gap-2 mt-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: colors.cream }}>{TX_LABELS[tx.type] || tx.type}</p>
                <p className="text-xs" style={{ color: colors.creamDim }}>
                  {new Date(tx.created_at).toLocaleDateString()} · {tx.status}
                </p>
              </div>
              <p className="text-base" style={{ color: tx.type === "debit" ? "#E07A5F" : colors.cream, fontWeight: 700 }}>
                {tx.type === "debit" ? "-" : "+"}₦{Number(tx.amount).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LocationShareBlock({ bookingId, token, otherLabel }) {
  const [shares, setShares] = useState([]);
  const [myUserId, setMyUserId] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("customerAuth") || localStorage.getItem("ownerAuth") || "null");
      setMyUserId(saved?.user?.id || null);
    } catch (e) {}
  }, []);

  const fetchShares = () => {
    apiFetch(`/bookings/${bookingId}/location`, { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => setShares(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchShares();
    const interval = setInterval(fetchShares, 20000);
    return () => clearInterval(interval);
  }, [bookingId]);

  const mine = shares.find((s) => s.shared_by === myUserId);
  const theirs = shares.find((s) => s.shared_by !== myUserId);

  const shareLocation = () => {
    if (!navigator.geolocation) {
      setError("Location isn't available on this device.");
      return;
    }
    setSharing(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await apiFetch(`/bookings/${bookingId}/location`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          });
          fetchShares();
        } catch (err) {
          setError(err.message || "Couldn't share your location.");
        } finally {
          setSharing(false);
        }
      },
      () => {
        setError("Couldn't get your location — check location permission for this site.");
        setSharing(false);
      }
    );
  };

  const stopSharing = async () => {
    try {
      await apiFetch(`/bookings/${bookingId}/location`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchShares();
    } catch (err) {}
  };

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={shareLocation}
          disabled={sharing}
          className="text-xs font-semibold px-3 py-1.5 rounded-full tap-glass flex items-center gap-1"
          style={{ border: `2px solid ${colors.hairline}`, color: colors.cream }}
        >
          <MapPin size={12} />
          {sharing ? "Sharing…" : mine ? "Update my location" : "Share my location"}
        </button>
        {mine && (
          <button
            onClick={stopSharing}
            className="text-xs font-semibold px-3 py-1.5 rounded-full tap-glass"
            style={{ color: colors.creamDim }}
          >
            Stop sharing
          </button>
        )}
        {theirs && (
          <a
            href={`https://maps.google.com/?q=${theirs.lat},${theirs.lng}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold px-3 py-1.5 rounded-full tap-glass flex items-center gap-1"
            style={{ background: colors.hairline, color: "#FFFFFF" }}
          >
            <MapPin size={12} /> View {otherLabel}'s location
          </a>
        )}
      </div>
      {error && <p className="text-xs" style={{ color: "#E07A5F" }}>{error}</p>}
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
  const [disputingId, setDisputingId] = useState(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeError, setDisputeError] = useState(null);
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
                {b.status === "confirmed" && b.owner_response === "pending" && (
                  <p className="text-xs mt-2" style={{ color: colors.gold }}>
                    Payment received — waiting for {b.salon_name} to accept.
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
                {b.status === "confirmed" && b.completion_requested_at && !b.disputed_at && (
                  <div className="mt-2 flex flex-col gap-2">
                    <div className="px-3 py-2 rounded-xl text-center" style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}` }}>
                      <p className="text-xs" style={{ color: colors.creamDim }}>Your confirmation code</p>
                      <p className="text-2xl" style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 800, letterSpacing: "0.1em" }}>
                        {b.completion_otp || "····"}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: colors.creamDim }}>Give this to {b.salon_name} once you're happy with the service.</p>
                    </div>
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

function SettingsView({ onBack, onWatchIntro }) {
  const savedCustomer = JSON.parse(localStorage.getItem("customerAuth") || "null");
  const savedOwner = JSON.parse(localStorage.getItem("ownerAuth") || "null");
  const user = savedCustomer?.user || savedOwner?.user || {};
  const ownerToken = savedOwner?.token;

  const [ownerSalon, setOwnerSalon] = useState(null);
  const [confirmDeleteSalon, setConfirmDeleteSalon] = useState(false);
  const [deletingSalon, setDeletingSalon] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    if (!ownerToken) return;
    apiFetch("/salons/mine", { headers: { Authorization: `Bearer ${ownerToken}` } })
      .then((data) => setOwnerSalon(data[0] || null))
      .catch(() => {});
  }, [ownerToken]);

  const handleDeleteSalon = async () => {
    setDeletingSalon(true);
    setDeleteError(null);
    try {
      await apiFetch(`/salons/${ownerSalon.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      onBack && onBack();
    } catch (err) {
      setDeleteError(err.message || "Couldn't delete this salon.");
      setDeletingSalon(false);
    }
  };

  return (
    <div className="pb-8 transition-[background] duration-500" style={{ background: NEUTRAL_HERO_GRADIENT }}>
      <Header title="Settings" onBack={onBack} />
      <div className="px-4 mt-4 flex flex-col gap-3 max-w-xl mx-auto w-full">
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
        {onWatchIntro && (
          <button
            onClick={onWatchIntro}
            className="px-4 py-3 rounded-xl text-sm font-semibold text-left tap-glass"
            style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
          >
            Watch intro again
          </button>
        )}
        {ownerSalon && (
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
        )}
      </div>
    </div>
  );
}

function Concierge({ open, onClose, onSelectSalon }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi, I'm Aria. Tell me what you're after — a service, a budget, how far you'll travel — and I'll point you to the right place.", matches: [] },
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
      const { text, matches } = await apiFetch("/concierge", {
        method: "POST",
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.text })),
        }),
      });
      setMessages((prev) => [...prev, { role: "assistant", text, matches: matches || [] }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", text: "Aria's having trouble connecting right now — try again in a moment.", matches: [] }]);
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
            <div key={i} className="flex flex-col gap-2" style={{ alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div
                className="max-w-[85%] px-4 py-2.5 rounded-2xl text-base"
                style={{
                  background: m.role === "user" ? colors.hairline : colors.panelLight,
                  color: m.role === "user" ? "#FFFFFF" : colors.cream,
                  border: m.role === "user" ? "none" : `2px solid ${colors.hairline}`,
                  fontFamily: FONT_BODY,
                }}
              >
                {m.text}
              </div>
              {m.matches && m.matches.length > 0 && (
                <div className="w-full flex flex-col gap-2">
                  {m.matches.map((s) => (
                    <SalonCard key={s.id} salon={s} onClick={() => { onSelectSalon(s); onClose(); }} />
                  ))}
                </div>
              )}
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
            placeholder="I need a cut under ₦5000..."
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
    <div className="px-4 pt-6 pb-10 flex flex-col items-center max-w-xl mx-auto w-full">
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
    title: "Welcome to TheHub!",
    body: "Nigeria's home for beauty and grooming — booked in seconds, no phone calls needed.",
    photo: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80",
  },
  {
    title: "Book any service, anywhere",
    body: "Great hair, skin, and beauty care — in the salon or at home, wherever suits you.",
    photo: "https://images.pexels.com/photos/4350096/pexels-photo-4350096.jpeg",
  },
  {
    title: "Built for clients and businesses alike",
    body: "Search by category and see real reviews before you book. Salon or freelance owners get paid instantly via Paystack — no waiting around.",
    photo: "https://images.pexels.com/photos/7389077/pexels-photo-7389077.jpeg",
  },
  {
    type: "location",
    title: "See what's near you",
    body: "Turn on location to find salons, barbers, and pros close to you — sorted nearest first.",
    photo: "https://images.pexels.com/photos/8828593/pexels-photo-8828593.jpeg",
  },
  {
    type: "categories",
    title: "Explore what we offer",
    photo: null,
    categories: CATEGORIES,
  },
];

function OnboardingView({ onDone }) {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const urls = ONBOARDING_SLIDES.flatMap((s) =>
      s.type === "categories" ? s.categories.map((c) => c.photo) : [s.photo]
    ).filter(Boolean);
    urls.forEach((url) => {
      const img = new window.Image();
      img.src = url;
    });
  }, []);
  const isLast = slide === ONBOARDING_SLIDES.length - 1;
  const current = ONBOARDING_SLIDES[slide];

  const next = () => {
    if (isLast) onDone();
    else setSlide((s) => s + 1);
  };

  const prev = () => {
    if (slide > 0) setSlide((s) => s - 1);
  };

  const isPlain = current.type === "categories";

  return (
    <div
      onClick={next}
      className="min-h-screen w-full flex flex-col justify-between px-6 pt-10 pb-10 relative overflow-hidden cursor-pointer"
      style={{
        backgroundImage: isPlain
          ? "linear-gradient(160deg, #FBEEE3 0%, #F6DCC4 55%, #F2C79E 100%)"
          : `linear-gradient(160deg, rgba(201,122,61,0.75), rgba(166,83,42,0.85)), url(${current.photo})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="flex justify-between items-center">
        <div
          className="pl-2.5 pr-4 py-2 rounded-[50%_50%_50%_10%/60%_60%_40%_40%] flex items-center gap-2 shadow-lg"
          style={{ background: "#F6F1E9" }}
        >
          <img src="/icon-192.png" alt="" className="w-8 h-8 rounded-lg shrink-0" />
          <div className="flex flex-col leading-tight">
            <span
              className="text-sm font-extrabold tracking-wide"
              style={{ color: colors.hairline, fontFamily: FONT_DISPLAY }}
            >
              TheHub
            </span>
            <span
              className="text-[9px] font-semibold tracking-widest"
              style={{ color: "#9C4A31" }}
            >
              BOOKING
            </span>
          </div>
        </div>
        {!isLast && (
          <button
            onClick={(e) => { e.stopPropagation(); onDone(); }}
            className="text-sm font-semibold px-4 py-2 rounded-full"
            style={{
              color: isPlain ? colors.hairline : "#FFFFFF",
              background: isPlain ? "rgba(217,112,46,0.12)" : "rgba(255,255,255,0.18)",
            }}
          >
            Skip
          </button>
        )}
      </div>

      {current.type === "categories" ? (
        <>
          <div className="mt-8">
            <h1
              className="text-3xl font-extrabold leading-tight mb-4"
              style={{ fontFamily: FONT_DISPLAY, color: colors.hairline }}
            >
              {current.title}
            </h1>
          </div>

          <div className="flex-1 overflow-y-auto py-6">
            <div className="grid grid-cols-3 gap-x-4 gap-y-5">
              {current.categories.map((cat) => (
                <div key={cat.name} className="flex flex-col items-center gap-2">
                  {cat.photo ? (
                    <div
                      className="w-20 h-20 rounded-full shadow-lg"
                      style={{
                        backgroundImage: `url(${cat.photo})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        border: `3px solid ${colors.hairline}`,
                      }}
                    />
                  ) : (
                    <div
                      className="w-20 h-20 rounded-full shadow-lg flex items-center justify-center"
                      style={{ background: colors.gold, border: `3px solid ${colors.hairline}` }}
                    >
                      <cat.icon size={28} color="#FFFFFF" />
                    </div>
                  )}
                  <span className="text-xs font-semibold text-center" style={{ color: colors.hairline }}>{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : current.type === "location" ? (
        <>
          <div className="flex-1 flex items-center justify-center">
            <div className="relative w-56 h-56">
              <MapPin size={44} color="#F2C79E" fill="#F2C79E" className="absolute" style={{ top: 0, left: 70 }} />
              <MapPin size={40} color="#F2C79E" fill="#F2C79E" className="absolute" style={{ top: 50, left: 0 }} />
              <MapPin size={40} color="#F2C79E" fill="#F2C79E" className="absolute" style={{ top: 60, left: 150 }} />
              <MapPin size={48} color="#4FA89C" fill="#4FA89C" className="absolute" style={{ top: 140, left: 90 }} />
            </div>
          </div>

          <div className="mb-6">
            <h1
              className="text-3xl font-extrabold text-white leading-tight mb-4 text-center"
              style={{ fontFamily: FONT_DISPLAY }}
            >
              {current.title}
            </h1>
            <p className="text-white text-base leading-relaxed text-center" style={{ opacity: 0.9 }}>
              {current.body}
            </p>
          </div>
        </>
      ) : (
        <>
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
            {slide === 0 && (
              <div
                className="w-52 h-48 rounded-[50%_50%_50%_10%/60%_60%_40%_40%] flex flex-col items-center justify-center gap-1.5 shadow-2xl px-4"
                style={{ background: "#F6F1E9" }}
              >
                <img src="/icon-192.png" alt="" className="w-14 h-14 rounded-2xl" />
                <span
                  className="text-xl font-extrabold"
                  style={{ color: colors.hairline, fontFamily: FONT_DISPLAY }}
                >
                  TheHub
                </span>
                <div className="w-14 h-px" style={{ background: colors.hairline, opacity: 0.25 }} />
                <span
                  className="text-[10px] font-semibold tracking-widest"
                  style={{ color: "#9C4A31" }}
                >
                  BOOKING
                </span>
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex items-center justify-between">
        {slide > 0 ? (
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="text-base font-semibold"
            style={{ color: isPlain ? colors.hairline : "#FFFFFF" }}
          >
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
              style={{
                background: isPlain
                  ? i === slide ? colors.hairline : "rgba(166,83,42,0.35)"
                  : i === slide ? "#FFFFFF" : "rgba(255,255,255,0.5)",
              }}
            />
          ))}
        </div>

        {isLast && (
          <button
            onClick={(e) => { e.stopPropagation(); onDone(); }}
            className="px-6 py-3 rounded-full text-base font-bold"
            style={{ background: "#4FA89C", color: "#FFFFFF" }}
          >
            Get Started
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
  const [priceFilter, setPriceFilter] = useState(null);
  const [selectedSalon, setSelectedSalon] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const iconBarRef = useRef(null);
  const [iconBarHeight, setIconBarHeight] = useState(64);

  useEffect(() => {
    const measure = () => {
      if (iconBarRef.current) setIconBarHeight(iconBarRef.current.offsetHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  });
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
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [headerWalletBalance, setHeaderWalletBalance] = useState(null);
  const [customerPhotoUrl, setCustomerPhotoUrl] = useState(null);
  const [salons, setSalons] = useState([]);
    const [userLocation, setUserLocation] = useState(null);
    const [locationStatus, setLocationStatus] = useState("idle"); // idle | loading | granted | denied | unsupported
    const [searchQuery, setSearchQuery] = useState("");
    const [searchState, setSearchState] = useState("");
    const [searchCity, setSearchCity] = useState("");
  const [status, setStatus] = useState("loading"); // loading | ready | offline
  const [checkoutResult, setCheckoutResult] = useState(null); // "success" | "cancelled" | null
  const [resetToken, setResetToken] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(() => !sessionStorage.getItem("onboardingSeen"));
  const reset = () => {
    setView("home");
    setSelectedSalon(null);
    setSelectedService(null);
  };
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus("granted");
      },
      () => setLocationStatus("denied"),
      { timeout: 8000 }
    );
  };
  useEffect(() => {
      requestLocation();
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
    const activeAuth = role === "customer" ? customerAuth : ownerAuth;
    if (!activeAuth?.token) { setNotifications([]); setUnreadCount(0); return; }
    const fetchNotifications = () => {
      apiFetch("/notifications/me", { headers: { Authorization: `Bearer ${activeAuth.token}` } })
        .then((data) => { setNotifications(data.notifications || []); setUnreadCount(data.unreadCount || 0); })
        .catch(() => {});
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [role, customerAuth?.token, ownerAuth?.token]);
  useEffect(() => {
    if (role !== "customer" || !customerAuth?.token) { setHeaderWalletBalance(null); return; }
    const fetchBalance = () => {
      apiFetch("/wallet/me", { headers: { Authorization: `Bearer ${customerAuth.token}` } })
        .then((data) => setHeaderWalletBalance(data.balance || 0))
        .catch(() => {});
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 15000);
    return () => clearInterval(interval);
  }, [role, customerAuth?.token, view]);
  useEffect(() => {
    if (role !== "customer" || !customerAuth?.token) { setCustomerPhotoUrl(null); return; }
    apiFetch("/users/me", { headers: { Authorization: `Bearer ${customerAuth.token}` } })
      .then((data) => setCustomerPhotoUrl(data.profile_photo_url || null))
      .catch(() => {});
  }, [role, customerAuth?.token, view]);
  const markNotificationRead = (id) => {
    const activeAuth = role === "customer" ? customerAuth : ownerAuth;
    if (!activeAuth?.token) return;
    apiFetch(`/notifications/${id}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${activeAuth.token}` } })
      .then(() => {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        setUnreadCount((c) => Math.max(0, c - 1));
      })
      .catch(() => {});
  };
  const markAllNotificationsRead = () => {
    const activeAuth = role === "customer" ? customerAuth : ownerAuth;
    if (!activeAuth?.token) return;
    apiFetch("/notifications/read-all", { method: "PATCH", headers: { Authorization: `Bearer ${activeAuth.token}` } })
      .then(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      })
      .catch(() => {});
  };
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
    } else if (params.get("wallet_success")) {
      setRole("customer");
      setView("wallet");
    } else if (params.get("stripe_return") || params.get("stripe_refresh")) {
      setRole("owner");
    } else if (params.get("salon")) {
      const salonId = params.get("salon");
      setRole("customer");
      apiFetch(`/salons/${salonId}`)
        .then((data) => {
          setSelectedSalon(data);
          setView("salonDetail");
        })
        .catch(() => {});
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
          sessionStorage.setItem("onboardingSeen", "1");
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
      <div className="w-full relative" style={{ minHeight: "100vh", maxWidth: "1600px", margin: "0 auto" }}>
        <div
          ref={iconBarRef}
          className="flex px-4 pt-4 pb-3 justify-between items-center sticky top-0 z-30"
          style={{ background: colors.bg }}
        >
          <div>
            {role === "customer" && customerAuth && customerPhotoUrl ? (
              <button onClick={() => setView("profile")} className="tap-glass block">
                <img
                  src={customerPhotoUrl}
                  alt="Your profile"
                  className="w-9 h-9 rounded-full object-cover"
                  style={{ border: `2px solid ${colors.hairline}` }}
                />
              </button>
            ) : (
              <span style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.3rem", fontWeight: 700 }}>
                TheHub
              </span>
            )}
            {role === "customer" && customerAuth && headerWalletBalance !== null && (
              <button
                onClick={() => setView("wallet")}
                className="flex items-center gap-1 mt-0.5 tap-glass"
                style={{ color: colors.creamDim, fontSize: "0.8rem", fontWeight: 700 }}
              >
                <Wallet size={12} /> ₦{Number(headerWalletBalance).toLocaleString()}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(role === "customer" ? customerAuth : ownerAuth) && (
              <div className="relative">
                <button
                  onClick={() => setNotifOpen((o) => { if (!o) setMenuOpen(false); return !o; })}
                  className="p-2.5 rounded-full tap-glass relative"
                  style={{ border: `2px solid ${colors.hairline}`, color: colors.creamDim }}
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-xs"
                      style={{ background: "#E07A5F", color: "#FFFFFF", minWidth: 18, height: 18, fontWeight: 700, padding: "0 4px" }}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div
                    className="absolute right-0 mt-2 w-72 rounded-2xl shadow-lg z-50 overflow-hidden"
                    style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}` }}
                  >
                    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `2px solid ${colors.hairline}` }}>
                      <span className="text-sm font-bold" style={{ color: colors.cream }}>Notifications</span>
                      {unreadCount > 0 && (
                        <button onClick={markAllNotificationsRead} className="text-xs font-semibold" style={{ color: colors.creamDim }}>
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div style={{ maxHeight: 320, overflowY: "auto" }}>
                      {notifications.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-center" style={{ color: colors.creamDim }}>
                          No notifications yet.
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            onClick={() => {
                              if (!n.read) markNotificationRead(n.id);
                              const ownerTypes = ["new_booking"];
                              const customerBookingTypes = [
                                "booking_confirmed", "booking_accepted", "booking_declined",
                                "booking_cancelled", "completion_requested", "booking_completed",
                                "booking_disputed", "reminder",
                              ];
                              if (ownerTypes.includes(n.type)) {
                                setNotifOpen(false);
                                setRole("owner");
                                setOwnerPage("dashboard");
                              } else if (customerBookingTypes.includes(n.type)) {
                                setNotifOpen(false);
                                setRole("customer");
                                setView("myBookings");
                              }
                            }}
                            className="w-full text-left px-4 py-3"
                            style={{
                              borderBottom: `1px solid ${colors.hairline}`,
                              background: n.read ? "transparent" : "rgba(224,122,95,0.08)",
                            }}
                          >
                            <p className="text-sm font-semibold" style={{ color: colors.cream }}>{n.title}</p>
                            {n.body && <p className="text-xs mt-0.5" style={{ color: colors.creamDim }}>{n.body}</p>}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => { if (!o) setNotifOpen(false); return !o; })}
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
                  onClick={() => {
                    if (role === "owner" && !window.confirm("Switch to booking mode? You'll leave your salon dashboard.")) return;
                    setMenuOpen(false); setRole("customer"); reset();
                  }}
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
                    onClick={() => { setMenuOpen(false); setView("profile"); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm"
                    style={{ color: colors.cream }}
                  >
                    <UserCircle size={16} /> My Profile
                  </button>
                )}
                {role === "customer" && customerAuth && (
                  <button
                    onClick={() => { setMenuOpen(false); setView("myBookings"); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm"
                    style={{ color: colors.cream }}
                  >
                    <CalendarCheck size={16} /> My bookings
                  </button>
                )}
                {((role === "customer" && customerAuth) || (role === "owner" && ownerAuth)) && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      if (role === "owner") setOwnerPage("marketplace");
                      else setView("marketplace");
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm"
                    style={{ color: colors.cream }}
                  >
                    <ShoppingBag size={16} /> Marketplace
                  </button>
                )}
                {role === "customer" && customerAuth && (
                  <button
                    onClick={() => { setMenuOpen(false); setView("wallet"); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm"
                    style={{ color: colors.cream }}
                  >
                    <Wallet size={16} /> Wallet
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
              onOpenWallet={() => setOwnerPage("wallet")}
            />
            ) : ownerPage === "marketplace" ? (
              <MarketplaceView token={ownerAuth.token} onBack={() => setOwnerPage("dashboard")} />
            ) : ownerPage === "wallet" ? (
              <WalletView token={ownerAuth.token} onBack={() => setOwnerPage("profile")} />
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
                priceFilter={priceFilter} setPriceFilter={setPriceFilter}
                searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                searchState={searchState} setSearchState={setSearchState}
                searchCity={searchCity} setSearchCity={setSearchCity}
                locationStatus={locationStatus} onRequestLocation={requestLocation}
                onSelectSalon={(s) => { setSelectedSalon(s); setView("salonDetail"); }}
                topOffset={iconBarHeight}
              />
            )}
            {view === "salonDetail" && selectedSalon && (
              <ProfileView
                salon={selectedSalon}
                onBack={() => setView("home")}
                onBook={(svc) => { setSelectedService(svc); setView(customerAuth ? "booking" : "auth"); }}
              />
            )}
            {view === "auth" && (
              <>
                <Header title="Sign in to book" onBack={() => setView("salonDetail")} />
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
                onBack={() => setView("salonDetail")}
                onPaidWithWallet={() => setCheckoutResult("success")}
              />
            )}
            {view === "profile" && customerAuth && (
              <CustomerProfileView
                token={customerAuth.token}
                onBack={() => setView("home")}
              />
            )}
            {view === "myBookings" && customerAuth && (
              <MyBookingsView
                token={customerAuth.token}
                onBack={() => setView("home")}
              />
            )}
            {view === "wallet" && customerAuth && (
              <WalletView
                token={customerAuth.token}
                onBack={() => setView("home")}
              />
            )}
            {view === "marketplace" && customerAuth && (
              <MarketplaceView
                token={customerAuth.token}
                onBack={() => setView("home")}
              />
            )}
            {view === "settings" && (
              <SettingsView
                onBack={() => setView("home")}
                onWatchIntro={() => setShowOnboarding(true)}
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
        <Concierge
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          onSelectSalon={(s) => { setSelectedSalon(s); setRole("customer"); setView("salonDetail"); }}
        />
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
