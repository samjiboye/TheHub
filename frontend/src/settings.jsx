import React, { useState, useEffect } from "react";
import * as Sentry from "@sentry/react";
import {
  Loader2, Settings, MessageSquare,
} from "lucide-react";
import { apiFetch } from "./api";
import { Header } from "./shared";
import { FONT_DISPLAY, NEUTRAL_HERO_GRADIENT, colors } from "./theme";

function SettingsView({ onBack, onWatchIntro, onSendFeedback }) {
  const saved = JSON.parse(localStorage.getItem("auth") || localStorage.getItem("customerAuth") || localStorage.getItem("ownerAuth") || "null");
  const user = saved?.user || {};
  const ownerToken = saved?.token;

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
        {onSendFeedback && (
          <button
            onClick={onSendFeedback}
            className="px-4 py-3 rounded-xl text-sm font-semibold text-left tap-glass flex items-center gap-2"
            style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
          >
            <MessageSquare size={16} /> Send feedback
          </button>
        )}
        <a
          href="/terms.html"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-3 rounded-xl text-sm font-semibold text-left tap-glass"
          style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
        >
          Terms of Service
        </a>
        <a
          href="/privacy.html"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-3 rounded-xl text-sm font-semibold text-left tap-glass"
          style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
        >
          Privacy Policy
        </a>
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

function FeedbackView({ token, onBack }) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/feedback", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: message.trim() }),
      });
      setSent(true);
      setMessage("");
    } catch (err) {
      setError(err.message || "Couldn't send that -- please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-8 transition-[background] duration-500" style={{ background: NEUTRAL_HERO_GRADIENT, minHeight: "100vh" }}>
      <Header title="Send feedback" onBack={onBack} />
      <div className="px-4 mt-4 flex flex-col gap-3 max-w-xl mx-auto w-full">
        {sent ? (
          <div className="rounded-2xl px-4 py-8 flex flex-col items-center text-center gap-2" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>
            <p style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700, fontSize: "1.1rem" }}>Thanks!</p>
            <p className="text-sm" style={{ color: colors.creamDim }}>Your feedback has been sent.</p>
            <button
              onClick={() => setSent(false)}
              className="mt-3 px-5 py-2.5 rounded-full text-sm font-semibold tap-glass"
              style={{ background: colors.hairline, color: "#FFFFFF" }}
            >
              Send another
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm" style={{ color: colors.creamDim }}>
              Found a bug, or wish TheHub had something it doesn't yet? Tell us here.
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What's on your mind?"
              rows={6}
              maxLength={2000}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
            />
            {error && <p className="text-sm" style={{ color: "#E07A5F" }}>{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={!message.trim() || submitting}
              className="py-3 rounded-full text-sm font-bold tap-glass flex items-center justify-center gap-2"
              style={{ background: colors.hairline, color: "#FFFFFF", opacity: !message.trim() || submitting ? 0.6 : 1 }}
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : "Send"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export { SettingsView, FeedbackView };