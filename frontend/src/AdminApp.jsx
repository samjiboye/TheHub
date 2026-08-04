import React, { useState, useEffect } from "react";
import { LogOut, Loader2, TrendingUp, Users, Store, Calendar, ShoppingBag, Package, DollarSign } from "lucide-react";
import { ProductsTab, OrdersTab } from "./AdminMarketplace";

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

function LoginScreen({ onAuthed }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (!data.user?.isAdmin) {
        setError("This account doesn't have admin access.");
        setLoading(false);
        return;
      }
      onAuthed(data.token, data.user);
    } catch (err) {
      setError(err.message || "Couldn't log in.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: colors.panelLight }}>
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl p-6" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: FONT_DISPLAY, color: colors.cream }}>TheHub Admin</h1>
        <p className="text-sm mb-6" style={{ color: colors.creamDim }}>Sign in with your admin account</p>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm mb-3"
          style={{ border: `2px solid ${colors.hairline}`, color: colors.cream }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm mb-3"
          style={{ border: `2px solid ${colors.hairline}`, color: colors.cream }}
        />
        {error && <p className="text-xs mb-3" style={{ color: "#E07A5F" }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: colors.hairline, color: "#fff" }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl p-4" style={{ border: `2px solid ${colors.hairline}` }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} color={colors.hairline} />
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.creamDim }}>{label}</p>
      </div>
      <p className="text-xl font-bold" style={{ color: colors.cream, fontFamily: FONT_DISPLAY }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: colors.creamDim }}>{sub}</p>}
    </div>
  );
}

// Lightweight dependency-free line chart (avoids pulling in a charting library for two trend lines)
function TrendChart({ title, series, height = 160 }) {
  const width = 600;
  const padding = 24;
  const allValues = series.flatMap((s) => s.values);
  const max = Math.max(1, ...allValues);
  const points = series[0].values.length;
  const xStep = points > 1 ? (width - padding * 2) / (points - 1) : 0;

  const toPath = (values) =>
    values
      .map((v, i) => {
        const x = padding + i * xStep;
        const y = height - padding - (v / max) * (height - padding * 2);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <div className="rounded-2xl p-4" style={{ border: `2px solid ${colors.hairline}` }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold" style={{ color: colors.cream }}>{title}</p>
        <div className="flex gap-3">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1 text-xs" style={{ color: colors.creamDim }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: s.color, display: "inline-block" }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
        {series.map((s) => (
          <path key={s.label} d={toPath(s.values)} fill="none" stroke={s.color} strokeWidth={2} />
        ))}
      </svg>
    </div>
  );
}

function OverviewTab({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/admin/analytics", { headers: { Authorization: `Bearer ${token}` } })
      .then(setData)
      .catch(() => setError("Couldn't load analytics."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="pt-16 flex justify-center"><Loader2 size={28} className="animate-spin" color={colors.creamDim} /></div>;
  if (error) return <p className="text-sm text-center py-10" style={{ color: colors.creamDim }}>{error}</p>;

  const t = data.totals;
  const totalRevenue = t.bookingRevenue + t.marketplaceRevenue;

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <KpiCard icon={DollarSign} label="Total revenue" value={naira(totalRevenue)} sub={`${naira(t.commissionEarned)} commission earned`} />
        <KpiCard icon={Calendar} label="Bookings" value={t.bookings} sub={`${t.completedBookings} completed`} />
        <KpiCard icon={ShoppingBag} label="Marketplace orders" value={t.marketplaceOrders} sub={naira(t.marketplaceRevenue)} />
        <KpiCard icon={Package} label="Active products" value={t.products} />
        <KpiCard icon={Users} label="Users" value={t.users} sub={`${t.customers} customers · ${t.owners} owners`} />
        <KpiCard icon={Store} label="Salons" value={t.salons} />
      </div>

      <TrendChart
        title="Bookings & orders (last 30 days)"
        series={[
          { label: "Bookings", color: colors.hairline, values: data.trends.map((d) => d.bookings) },
          { label: "Marketplace orders", color: colors.creamDim, values: data.trends.map((d) => d.orders) },
        ]}
      />
      <TrendChart
        title="Revenue (last 30 days)"
        series={[
          { label: "Booking revenue", color: colors.hairline, values: data.trends.map((d) => d.bookingRevenue) },
          { label: "Marketplace revenue", color: colors.creamDim, values: data.trends.map((d) => d.orderRevenue) },
        ]}
      />
    </div>
  );
}

export default function AdminApp() {
  const [auth, setAuth] = useState(() => {
    try {
      const saved = localStorage.getItem("adminAuth");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [tab, setTab] = useState("overview");

  if (!auth) {
    return (
      <LoginScreen
        onAuthed={(token, user) => {
          const next = { token, user };
          localStorage.setItem("adminAuth", JSON.stringify(next));
          setAuth(next);
        }}
      />
    );
  }

  return (
    <div style={{ background: colors.bg, minHeight: "100vh" }}>
      <div className="flex items-center justify-between px-4 py-5 sticky top-0 z-10" style={{ background: colors.bg, borderBottom: `3px solid ${colors.hairline}` }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontSize: "1.5rem", fontWeight: 700 }}>TheHub Admin</h1>
        <button
          onClick={() => { localStorage.removeItem("adminAuth"); setAuth(null); }}
          className="p-2.5 rounded-full tap-glass"
          style={{ border: `2px solid ${colors.hairline}` }}
        >
          <LogOut size={18} color={colors.hairline} />
        </button>
      </div>

      <div className="flex gap-2 px-4 pt-3">
        {[
          { id: "overview", label: "Overview" },
          { id: "products", label: "Products" },
          { id: "orders", label: "Orders" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: tab === t.id ? colors.hairline : colors.panelLight, color: tab === t.id ? "#fff" : colors.cream }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab token={auth.token} />}
      {tab === "products" && <ProductsTab token={auth.token} />}
      {tab === "orders" && <OrdersTab token={auth.token} />}
    </div>
  );
}
