import React, { useState } from "react";
import {
  Search, Sparkles, ChevronLeft, ArrowRight,
} from "lucide-react";
import { TierStars } from "./ratings";
import { CATEGORIES, FONT_DISPLAY, colors, inputStyle } from "./theme";

function formatBookingDate(dateInput) {
  if (!dateInput) return null;
  const d = dateInput instanceof Date ? dateInput : new Date(String(dateInput).slice(0, 10) + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
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

const STATE_ABBREVIATIONS = {
  "Abia": "AB", "Adamawa": "AD", "Akwa Ibom": "AKW", "Anambra": "AN",
  "Bauchi": "BA", "Bayelsa": "BAY", "Benue": "BEN", "Borno": "BOR",
  "Cross River": "CRS", "Delta": "DEL", "Ebonyi": "EBO", "Edo": "EDO",
  "Ekiti": "EKI", "Enugu": "ENU", "Gombe": "GOM", "Imo": "IMO",
  "Jigawa": "JIG", "Kaduna": "KAD", "Kano": "KAN", "Katsina": "KTS",
  "Kebbi": "KEB", "Kogi": "KOG", "Kwara": "KWA", "Lagos": "LAG",
  "Nasarawa": "NAS", "Niger": "NIG", "Ogun": "OGU", "Ondo": "OND",
  "Osun": "OSU", "Oyo": "OY", "Plateau": "PLA", "Rivers": "RIV",
  "Sokoto": "SOK", "Taraba": "TAR", "Yobe": "YOB", "Zamfara": "ZAM",
  "FCT (Abuja)": "ABJ",
};
const CITY_ABBREVIATIONS = {
  "Ibadan": "IB", "Lagos Island": "LAG", "Ikeja": "IKJ", "Lekki": "LEK",
  "Surulere": "SUR", "Ajah": "AJH", "Yaba": "YBA", "Abuja": "ABJ",
  "Port Harcourt": "PH", "Kano": "KAN", "Kaduna": "KAD", "Enugu": "ENU",
  "Benin City": "BEN", "Owerri": "OWR", "Calabar": "CAL", "Warri": "WAR",
};

function locationTag(salon) {
  if (salon.city && salon.neighborhood) {
    const cityCode = CITY_ABBREVIATIONS[salon.city] || salon.city.slice(0, 3).toUpperCase();
    return `${cityCode}/${salon.neighborhood}`;
  }
  if (!salon.state && !salon.city) return null;
  const stateCode = STATE_ABBREVIATIONS[salon.state] || (salon.state ? salon.state.slice(0, 3).toUpperCase() : "");
  if (stateCode && salon.city) return `${stateCode}/${salon.city}`;
  return stateCode || salon.city || null;
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
        {locationTag(salon) && (
          <p className="text-xs mt-0.5 text-right" style={{ color: colors.creamDim }}>
            {locationTag(salon)}
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

export { formatBookingDate, SalonPhoto, TicketNotch, locationTag, SalonCard, Header, BankSelect };