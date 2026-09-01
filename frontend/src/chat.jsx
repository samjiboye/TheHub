import React, { useState, useRef, useEffect } from "react";
import {
  MapPin, Send, Loader2,
} from "lucide-react";
import { apiFetch } from "./api";
import { Header } from "./shared";
import { colors } from "./theme";

function ChatThreadView({ conversationId, token, myRole, myUserId, onBack }) {
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  const fetchMessages = () => {
    apiFetch(`/conversations/${conversationId}/messages`, { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => {
        setMessages(data.messages);
        setConversation(data.conversation);
        setError(null);
      })
      .catch(() => setError("Couldn't load messages."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 12000);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await apiFetch(`/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: input.trim() }),
      });
      setInput("");
      fetchMessages();
    } catch (e) {
      setError(e.message || "Couldn't send that message.");
    } finally {
      setSending(false);
    }
  };

  const otherName = myRole === "owner" ? conversation?.customer_name : conversation?.salon_name;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: colors.bg }}>
      <Header title={otherName || "Chat"} onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {loading ? (
          <Loader2 size={24} className="animate-spin mx-auto mt-8" color={colors.creamDim} />
        ) : messages.length === 0 ? (
          <p className="text-sm text-center mt-8" style={{ color: colors.creamDim }}>
            No messages yet — say hello!
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === myUserId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[75%] px-4 py-2.5 rounded-2xl text-sm"
                  style={{
                    background: mine ? colors.hairline : colors.panelLight,
                    color: mine ? "#FFFFFF" : colors.cream,
                    border: mine ? "none" : `2px solid ${colors.hairline}`,
                  }}
                >
                  {m.body}
                  <p
                    className="text-[10px] mt-1"
                    style={{ color: mine ? "rgba(255,255,255,0.7)" : colors.creamDim, textAlign: "right" }}
                  >
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      {error && <p className="text-xs px-4" style={{ color: "#E07A5F" }}>{error}</p>}
      <div className="flex gap-2 px-4 py-3" style={{ borderTop: `2px solid ${colors.hairline}` }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message…"
          className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none"
          style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="px-4 rounded-2xl tap-glass"
          style={{ background: colors.hairline, color: "#FFFFFF", opacity: sending || !input.trim() ? 0.5 : 1 }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

// Owner-only inbox: list of chat threads across all their customers, newest
// activity first. Tapping one opens ChatThreadView for that conversation.

function ChatInboxView({ token, onBack, onOpenConversation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/conversations/mine", { headers: { Authorization: `Bearer ${token}` } })
      .then(setConversations)
      .catch(() => setError("Couldn't load your conversations."))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen" style={{ background: colors.bg }}>
      <Header title="Messages" onBack={onBack} />
      <div className="px-4 py-4">
        {loading ? (
          <Loader2 size={24} className="animate-spin mx-auto mt-8" color={colors.creamDim} />
        ) : error ? (
          <p className="text-sm text-center mt-8" style={{ color: "#E07A5F" }}>{error}</p>
        ) : conversations.length === 0 ? (
          <p className="text-sm text-center mt-8" style={{ color: colors.creamDim }}>
            No messages yet. Conversations with clients will show up here.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => onOpenConversation(c.id)}
                className="flex items-center justify-between px-4 py-4 rounded-2xl tap-glass text-left"
                style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}
              >
                <div className="min-w-0 flex-1">
                  <p style={{ color: colors.cream, fontWeight: 700 }} className="text-base">{c.other_name}</p>
                  {c.last_message && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: colors.creamDim }}>{c.last_message}</p>
                  )}
                </div>
                {Number(c.unread_count) > 0 && (
                  <span
                    className="shrink-0 ml-3 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: colors.gold, color: colors.bg }}
                  >
                    {c.unread_count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
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
      const saved = JSON.parse(localStorage.getItem("auth") || localStorage.getItem("customerAuth") || localStorage.getItem("ownerAuth") || "null");
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

// Shared by both customer and owner — a single conversation thread. Polls for
// new messages every 12s instead of using a live connection, which keeps this
// simple and cheap to run; the small delay isn't noticeable for casual chat.

export { ChatThreadView, ChatInboxView, LocationShareBlock };