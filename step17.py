path = "frontend/src/App.jsx"
with open(path, "r") as f:
    src = f.read()

changes = []

# 1. Confirmation screen title — more mature, ties directly to the action taken
old1 = '{checkoutResult === "success" ? "Payment received!" : "No charge made"}'
new1 = '{checkoutResult === "success" ? "Appointment booked!" : "No charge made"}'
if old1 in src:
    assert src.count(old1) == 1
    src = src.replace(old1, new1)
    changes.append("✅ Confirmation screen title now says 'Appointment booked!'")
else:
    changes.append("⏭️  Confirmation screen title already updated")

# 2. Booking status text on My Bookings
old2 = "Payment received — waiting for {b.salon_name} to accept."
new2 = "Booking sent — waiting for {b.salon_name} to accept."
if old2 in src:
    assert src.count(old2) == 1
    src = src.replace(old2, new2)
    changes.append("✅ My Bookings status text now says 'Booking sent'")
else:
    changes.append("⏭️  My Bookings status text already updated")

# 3. Remove Marketplace from hamburger menu
old3 = '''                {((role === "customer" && customerAuth) || (role === "owner" && ownerAuth)) && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      if (role === "owner") setOwnerPage("marketplace");
                      else setView("marketplace");
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm"
                    style={{ color: colors.cream }}
                  >
                    <ShoppingBag size={16} /> Marketplace
                  </button>
                )}
'''
if old3 in src:
    assert src.count(old3) == 1
    src = src.replace(old3, "")
    changes.append("✅ Removed 'Marketplace' from hamburger menu")
else:
    changes.append("⏭️  Hamburger marketplace link already removed")

# 4. Remove owner marketplace route
old4 = '''            ) : ownerPage === "marketplace" ? (
              <MarketplaceView token={ownerAuth.token} onBack={() => setOwnerPage("dashboard")} />
            ) : ('''
new4 = '''            ) : ('''
if old4 in src:
    assert src.count(old4) == 1
    src = src.replace(old4, new4)
    changes.append("✅ Removed owner 'marketplace' page route")
else:
    changes.append("⏭️  Owner marketplace route already removed")

# 5. Remove customer marketplace route
old5 = '''            {view === "marketplace" && customerAuth && (
              <MarketplaceView
                token={customerAuth.token}
                onBack={() => setView("home")}
              />
            )}
'''
if old5 in src:
    assert src.count(old5) == 1
    src = src.replace(old5, "")
    changes.append("✅ Removed customer 'marketplace' view route")
else:
    changes.append("⏭️  Customer marketplace route already removed")

with open(path, "w") as f:
    f.write(src)

for c in changes:
    print(c)
