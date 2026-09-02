import React, { useState, useEffect } from "react";
import {
  Search, MapPin, Send, Loader2, LogIn, UserPlus, Eye, EyeOff, Image,
} from "lucide-react";
import { DEMO_CUSTOMER, apiFetch, ensureDemoAuth } from "./api";
import { CATEGORIES, FONT_DISPLAY, colors, inputStyle } from "./theme";

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
            minLength={mode === "signup" ? 8 : undefined}
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
        {mode === "signup" && (
          <p className="text-xs -mt-1" style={{ color: colors.creamDim }}>At least 8 characters.</p>
        )}

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
        {mode === "signup" && (
          <p className="text-xs text-center mt-2" style={{ color: colors.creamDim }}>
            By signing up, you agree to TheHub's{" "}
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" style={{ color: colors.hairline, textDecoration: "underline" }}>
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" style={{ color: colors.hairline, textDecoration: "underline" }}>
              Privacy Policy
            </a>
            .
          </p>
        )}
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
                <div className="w'14 h-px" style={{ background: colors.hairline, opacity: 0.25 }} />
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

export { AuthGate, ResetPasswordView, OnboardingView };