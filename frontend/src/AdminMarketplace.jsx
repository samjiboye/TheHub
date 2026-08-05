import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, Plus, Loader2, Trash2, Upload, Package, Truck } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";
const colors = {
  bg: "#FFFFFF", panel: "#FFFFFF", panelLight: "#F2F2F2", hairline: "#D9702E",
  cream: "#241B14", creamDim: "#7A6F63", gold: "#D9702E",
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
const ORDER_STATUSES = ["pending", "processing", "dispatched", "delivered", "cancelled"];
const PREORDER_DAYS = 42; // matches backend default

function daysUntilDue(order) {
  const due = new Date(order.created_at);
  due.setDate(due.getDate() + (order.estimated_delivery_days || PREORDER_DAYS));
  const diff = Math.ceil((due - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

function AdminHeader({ title, onBack }) {
  return (
    <div className="flex items-center gap-2 px-4 py-5 sticky top-0 z-10" style={{ background: colors.bg, borderBottom: `3px solid ${colors.hairline}` }}>
      {onBack && (
        <button onClick={onBack} className="p-2 -ml-1 rounded-full flex items-center justify-center" style={{ border: `3px solid ${colors.hairline}`, width: 48, height: 48 }}>
          <ChevronLeft size={26} color={colors.cream} />
        </button>
      )}
      <h1 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.5rem", fontWeight: 700 }}>{title}</h1>
    </div>
  );
}

function AddCategoryForm({ token, onAdded }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      await apiFetch("/product-categories", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), slug }),
      });
      setName("");
      onAdded();
    } catch (err) {
      setError(err.message || "Couldn't add category.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New category name"
        className="flex-1 px-3 py-2.5 rounded-xl text-base"
        style={{ border: `2px solid ${colors.hairline}`, color: colors.cream }}
      />
      <button onClick={submit} disabled={saving} className="p-2.5 rounded-xl" style={{ background: colors.hairline }}>
        {saving ? <Loader2 size={16} className="animate-spin" color="#fff" /> : <Plus size={16} color="#fff" />}
      </button>
      {error && <p className="text-xs" style={{ color: "#E07A5F" }}>{error}</p>}
    </div>
  );
}

function ProductForm({ token, categories, product, onSaved, onCancel }) {
  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [price, setPrice] = useState(product?.price ?? "");
  const [stock, setStock] = useState(product?.stock_quantity ?? "");
  const [categoryId, setCategoryId] = useState(product?.category_id || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState(null);

  const submit = async () => {
    if (!name.trim() || !price) {
      setError("Name and price are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("description", description);
      formData.append("price", price);
      formData.append("stock_quantity", stock || 0);
      if (categoryId) formData.append("category_id", categoryId);
      if (fileInputRef.current?.files[0]) formData.append("image", fileInputRef.current.files[0]);

      const url = product ? `${API_BASE}/products/${product.id}` : `${API_BASE}/products`;
      const res = await fetch(url, {
        method: product ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save product.");
      onSaved();
    } catch (err) {
      setError(err.message || "Couldn't save product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ border: `2px solid ${colors.hairline}` }}>
      <div className="space-y-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name"
          className="w-full px-3 py-2.5 rounded-xl text-base" style={{ border: `2px solid ${colors.hairline}`, color: colors.cream }} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={2}
          className="w-full px-3 py-2.5 rounded-xl text-base" style={{ border: `2px solid ${colors.hairline}`, color: colors.cream }} />
        <div className="flex gap-2">
          <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" placeholder="Price ₦"
            className="w-1/2 px-3 py-2.5 rounded-xl text-base" style={{ border: `2px solid ${colors.hairline}`, color: colors.cream }} />
          <input value={stock} onChange={(e) => setStock(e.target.value)} type="number" placeholder="Order limit (how many you can source)"
            className="w-1/2 px-3 py-2.5 rounded-xl text-base" style={{ border: `2px solid ${colors.hairline}`, color: colors.cream }} />
        </div>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl text-base" style={{ border: `2px solid ${colors.hairline}`, color: colors.cream }}>
          <option value="">No category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => setFileName(e.target.files[0]?.name || null)}
          style={{ display: "none" }}
          id={`file-${product?.id || "new"}`}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm tap-glass"
          style={{ background: colors.panelLight, color: colors.cream }}
        >
          <Upload size={14} /> {fileName || (product?.image_url ? "Replace photo" : "Add photo")}
        </button>
      </div>
      {error && <p className="text-xs mt-2" style={{ color: "#E07A5F" }}>{error}</p>}
      <div className="flex gap-2 mt-3">
        <button onClick={submit} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1" style={{ background: colors.hairline, color: "#fff" }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {saving ? "Saving..." : "Save product"}
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 rounded-xl text-sm" style={{ border: `2px solid ${colors.hairline}`, color: colors.cream }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function ProductsTab({ token }) {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch("/product-categories"),
      apiFetch("/products"),
    ]).then(([cats, prods]) => {
      setCategories(cats);
      setProducts(prods);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const deleteProduct = async (id) => {
    try {
      await apiFetch(`/products/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      load();
    } catch (err) {
      alert(err.message || "Couldn't delete product.");
    }
  };

  return (
    <div className="px-4 py-4">
      <div className="rounded-2xl p-4 mb-4" style={{ background: colors.panelLight }}>
        <p className="text-xs font-semibold mb-2" style={{ color: colors.creamDim }}>CATEGORIES</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {categories.map((c) => (
            <span key={c.id} className="text-xs px-3 py-1.5 rounded-full" style={{ background: colors.panel, color: colors.cream, border: `1px solid ${colors.hairline}` }}>
              {c.name}
            </span>
          ))}
        </div>
        <AddCategoryForm token={token} onAdded={load} />
      </div>

      {showForm || editingProduct ? (
        <ProductForm
          token={token}
          categories={categories}
          product={editingProduct}
          onSaved={() => { setShowForm(false); setEditingProduct(null); load(); }}
          onCancel={() => { setShowForm(false); setEditingProduct(null); }}
        />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold mb-4 tap-glass"
          style={{ background: colors.hairline, color: "#fff" }}
        >
          <Plus size={16} /> Add product
        </button>
      )}

      {loading ? (
        <div className="pt-10 flex justify-center"><Loader2 size={24} className="animate-spin" color={colors.creamDim} /></div>
      ) : products.length === 0 ? (
        <p className="text-sm text-center py-10" style={{ color: colors.creamDim }}>No products yet — add your first one above.</p>
      ) : (
        products.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl p-3 mb-2" style={{ border: `2px solid ${colors.hairline}` }}>
            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0" style={{ background: colors.panelLight }}>
              {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: colors.cream }}>{p.name}</p>
              <p className="text-xs" style={{ color: colors.creamDim }}>{naira(p.price)} · {p.stock_quantity} orders available{p.is_active === false ? " · inactive" : ""}</p>
              <p className="text-[10px]" style={{ color: colors.creamDim }}>Pre-order · deliver within ~6 weeks</p>
            </div>
            <button onClick={() => setEditingProduct(p)} className="text-xs font-semibold px-2 py-1" style={{ color: colors.hairline }}>Edit</button>
            <button onClick={() => deleteProduct(p.id)} className="p-2 rounded-full" style={{ border: `1px solid ${colors.hairline}` }}>
              <Trash2 size={14} color={colors.hairline} />
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export function OrdersTab({ token }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const load = () => {
    setLoading(true);
    apiFetch("/orders", { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => {
        const needsSourcing = (o) => o.payment_status === "paid" && !o.supplier_order_ref && o.status !== "delivered" && o.status !== "cancelled";
        setOrders([...data].sort((a, b) => needsSourcing(b) - needsSourcing(a)));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const updateOrder = async (order, updates) => {
    setSavingId(order.id);
    try {
      await apiFetch(`/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      load();
    } catch (err) {
      alert(err.message || "Couldn't update order.");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <div className="pt-10 flex justify-center"><Loader2 size={24} className="animate-spin" color={colors.creamDim} /></div>;
  if (orders.length === 0) return <p className="text-sm text-center py-10" style={{ color: colors.creamDim }}>No orders yet.</p>;

  return (
    <div className="px-4 py-4">
      {orders.map((o) => {
        const needsSourcing = o.payment_status === "paid" && !o.supplier_order_ref && o.status !== "delivered" && o.status !== "cancelled";
        return (
        <div key={o.id} className="rounded-2xl p-4 mb-3" style={{ border: `2px solid ${needsSourcing ? "#E07A5F" : colors.hairline}` }}>
          <div className="flex justify-between items-start mb-1">
            <p className="text-sm font-bold" style={{ color: colors.cream }}>Order #{o.id} · {o.customer_name}</p>
            <p className="text-sm font-bold" style={{ color: colors.hairline }}>{naira(o.total)}</p>
          </div>
          {needsSourcing && (
            <span className="inline-block text-[10px] font-bold px-2 py-1 rounded-full mb-2" style={{ background: "#E07A5F", color: "#fff" }}>
              NEEDS SOURCING — place this order with your supplier
            </span>
          )}
          <p className="text-xs mb-1" style={{ color: colors.creamDim }}>{o.customer_email}</p>
          {o.items.map((it) => (
            <p key={it.id} className="text-xs" style={{ color: colors.creamDim }}>{it.product_name} × {it.quantity}</p>
          ))}
          <p className="text-xs mt-2" style={{ color: colors.cream }}>
            <Package size={12} className="inline mr-1" />{o.delivery_address}{o.delivery_city ? `, ${o.delivery_city}` : ""}{o.delivery_state ? `, ${o.delivery_state}` : ""} · {o.delivery_phone}
          </p>
          {o.status !== "delivered" && o.status !== "cancelled" && o.payment_status === "paid" && (
            <p className="text-xs mt-1 font-semibold" style={{ color: daysUntilDue(o) < 7 ? "#E07A5F" : colors.creamDim }}>
              {daysUntilDue(o) < 0 ? `${Math.abs(daysUntilDue(o))} days overdue` : `${daysUntilDue(o)} days left to deliver`}
            </p>
          )}

          {o.payment_status === "paid" && (
            <input
              defaultValue={o.supplier_order_ref || ""}
              placeholder="Supplier order # (e.g. AliExpress order ID)"
              onBlur={(e) => e.target.value !== (o.supplier_order_ref || "") && updateOrder(o, { supplier_order_ref: e.target.value })}
              className="w-full mt-2 px-2 py-2 rounded-lg text-base"
              style={{ border: `1px solid ${needsSourcing ? "#E07A5F" : colors.hairline}`, color: colors.cream }}
            />
          )}

          <div className="flex items-center gap-2 mt-3">
            <select
              value={o.status}
              onChange={(e) => updateOrder(o, { status: e.target.value })}
              disabled={savingId === o.id}
              className="flex-1 px-2 py-2 rounded-lg text-base"
              style={{ border: `1px solid ${colors.hairline}`, color: colors.cream }}
            >
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {savingId === o.id && <Loader2 size={14} className="animate-spin" color={colors.creamDim} />}
          </div>

          {(o.status === "processing" || o.status === "dispatched") && (
            <div className="flex gap-2 mt-2">
              <input
                defaultValue={o.courier_name || ""}
                placeholder="Courier name"
                onBlur={(e) => e.target.value !== (o.courier_name || "") && updateOrder(o, { courier_name: e.target.value })}
                className="flex-1 px-2 py-2 rounded-lg text-base"
                style={{ border: `1px solid ${colors.hairline}`, color: colors.cream }}
              />
              <input
                defaultValue={o.courier_tracking_ref || ""}
                placeholder="Tracking ref"
                onBlur={(e) => e.target.value !== (o.courier_tracking_ref || "") && updateOrder(o, { courier_tracking_ref: e.target.value })}
                className="flex-1 px-2 py-2 rounded-lg text-base"
                style={{ border: `1px solid ${colors.hairline}`, color: colors.cream }}
              />
            </div>
          )}
          {o.courier_name && <p className="text-xs mt-2 flex items-center gap-1" style={{ color: colors.creamDim }}><Truck size={12} /> {o.courier_name} {o.courier_tracking_ref}</p>}
        </div>
        );
      })}
    </div>
  );
}

export default function AdminMarketplaceView({ token, onBack }) {
  const [tab, setTab] = useState("products");
  return (
    <div>
      <AdminHeader title="Manage Marketplace" onBack={onBack} />
      <div className="flex gap-2 px-4 pt-3">
        <button
          onClick={() => setTab("products")}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: tab === "products" ? colors.hairline : colors.panelLight, color: tab === "products" ? "#fff" : colors.cream }}
        >
          Products
        </button>
        <button
          onClick={() => setTab("orders")}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: tab === "orders" ? colors.hairline : colors.panelLight, color: tab === "orders" ? "#fff" : colors.cream }}
        >
          Orders
        </button>
      </div>
      {tab === "products" ? <ProductsTab token={token} /> : <OrdersTab token={token} />}
    </div>
  );
}
