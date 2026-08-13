#!/usr/bin/env python3
import os, sys

def edit(path, replacements, label):
    if not os.path.exists(path):
        print(f"FAILED: {label} - file not found: {path}")
        sys.exit(1)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    for old, new in replacements:
        count = content.count(old)
        if count != 1:
            print(f"FAILED: {label} - anchor not found exactly once (found {count}) in {path}")
            print("----- anchor -----")
            print(old[:300])
            print("------------------")
            sys.exit(1)
        content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"OK: {label}")

schema_path = "backend/db/schema.sql"
with open(schema_path, "r", encoding="utf-8") as f:
    schema_content = f.read()
marker = "-- Wallet-funded marketplace purchases reference an order instead of a booking."
if marker in schema_content:
    print("OK: schema.sql - order_id migration already present, skipping")
else:
    schema_content += (
        "\n\n" + marker + "\n"
        "ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS order_id INTEGER REFERENCES product_orders(id) ON DELETE SET NULL;\n"
    )
    with open(schema_path, "w", encoding="utf-8") as f:
        f.write(schema_content)
    print("OK: schema.sql - order_id migration appended")

edit(
    "backend/lib/wallet.js",
    [(
        'async function debitWallet(userId, amount, { bookingId = null } = {}) {\n'
        '  const result = await db.query(\n'
        '    "UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2 AND wallet_balance >= $1 RETURNING wallet_balance",\n'
        '    [amount, userId]\n'
        '  );\n'
        '  if (result.rowCount === 0) return false;\n'
        '  await db.query(\n'
        '    `INSERT INTO wallet_transactions (user_id, type, amount, booking_id, status) VALUES ($1, \'debit\', $2, $3, \'success\')`,\n'
        '    [userId, amount, bookingId]\n'
        '  );\n'
        '  return true;\n'
        '}',
        'async function debitWallet(userId, amount, { bookingId = null, orderId = null } = {}) {\n'
        '  const result = await db.query(\n'
        '    "UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2 AND wallet_balance >= $1 RETURNING wallet_balance",\n'
        '    [amount, userId]\n'
        '  );\n'
        '  if (result.rowCount === 0) return false;\n'
        '  await db.query(\n'
        '    `INSERT INTO wallet_transactions (user_id, type, amount, booking_id, order_id, status) VALUES ($1, \'debit\', $2, $3, $4, \'success\')`,\n'
        '    [userId, amount, bookingId, orderId]\n'
        '  );\n'
        '  return true;\n'
        '}',
    )],
    "wallet.js: debitWallet accepts orderId",
)

edit(
    "backend/lib/completeBooking.js",
    [
        (
            'const REFERRAL_REFERRER_POINTS = 60; // \u2248\u20a6200\n'
            'const REFERRAL_REFERRED_POINTS = 30; // \u2248\u20a6100',
            'const REFERRAL_REFERRER_POINTS = 60; // \u2248\u20a6200\n'
            'const REFERRAL_REFERRED_POINTS = 30; // \u2248\u20a6100\n'
            '// Owner-to-owner referrals pay more than customer ones since bringing a whole\n'
            '// new salon onto the platform is worth more than one customer - but the reward\n'
            '// never shows side-by-side with the customer numbers, so there\'s no framing\n'
            '// that nudges people to register as an owner just to chase a bigger number.\n'
            'const OWNER_REFERRAL_REFERRER_POINTS = 100; // \u2248\u20a6330\n'
            'const OWNER_REFERRAL_REFERRED_POINTS = 50; // \u2248\u20a6165',
        ),
        (
            '  } catch (err) {\n'
            '    console.error(`Referral bonus tracking failed for booking #${booking.id}:`, err);\n'
            '  }\n'
            '}\n\n'
            'module.exports = { completeBooking };',
            '  } catch (err) {\n'
            '    console.error(`Referral bonus tracking failed for booking #${booking.id}:`, err);\n'
            '  }\n\n'
            '  // Owner-to-owner referral bonus: fires once, only when the referred owner\'s\n'
            '  // salon gets its first-ever completed booking - i.e. once they\'ve actually\n'
            '  // brought in real, paying business, not just registered an account.\n'
            '  try {\n'
            '    if (salon) {\n'
            '      const { rows: ownerRows } = await db.query(\n'
            '        "SELECT referred_by, referral_bonus_awarded FROM users WHERE id = $1",\n'
            '        [salon.owner_id]\n'
            '      );\n'
            '      const ownerRow = ownerRows[0];\n'
            '      if (ownerRow?.referred_by && !ownerRow.referral_bonus_awarded) {\n'
            '        const { rows: salonCountRows } = await db.query(\n'
            '          "SELECT COUNT(*) AS count FROM bookings WHERE salon_id = $1 AND status = \'completed\'",\n'
            '          [salon.id]\n'
            '        );\n'
            '        if (Number(salonCountRows[0].count) === 1) {\n'
            '          await db.query("UPDATE users SET referral_bonus_awarded = true WHERE id = $1", [salon.owner_id]);\n'
            '          await addLoyaltyPoints(salon.owner_id, OWNER_REFERRAL_REFERRED_POINTS, { bookingId: booking.id });\n'
            '          await addLoyaltyPoints(ownerRow.referred_by, OWNER_REFERRAL_REFERRER_POINTS, { bookingId: booking.id });\n'
            '          await notifyUser(salon.owner_id, {\n'
            '            type: "referral_bonus",\n'
            '            title: "Referral bonus! \U0001f381",\n'
            '            body: `You earned ${OWNER_REFERRAL_REFERRED_POINTS} loyalty points for your salon\'s first completed booking.`,\n'
            '            bookingId: booking.id,\n'
            '          });\n'
            '          await notifyUser(ownerRow.referred_by, {\n'
            '            type: "referral_bonus",\n'
            '            title: "The salon you referred just booked! \U0001f389",\n'
            '            body: `A salon you referred completed its first booking \u2014 you earned ${OWNER_REFERRAL_REFERRER_POINTS} loyalty points.`,\n'
            '            bookingId: booking.id,\n'
            '          });\n'
            '        }\n'
            '      }\n'
            '    }\n'
            '  } catch (err) {\n'
            '    console.error(`Owner referral bonus tracking failed for booking #${booking.id}:`, err);\n'
            '  }\n'
            '}\n\n'
            'module.exports = { completeBooking };',
        ),
    ],
    "completeBooking.js: owner-to-owner referral bonus",
)

edit(
    "backend/routes/marketplaceOrders.js",
    [
        (
            'const { requireAuth, requireAdmin } = require("../middleware/auth");\n'
            'const { notifyUser } = require("../lib/notify");',
            'const { requireAuth, requireAdmin } = require("../middleware/auth");\n'
            'const { notifyUser } = require("../lib/notify");\n'
            'const { debitWallet, getBalance } = require("../lib/wallet");',
        ),
        (
            '// POST /orders/checkout - body: { items: [{product_id, quantity}], delivery_address, delivery_state, delivery_city, delivery_phone }\n'
            'router.post("/checkout", requireAuth, async (req, res) => {\n'
            '  const { items, delivery_address, delivery_state, delivery_city, delivery_phone } = req.body;',
            '// POST /orders/checkout - body: { items: [{product_id, quantity}], delivery_address, delivery_state, delivery_city, delivery_phone, payment_method }\n'
            '// payment_method is "paystack" (default) or "wallet" - lets accumulated loyalty/referral\n'
            '// points (already convertible to wallet balance) be spent directly on marketplace products.\n'
            'router.post("/checkout", requireAuth, async (req, res) => {\n'
            '  const { items, delivery_address, delivery_state, delivery_city, delivery_phone, payment_method } = req.body;',
        ),
        (
            '    try {\n'
            '      const transaction = await paystack.post("/transaction/initialize", {\n'
            '        email: req.user.email,\n'
            '        amount: Math.round(total * 100),\n'
            '        currency: CURRENCY,\n'
            '        metadata: { order_id: orderId },\n'
            '        callback_url: `${FRONTEND_URL}/?order_success=1&order_id=${orderId}`,\n'
            '      });\n\n'
            '      await db.query("UPDATE product_orders SET paystack_reference = $1 WHERE id = $2", [transaction.reference, orderId]);\n'
            '      res.json({ url: transaction.authorization_url, order_id: orderId });\n'
            '    } catch (err) {\n'
            '      console.error(err);\n'
            '      await db.query("UPDATE product_orders SET status = \'cancelled\' WHERE id = $1", [orderId]);\n'
            '      res.status(500).json({ error: "Couldn\'t start checkout. Check PAYSTACK_SECRET_KEY is set." });\n'
            '    }',
            '    if (payment_method === "wallet") {\n'
            '      const balance = await getBalance(req.user.id);\n'
            '      if (balance < total) {\n'
            '        await db.query("UPDATE product_orders SET status = \'cancelled\' WHERE id = $1", [orderId]);\n'
            '        return res.status(400).json({ error: `Your wallet balance (\u20a6${balance.toLocaleString()}) doesn\'t cover this order (\u20a6${total.toLocaleString()}).`, balance });\n'
            '      }\n'
            '      const paid = await debitWallet(req.user.id, total, { orderId });\n'
            '      if (!paid) {\n'
            '        await db.query("UPDATE product_orders SET status = \'cancelled\' WHERE id = $1", [orderId]);\n'
            '        return res.status(400).json({ error: "Couldn\'t debit your wallet \u2014 try again." });\n'
            '      }\n'
            '      await db.query("UPDATE product_orders SET payment_status = \'paid\' WHERE id = $1", [orderId]);\n'
            '      res.json({ paidWithWallet: true, order_id: orderId });\n'
            '      return;\n'
            '    }\n\n'
            '    try {\n'
            '      const transaction = await paystack.post("/transaction/initialize", {\n'
            '        email: req.user.email,\n'
            '        amount: Math.round(total * 100),\n'
            '        currency: CURRENCY,\n'
            '        metadata: { order_id: orderId },\n'
            '        callback_url: `${FRONTEND_URL}/?order_success=1&order_id=${orderId}`,\n'
            '      });\n\n'
            '      await db.query("UPDATE product_orders SET paystack_reference = $1 WHERE id = $2", [transaction.reference, orderId]);\n'
            '      res.json({ url: transaction.authorization_url, order_id: orderId });\n'
            '    } catch (err) {\n'
            '      console.error(err);\n'
            '      await db.query("UPDATE product_orders SET status = \'cancelled\' WHERE id = $1", [orderId]);\n'
            '      res.status(500).json({ error: "Couldn\'t start checkout. Check PAYSTACK_SECRET_KEY is set." });\n'
            '    }',
        ),
    ],
    "marketplaceOrders.js: wallet payment method",
)

edit(
    "frontend/src/App.jsx",
    [(
        '        {mode === "signup" && role === "customer" && (\n'
        '          <input\n'
        '            value={referralCode}\n'
        '            onChange={(e) => setReferralCode(e.target.value)}\n'
        '            placeholder="Referral code (optional)"\n'
        '            className="pb-2 text-base outline-none"\n'
        '            style={inputStyle}\n'
        '          />\n'
        '        )}',
        '        {mode === "signup" && (\n'
        '          <input\n'
        '            value={referralCode}\n'
        '            onChange={(e) => setReferralCode(e.target.value)}\n'
        '            placeholder="Referral code (optional)"\n'
        '            className="pb-2 text-base outline-none"\n'
        '            style={inputStyle}\n'
        '          />\n'
        '        )}',
    )],
    "App.jsx: referral code field open to owner signups too",
)

mp_replacements = [
    (
        '  const [checkoutOpen, setCheckoutOpen] = useState(false);',
        '  const [checkoutOpen, setCheckoutOpen] = useState(false);\n'
        '  const [paymentMethod, setPaymentMethod] = useState("paystack");\n'
        '  const [walletBalance, setWalletBalance] = useState(null);\n'
        '  const [walletOrderSuccess, setWalletOrderSuccess] = useState(false);',
    ),
    (
        '  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);\n'
        '  const cartSubtotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);',
        '  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);\n'
        '  const cartSubtotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);\n\n'
        '  useEffect(() => {\n'
        '    if (!checkoutOpen || !token) return;\n'
        '    apiFetch("/wallet/me", { headers: { Authorization: `Bearer ${token}` } })\n'
        '      .then((data) => setWalletBalance(data.balance || 0))\n'
        '      .catch(() => setWalletBalance(null));\n'
        '  }, [checkoutOpen, token]);',
    ),
    (
        '  const submitOrder = async () => {\n'
        '    if (!checkoutForm.delivery_address || !checkoutForm.delivery_phone) {\n'
        '      setCheckoutError("Delivery address and phone are required.");\n'
        '      return;\n'
        '    }\n'
        '    setPlacingOrder(true);\n'
        '    setCheckoutError(null);\n'
        '    try {\n'
        '      const body = {\n'
        '        items: cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),\n'
        '        ...checkoutForm,\n'
        '      };\n'
        '      const data = await apiFetch("/orders/checkout", {\n'
        '        method: "POST",\n'
        '        headers: { Authorization: `Bearer ${token}` },\n'
        '        body: JSON.stringify(body),\n'
        '      });\n'
        '      window.location.href = data.url;\n'
        '    } catch (err) {\n'
        '      setCheckoutError(err.message || "Couldn\'t start checkout.");\n'
        '      setPlacingOrder(false);\n'
        '    }\n'
        '  };',
        '  const submitOrder = async () => {\n'
        '    if (!checkoutForm.delivery_address || !checkoutForm.delivery_phone) {\n'
        '      setCheckoutError("Delivery address and phone are required.");\n'
        '      return;\n'
        '    }\n'
        '    setPlacingOrder(true);\n'
        '    setCheckoutError(null);\n'
        '    try {\n'
        '      const body = {\n'
        '        items: cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),\n'
        '        ...checkoutForm,\n'
        '        payment_method: paymentMethod,\n'
        '      };\n'
        '      const data = await apiFetch("/orders/checkout", {\n'
        '        method: "POST",\n'
        '        headers: { Authorization: `Bearer ${token}` },\n'
        '        body: JSON.stringify(body),\n'
        '      });\n'
        '      if (data.paidWithWallet) {\n'
        '        setCart([]);\n'
        '        setWalletOrderSuccess(true);\n'
        '        setPlacingOrder(false);\n'
        '        return;\n'
        '      }\n'
        '      window.location.href = data.url;\n'
        '    } catch (err) {\n'
        '      setCheckoutError(err.message || "Couldn\'t start checkout.");\n'
        '      setPlacingOrder(false);\n'
        '    }\n'
        '  };',
    ),
    (
        '          {checkoutError && <p className="text-xs mt-3" style={{ color: "#E07A5F" }}>{checkoutError}</p>}\n\n'
        '          <p className="text-xs mt-4 flex items-center gap-1" style={{ color: colors.creamDim }}>\n'
        '            <Package size={12} /> This is a pre-order, sourced from overseas — expect delivery in {PREORDER_LABEL} after payment.\n'
        '          </p>\n\n'
        '          <button\n'
        '            onClick={submitOrder}\n'
        '            disabled={placingOrder}\n'
        '            className="w-full mt-4 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2"\n'
        '            style={{ background: colors.hairline, color: "#fff" }}\n'
        '          >\n'
        '            {placingOrder ? <Loader2 size={16} className="animate-spin" /> : null}\n'
        '            {placingOrder ? "Starting checkout..." : "Continue to payment"}\n'
        '          </button>',
        '          {walletBalance !== null && (\n'
        '            <div className="mt-5">\n'
        '              <p className="text-xs font-bold mb-2" style={{ color: colors.cream }}>How would you like to pay?</p>\n'
        '              <div className="flex gap-2">\n'
        '                <button\n'
        '                  onClick={() => setPaymentMethod("paystack")}\n'
        '                  className="flex-1 px-3 py-3 rounded-xl text-sm font-semibold"\n'
        '                  style={{\n'
        '                    background: paymentMethod === "paystack" ? colors.hairline : colors.panelLight,\n'
        '                    color: paymentMethod === "paystack" ? "#fff" : colors.cream,\n'
        '                    border: `2px solid ${colors.hairline}`,\n'
        '                  }}\n'
        '                >\n'
        '                  Card / bank\n'
        '                </button>\n'
        '                <button\n'
        '                  onClick={() => setPaymentMethod("wallet")}\n'
        '                  disabled={walletBalance < cartSubtotal + config.deliveryFee}\n'
        '                  className="flex-1 px-3 py-3 rounded-xl text-sm font-semibold disabled:opacity-40"\n'
        '                  style={{\n'
        '                    background: paymentMethod === "wallet" ? colors.hairline : colors.panelLight,\n'
        '                    color: paymentMethod === "wallet" ? "#fff" : colors.cream,\n'
        '                    border: `2px solid ${colors.hairline}`,\n'
        '                  }}\n'
        '                >\n'
        '                  Wallet ({naira(walletBalance)})\n'
        '                </button>\n'
        '              </div>\n'
        '              {paymentMethod === "wallet" && walletBalance < cartSubtotal + config.deliveryFee && (\n'
        '                <p className="text-xs mt-2" style={{ color: colors.creamDim }}>\n'
        '                  Your wallet balance isn\'t enough for this order yet \u2014 pay by card or add more to your cart\'s worth first.\n'
        '                </p>\n'
        '              )}\n'
        '            </div>\n'
        '          )}\n\n'
        '          {checkoutError && <p className="text-xs mt-3" style={{ color: "#E07A5F" }}>{checkoutError}</p>}\n\n'
        '          <p className="text-xs mt-4 flex items-center gap-1" style={{ color: colors.creamDim }}>\n'
        '            <Package size={12} /> This is a pre-order, sourced from overseas — expect delivery in {PREORDER_LABEL} after payment.\n'
        '          </p>\n\n'
        '          <button\n'
        '            onClick={submitOrder}\n'
        '            disabled={placingOrder || (paymentMethod === "wallet" && walletBalance < cartSubtotal + config.deliveryFee)}\n'
        '            className="w-full mt-4 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2"\n'
        '            style={{ background: colors.hairline, color: "#fff" }}\n'
        '          >\n'
        '            {placingOrder ? <Loader2 size={16} className="animate-spin" /> : null}\n'
        '            {placingOrder ? "Placing order..." : paymentMethod === "wallet" ? "Pay with wallet" : "Continue to payment"}\n'
        '          </button>',
    ),
    (
        '      ) : checkoutOpen ? (\n'
        '        <div className="px-4 py-4">\n'
        '          <h2 className="text-lg font-bold mb-1" style={{ color: colors.cream, fontFamily: FONT_DISPLAY }}>Delivery details</h2>',
        '      ) : checkoutOpen && walletOrderSuccess ? (\n'
        '        <div className="px-4 py-10 text-center">\n'
        '          <h2 className="text-lg font-bold mb-2" style={{ color: colors.cream, fontFamily: FONT_DISPLAY }}>Order placed! \U0001f389</h2>\n'
        '          <p className="text-sm mb-6" style={{ color: colors.creamDim }}>\n'
        '            Paid from your wallet balance. We\'ll notify you once it ships \u2014 expect delivery in {PREORDER_LABEL}.\n'
        '          </p>\n'
        '          <button\n'
        '            onClick={() => { setCheckoutOpen(false); setWalletOrderSuccess(false); }}\n'
        '            className="px-6 py-3 rounded-xl font-bold text-sm"\n'
        '            style={{ background: colors.hairline, color: "#fff" }}\n'
        '          >\n'
        '            Back to Marketplace\n'
        '          </button>\n'
        '        </div>\n'
        '      ) : checkoutOpen ? (\n'
        '        <div className="px-4 py-4">\n'
        '          <h2 className="text-lg font-bold mb-1" style={{ color: colors.cream, fontFamily: FONT_DISPLAY }}>Delivery details</h2>',
    ),
]

edit("frontend/src/Marketplace.jsx", mp_replacements, "Marketplace.jsx: pay with wallet balance")

print("\nALL DONE. Review with: git diff")
print('Then: git add -A && git commit -m "Owner-to-owner referrals + pay with wallet at marketplace checkout" && git push')
