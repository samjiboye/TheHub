const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

// POST /auth/signup
router.post("/signup", (req, res) => {
  const { name, email, phone, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ error: "An account with that email already exists" });

  const password_hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare("INSERT INTO users (name, email, phone, role, password_hash) VALUES (?, ?, ?, ?, ?)")
    .run(name, email, phone || null, role === "owner" ? "owner" : "customer", password_hash);

  const user = { id: info.lastInsertRowid, name, email, role: role === "owner" ? "owner" : "customer" };
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: "30d" });
  res.status(201).json({ user, token });
});

// POST /auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!row || !bcrypt.compareSync(password || "", row.password_hash)) {
    return res.status(401).json({ error: "Incorrect email or password" });
  }
  const user = { id: row.id, name: row.name, email: row.email, role: row.role };
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: "30d" });
  res.json({ user, token });
});

module.exports = router;
