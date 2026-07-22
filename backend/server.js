require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const salonRoutes = require("./routes/salons");
const bookingRoutes = require("./routes/bookings");
const reviewRoutes = require("./routes/reviews");
const conciergeRoutes = require("./routes/concierge");
const paymentRoutes = require("./routes/payments");
const paystackWebhookRoutes = require("./routes/paystackWebhook");
const adminSeedRoutes = require("./routes/adminSeed");

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: corsOrigin }));

app.use("/webhooks/paystack", express.raw({ type: "application/json" }), paystackWebhookRoutes);

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
app.listen(PORT, () => console.log(`The Hub API running on http://localhost:${PORT}`));
