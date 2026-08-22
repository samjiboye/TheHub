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

module.exports = { loginLimiter, authLimiter, uploadLimiter };
