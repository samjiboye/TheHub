import React, { useState, useEffect } from "react";
import {
  Search, MapPin, Send, Loader2, LogIn, UserPlus, Eye, EyeOff, Image,
} from "lucide-react";
import { DEMO_CUSTOMER, apiFetch, ensureDemoAuth } from "./api";
import { CATEGORIES, FONT_DISPLAY, colors, inputStyle } from "./theme";

function AuthGate({ role, onAuthed, allowGuest, onViewTerms, onViewPrivacy }) {
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
  const [signupStep, setSignupStep] = useState("form");
  const [code, setCode] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

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
      if (mode === "signup" && signupStep === "form") {
        if (!termsAccepted) {
          setError("Please accept the Terms of Service and Privacy Policy to continue.");
          setLoading(false);
          return;
        }
        // Confirm they actually own this email before an account is made with it.
        await apiFetch("/auth/send-signup-code", {
          method: "POST",
          body: JSON.stringify({ email }),
        });
        setSignupStep("code");
        return;
      }
      const body =
        mode === "login"
          ? { email, password }
          : { name, email, password, role, referralCode: referralCode || undefined, code, terms_accepted: true };
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

  const resendCode = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/auth/send-signup-code", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
    } catch (err) {
      setError(err.message || "Couldn't resend the code.");
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
          onClick={() => { setMode("login"); setSignupStep("form"); }}
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
          onClick={() => { setMode("signup"); setSignupStep("form"); }}
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
        {mode === "signup" && signupStep === "code" ? (
          <>
            <p className="text-sm text-center" style={{ color: colors.creamDim }}>
              We sent a 6-digit code to <strong style={{ color: colors.cream }}>{email}</strong>. Enter it below to finish creating your account.
            </p>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              inputMode="numeric"
              className="pb-2 text-base outline-none text-center tracking-[0.5em]"
              style={inputStyle}
            />
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setSignupStep("form")} className="text-sm" style={{ color: colors.creamDim }}>
                Edit email
              </button>
              <button type="button" disabled={loading} onClick={resendCode} className="text-sm font-semibold" style={{ color: colors.hairline }}>
                Resend code
              </button>
            </div>
          </>
        ) : (
          <>
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
            {mode === "signup" && (
              <label
                className="flex items-start gap-2 text-xs cursor-pointer"
                style={{ color: colors.creamDim }}
              >
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  style={{ accentColor: colors.gold, marginTop: 2 }}
                />
                <span>
                  I have read and accept TheHub's{" "}
                  <button type="button" onClick={onViewTerms} className="underline" style={{ color: colors.cream }}>
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <button type="button" onClick={onViewPrivacy} className="underline" style={{ color: colors.cream }}>
                    Privacy Policy
                  </button>
                </span>
              </label>
            )}
          </>
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
          disabled={loading || (mode === "signup" && signupStep === "form" && !termsAccepted)}
          className="mt-2 py-4 rounded-2xl text-lg flex items-center justify-center gap-2 tap-glass"
          style={{ background: colors.hairline, color: "#FFFFFF", fontWeight: 700 }}
        >
          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : mode === "login" ? (
            <><LogIn size={18} /> Log in</>
          ) : signupStep === "code" ? (
            <><UserPlus size={18} /> Verify & create account</>
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
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.08-1.81 2.72v2.26h2.92c1.71-1.57 2.69-3.88 2.69-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.54-1.84.87-3.04.87-2.34 0-4.32-1.58-5.03-3.71H.96v2.33C2.44 15.98 5.48 18 9 18z" />
          <path fill="#FBBC05" d="M3.97 10.72c-.18-.54-.28-1.11-.28-1.72s.1-1.18.28-1.72V4.95H.96C.35 6.17 0 7.55 0 9s.35 2.83.96 4.05l3.01-2.33z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
        </svg>
        Sign in with Google
      </a>

      <a
        href="https://thehub-api.onrender.com/auth/apple"
        className="w-full mt-3 py-3 rounded-2xl text-base flex items-center justify-center gap-2"
        style={{ border: `2px solid ${colors.hairline}`, color: colors.cream, fontWeight: 600, textDecoration: "none" }}
      >
        <svg width="16" height="18" viewBox="0 0 170 210" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          <path
            fill={colors.cream}
            d="M150.4 47.6c-9.1.6-19.8 6.3-26 13.9-5.6 6.8-10.2 16.8-8.4 26.5 10.1.8 20.5-5.1 26.5-12.9 5.9-7.5 10.2-17.3 7.9-27.5zM168 154.7c-4.6-6.9-8.7-14.6-8.6-23.1.1-13.4 8.2-24.4 17.5-31.4-8.8-12.4-22.3-18.7-33.4-19.7-1.6-.1-3.2-.2-4.9-.2-9.6 0-17.7 4.5-24.8 4.5-7.4 0-16.4-4.3-25.5-4.2-16.7.2-32.2 9.7-40.7 24.7-16.9 29.5-4.3 76.4 12.1 101.4 8 11.8 17.7 25.1 30.5 24.6 12.1-.5 16.8-8 31.7-8s19.1 8 31.2 7.8c13.2-.2 22.1-11.9 30.1-23.7 6.2-9.2 11-19.4 14.3-30.3-.2-.1-9.4-3.6-9.5-23.4z"
          />
        </svg>
        Sign in with Apple
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
    body: "Search by category and see real reviews before you book. Pay the salon or barber directly, however you normally would — and after your 5th completed visit with them, you get 50% off automatically.",
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