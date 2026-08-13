const express = require("express");
const db = require("../db");
const paystack = require("../lib/paystack");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { notifyUser } = require("../lib/notify");
const { debitWallet, getBalance } = require("../lib/wallet");

const router = express.Router();
const CURRENCY = process.env.PAYSTACK_CURRENCY || "NGN";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const DELIVERY_FEE = Number(process.env.MARKETPLACE_DELIVERY_FEE || 1500); // flat fee in naira until courier integration exists
const PREORDER_DAYS = Number(process.env.MARKETPLACE_PREORDER_DAYS || 42); // ~6 weeks — realistic overseas sourcing + shipping time

// GET /orders/saved-address - the customer's most recently used delivery details, for pre-filling checkout
router.get("/saved-address", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT saved_delivery_address, saved_delivery_state, saved_delivery_city, saved_delivery_phone FROM users WHERE id = $1",
      [req.user.id]
    );
    const row = rows[0] || {};
    res.json({
      delivery_address: row.saved_delivery_address || "",
      delivery_state: row.saved_delivery_state || "",
      delivery_city: row.saved_delivery_city || "",
      delivery_phone: row.saved_delivery_phone || "",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load saved address." });
  }
});

// POST /orders/checkout - body: { items: [{product_id, quantity}], delivery_address, delivery_state, delivery_city, delivery_phone, payment_method }
// payment_method is "paystack" (default) or "wallet" - lets accumulated loyalty/referral
// points (already convertible to wallet balance) be spent directly on marketplace products.
router.post("/checkout", requireAuth, async (req, res) => {
  const { items, delivery_address, delivery_state, delivery_city, delivery_phone, payment_method } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "items is required and must be a non-empty array" });
  }
  if (!delivery_address || !delivery_phone) {
    return res.status(400).json({ error: "delivery_address and delivery_phone are required" });
  }

  try {
    const productIds = items.map((i) => i.product_id);
    const { rows: products } = await db.query(
      "SELECT * FROM products WHERE id = ANY($1) AND is_active = true",
      [productIds]
    );

    const lineItems = [];
    let subtotal = 0;
    for (const item of items) {
      const product = products.find((p) => p.id === item.product_id);
      const quantity = parseInt(item.quantity, 10);
      if (!product) return res.status(404).json({ error: `Product ${item.product_id} not found or unavailable` });
      if (!quantity || quantity < 1) return res.status(400).json({ error: `Invalid quantity for ${product.name}` });
      if (product.stock_quantity < quantity) {
        return res.status(400).json({ error: `Only ${product.stock_quantity} left of ${product.name}` });
      }
      subtotal += product.price * quantity;
      lineItems.push({ product, quantity });
    }

    const total = subtotal + DELIVERY_FEE;

    const { rows: orderRows } = await db.query(
      `INSERT INTO product_orders
        (customer_id, status, subtotal, delivery_fee, total, delivery_address, delivery_state, delivery_city, delivery_phone, payment_status, estimated_delivery_days)
       VALUES ($1, 'pending', $2, $3, $4, $5, $6, $7, $8, 'unpaid', $9) RETURNING id`,
      [req.user.id, subtotal, DELIVERY_FEE, total, delivery_address, delivery_state || null, delivery_city || null, delivery_phone, PREORDER_DAYS]
    );
    const orderId = orderRows[0].id;

    await db.query(
      `UPDATE users SET
        saved_delivery_address = $1, saved_delivery_state = $2, saved_delivery_city = $3, saved_delivery_phone = $4
       WHERE id = $5`,
      [delivery_address, delivery_state || null, delivery_city || null, delivery_phone, req.user.id]
    ).catch((e) => console.error("Failed to save default delivery address:", e));

    for (const { product, quantity } of lineItems) {
      await db.query(
        `INSERT INTO product_order_items (order_id, product_id, product_name, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, product.id, product.name, quantity, product.price]
      );
    }

    if (payment_method === "wallet") {
      const balance = await getBalance(req.user.id);
      if (balance < total) {
        await db.query("UPDATE product_orders SET status = 'cancelled' WHERE id = $1", [orderId]);
        return res.status(400).json({ error: `Your wallet balance (₦${balance.toLocaleString()}) doesn't cover this order (₦${total.toLocaleString()}).`, balance });
      }
      const paid = await debitWallet(req.user.id, total, { orderId });
      if (!paid) {
        await db.query("UPDATE product_orders SET status = 'cancelled' WHERE id = $1", [orderId]);
        return res.status(400).json({ error: "Couldn't debit your wallet — try again." });
      }
      await db.query("UPDATE product_orders SET payment_status = 'paid' WHERE id = $1", [orderId]);
      res.json({ paidWithWallet: true, order_id: orderId });
      return;
    }

    try {
      const transaction = await paystack.post("/transaction/initialize", {
        email: req.user.email,
        amount: Math.round(total * 100),
        currency: CURRENCY,
        metadata: { order_id: orderId },
        callback_url: `${FRONTEND_URL}/?order_success=1&order_id=${orderId}`,
      });

      await db.query("UPDATE product_orders SET paystack_reference = $1 WHERE id = $2", [transaction.reference, orderId]);
      res.json({ url: transaction.authorization_url, order_id: orderId });
    } catch (err) {
      console.error(err);
      await db.query("UPDATE product_orders SET status = 'cancelled' WHERE id = $1", [orderId]);
      res.status(500).json({ error: "Couldn't start checkout. Check PAYSTACK_SECRET_KEY is set." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong starting checkout." });
  }
});

// GET /orders/mine - customer's own order history
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const { rows: orders } = await db.query(
      "SELECT * FROM product_orders WHERE customer_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );
    const { rows: items } = await db.query(
      `SELECT oi.*, p.image_url AS product_image_url
       FROM product_order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ANY($1)`,
      [orders.map((o) => o.id)]
    );
    const withItems = orders.map((order) => ({
      ...order,
      items: items.filter((i) => i.order_id === order.id),
    }));
    res.json(withItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load your orders." });
  }
});

// GET /orders - admin only, all orders (optionally filtered by status)
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  const { status } = req.query;
  try {
    let query = `
      SELECT o.*, u.name AS customer_name, u.email AS customer_email
      FROM product_orders o JOIN users u ON u.id = o.customer_id
    `;
    const params = [];
    if (status) {
      params.push(status);
      query += ` WHERE o.status = $${params.length}`;
    }
    query += " ORDER BY o.created_at DESC";
    const { rows: orders } = await db.query(query, params);
    const { rows: items } = await db.query(
      `SELECT oi.*, p.image_url AS product_image_url
       FROM product_order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ANY($1)`,
      [orders.map((o) => o.id)]
    );
    const withItems = orders.map((order) => ({
      ...order,
      items: items.filter((i) => i.order_id === order.id),
    }));
    res.json(withItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load orders." });
  }
});

// PATCH /orders/:id/status - admin only, update fulfillment status / courier info
router.patch("/:id/status", requireAuth, requireAdmin, async (req, res) => {
  const { status, courier_name, courier_tracking_ref, supplier_order_ref } = req.body;
  const validStatuses = ["pending", "processing", "dispatched", "delivered", "cancelled"];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(", ")}` });
  }

  try {
    const { rows: existingRows } = await db.query("SELECT * FROM product_orders WHERE id = $1", [req.params.id]);
    const order = existingRows[0];
    if (!order) return res.status(404).json({ error: "Order not found" });

    const { rows } = await db.query(
      `UPDATE product_orders SET
        status = $1, courier_name = $2, courier_tracking_ref = $3, supplier_order_ref = $4
       WHERE id = $5 RETURNING *`,
      [
        status || order.status,
        courier_name ?? order.courier_name,
        courier_tracking_ref ?? order.courier_tracking_ref,
        supplier_order_ref ?? order.supplier_order_ref,
        req.params.id,
      ]
    );

    if (status && status !== order.status) {
      const statusMessages = {
        processing: "Your order is being prepared for dispatch.",
        dispatched: `Your order is on its way${courier_name ? ` via ${courier_name}` : ""}.`,
        delivered: "Your order has been delivered. Thanks for shopping with TheHub!",
        cancelled: "Your order was cancelled.",
      };
      if (statusMessages[status]) {
        await notifyUser(order.customer_id, {
          type: "order_status",
          title: "Order update",
          body: statusMessages[status],
        });
      }
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't update order." });
  }
});

module.exports = router;
