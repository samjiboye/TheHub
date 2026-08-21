const express = require("express");
const multer = require("multer");
const db = require("../db");
const cloudinary = require("../lib/cloudinary");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/"));
  },
});

function uploadToCloudinary(buffer, resourceType) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: resourceType, folder: "thehub" },
      (err, result) => {
        if (err) return reject(err);
        // Serve a compressed, auto-format version instead of the original upload —
        // meaningfully smaller downloads on the mobile data most customers are on.
        // Videos use a different delivery pipeline, so this only applies to images.
        if (resourceType !== "video") {
          result.secure_url = result.secure_url.replace("/upload/", "/upload/f_auto,q_auto/");
        }
        resolve(result);
      }
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

// POST /salons/:id/profile-picture - owner uploads/replaces the salon's profile picture
router.post("/:id/profile-picture", requireAuth, requireRole("owner"), upload.single("file"), async (req, res) => {
  const salonId = req.params.id;
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const { rows } = await db.query("SELECT * FROM salons WHERE id = $1", [salonId]);
    const salon = rows[0];
    if (!salon) return res.status(404).json({ error: "Salon not found" });
    if (salon.owner_id !== req.user.id) return res.status(403).json({ error: "Not your salon" });

    const result = await uploadToCloudinary(req.file.buffer, "image");

    if (salon.profile_image_public_id) {
      await cloudinary.uploader.destroy(salon.profile_image_public_id, { resource_type: "image" }).catch(() => {});
    }

    const updateResult = await db.query(
      "UPDATE salons SET profile_image_url = $1, profile_image_public_id = $2 WHERE id = $3 RETURNING *",
      [result.secure_url, result.public_id, salonId]
    );

    res.status(201).json(updateResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't upload profile picture." });
  }
});

// DELETE /salons/:id/profile-picture - owner removes the salon's profile picture
router.delete("/:id/profile-picture", requireAuth, requireRole("owner"), async (req, res) => {
  const salonId = req.params.id;
  try {
    const { rows } = await db.query("SELECT * FROM salons WHERE id = $1", [salonId]);
    const salon = rows[0];
    if (!salon) return res.status(404).json({ error: "Salon not found" });
    if (salon.owner_id !== req.user.id) return res.status(403).json({ error: "Not your salon" });

    if (salon.profile_image_public_id) {
      await cloudinary.uploader.destroy(salon.profile_image_public_id, { resource_type: "image" }).catch(() => {});
    }

    const updateResult = await db.query(
      "UPDATE salons SET profile_image_url = NULL, profile_image_public_id = NULL WHERE id = $1 RETURNING *",
      [salonId]
    );

    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't remove profile picture." });
  }
});

module.exports = router;
