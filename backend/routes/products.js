const express = require("express");
const multer = require("multer");
const db = require("../db");
const cloudinary = require("../lib/cloudinary");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const DELIVERY_FEE = Number(process.env.MARKETPLACE_DELIVERY_FEE || 1500);
const PREORDER_DAYS = Number(process.env.MARKETPLACE_PREORDER_DAYS || 28);

// GET /marketplace/config - public, so the frontend never has to hardcode/guess these values
router.get("/marketplace/config", (req, res) => {
  res.json({ deliveryFee: DELIVERY_FEE, preorderDays: PREORDER_DAYS });
});

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image", folder: "thehub/products" },
      (err, result) => {
        if (err) return reject(err);
        // Serve a compressed, auto-format version instead of the original upload —
        // meaningfully smaller downloads on the mobile data most customers are on.
        result.secure_url = result.secure_url.replace("/upload/", "/upload/f_auto,q_auto/");
        resolve(result);
      }
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
      SELECT p.*, c.name AS category_name, c.slug AS category_slug,
        COALESCE(r.avg_rating, 0) AS avg_rating, COALESCE(r.review_count, 0) AS review_count
      FROM products p
      LEFT JOIN product_categories c ON c.id = p.category_id
      LEFT JOIN (
        SELECT product_id, AVG(rating)::numeric(2,1) AS avg_rating, COUNT(*) AS review_count
        FROM product_reviews GROUP BY product_id
      ) r ON r.product_id = p.id
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

// GET /products/:id - public, product detail (includes gallery images beyond the cover photo)
router.get("/products/:id", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
        COALESCE(r.avg_rating, 0) AS avg_rating, COALESCE(r.review_count, 0) AS review_count
       FROM products p
       LEFT JOIN product_categories c ON c.id = p.category_id
       LEFT JOIN (
         SELECT product_id, AVG(rating)::numeric(2,1) AS avg_rating, COUNT(*) AS review_count
         FROM product_reviews GROUP BY product_id
       ) r ON r.product_id = p.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Product not found" });

    const { rows: imageRows } = await db.query(
      "SELECT id, image_url, position FROM product_images WHERE product_id = $1 ORDER BY position ASC, id ASC",
      [req.params.id]
    );
    rows[0].images = imageRows;
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load product." });
  }
});

// GET /products/:id/reviews - public
router.get("/products/:id/reviews", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT pr.id, pr.rating, pr.comment, pr.created_at, u.name AS customer_name
       FROM product_reviews pr JOIN users u ON u.id = pr.customer_id
       WHERE pr.product_id = $1
       ORDER BY pr.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load reviews." });
  }
});

// POST /products/:id/reviews - auth required, must be a delivered order containing this product
router.post("/products/:id/reviews", requireAuth, async (req, res) => {
  const { order_id, rating, comment } = req.body;
  const ratingNum = parseInt(rating, 10);
  if (!order_id || !ratingNum || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: "order_id and a rating from 1-5 are required" });
  }
  try {
    const { rows: orderRows } = await db.query(
      `SELECT o.* FROM product_orders o
       JOIN product_order_items oi ON oi.order_id = o.id
       WHERE o.id = $1 AND o.customer_id = $2 AND o.status = 'delivered' AND oi.product_id = $3`,
      [order_id, req.user.id, req.params.id]
    );
    if (!orderRows[0]) {
      return res.status(403).json({ error: "You can only review products from your own delivered orders." });
    }

    const { rows } = await db.query(
      `INSERT INTO product_reviews (product_id, customer_id, order_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, req.user.id, order_id, ratingNum, comment || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === "23505") return res.status(409).json({ error: "You've already reviewed this product for this order." });
    res.status(500).json({ error: "Couldn't submit review." });
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

// POST /products/:id/images - admin only, add extra gallery photos (up to 8 per request)
router.post("/products/:id/images", requireAuth, requireAdmin, upload.array("images", 8), async (req, res) => {
  try {
    const { rows: productRows } = await db.query("SELECT id FROM products WHERE id = $1", [req.params.id]);
    if (!productRows[0]) return res.status(404).json({ error: "Product not found" });
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: "No images provided" });

    const { rows: posRows } = await db.query(
      "SELECT COALESCE(MAX(position), -1) AS max_pos FROM product_images WHERE product_id = $1",
      [req.params.id]
    );
    let nextPos = posRows[0].max_pos + 1;

    const inserted = [];
    for (const file of req.files) {
      const result = await uploadToCloudinary(file.buffer);
      const { rows } = await db.query(
        `INSERT INTO product_images (product_id, image_url, image_public_id, position)
         VALUES ($1, $2, $3, $4) RETURNING id, image_url, position`,
        [req.params.id, result.secure_url, result.public_id, nextPos]
      );
      inserted.push(rows[0]);
      nextPos++;
    }
    res.status(201).json(inserted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't upload photos." });
  }
});

// DELETE /products/:id/images/:imageId - admin only, remove one gallery photo
router.delete("/products/:id/images/:imageId", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM product_images WHERE id = $1 AND product_id = $2",
      [req.params.imageId, req.params.id]
    );
    const image = rows[0];
    if (!image) return res.status(404).json({ error: "Photo not found" });

    if (image.image_public_id) {
      await cloudinary.uploader.destroy(image.image_public_id).catch(() => {});
    }
    await db.query("DELETE FROM product_images WHERE id = $1", [req.params.imageId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't delete photo." });
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
