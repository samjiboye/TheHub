path = "frontend/src/App.jsx"
with open(path, "r") as f:
    src = f.read()

changes = []

old_fn = '''  async function openChatFor(booking) {
    try {
      const convo = await apiFetch("/conversations/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ salon_id: booking.salon_id }),
      });
      onOpenChatProp && onOpenChatProp(convo.id);
    } catch (e) {
      console.error(e);
    }
  }
  const onOpenChat = onOpenChatProp ? openChatFor : null;'''
new_fn = '''  const [openingChatId, setOpeningChatId] = useState(null);
  const [openChatErrors, setOpenChatErrors] = useState({});

  async function openChatFor(booking) {
    setOpeningChatId(booking.id);
    setOpenChatErrors((prev) => ({ ...prev, [booking.id]: null }));
    try {
      const convo = await apiFetch("/conversations/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ salon_id: booking.salon_id }),
      });
      onOpenChatProp && onOpenChatProp(convo.id);
    } catch (e) {
      setOpenChatErrors((prev) => ({ ...prev, [booking.id]: e.message || "Couldn't open this chat." }));
    } finally {
      setOpeningChatId(null);
    }
  }
  const onOpenChat = onOpenChatProp ? openChatFor : null;'''
if old_fn in src:
    assert src.count(old_fn) == 1
    src = src.replace(old_fn, new_fn)
    changes.append("✅ Added loading + error state so we can actually see what happens on tap")
else:
    changes.append("⏭️  Chat loading/error state already added")

old_button = '''                {onOpenChat && (
                  <button
                    onClick={() => onOpenChat(b)}
                    className="shrink-0 p-2 rounded-full tap-glass"
                    style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}` }}
                    aria-label="Message this salon"
                  >
                    <MessageCircle size={16} color={colors.cream} />
                  </button>
                )}
              </div>'''
new_button = '''                {onOpenChat && (
                  <button
                    onClick={() => onOpenChat(b)}
                    disabled={openingChatId === b.id}
                    className="shrink-0 p-2 rounded-full tap-glass"
                    style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}` }}
                    aria-label="Message this salon"
                  >
                    {openingChatId === b.id ? (
                      <Loader2 size={16} className="animate-spin" color={colors.cream} />
                    ) : (
                      <MessageCircle size={16} color={colors.cream} />
                    )}
                  </button>
                )}
              </div>
              {openChatErrors[b.id] && (
                <p className="text-xs mt-1" style={{ color: "#E07A5F" }}>{openChatErrors[b.id]}</p>
              )}'''
if old_button in src:
    assert src.count(old_button) == 1
    src = src.replace(old_button, new_button)
    changes.append("✅ Message button now shows a spinner while connecting, and any real error underneath")
else:
    changes.append("⏭️  Message button loading/error UI already added")

with open(path, "w") as f:
    f.write(src)

for c in changes:
    print(c)
