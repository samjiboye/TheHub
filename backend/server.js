require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/auth");
const salonRoutes = require("./routes/salons");
const mediaRoutes = require("./routes/media");
const bookingRoutes = require("./routes/bookings");
const reviewRoutes = require("./routes/reviews");
const conciergeRoutes = require("./routes/concierge");
const paymentRoutes = require("./routes/payments");
const paystackWebhookRoutes = require("./routes/paystackWebhook");
const adminSeedRoutes = require("./routes/adminSeed");
const notificationRoutes = require("./routes/notifications");
const { startReminderJob } = require("./lib/reminders");
const walletRoutes = require("./routes/wallet");
const { startAutoReleaseJob } = require("./lib/autoRelease");
const productRoutes = require("./routes/products");
const marketplaceOrderRoutes = require("./routes/marketplaceOrders");
const adminAnalyticsRoutes = require("./routes/adminAnalytics");
const userRoutes = require("./routes/users");
const conversationRoutes = require("./routes/conversations");
const feedbackRoutes = require("./routes/feedback");

const app = express();

// Render sits in front of this app as a reverse proxy, so incoming requests
// carry an X-Forwarded-For header set by Render rather than the real client.
// Without telling Express to trust exactly one hop of proxy, express-rate-limit
// can't safely determine the real client IP and logs ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
// on every rate-limited route (login, signup, uploads, Aria, check-in, admin).
// "1" (not "true") is deliberate -- it trusts only Render's own proxy, not an
// arbitrary chain, which is what actually prevents IP-spoofing via a forged header.
app.set("trust proxy", 1);

// Security headers - safe defaults for a JSON-only API (no HTML pages
// served here, so the default Content-Security-Policy has nothing to
// conflict with).
app.use(helmet());

const corsOrigin = process.env.CORS_ORIGIN || "*";
if (corsOrigin === "*") {
  console.warn("CORS_ORIGIN is not set — accepting requests from any origin. Set it to your real frontend URL(s) in production.");
}
app.use(cors({ origin: corsOrigin }));

app.use("/webhooks/paystack", express.raw({ type: "application/json" }), paystackWebhookRoutes);

app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/salons", salonRoutes);
app.use("/salons", mediaRoutes);
app.use("/bookings", bookingRoutes);
app.use("/reviews", reviewRoutes);
app.use("/concierge", conciergeRoutes);
app.use("/payments", paymentRoutes);
app.use("/admin", adminSeedRoutes);
app.use("/notifications", notificationRoutes);
app.use("/wallet", walletRoutes);
app.use("/", productRoutes);
app.use("/orders", marketplaceOrderRoutes);
app.use("/admin", adminAnalyticsRoutes);
app.use("/users", userRoutes);
app.use("/conversations", conversationRoutes);
app.use("/feedback", feedbackRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`The Hub API running on http://localhost:${PORT}`));
startReminderJob();
startAutoReleaseJob();
