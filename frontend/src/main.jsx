import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.jsx";
import AdminApp from "./AdminApp.jsx";
import "./index.css";

// Set VITE_SENTRY_DSN in your deploy environment (Vercel project settings) to start
// receiving crash reports. Sentry silently does nothing if the DSN isn't set, so this
// is safe to ship even before you've created a Sentry account.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Keep this low — we only need enough sessions to catch real problems, not a
    // detailed performance trace of every visit.
    tracesSampleRate: 0.1,
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

const isAdminRoute = window.location.pathname.startsWith("/admin");

// If something crashes anywhere in the app, show a friendly "something went
// wrong" screen with a reload button instead of a blank white page -- and report
// the crash to Sentry (if configured) so Sammy finds out about it.
function CrashFallback({ resetError }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
        fontFamily: "'Baloo 2', sans-serif",
        background: "#FFFFFF",
      }}
    >
      <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#241B14", marginBottom: 8 }}>
        Something went wrong
      </h2>
      <p style={{ color: "#7A6F63", marginBottom: 20, maxWidth: 320 }}>
        This screen hit an unexpected error. Reloading usually fixes it.
      </p>
      <button
        onClick={() => {
          resetError();
          window.location.reload();
        }}
        style={{
          background: "#D9702E",
          color: "#FFFFFF",
          fontWeight: 700,
          padding: "12px 28px",
          borderRadius: 999,
          border: "none",
        }}
      >
        Reload
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={CrashFallback}>
      {isAdminRoute ? <AdminApp /> : <App />}
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
