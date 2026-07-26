const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { JWT_SECRET } = require("../middleware/auth");
const router = express.Router();

// POST /auth/signup
router.post("/signup", async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }
  try {
    const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "An account with that email already exists" });
    }
    const password_hash = bcrypt.hashSync(password, 10);
    const result = await db.query(
      "INSERT INTO users (name, email, phone, role, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [name, email, phone || null, role === "owner" ? "owner" : "customer", password_hash]
    );
    const user = { id: result.rows[0].id, name, email, role: role === "owner" ? "owner" : "customer" };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: "30d" });
    res.status(201).json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't create that account." });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    const row = result.rows[0];
    if (!row || !bcrypt.compareSync(password || "", row.password_hash)) {
      return res.status(401).json({ error: "Incorrect email or password" });
    }
    const user = { id: row.id, name: row.name, email: row.email, role: row.role };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: "30d" });
    res.json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't log in." });
  }
});

const crypto = require("crypto");
const { sendPasswordResetEmail } = require("../lib/email");
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// POST /auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email is required" });

  try {
    const result = await db.query("SELECT id FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    // Always respond the same way, whether or not the email exists,
    // so we don't leak which emails are registered.
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await db.query(
        "UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3",
        [token, expires, user.id]
      );
      const resetLink = `${FRONTEND_URL}/?token=${token}`;
      await sendPasswordResetEmail(email, resetLink);
    }

    res.json({ ok: true, message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't process that request." });
  }
});

// POST /auth/reset-password
router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: "token and password are required" });
  }

  try {
    const result = await db.query(
      "SELECT id, reset_token_expires FROM users WHERE reset_token = $1",
      [token]
    );
    const user = result.rows[0];

    if (!user || new Date(user.reset_token_expires) < new Date()) {
      return res.status(400).json({ error: "This reset link is invalid or has expired." });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    await db.query(
      "UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2",
      [password_hash, user.id]
    );

    res.json({ ok: true, message: "Password updated. You can now log in." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't reset the password." });
  }
});

module.exports = router;
