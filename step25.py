changes = []

schema_path = "backend/db/schema.sql"
with open(schema_path, "r") as f:
    schema = f.read()

new_sql = "\nALTER TABLE notifications ADD COLUMN IF NOT EXISTS conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL;\n"
if "notifications ADD COLUMN IF NOT EXISTS conversation_id" not in schema:
    schema = schema.rstrip("\n") + "\n" + new_sql
    with open(schema_path, "w") as f:
        f.write(schema)
    changes.append("✅ schema.sql — notifications can now link to a conversation")
else:
    changes.append("⏭️  conversation_id column already added")

notify_path = "backend/lib/notify.js"
with open(notify_path, "r") as f:
    notify = f.read()

old_notify = '''async function notifyUser(userId, { type, title, body, bookingId = null }) {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, title, body, booking_id) VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, body || null, bookingId]
    );'''
new_notify = '''async function notifyUser(userId, { type, title, body, bookingId = null, conversationId = null }) {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, title, body, booking_id, conversation_id) VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, type, title, body || null, bookingId, conversationId]
    );'''
if old_notify in notify:
    assert notify.count(old_notify) == 1
    notify = notify.replace(old_notify, new_notify)
    with open(notify_path, "w") as f:
        f.write(notify)
    changes.append("✅ notify.js — notifications can now carry a conversationId")
else:
    changes.append("⏭️  notify.js already updated")

conv_path = "backend/routes/conversations.js"
with open(conv_path, "r") as f:
    conv = f.read()

old_notify_call = '''    await notifyUser(recipientId, {
      type: "new_message",
      title: req.user.role === "customer" ? "New message from a client" : `New message from ${convo.salon_name}`,
      body: body.trim().length > 80 ? body.trim().slice(0, 80) + "…" : body.trim(),
    });'''
new_notify_call = '''    await notifyUser(recipientId, {
      type: "new_message",
      title: req.user.role === "customer" ? "New message from a client" : `New message from ${convo.salon_name}`,
      body: body.trim().length > 80 ? body.trim().slice(0, 80) + "…" : body.trim(),
      conversationId: convo.id,
    });'''
if old_notify_call in conv:
    assert conv.count(old_notify_call) == 1
    conv = conv.replace(old_notify_call, new_notify_call)
    with open(conv_path, "w") as f:
        f.write(conv)
    changes.append("✅ conversations.js — new-message notifications now include the conversation ID")
else:
    changes.append("⏭️  conversations.js already updated")

app_path = "frontend/src/App.jsx"
with open(app_path, "r") as f:
    src = f.read()

old_click_handler = '''                              if (ownerTypes.includes(n.type)) {
                                setNotifOpen(false);
                                setRole("owner");
                                setOwnerPage("dashboard");
                              } else if (customerBookingTypes.includes(n.type)) {
                                setNotifOpen(false);
                                setRole("customer");
                                setView("myBookings");
                              }'''
new_click_handler = '''                              if (n.type === "new_message" && n.conversation_id) {
                                setNotifOpen(false);
                                setActiveConversationId(n.conversation_id);
                                if (role === "owner") {
                                  setOwnerPage("chatThread");
                                } else {
                                  setChatBackView("chatInbox");
                                  setView("chat");
                                }
                              } else if (ownerTypes.includes(n.type)) {
                                setNotifOpen(false);
                                setRole("owner");
                                setOwnerPage("dashboard");
                              } else if (customerBookingTypes.includes(n.type)) {
                                setNotifOpen(false);
                                setRole("customer");
                                setView("myBookings");
                              }'''
if old_click_handler in src:
    assert src.count(old_click_handler) == 1
    src = src.replace(old_click_handler, new_click_handler)
    changes.append("✅ App.jsx — tapping a message notification now opens that chat directly")
else:
    changes.append("⏭️  Notification click handler already updated")

with open(app_path, "w") as f:
    f.write(src)

for c in changes:
    print(c)
