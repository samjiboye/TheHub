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

module.exports = router;
