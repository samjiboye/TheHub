import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ShoppingBag, Plus, Minus, X, Loader2, Package, Truck, Star } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";
const colors = {
  bg: "#FFFFFF", panel: "#FFFFFF", panelLight: "#F2F2F2", hairline: "#D9702E",
  cream: "#241B14", creamDim: "#7A6F63", gold: "#D9702E", goldDim: "#A6532A", rose: "#4FA89C",
};
const FONT_DISPLAY = "'Baloo 2', sans-serif";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const naira = (n) => `₦${Number(n).toLocaleString()}`;
const PREORDER_DAYS = 28; // matches backend default (~4 weeks for overseas-sourced pre-orders)
const PREORDER_LABEL = "2–4 weeks"; // shown to customers — a range reads more honest than a precise day count

function estimatedDeliveryDate(order) {
  const created = new Date(order.created_at);
  created.setDate(created.getDate() + (order.estimated_delivery_days || PREORDER_DAYS));
  return created.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function StarRow({ rating, size = 12, onSelect }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          fill={n <= Math.round(rating) ? colors.hairline : "none"}
          color={colors.hairline}
          onClick={onSelect ? () => onSelect(n) : undefined}
          style={onSelect ? { cursor: "pointer" } : undefined}
        />
      ))}
    </div>
  );
}

function MarketplaceHeader({ title, onBack, right }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-5 sticky top-0 z-10"
      style={{ background: colors.bg, borderBottom: `3px solid ${colors.hairline}` }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 -ml-1 shrink-0 rounded-full flex items-center justify-center"
            style={{ border: `3px solid ${colors.hairline}`, width: 48, height: 48 }}
          >
            <ChevronLeft size={26} color={colors.cream} />
          </button>
        )}
        <h1 className="truncate" style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.5rem", fontWeight: 700 }}>
          {title}
        </h1>
      </div>
      {right}
    </div>
  );
}

function ProductGallery({ images, alt }) {
  const [index, setIndex] = useState(0);
  const scrollRef = useRef(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  if (images.length === 0) {
    return <div className="w-full aspect-square" style={{ background: colors.panelLight }} />;
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto"
        style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
      >
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={alt}
            className="w-full aspect-square object-cover shrink-0"
            style={{ scrollSnapAlign: "center" }}
          />
        ))}
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
          {images.map((_, i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: i === index ? 16 : 6,
                height: 6,
                background: i === index ? colors.hairline : "rgba(255,255,255,0.6)",
                transition: "width 200ms ease",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductDetail({ product: initialProduct, onBack, onAddToCart }) {
  const [product, setProduct] = useState(initialProduct);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    apiFetch(`/products/${initialProduct.id}`).then(setProduct).catch(() => {});
  }, [initialProduct.id]);

  useEffect(() => {
    apiFetch(`/products/${product.id}/reviews`)
      .then(setReviews)
      .catch(() => {})
      .finally(() => setLoadingReviews(false));
  }, [product.id]);

  const galleryImages = [product.image_url, ...((product.images || []).map((i) => i.image_url))].filter(Boolean);

  return (
    <div className="px-4 py-4">
      <div className="rounded-2xl overflow-hidden mb-4" style={{ background: colors.panelLight }}>
        <ProductGallery images={galleryImages} alt={product.name} />
      </div>
      <h2 className="text-xl font-bold" style={{ color: colors.cream, fontFamily: FONT_DISPLAY }}>{product.name}</h2>
      <p className="text-lg font-bold mt-1" style={{ color: colors.hairline }}>{naira(product.price)}</p>
      {product.review_count > 0 ? (
        <div className="flex items-center gap-2 mt-1">
          <StarRow rating={product.avg_rating} size={14} />
          <span className="text-xs" style={{ color: colors.creamDim }}>{product.avg_rating} · {product.review_count} review{product.review_count === 1 ? "" : "s"}</span>
        </div>
      ) : (
        <p className="text-xs mt-1" style={{ color: colors.creamDim }}>No reviews yet</p>
      )}
      <p className="text-xs mt-2" style={{ color: colors.creamDim }}>Pre-order · delivered in {PREORDER_LABEL}</p>

      {product.description && (
        <p className="text-sm mt-4 leading-relaxed" style={{ color: colors.cream }}>{product.description}</p>
      )}

      {product.stock_quantity < 1 ? (
        <p className="text-sm mt-5 text-center py-3" style={{ color: colors.creamDim }}>Not available right now</p>
      ) : (
        <button
          onClick={() => { onAddToCart(product); onBack(); }}
          className="w-full mt-5 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 tap-glass"
          style={{ background: colors.hairline, color: "#fff" }}
        >
          <Plus size={16} /> Add to cart
        </button>
      )}

      <div className="mt-6">
        <h3 className="text-sm font-bold mb-3" style={{ color: colors.cream }}>Reviews</h3>
        {loadingReviews ? (
          <div className="pt-4 flex justify-center"><Loader2 size={20} className="animate-spin" color={colors.creamDim} /></div>
        ) : reviews.length === 0 ? (
          <p className="text-xs" style={{ color: colors.creamDim }}>Be the first to review this once it's delivered to you.</p>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="py-3" style={{ borderTop: `1px solid ${colors.panelLight}` }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold" style={{ color: colors.cream }}>{r.customer_name}</p>
                <StarRow rating={r.rating} size={11} />
              </div>
              {r.comment && <p className="text-xs mt-1" style={{ color: colors.creamDim }}>{r.comment}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ReviewForm({ token, productId, orderId, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/products/${productId}/reviews`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ order_id: orderId, rating, comment }),
      });
      onSubmitted();
    } catch (err) {
      setError(err.message || "Couldn't submit review.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-semibold mt-1" style={{ color: colors.hairline }}>
        Leave a review
      </button>
    );
  }

  return (
    <div className="mt-2 p-3 rounded-xl" style={{ background: colors.panelLight }}>
      <StarRow rating={rating} size={18} onSelect={setRating} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="What did you think? (optional)"
        rows={2}
        className="w-full mt-2 px-2 py-2 rounded-lg text-xs"
        style={{ border: `1px solid ${colors.hairline}`, color: colors.cream }}
      />
      {error && <p className="text-xs mt-1" style={{ color: "#E07A5F" }}>{error}</p>}
      <button
        onClick={submit}
        disabled={saving}
        className="mt-2 px-4 py-2 rounded-lg text-xs font-bold"
        style={{ background: colors.hairline, color: "#fff" }}
      >
        {saving ? "Submitting..." : "Submit review"}
      </button>
    </div>
  );
}

export default function MarketplaceView({ token, onBack }) {
  const [tab, setTab] = useState("shop"); // shop | orders
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState([]); // [{product, quantity}]
  const [cartOpen, setCartOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("paystack");
  const [walletBalance, setWalletBalance] = useState(null);
  const [walletOrderSuccess, setWalletOrderSuccess] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({ delivery_address: "", delivery_state: "", delivery_city: "", delivery_phone: "" });
  const [placingOrder, setPlacingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [config, setConfig] = useState({ deliveryFee: 1500, preorderDays: PREORDER_DAYS });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reviewedItems, setReviewedItems] = useState(() => new Set());

  useEffect(() => {
    apiFetch("/marketplace/config").then(setConfig).catch(() => {});
    if (token) {
      apiFetch("/orders/saved-address", { headers: { Authorization: `Bearer ${token}` } })
        .then((saved) => {
          if (saved.delivery_address) setCheckoutForm(saved);
        })
        .catch(() => {});
    }
  }, [token]);

  useEffect(() => {
    apiFetch("/product-categories").then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const qs = activeCategory ? `?category=${activeCategory}` : "";
    apiFetch(`/products${qs}`)
      .then(setProducts)
      .catch(() => setError("Couldn't load products."))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  useEffect(() => {
    if (tab !== "orders" || !token) return;
    setOrdersLoading(true);
    apiFetch("/orders/mine", { headers: { Authorization: `Bearer ${token}` } })
      .then(setOrders)
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, [tab, token]);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const changeQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartSubtotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  useEffect(() => {
    if (!checkoutOpen || !token) return;
    apiFetch("/wallet/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => setWalletBalance(data.balance || 0))
      .catch(() => setWalletBalance(null));
  }, [checkoutOpen, token]);

  const submitOrder = async () => {
    if (!checkoutForm.delivery_address || !checkoutForm.delivery_phone) {
      setCheckoutError("Delivery address and phone are required.");
      return;
    }
    setPlacingOrder(true);
    setCheckoutError(null);
    try {
      const body = {
        items: cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        ...checkoutForm,
        payment_method: paymentMethod,
      };
      const data = await apiFetch("/orders/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (data.paidWithWallet) {
        setCart([]);
        setWalletOrderSuccess(true);
        setPlacingOrder(false);
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      setCheckoutError(err.message || "Couldn't start checkout.");
      setPlacingOrder(false);
    }
  };

  return (
    <div style={{ paddingBottom: cart.length > 0 ? 90 : 0 }}>
      <MarketplaceHeader
        title={selectedProduct ? selectedProduct.name : "Marketplace"}
        onBack={
          selectedProduct
            ? () => setSelectedProduct(null)
            : cartOpen || checkoutOpen
            ? () => { setCartOpen(false); setCheckoutOpen(false); }
            : onBack
        }
        right={
          !checkoutOpen && !selectedProduct && (
            <button onClick={() => setCartOpen(true)} className="relative p-2.5 rounded-full tap-glass" style={{ border: `2px solid ${colors.hairline}` }}>
              <ShoppingBag size={20} color={colors.cream} />
              {cartCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-[10px] font-bold"
                  style={{ background: colors.hairline, color: "#fff", width: 18, height: 18 }}
                >
                  {cartCount}
                </span>
              )}
            </button>
          )
        }
      />

      {selectedProduct ? (
        <ProductDetail product={selectedProduct} onBack={() => setSelectedProduct(null)} onAddToCart={addToCart} />
      ) : checkoutOpen && walletOrderSuccess ? (
        <div className="px-4 py-10 text-center">
          <h2 className="text-lg font-bold mb-2" style={{ color: colors.cream, fontFamily: FONT_DISPLAY }}>Order placed! 🎉</h2>
          <p className="text-sm mb-6" style={{ color: colors.creamDim }}>
            Paid from your wallet balance. We'll notify you once it ships — expect delivery in {PREORDER_LABEL}.
          </p>
          <button
            onClick={() => { setCheckoutOpen(false); setWalletOrderSuccess(false); }}
            className="px-6 py-3 rounded-xl font-bold text-sm"
            style={{ background: colors.hairline, color: "#fff" }}
          >
            Back to Marketplace
          </button>
        </div>
      ) : checkoutOpen ? (
        <div className="px-4 py-4">
          <h2 className="text-lg font-bold mb-1" style={{ color: colors.cream, fontFamily: FONT_DISPLAY }}>Delivery details</h2>
          {checkoutForm.delivery_address && (
            <p className="text-xs mb-3" style={{ color: colors.creamDim }}>Using your saved details — edit anything that's changed.</p>
          )}
          <div className="space-y-3">
            <input
              placeholder="Delivery address"
              value={checkoutForm.delivery_address}
              onChange={(e) => setCheckoutForm((f) => ({ ...f, delivery_address: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl text-base"
              style={{ border: `2px solid ${colors.hairline}`, color: colors.cream }}
            />
            <div className="flex gap-2">
              <input
                placeholder="State"
                value={checkoutForm.delivery_state}
                onChange={(e) => setCheckoutForm((f) => ({ ...f, delivery_state: e.target.value }))}
                className="w-1/2 px-4 py-3 rounded-xl text-base"
                style={{ border: `2px solid ${colors.hairline}`, color: colors.cream }}
              />
              <input
                placeholder="City"
                value={checkoutForm.delivery_city}
                onChange={(e) => setCheckoutForm((f) => ({ ...f, delivery_city: e.target.value }))}
                className="w-1/2 px-4 py-3 rounded-xl text-base"
                style={{ border: `2px solid ${colors.hairline}`, color: colors.cream }}
              />
            </div>
            <input
              placeholder="Phone number"
              value={checkoutForm.delivery_phone}
              onChange={(e) => setCheckoutForm((f) => ({ ...f, delivery_phone: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl text-base"
              style={{ border: `2px solid ${colors.hairline}`, color: colors.cream }}
            />
          </div>

          <div className="mt-5 rounded-xl p-4" style={{ background: colors.panelLight }}>
            {cart.map((i) => (
              <div key={i.product.id} className="flex justify-between text-sm py-1" style={{ color: colors.cream }}>
                <span>{i.product.name} × {i.quantity}</span>
                <span>{naira(i.product.price * i.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm py-1" style={{ color: colors.cream }}>
              <span>Delivery fee</span><span>{naira(config.deliveryFee)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 mt-2" style={{ borderTop: `2px solid ${colors.hairline}`, color: colors.cream }}>
              <span>Total</span><span>{naira(cartSubtotal + config.deliveryFee)}</span>
            </div>
          </div>
          <p className="text-xs mt-2" style={{ color: colors.creamDim }}>
            The {naira(config.deliveryFee)} delivery fee covers getting your order from us to your address once it arrives — it's separate from the item price.
          </p>

          {walletBalance !== null && (
            <div className="mt-5">
              <p className="text-xs font-bold mb-2" style={{ color: colors.cream }}>How would you like to pay?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentMethod("paystack")}
                  className="flex-1 px-3 py-3 rounded-xl text-sm font-semibold"
                  style={{
                    background: paymentMethod === "paystack" ? colors.hairline : colors.panelLight,
                    color: paymentMethod === "paystack" ? "#fff" : colors.cream,
                    border: `2px solid ${colors.hairline}`,
                  }}
                >
                  Card / bank
                </button>
                <button
                  onClick={() => setPaymentMethod("wallet")}
                  disabled={walletBalance < cartSubtotal + config.deliveryFee}
                  className="flex-1 px-3 py-3 rounded-xl text-sm font-semibold disabled:opacity-40"
                  style={{
                    background: paymentMethod === "wallet" ? colors.hairline : colors.panelLight,
                    color: paymentMethod === "wallet" ? "#fff" : colors.cream,
                    border: `2px solid ${colors.hairline}`,
                  }}
                >
                  Wallet ({naira(walletBalance)})
                </button>
              </div>
              {paymentMethod === "wallet" && walletBalance < cartSubtotal + config.deliveryFee && (
                <p className="text-xs mt-2" style={{ color: colors.creamDim }}>
                  Your wallet balance isn't enough for this order yet — pay by card or add more to your cart's worth first.
                </p>
              )}
            </div>
          )}

          {checkoutError && <p className="text-xs mt-3" style={{ color: "#E07A5F" }}>{checkoutError}</p>}

          <p className="text-xs mt-4 flex items-center gap-1" style={{ color: colors.creamDim }}>
            <Package size={12} /> This is a pre-order, sourced from overseas — expect delivery in {PREORDER_LABEL} after payment.
          </p>

          <button
            onClick={submitOrder}
            disabled={placingOrder || (paymentMethod === "wallet" && walletBalance < cartSubtotal + config.deliveryFee)}
            className="w-full mt-4 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
            style={{ background: colors.hairline, color: "#fff" }}
          >
            {placingOrder ? <Loader2 size={16} className="animate-spin" /> : null}
            {placingOrder ? "Placing order..." : paymentMethod === "wallet" ? "Pay with wallet" : "Continue to payment"}
          </button>
        </div>
      ) : cartOpen ? (
        <div className="px-4 py-4">
          {cart.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: colors.creamDim }}>Your cart is empty.</p>
          ) : (
            <>
              {cart.map((i) => (
                <div key={i.product.id} className="flex items-center gap-3 py-3" style={{ borderBottom: `1px solid ${colors.panelLight}` }}>
                  <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0" style={{ background: colors.panelLight }}>
                    {i.product.image_url && <img src={i.product.image_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: colors.cream }}>{i.product.name}</p>
                    <p className="text-xs" style={{ color: colors.creamDim }}>{naira(i.product.price)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => changeQty(i.product.id, -1)} className="p-1.5 rounded-full" style={{ border: `1px solid ${colors.hairline}` }}>
                      <Minus size={12} color={colors.cream} />
                    </button>
                    <span className="text-sm w-4 text-center" style={{ color: colors.cream }}>{i.quantity}</span>
                    <button onClick={() => changeQty(i.product.id, 1)} className="p-1.5 rounded-full" style={{ border: `1px solid ${colors.hairline}` }}>
                      <Plus size={12} color={colors.cream} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-4" style={{ color: colors.cream }}>
                <span>Subtotal</span><span>{naira(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm py-1" style={{ color: colors.cream }}>
                <span>Delivery fee</span><span>{naira(config.deliveryFee)}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 mt-1" style={{ borderTop: `2px solid ${colors.hairline}`, color: colors.cream }}>
                <span>Total</span><span>{naira(cartSubtotal + config.deliveryFee)}</span>
              </div>
              <button
                onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}
                className="w-full mt-4 py-4 rounded-xl font-bold text-sm"
                style={{ background: colors.hairline, color: "#fff" }}
              >
                Checkout
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="flex gap-2 px-4 pt-3">
            <button
              onClick={() => setTab("shop")}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: tab === "shop" ? colors.hairline : colors.panelLight, color: tab === "shop" ? "#fff" : colors.cream }}
            >
              Shop
            </button>
            <button
              onClick={() => setTab("orders")}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: tab === "orders" ? colors.hairline : colors.panelLight, color: tab === "orders" ? "#fff" : colors.cream }}
            >
              My orders
            </button>
          </div>

          {tab === "shop" ? (
            <>
              <div className="mx-4 mt-3 px-4 py-3 rounded-xl flex items-center gap-2" style={{ background: colors.panelLight }}>
                <Package size={16} color={colors.hairline} />
                <p className="text-xs" style={{ color: colors.cream }}>
                  All items are pre-order, sourced from overseas — delivered in {PREORDER_LABEL} after payment.
                </p>
              </div>
              {categories.length > 0 && (
                <div className="flex gap-2 px-4 py-3 overflow-x-auto">
                  <button
                    onClick={() => setActiveCategory(null)}
                    className="shrink-0 px-4 py-2 rounded-full text-xs font-semibold"
                    style={{ background: !activeCategory ? colors.hairline : colors.panelLight, color: !activeCategory ? "#fff" : colors.cream }}
                  >
                    All
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setActiveCategory(c.slug)}
                      className="shrink-0 px-4 py-2 rounded-full text-xs font-semibold"
                      style={{ background: activeCategory === c.slug ? colors.hairline : colors.panelLight, color: activeCategory === c.slug ? "#fff" : colors.cream }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}

              {loading ? (
                <div className="px-4 pt-10 flex justify-center"><Loader2 size={24} className="animate-spin" color={colors.creamDim} /></div>
              ) : error ? (
                <p className="px-4 py-8 text-sm text-center" style={{ color: colors.creamDim }}>{error}</p>
              ) : products.length === 0 ? (
                <div className="px-4 py-16 text-center">
                  <Package size={32} color={colors.creamDim} className="mx-auto mb-2" />
                  <p className="text-sm" style={{ color: colors.creamDim }}>No products here yet — check back soon.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 px-4 pb-4">
                  {products.map((p) => (
                    <div key={p.id} className="rounded-2xl overflow-hidden tap-glass" style={{ border: `2px solid ${colors.hairline}` }} onClick={() => setSelectedProduct(p)}>
                      <div className="aspect-square" style={{ background: colors.panelLight }}>
                        {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold truncate" style={{ color: colors.cream }}>{p.name}</p>
                        <p className="text-sm font-bold mt-0.5" style={{ color: colors.hairline }}>{naira(p.price)}</p>
                        {p.review_count > 0 && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <StarRow rating={p.avg_rating} size={10} />
                            <span className="text-[10px]" style={{ color: colors.creamDim }}>({p.review_count})</span>
                          </div>
                        )}
                        <p className="text-[10px] mt-0.5" style={{ color: colors.creamDim }}>Pre-order · {PREORDER_LABEL}</p>
                        {p.stock_quantity < 1 ? (
                          <p className="text-xs mt-2" style={{ color: colors.creamDim }}>Not available right now</p>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); addToCart(p); }}
                            className="w-full mt-2 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 tap-glass"
                            style={{ background: colors.panelLight, color: colors.cream }}
                          >
                            <Plus size={12} /> Add
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="px-4 py-4">
              {ordersLoading ? (
                <div className="pt-10 flex justify-center"><Loader2 size={24} className="animate-spin" color={colors.creamDim} /></div>
              ) : orders.length === 0 ? (
                <p className="text-sm text-center py-10" style={{ color: colors.creamDim }}>No orders yet.</p>
              ) : (
                orders.map((o) => (
                  <div key={o.id} className="rounded-2xl p-4 mb-3" style={{ border: `2px solid ${colors.hairline}` }}>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-bold" style={{ color: colors.cream }}>Order #{o.id}</p>
                      <span
                        className="text-xs px-2 py-1 rounded-full font-semibold"
                        style={{ background: colors.panelLight, color: colors.hairline }}
                      >
                        {o.status}
                      </span>
                    </div>
                    {o.items.map((it) => (
                      <div key={it.id} className="flex items-start gap-2 mb-1">
                        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0" style={{ background: colors.panelLight }}>
                          {it.product_image_url && <img src={it.product_image_url} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs" style={{ color: colors.creamDim }}>{it.product_name} × {it.quantity}</p>
                          {o.status === "delivered" && (
                            reviewedItems.has(`${o.id}-${it.product_id}`) ? (
                              <p className="text-xs mt-1" style={{ color: colors.creamDim }}>✓ Reviewed</p>
                            ) : (
                              <ReviewForm
                                token={token}
                                productId={it.product_id}
                                orderId={o.id}
                                onSubmitted={() => setReviewedItems((prev) => new Set(prev).add(`${o.id}-${it.product_id}`))}
                              />
                            )
                          )}
                        </div>
                      </div>
                    ))}
                    <p className="text-sm font-bold mt-2" style={{ color: colors.cream }}>{naira(o.total)}</p>
                    {o.status !== "delivered" && o.status !== "cancelled" && (
                      <p className="text-xs mt-1 flex items-center gap-1" style={{ color: colors.creamDim }}>
                        <Package size={12} /> Estimated delivery: {estimatedDeliveryDate(o)}
                      </p>
                    )}
                    {o.courier_name && (
                      <p className="text-xs mt-1 flex items-center gap-1" style={{ color: colors.creamDim }}>
                        <Truck size={12} /> {o.courier_name}{o.courier_tracking_ref ? ` · ${o.courier_tracking_ref}` : ""}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
