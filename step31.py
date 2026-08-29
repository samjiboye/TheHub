path = "frontend/src/App.jsx"
with open(path, "r") as f:
    src = f.read()

changes = []

old_derived = '''  const [unreadCount, setUnreadCount] = useState(0);
  const unreadMessageCount = notifications.filter((n) => n.type === "new_message" && !n.read).length;'''
new_derived = '''  const [unreadCount, setUnreadCount] = useState(0);
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
  }, [auth?.token]);'''
if old_derived in src:
    assert src.count(old_derived) == 1
    src = src.replace(old_derived, new_derived)
    changes.append("✅ Added live-polled unread message and pending check-in counts")
else:
    changes.append("⏭️  Live counts already added")

old_bookings_item = '''                    <CalendarCheck size={16} /> My bookings
                  </button>
                )}'''
new_bookings_item = '''                    <CalendarCheck size={16} /> My bookings
                    {pendingCheckInCount > 0 && (
                      <span
                        className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: colors.gold, color: colors.bg }}
                      >
                        {pendingCheckInCount}
                      </span>
                    )}
                  </button>
                )}'''
if old_bookings_item in src:
    assert src.count(old_bookings_item) == 1
    src = src.replace(old_bookings_item, new_bookings_item)
    changes.append("✅ My bookings menu item now shows a pending-check-in count badge")
else:
    changes.append("⏭️  My bookings badge already added")

with open(path, "w") as f:
    f.write(src)

for c in changes:
    print(c)
