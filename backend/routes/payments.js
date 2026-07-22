const express = require("express");
const db = require("../db");
const paystack = require("../lib/paystack");
const { requireAuth, requireRole } = require("../middleware/auth");
const router = express.Router();
const BOOKING_FEE = 2.5;
const COMMISSION_RATE = 0.15;
const CURRENCY = process.env.PAYSTACK_CURRENCY || "NGN";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

router.get("/banks", async (req, res) => {
  try {
    const banks = await paystack.get(`/bank?country=nigeria&currency=${CURRENCY}`);
    res.json(banks.map((b) => ({ name: b.name, code: b.code })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load bank list. Check PAYSTACK_SECRET_KEY is set." });
  }
});

router.get("/resolve-account", requireAuth, requireRole("owner"), async (req, res) => {
  const { account_number, bank_code } = req.query;
  if (!account_number || !bank_code) {
    return res.status(400).json({ error: "account_number and bank_code are required" });
  }
  try {
    const result = await paystack.get(
      `/bank/resolve?account_number=${encodeURIComponent(account_number)}&bank_code=${encodeURIComponent(bank_code)}`
    );
    res.json({ account_name: result.account_name });
  } catch (err) {
    res.status(400).json({ error: "Couldn't verify that account. Double-check the number and bank." });
  }
});

router.post("/connect", requireAuth, requireRole("owner"),
