const express = require("express");
const multer = require("multer");
const db = require("../db");
const cloudinary = require("../lib/cloudinary");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image", folder: "thehub/products" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

// GET /product-categories - public, list categories
router.get("/product-categories", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM product_categories ORDER BY name ASC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load categories." });
  }
});

// POST /product-categories - admin only
router.post("/product-categories", requireAuth, requireAdmin, async (req, res) => {
  const { name, slug, icon_url } = req.body;
  if (!name || !slug) return res.status(400).json({ error: "name and slug are required" });
  try {
    const { rows } = await db.query(
      "INSERT INTO product_categories (name, slug, icon_url) VALUES ($1, $2, $3) RETURNING *",
      [name, slug, icon_url || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === "23505") return res.status(409).json({ error: "A category with that slug already exists." });
    res.status(500).json({ error: "Couldn't create category." });
  }
});

// GET /products?category=slug - public, browse active products
router.get("/products", async (req, res) => {
  const { category } = req.query;
  try {
    let query = `
      SELECT p.*, c.name AS category_name, c.slug AS category_slug
      FROM products p
      LEFT JOIN product_categories c ON c.id = p.category_id
      WHERE p.is_active = true
    `;
    const params = [];
    if (category) {
      params.push(category);
      query += ` AND c.slug = $${params.length}`;
    }
    query += " ORDER BY p.created_at DESC";
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load products." });
  }
});

// GET /products/:id - public, product detail
router.get("/products/:id", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p LEFT JOIN product_categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Product not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load product." });
  }
});

// POST /products - admin only, create a product with an optional image
router.post("/products", requireAuth, requireAdmin, upload.single("image"), async (req, res) => {
  const { name, description, price, stock_quantity, category_id } = req.body;
  if (!name || !price) return res.status(400).json({ error: "name and price are required" });

  try {
    let image_url = null;
    let image_public_id = null;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      image_url = result.secure_url;
      image_public_id = result.public_id;
    }

    const { rows } = await db.query(
      `INSERT INTO products (category_id, name, description, price, stock_quantity, image_url, image_public_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [category_id || null, name, description || null, price, stock_quantity || 0, image_url, image_public_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't create product." });
  }
});

// PATCH /products/:id - admin only, edit a product (optionally replace the image)
router.patch("/products/:id", requireAuth, requireAdmin, upload.single("image"), async (req, res) => {
  const { name, description, price, stock_quantity, category_id, is_active } = req.body;
  try {
    const { rows: existingRows } = await db.query("SELECT * FROM products WHERE id = $1", [req.params.id]);
    const product = existingRows[0];
    if (!product) return res.status(404).json({ error: "Product not found" });

    let image_url = product.image_url;
    let image_public_id = product.image_public_id;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      if (product.image_public_id) {
        await cloudinary.uploader.destroy(product.image_public_id).catch(() => {});
      }
      image_url = result.secure_url;
      image_public_id = result.public_id;
    }

    const { rows } = await db.query(
      `UPDATE products SET
        name = $1, description = $2, price = $3, stock_quantity = $4,
        category_id = $5, is_active = $6, image_url = $7, image_public_id = $8
       WHERE id = $9 RETURNING *`,
      [
        name ?? product.name,
        description ?? product.description,
        price ?? product.price,
        stock_quantity ?? product.stock_quantity,
        category_id ?? product.category_id,
        is_active === undefined ? product.is_active : is_active === "true" || is_active === true,
        image_url,
        image_public_id,
        req.params.id,
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't update product." });
  }
});

// DELETE /products/:id - admin only
router.delete("/products/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM products WHERE id = $1", [req.params.id]);
    const product = rows[0];
    if (!product) return res.status(404).json({ error: "Product not found" });

    if (product.image_public_id) {
      await cloudinary.uploader.destroy(product.image_public_id).catch(() => {});
    }
    await db.query("DELETE FROM products WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    // Products referenced by past orders can't be hard-deleted (FK constraint) —
    // deactivate instead so order history stays intact.
    if (err.code === "23503") {
      await db.query("UPDATE products SET is_active = false WHERE id = $1", [req.params.id]);
      return res.json({ ok: true, message: "Product has past orders, so it was deactivated instead of deleted." });
    }
    res.status(500).json({ error: "Couldn't delete product." });
  }
});

module.exports = router;
