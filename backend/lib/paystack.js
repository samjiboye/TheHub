// Thin wrapper around the Paystack REST API. Docs: https://paystack.com/docs/api/
const BASE_URL = "https://api.paystack.co";

if (!process.env.PAYSTACK_SECRET_KEY) {
  console.warn("PAYSTACK_SECRET_KEY is not set — payment routes will fail until it's configured.");
}

async function paystackRequest(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok || data.status === false) {
    const err = new Error(data.message || "Paystack request failed");
    err.paystackResponse = data;
    throw err;
  }
  return data.data;
}

module.exports = {
  get: (path) => paystackRequest("GET", path),
  post: (path, body) => paystackRequest("POST", path, body),
};
