const express = require("express");
const multer = require("multer");
const db = require("../db");
const cloudinary = require("../lib/cloudinary");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

function uploadToCloudinary(buffer, resourceType) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: resourceType, folder: "thehub" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

// POST /salons/:id/media - owner uploads a photo or video
router.post("/:id/media", requireAuth, requireRole("owner"), upload.single("file"), async (req, res) => {
  const salonId = req.params.id;
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const { rows } = await db.query("SELECT * FROM salons WHERE id = $1", [salonId]);
    const salon = rows[0];
    if (!salon) return res.status(404).json({ error: "Salon not found" });
    if (salon.owner_id !== req.user.id) return res.status(403).json({ error: "Not your salon" });

    const isVideo = req.file.mimetype.startsWith("video/");
    const result = await uploadToCloudinary(req.file.buffer, isVideo ? "video" : "image");

    const insertResult = await db.query(
      "INSERT INTO salon_media (salon_id, media_type, url, public_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [salonId, isVideo ? "video" : "image", result.secure_url, result.public_id]
    );

    res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't upload media." });
  }
});

// GET /salons/:id/media - public, list a salon's media
router.get("/:id/media", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM salon_media WHERE salon_id = $1 ORDER BY created_at DESC",
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load media." });
  }
});

// DELETE /salons/:id/media/:mediaId - owner deletes one item
router.delete("/:id/media/:mediaId", requireAuth, requireRole("owner"), async (req, res) => {
  const { id: salonId, mediaId } = req.params;
  try {
    const { rows } = await db.query("SELECT * FROM salons WHERE id = $1", [salonId]);
    const salon = rows[0];
    if (!salon) return res.status(404).json({ error: "Salon not found" });
    if (salon.owner_id !== req.user.id) return res.status(403).json({ error: "Not your salon" });

    const mediaResult = await db.query("SELECT * FROM salon_media WHERE id = $1 AND salon_id = $2", [mediaId, salonId]);
    const media = mediaResult.rows[0];
    if (!media) return res.status(404).json({ error: "Media not found" });

    await cloudinary.uploader.destroy(media.public_id, { resource_type: media.media_type });
    await db.query("DELETE FROM salon_media WHERE id = $1", [mediaId]);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't delete media." });
  }
});

module.exports = router;
