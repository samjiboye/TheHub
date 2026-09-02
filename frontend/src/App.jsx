import React, { useState, useRef, useEffect } from "react";
import {
  Star, MessageCircle, CheckCircle2, Loader2, WifiOff, LogIn, Store, Menu, Settings, LogOut, CalendarCheck, UserCircle, Bell,
} from "lucide-react";
import { API_BASE, apiFetch } from "./api";
import { AuthGate, OnboardingView, ResetPasswordView } from "./auth";
import { BookingView, MyBookingsView } from "./booking";
import { ChatInboxView, ChatThreadView } from "./chat";
import { CustomerProfileView } from "./customer";
import { Concierge, HomeView, ProfileView } from "./home";
import { CompletedAppointmentsView, OwnerDashboard, OwnerProfileView } from "./owner";
import { RatingPopup, RatingsReviewsView } from "./ratings";
import { SettingsView, FeedbackView } from "./settings";
import { Header } from "./shared";
import { FONT_BODY, FONT_DISPLAY, colors } from "./theme";

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

  useEffect(() => {
    if (!menuOpen) return;
    const closeMenu = () => setMenuOpen(false);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("touchmove", closeMenu, { passive: true });
    return () => {
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("touchmove", closeMenu);
    };
  }, [menuOpen]);

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
  // One unified account works as BOTH customer and owner — no more
  // separate logins. "role" below is purely a UI-mode toggle for which
  // screens show; it no longer determines which account is logged in.
  // Old separate "customerAuth"/"ownerAuth" localStorage keys are read
  // as a fallback so existing logged-in sessions aren't signed out by
  // this change.
  const [auth, setAuth] = useState(() => {
    try {
      const saved = localStorage.getItem("auth") || localStorage.getItem("customerAuth") || localStorage.getItem("ownerAuth");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }); // { token, user }
  function persistAuth(value) {
    setAuth(value);
    try {
      if (value) localStorage.setItem("auth", JSON.stringify(value));
      else localStorage.removeItem("auth");
    } catch (e) {}
  }
  const customerAuth = auth;
  const ownerAuth = auth;
  const setCustomerAuth = persistAuth;
  const setOwnerAuth = persistAuth;

  const [unratedQueue, setUnratedQueue] = useState([]);
  const [ratingPopupDismissed, setRatingPopupDismissed] = useState(false);

  useEffect(() => {
    if (!customerAuth?.token) return;
    apiFetch("/reviews/unrated", { headers: { Authorization: `Bearer ${customerAuth.token}` } })
      .then((data) => setUnratedQueue(data.unrated || []))
      .catch(() => {});
  }, [customerAuth?.token]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [pendingCheckInCount, setPendingCheckInCount] = useState(0);

  useEffect(() => {
    if (!auth?.token) { setUnreadMessageCount(0); setPendingCheckInCount(0); return; }
    const fetchCounts = () => {
      apiFetch("/conversations/mine", { headers: { Authorization: `Bearer ${auth.token}` } })
        .then((rows) => setUnreadMessageCount(rows.reduce((sum, r) => sum + Number(r.unread_count || 0), 0)))
        .catch(() => {});
      apiFetch("/bookings/me", { headers: { Authorization: `Bearer ${auth.token}` } })
        .then((rows) => setPendingCheckInCount(rows.filter((b) => b.status === "confirmed" && !b.checked_in_at).length))
        .catch(() => {});
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [auth?.token]);
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
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [chatBackView, setChatBackView] = useState("chatInbox"); // where "back" from a chat thread should go
  const [startingChat, setStartingChat] = useState(false);
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
            {checkoutResult === "success" ? "Appointment booked!" : "No charge made"}
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
                              if (n.type === "new_message" && n.conversation_id) {
                                setNotifOpen(false);
                                setActiveConversationId(n.conversation_id);
                                if (role === "owner") {
                                  setOwnerPage("chatThread");
                                } else {
                                  setChatBackView("chatInbox");
                                  setView("chat");
                                }
                              } else if (n.type === "new_message") {
                                // Older notification from before messages linked to a
                                // specific conversation — open the inbox instead of doing nothing.
                                setNotifOpen(false);
                                if (role === "owner") {
                                  setOwnerPage("chatInbox");
                                } else {
                                  setView("chatInbox");
                                }
                              } else if (ownerTypes.includes(n.type)) {
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
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            )}
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
                {role === "customer" && !customerAuth && (
                  <button
                    onClick={() => { setMenuOpen(false); setView("auth"); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm"
                    style={{ color: colors.cream, fontWeight: 700 }}
                  >
                    <LogIn size={16} /> Log in / Sign up
                  </button>
                )}
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
                    {pendingCheckInCount > 0 && (
                      <span
                        className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: colors.gold, color: colors.bg }}
                      >
                        {pendingCheckInCount}
                      </span>
                    )}
                  </button>
                )}
                {((role === "customer" && customerAuth) || (role === "owner" && ownerAuth)) && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      if (role === "owner") setOwnerPage("chatInbox");
                      else setView("chatInbox");
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm"
                    style={{ color: colors.cream }}
                  >
                    <MessageCircle size={16} /> Messages
                    {unreadMessageCount > 0 && (
                      <span
                        className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: colors.gold, color: colors.bg }}
                      >
                        {unreadMessageCount}
                      </span>
                    )}
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
                        localStorage.removeItem("auth");
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
                localStorage.removeItem("auth");
                setOwnerAuth(null);
              }}
              onOpenWallet={() => setOwnerPage("wallet")}
            />
            ) : ownerPage === "chatInbox" ? (
              <ChatInboxView
                token={ownerAuth.token}
                onBack={() => setOwnerPage("dashboard")}
                onOpenConversation={(id) => { setActiveConversationId(id); setOwnerPage("chatThread"); }}
              />
            ) : ownerPage === "chatThread" ? (
              <ChatThreadView
                conversationId={activeConversationId}
                token={ownerAuth.token}
                myRole="owner"
                myUserId={ownerAuth.user?.id}
                onBack={() => setOwnerPage("chatInbox")}
              />
            ) : (
              <OwnerDashboard
                token={ownerAuth.token}
                onOpenChat={(convoId) => {
                  setActiveConversationId(convoId);
                  setOwnerPage("chatThread");
                }}
              />
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
            {view === "chat" && customerAuth && activeConversationId && (
              <ChatThreadView
                conversationId={activeConversationId}
                token={customerAuth.token}
                myRole="customer"
                myUserId={customerAuth.user?.id}
                onBack={() => setView(chatBackView)}
              />
            )}
            {view === "chatInbox" && customerAuth && (
              <ChatInboxView
                token={customerAuth.token}
                onBack={() => setView("home")}
                onOpenConversation={(id) => { setActiveConversationId(id); setChatBackView("chatInbox"); setView("chat"); }}
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
                onOpenSalon={async (salonId) => {
                  try {
                    const salon = await apiFetch(`/salons/${salonId}`);
                    setSelectedSalon(salon);
                    setView("salonDetail");
                  } catch (e) {
                    console.error(e);
                  }
                }}
                onOpenChat={(convoId) => {
                  setActiveConversationId(convoId);
                  setChatBackView("myBookings");
                  setView("chat");
                }}
              />
            )}
            {view === "settings" && (
              <SettingsView
                onBack={() => setView("home")}
                onWatchIntro={() => setShowOnboarding(true)}
                onSendFeedback={() => setView("feedback")}
              />
            )}
            {view === "feedback" && (
              <FeedbackView
                token={auth?.token}
                onBack={() => setView("settings")}
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