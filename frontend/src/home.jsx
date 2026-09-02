import React, { useState, useRef, useEffect } from "react";
import {
  Search, MapPin, Sparkles, ChevronDown, X, Send, Loader2,
} from "lucide-react";
import { NIGERIA_LOCATIONS } from "./nigeriaLocations";
import { apiFetch } from "./api";
import { MediaGallery } from "./owner";
import { TierStars } from "./ratings";
import { Header, SalonCard, SalonPhoto } from "./shared";
import { CATEGORIES, CATEGORY_THEMES, FONT_BODY, FONT_DISPLAY, NEUTRAL_HERO_GRADIENT, PRICE_BUCKETS, colors } from "./theme";

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
            {category || priceFilter || searchQuery.trim() || searchState || searchCity
              ? "No results — try a different filter."
              : "No one here yet."}
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

export { HomeView, ProfileView, Concierge };