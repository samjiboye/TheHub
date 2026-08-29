path = "frontend/src/App.jsx"
with open(path, "r") as f:
    src = f.read()

changes = []

old_click = '''                              if (n.type === "new_message" && n.conversation_id) {
                                setNotifOpen(false);
                                setActiveConversationId(n.conversation_id);
                                if (role === "owner") {
                                  setOwnerPage("chatThread");
                                } else {
                                  setChatBackView("chatInbox");
                                  setView("chat");
                                }
                              } else if (ownerTypes.includes(n.type)) {'''
new_click = '''                              if (n.type === "new_message" && n.conversation_id) {
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
                              } else if (ownerTypes.includes(n.type)) {'''
if old_click in src:
    assert src.count(old_click) == 1
    src = src.replace(old_click, new_click)
    changes.append("✅ Older message notifications now open the inbox instead of doing nothing")
else:
    changes.append("⏭️  Notification fallback already added")

old_state = '''  const [unreadCount, setUnreadCount] = useState(0);'''
new_state = '''  const [unreadCount, setUnreadCount] = useState(0);
  const unreadMessageCount = notifications.filter((n) => n.type === "new_message" && !n.read).length;'''
if old_state in src:
    assert src.count(old_state) == 1
    src = src.replace(old_state, new_state)
    changes.append("✅ Added unreadMessageCount derived from notifications")
else:
    changes.append("⏭️  unreadMessageCount already added")

old_menu_item = '''                    <MessageCircle size={16} /> Messages
                  </button>
                )}'''
new_menu_item = '''                    <MessageCircle size={16} /> Messages
                    {unreadMessageCount > 0 && (
                      <span
                        className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: colors.gold, color: colors.bg }}
                      >
                        {unreadMessageCount}
                      </span>
                    )}
                  </button>
                )}'''
if old_menu_item in src:
    assert src.count(old_menu_item) == 1
    src = src.replace(old_menu_item, new_menu_item)
    changes.append("✅ Messages menu item now shows an unread count badge")
else:
    changes.append("⏭️  Messages badge already added")

with open(path, "w") as f:
    f.write(src)

for c in changes:
    print(c)
