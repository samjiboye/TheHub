path = "frontend/src/App.jsx"
with open(path, "r") as f:
    src = f.read()

changes = []

old_anchor = '''      setCheckInErrors((prev) => ({ ...prev, [bookingId]: e.message || "That code didn't work — try again." }));
    } finally {
      setCheckInSubmittingId(null);
    }
  }

  return ('''
new_anchor = '''      setCheckInErrors((prev) => ({ ...prev, [bookingId]: e.message || "That code didn't work — try again." }));
    } finally {
      setCheckInSubmittingId(null);
    }
  }

  // Grouped so pending (awaiting acceptance or awaiting check-in) and
  // completed bookings are easy to browse separately, instead of one long
  // mixed list.
  const bookingSections = [
    { label: "Pending", items: bookings.filter((b) => b.status === "confirmed") },
    { label: "Completed", items: bookings.filter((b) => b.status === "completed") },
    { label: "Cancelled", items: bookings.filter((b) => b.status === "cancelled") },
  ].filter((section) => section.items.length > 0);

  return ('''
if old_anchor in src:
    assert src.count(old_anchor) == 1
    src = src.replace(old_anchor, new_anchor)
    changes.append("✅ Added Pending / Completed / Cancelled booking grouping")
else:
    changes.append("⏭️  Booking grouping already added")

old_open = '''        <div className="flex flex-col gap-2 mt-2">
          {bookings.map((b) => ('''
new_open = '''        {bookingSections.map((section) => (
          <div key={section.label} className="mt-4">
            <h3 className="text-sm font-bold mb-2" style={{ color: colors.creamDim }}>
              {section.label} ({section.items.length})
            </h3>
            <div className="flex flex-col gap-2">
              {section.items.map((b) => ('''
if old_open in src:
    assert src.count(old_open) == 1
    src = src.replace(old_open, new_open)
    changes.append("✅ Opened section wrapper around booking cards")
else:
    changes.append("⏭️  Section wrapper opening already added")

old_close = '''            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsView({ onBack, onWatchIntro }) {'''
new_close = '''            </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsView({ onBack, onWatchIntro }) {'''
if old_close in src:
    assert src.count(old_close) == 1
    src = src.replace(old_close, new_close)
    changes.append("✅ Closed section wrapper around booking cards")
else:
    changes.append("⏭️  Section wrapper closing already added")

with open(path, "w") as f:
    f.write(src)

for c in changes:
    print(c)
