require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const salonRoutes = require("./routes/salons");
const bookingRoutes = require("./routes/bookings");
const reviewRoutes = require("./routes/reviews");
const conciergeRoutes = require("./routes/concierge");
const paymentRoutes = require("./routes/payments");
const adminSeedRoutes =require("./routes/adminsed");
const stripeWebhookRoutes = require("./routes/stripeWebhook");

const app = express();

// In production, set CORS_ORIGIN to your deployed frontend's URL (e.g. https://salonconnect.vercel.app).
// Left as "*" by default so local development keeps working with no setup.
const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: corsOrigin }));

// IMPORTANT: the Stripe webhook needs the raw, unparsed request body to verify its
// signature — it must be mounted before express.json() below, not after.
app.use("/webhooks/stripe", express.raw({ type: "application/json" }), stripeWebhookRoutes);

app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/salons", salonRoutes);
app.use("/bookings", bookingRoutes);
app.use("/reviews", reviewRoutes);
app.use("/concierge", conciergeRoutes);
app.use("/payments", paymentRoutes);
app.use("/admin", adminSeedRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`SalonConnect API running on http://localhost:${PORT}`));
