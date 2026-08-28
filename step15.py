path = "frontend/src/App.jsx"
with open(path, "r") as f:
    src = f.read()

changes = []

# 1. Add onMessage prop to ProfileView
old1 = 'function ProfileView({ salon, onBack, onBook }) {'
new1 = 'function ProfileView({ salon, onBack, onBook, onMessage }) {'
if old1 in src:
    assert src.count(old1) == 1
    src = src.replace(old1, new1)
    changes.append("✅ ProfileView now accepts onMessage prop")
else:
    changes.append("⏭️  ProfileView already updated")

# 2. Add "Message this salon" button
old2 = '''        {salon.distance != null && (
          <div className="flex items-center gap-2 mt-3 text-base" style={{ color: textColorDim }}>
            <MapPin size={18} />{salon.distance} mi away
          </div>
        )}
'''
new2 = '''        {salon.distance != null && (
          <div className="flex items-center gap-2 mt-3 text-base" style={{ color: textColorDim }}>
            <MapPin size={18} />{salon.distance} mi away
          </div>
        )}

        {onMessage && (
          <button
            onClick={onMessage}
            className="flex items-center gap-2 mt-4 px-4 py-2.5 rounded-full text-sm font-semibold tap-glass"
            style={{ background: colors.panelLight, color: textColor, border: `2px solid ${heroTheme ? "rgba(255,255,255,0.4)" : colors.hairline}` }}
          >
            <MessageCircle size={16} /> Message this salon
          </button>
        )}
'''
if old2 in src:
    assert src.count(old2) == 1
    src = src.replace(old2, new2)
    changes.append("✅ Added 'Message this salon' button")
else:
    changes.append("⏭️  Message button already added")

# 3. Insert ChatThreadView + ChatInboxView components
old3 = '''function MyBookingsView({ token, onBack }) {'''
new3 = '''// Shared by both customer and owner — a single conversation thread. Polls for
// new messages every 12s instead of using a live connection, which keeps this
// simple and cheap to run; the small delay isn't noticeable for casual chat.
function ChatThreadView({ conversationId, token, myRole, onBack }) {
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
            const mine = m.sender_role === myRole;
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

function MyBookingsView({ token, onBack }) {'''
if old3 in src:
    assert src.count(old3) == 1
    src = src.replace(old3, new3)
    changes.append("✅ Added ChatThreadView and ChatInboxView components")
else:
    changes.append("⏭️  Chat components already added")

# 4. Add chat-related state
old4 = 'const [checkoutResult, setCheckoutResult] = useState(null); // "success" | "cancelled" | null'
new4 = '''const [checkoutResult, setCheckoutResult] = useState(null); // "success" | "cancelled" | null
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [chatBackView, setChatBackView] = useState("chatInbox"); // where "back" from a chat thread should go
  const [startingChat, setStartingChat] = useState(false);'''
if old4 in src:
    assert src.count(old4) == 1
    src = src.replace(old4, new4)
    changes.append("✅ Added chat state (activeConversationId, chatBackView, startingChat)")
else:
    changes.append("⏭️  Chat state already added")

# 5. Add "Messages" hamburger link
old5 = '''                    <CalendarCheck size={16} /> My bookings
                  </button>
                )}
                {((role === "customer" && customerAuth) || (role === "owner" && ownerAuth)) && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      if (role === "owner") setOwnerPage("marketplace");'''
new5 = '''                    <CalendarCheck size={16} /> My bookings
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
                  </button>
                )}
                {((role === "customer" && customerAuth) || (role === "owner" && ownerAuth)) && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      if (role === "owner") setOwnerPage("marketplace");'''
if old5 in src:
    assert src.count(old5) == 1
    src = src.replace(old5, new5)
    changes.append("✅ Added 'Messages' to hamburger menu")
else:
    changes.append("⏭️  Hamburger Messages link already added")

# 6. Add owner chat routes
old6 = '''              onOpenWallet={() => setOwnerPage("wallet")}
            />
            ) : ownerPage === "marketplace" ? ('''
new6 = '''              onOpenWallet={() => setOwnerPage("wallet")}
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
                onBack={() => setOwnerPage("chatInbox")}
              />
            ) : ownerPage === "marketplace" ? ('''
if old6 in src:
    assert src.count(old6) == 1
    src = src.replace(old6, new6)
    changes.append("✅ Added owner chatInbox/chatThread routes")
else:
    changes.append("⏭️  Owner chat routes already added")

# 7. Wire onMessage into ProfileView call site
old7 = '''            {view === "salonDetail" && selectedSalon && (
              <ProfileView
                salon={selectedSalon}
                onBack={() => setView("home")}
                onBook={(svc) => { setSelectedService(svc); setView(customerAuth ? "booking" : "auth"); }}
              />
            )}'''
new7 = '''            {view === "salonDetail" && selectedSalon && (
              <ProfileView
                salon={selectedSalon}
                onBack={() => setView("home")}
                onBook={(svc) => { setSelectedService(svc); setView(customerAuth ? "booking" : "auth"); }}
                onMessage={
                  customerAuth
                    ? async () => {
                        if (startingChat) return;
                        setStartingChat(true);
                        try {
                          const convo = await apiFetch("/conversations/start", {
                            method: "POST",
                            headers: { Authorization: `Bearer ${customerAuth.token}` },
                            body: JSON.stringify({ salon_id: selectedSalon.id }),
                          });
                          setActiveConversationId(convo.id);
                          setChatBackView("salonDetail");
                          setView("chat");
                        } catch (e) {
                          console.error(e);
                        } finally {
                          setStartingChat(false);
                        }
                      }
                    : () => setView("auth")
                }
              />
            )}'''
if old7 in src:
    assert src.count(old7) == 1
    src = src.replace(old7, new7)
    changes.append("✅ Wired 'Message this salon' button to start a conversation")
else:
    changes.append("⏭️  Message button already wired")

# 8. Add customer chat + chatInbox routes
old8 = '''            {view === "booking" && selectedSalon && selectedService && customerAuth && (
              <BookingView
                salon={selectedSalon}
                service={selectedService}
                token={customerAuth.token}
                onBack={() => setView("salonDetail")}
                onPaidWithWallet={() => setCheckoutResult("success")}
              />
            )}'''
new8 = '''            {view === "booking" && selectedSalon && selectedService && customerAuth && (
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
                onBack={() => setView(chatBackView)}
              />
            )}
            {view === "chatInbox" && customerAuth && (
              <ChatInboxView
                token={customerAuth.token}
                onBack={() => setView("home")}
                onOpenConversation={(id) => { setActiveConversationId(id); setChatBackView("chatInbox"); setView("chat"); }}
              />
            )}'''
if old8 in src:
    assert src.count(old8) == 1
    src = src.replace(old8, new8)
    changes.append("✅ Added customer chat and chatInbox routes")
else:
    changes.append("⏭️  Customer chat routes already added")

with open(path, "w") as f:
    f.write(src)

for c in changes:
    print(c)
