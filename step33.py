path = "frontend/src/App.jsx"
with open(path, "r") as f:
    src = f.read()

changes = []

old_state_anchor = '''  const [checkInInputs, setCheckInInputs] = useState({}); // bookingId -> code string'''
new_state_anchor = '''  const [activeBookingTab, setActiveBookingTab] = useState("Pending");
  const [checkInInputs, setCheckInInputs] = useState({}); // bookingId -> code string'''
if old_state_anchor in src:
    assert src.count(old_state_anchor) == 1
    src = src.replace(old_state_anchor, new_state_anchor)
    changes.append("✅ Added activeBookingTab state")
else:
    changes.append("⏭️  Tab state already added")

old_sections = '''  // Grouped so pending (awaiting acceptance or awaiting check-in) and
  // completed bookings are easy to browse separately, instead of one long
  // mixed list.
  const bookingSections = [
    { label: "Pending", items: bookings.filter((b) => b.status === "confirmed") },
    { label: "Completed", items: bookings.filter((b) => b.status === "completed") },
    { label: "Cancelled", items: bookings.filter((b) => b.status === "cancelled") },
  ].filter((section) => section.items.length > 0);'''
new_sections = '''  // Grouped so pending (awaiting acceptance or awaiting check-in) and
  // completed bookings are easy to browse separately, as switchable tabs
  // instead of one long mixed list or a long stacked scroll.
  const bookingSections = [
    { label: "Pending", items: bookings.filter((b) => b.status === "confirmed") },
    { label: "Completed", items: bookings.filter((b) => b.status === "completed") },
    { label: "Cancelled", items: bookings.filter((b) => b.status === "cancelled") },
  ];
  const activeSection = bookingSections.find((s) => s.label === activeBookingTab) || bookingSections[0];'''
if old_sections in src:
    assert src.count(old_sections) == 1
    src = src.replace(old_sections, new_sections)
    changes.append("✅ Booking groups now always computed (tabs stay stable) with an active-tab selector")
else:
    changes.append("⏭️  Booking groups already updated")

old_render = '''        {bookingSections.map((section) => (
          <div key={section.label} className="mt-4">
            <h3 className="text-sm font-bold mb-2" style={{ color: colors.creamDim }}>
              {section.label} ({section.items.length})
            </h3>
            <div className="flex flex-col gap-2">
              {section.items.map((b) => ('''
new_render = '''        {bookings.length > 0 && (
          <div className="flex gap-2 mt-4">
            {bookingSections.map((section) => (
              <button
                key={section.label}
                onClick={() => setActiveBookingTab(section.label)}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold tap-glass"
                style={{
                  background: activeBookingTab === section.label ? colors.hairline : colors.panelLight,
                  color: activeBookingTab === section.label ? "#FFFFFF" : colors.creamDim,
                  border: `2px solid ${colors.hairline}`,
                }}
              >
                {section.label} ({section.items.length})
              </button>
            ))}
          </div>
        )}
        {bookings.length > 0 && activeSection.items.length === 0 && (
          <p className="text-sm py-6 text-center" style={{ color: colors.creamDim }}>
            Nothing in {activeSection.label.toLowerCase()} yet.
          </p>
        )}
        <div className="flex flex-col gap-2 mt-3">
          {activeSection.items.map((b) => ('''
if old_render in src:
    assert src.count(old_render) == 1
    src = src.replace(old_render, new_render)
    changes.append("✅ Replaced stacked sections with a side-by-side tab switcher")
else:
    changes.append("⏭️  Tab render already applied")

old_close = '''            </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsView({ onBack, onWatchIntro }) {'''
new_close = '''            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsView({ onBack, onWatchIntro }) {'''
if old_close in src:
    assert src.count(old_close) == 1
    src = src.replace(old_close, new_close)
    changes.append("✅ Fixed closing tags to match the simplified single-list structure")
else:
    changes.append("⏭️  Closing tags already fixed")

with open(path, "w") as f:
    f.write(src)

for c in changes:
    print(c)
