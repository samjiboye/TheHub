const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

// Fixed demo accounts so a kid tapping through the app never has to type an email or
// password. The backend seed script (`npm run seed`) creates the owner account below.
const DEMO_CUSTOMER = { name: "Guest", email: "guest@thehub.demo", password: "guest1234" };
const DEMO_OWNER = { email: "owner@thehub.demo", password: "demo1234" };

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Logs in a demo account, creating it on first run (signup), then reusing it after.
async function ensureDemoAuth({ name, email, password, role }) {
  try {
    const { token } = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    return token;
  } catch (e) {
    const { token } = await apiFetch("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role }),
    });
    return token;
  }
}
export { apiFetch, ensureDemoAuth, API_BASE, DEMO_CUSTOMER, DEMO_OWNER };
