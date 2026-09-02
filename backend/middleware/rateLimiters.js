const rateLimit = require("express-rate-limit");

// Login is the classic brute-force target - keep this tight. 10 attempts
// per 15 minutes per IP is enough for a real person who mistypes their
// password a few times, but not enough to meaningfully guess one.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts. Please try again in a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Signup / forgot-password / reset-password: looser since these aren't a
// brute-force target the same way, but still capped to stop spam account
// creation (e.g. farming referral welcome bonuses) and email-bombing abuse.
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { error: "Too many uploads. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user ? `user:${req.user.id}` : req.ip),
});

const ariaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: "Aria is getting a lot of questions right now — please try again in a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Check-in codes are only 4 digits (9,000 possibilities). Without this, a
// customer could script through every combination against their own booking
// in seconds and fake a "checked in" visit to farm the loyalty reward without
// ever showing up. Keyed per-user (not just IP) since this is specifically
// guarding against an authenticated user attacking their own booking. At 10
// attempts / 15 min, brute-forcing all 9,000 codes would take over 9 days.
const checkInLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many attempts. Please wait a few minutes and try again." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user ? `user:${req.user.id}` : req.ip),
});

// /admin/seed and /admin/promote are gated by ADMIN_KEY rather than a user
// login, so there's no natural per-account throttling. This adds a floor so
// the key can't be brute-forced even if it were ever weak or partially leaked.
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter, authLimiter, uploadLimiter, ariaLimiter, checkInLimiter, adminLimiter };
