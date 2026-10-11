import express from "express";
import multer from "multer";
import { pool } from "../db.js";
import { requireAuth, requirePermission, optionalAuth } from "../middleware.js";
import { saveImage, removeImages } from "../storage.js";

const router = express.Router();
const FOLDER = "drinks_types";
const guard = [requireAuth, requirePermission("menu")];

// Catches errors from async handlers (Express 4 does not do this by itself).
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(`[drinks-types] ${req.method} ${req.originalUrl}:`, err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  });

// The DB columns are NOT NULL DEFAULT '' -> never store null, use "".
const noFile = { img: "", thumbnail: "" };
const dropFiles = (img, thumb) => removeImages(img || null, thumb || null);

/* ---------- upload: 1 image, max 5 MB ---------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only JPG, PNG, WebP or GIF images are allowed.")),
});

const uploadOne = (req, res, next) =>
  upload.single("image")(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE")
      return res.status(413).json({ error: "The image is too large (max 5 MB)." });
    res.status(400).json({ error: err.message || "Upload failed." });
  });

async function storeUpload(file) {
  try {
    return await saveImage(file.buffer, FOLDER);
  } catch {
    throw Object.assign(new Error("That file is not a valid image."), { status: 400 });
  }
}

/* ---------- { en, km, ... } helper ---------- */
const LANG_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
function parseI18n(raw, max) {
  let obj;
  try {
    obj = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    obj = null;
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const out = {};
  for (const [lang, text] of Object.entries(obj)) {
    if (!LANG_RE.test(lang)) continue;
    const s = String(text ?? "").trim().slice(0, max);
    if (s) out[lang] = s;
  }
  return out;
}

/* ================= GET: list ================= */
router.get(
  "/",
  optionalAuth,
  wrap(async (req, res) => {
    const all = req.permissions?.includes("menu");
    const { rows } = await pool.query(
      `SELECT * FROM drinks_type ${all ? "" : "WHERE status = 1"} ORDER BY sort_num ASC, id ASC`
    );
    res.json(rows);
  })
);

/* ================= POST: create ================= */
router.post(
  "/",
  ...guard,
  uploadOne,
  wrap(async (req, res) => {
    const name = parseI18n(req.body.name, 120);
    const description = parseI18n(req.body.description, 500) || {};
    if (!name?.en) return res.status(400).json({ error: "The English name is required." });
    const status = Number(req.body.status) === 0 ? 0 : 1;

    const files = req.file ? await storeUpload(req.file) : noFile;

    try {
      const { rows } = await pool.query(
        `INSERT INTO drinks_type (name, description, img, thumbnail, status)
         VALUES ($1::jsonb, $2::jsonb, $3, $4, $5)
         RETURNING *`,
        [JSON.stringify(name), JSON.stringify(description), files.img, files.thumbnail, status]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      await dropFiles(files.img, files.thumbnail); // insert failed: delete the files we just saved
      throw err;
    }
  })
);

/* ================= PUT: update ================= */
router.put(
  "/:id",
  ...guard,
  uploadOne,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });

    const { rows: existing } = await pool.query("SELECT * FROM drinks_type WHERE id = $1", [id]);
    if (!existing[0]) return res.status(404).json({ error: "Drinks type not found." });

    const name = parseI18n(req.body.name, 120);
    const description = parseI18n(req.body.description, 500) || {};
    if (!name?.en) return res.status(400).json({ error: "The English name is required." });
    const status = Number(req.body.status) === 0 ? 0 : 1;

    let img = existing[0].img;
    let thumbnail = existing[0].thumbnail;
    let uploaded = null;

    if (req.file) {
      uploaded = await storeUpload(req.file); // new file chosen
      img = uploaded.img;
      thumbnail = uploaded.thumbnail;
    } else if (req.body.removeImage === "1") {
      img = ""; // "Remove image" clicked
      thumbnail = "";
    } // otherwise keep the current image

    try {
      const { rows } = await pool.query(
        `UPDATE drinks_type
         SET name = $1::jsonb, description = $2::jsonb, img = $3, thumbnail = $4, status = $5
         WHERE id = $6
         RETURNING *`,
        [JSON.stringify(name), JSON.stringify(description), img, thumbnail, status, id]
      );
      // only after the DB update succeeded: delete the OLD files
      if (img !== existing[0].img) await dropFiles(existing[0].img, existing[0].thumbnail);
      res.json(rows[0]);
    } catch (err) {
      if (uploaded) await dropFiles(uploaded.img, uploaded.thumbnail);
      throw err;
    }
  })
);

/* ================= DELETE ================= */
router.delete(
  "/:id",
  ...guard,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });

    const { rows } = await pool.query("DELETE FROM drinks_type WHERE id = $1 RETURNING *", [id]);
    if (!rows[0]) return res.status(404).json({ error: "Drinks type not found." });
    await dropFiles(rows[0].img, rows[0].thumbnail);
    res.json({ message: "Drinks type deleted successfully", id });
  })
);

export default router;