const express = require("express");
const db = require("../db");
const paystack = require("../lib/paystack");
const { requireAuth } = require("../middleware/auth");
const { getBalance } = require("../lib/wallet");
const router = express.Router();

const CURRENCY = process.env.PAYSTACK_CURRENCY || "NGN";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

router.get("/me", requireAuth, async (req, res) => {
  try {
    const balance = await getBalance(req.user.id);
    const { rows: transactions } = await db.query(
      "SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
      [req.user.id]
    );
    res.json({ balance, transactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load wallet." });
  }
});

router.post("/fund", requireAuth, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: "A valid amount is required." });
  try {
    const transaction = await paystack.post("/transaction/initialize", {
      email: req.user.email,
      amount: Math.round(amount * 100),
      currency: CURRENCY,
      metadata: { wallet_fund: true, user_id: req.user.id },
      callback_url: `${FRONTEND_URL}/?wallet_success=1`,
    });

    await db.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, paystack_reference, status) VALUES ($1, 'fund', $2, $3, 'pending')`,
      [req.user.id, amount, transaction.reference]
    );

    res.json({ url: transaction.authorization_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't start wallet funding. Check PAYSTACK_SECRET_KEY is set." });
  }
});

module.exports = router;
