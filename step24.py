path = "frontend/src/App.jsx"
with open(path, "r") as f:
    src = f.read()

changes = []

old_sig = "function ChatThreadView({ conversationId, token, myRole, onBack }) {"
new_sig = "function ChatThreadView({ conversationId, token, myRole, myUserId, onBack }) {"
if old_sig in src:
    assert src.count(old_sig) == 1
    src = src.replace(old_sig, new_sig)
    changes.append("✅ ChatThreadView now accepts myUserId")
else:
    changes.append("⏭️  ChatThreadView signature already updated")

old_mine = "            const mine = m.sender_role === myRole;"
new_mine = "            const mine = m.sender_id === myUserId;"
if old_mine in src:
    assert src.count(old_mine) == 1
    src = src.replace(old_mine, new_mine)
    changes.append("✅ Message bubbles now split by actual sender ID, not role")
else:
    changes.append("⏭️  Mine-check already fixed")

old_owner_thread = '''              <ChatThreadView
                conversationId={activeConversationId}
                token={ownerAuth.token}
                myRole="owner"
                onBack={() => setOwnerPage("chatInbox")}
              />'''
new_owner_thread = '''              <ChatThreadView
                conversationId={activeConversationId}
                token={ownerAuth.token}
                myRole="owner"
                myUserId={ownerAuth.user?.id}
                onBack={() => setOwnerPage("chatInbox")}
              />'''
if old_owner_thread in src:
    assert src.count(old_owner_thread) == 1
    src = src.replace(old_owner_thread, new_owner_thread)
    changes.append("✅ Owner's chat thread now passes myUserId")
else:
    changes.append("⏭️  Owner chat thread already wired")

old_customer_thread = '''              <ChatThreadView
                conversationId={activeConversationId}
                token={customerAuth.token}
                myRole="customer"
                onBack={() => setView(chatBackView)}
              />'''
new_customer_thread = '''              <ChatThreadView
                conversationId={activeConversationId}
                token={customerAuth.token}
                myRole="customer"
                myUserId={customerAuth.user?.id}
                onBack={() => setView(chatBackView)}
              />'''
if old_customer_thread in src:
    assert src.count(old_customer_thread) == 1
    src = src.replace(old_customer_thread, new_customer_thread)
    changes.append("✅ Customer's chat thread now passes myUserId")
else:
    changes.append("⏭️  Customer chat thread already wired")

with open(path, "w") as f:
    f.write(src)

for c in changes:
    print(c)
