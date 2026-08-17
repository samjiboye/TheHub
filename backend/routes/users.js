const express = require("express");
const multer = require("multer");
const db = require("../db");
const cloudinary = require("../lib/cloudinary");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, file.mimetype.startsWith("image/"));
  },
});

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image", folder: "thehub/profiles" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

// GET /users/me - full profile for the logged-in user, any role
router.get("/me", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id, name, email, phone, role, profile_photo_url, address_state, address_city, address_street, referral_code FROM users WHERE id = $1",
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load profile." });
  }
});

// PUT /users/me - update editable fields (email is intentionally not editable here -
// it's the login identifier, changing it needs its own verified flow to stay safe)
router.put("/me", requireAuth, async (req, res) => {
  const { name, phone, address_state, address_city, address_street } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE users SET
         name = COALESCE($1, name),
         phone = $2,
         address_state = $3,
         address_city = $4,
         address_street = $5
       WHERE id = $6
       RETURNING id, name, email, phone, role, profile_photo_url, address_state, address_city, address_street, referral_code`,
      [name || null, phone || null, address_state || null, address_city || null, address_street || null, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't update profile." });
  }
});

// POST /users/me/photo - upload or replace profile photo
router.post("/me/photo", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const result = await uploadToCloudinary(req.file.buffer);
    await db.query("UPDATE users SET profile_photo_url = $1 WHERE id = $2", [result.secure_url, req.user.id]);
    res.json({ profile_photo_url: result.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't upload photo." });
  }
});

module.exports = router;
