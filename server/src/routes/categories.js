import express from "express";
import multer from "multer";
import { pool } from "../db.js";
import { requireAuth, requirePermission, optionalAuth } from "../middleware.js";
import { saveImage, removeImages } from "../storage.js";

const router = express.Router();
const FOLDER = "categories";
const guard = [requireAuth, requirePermission("menu")]; // only people allowed to manage the menu can change data

/* ---------- upload: 1 image, max 5 MB, read into memory, then processed by sharp ---------- */
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

// saves the full image + the thumbnail, returns both URLs
async function storeUpload(file) {
  try {
    return await saveImage(file.buffer, FOLDER);
  } catch {
    throw Object.assign(new Error("That file is not a valid image."), { status: 400 });
  }
}

/* ---------- { en, km, ... } helper (accepts JSON text from the form, or an object) ---------- */
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
    if (s) out[lang] = s; // empty translations are dropped
  }
  return out;
}

/* ================= GET: public list (hidden categories only for menu managers) ================= */
router.get("/", optionalAuth, async (req, res) => {
  const all = req.permissions?.includes("menu");
  const { rows } = await pool.query(
    `SELECT * FROM categories ${all ? "" : "WHERE status = 1"} ORDER BY id ASC`
  );
  res.json(rows);
});

/* ================= POST: create (img + thumbnail created from the uploaded file) ================= */
router.post("/", ...guard, uploadOne, async (req, res) => {
  const name = parseI18n(req.body.name, 120);
  const description = parseI18n(req.body.description, 500) || {};
  if (!name?.en) return res.status(400).json({ error: "The English name is required." });
  const status = Number(req.body.status) === 0 ? 0 : 1;

  // no file chosen -> img and thumbnail stay NULL
  const files = req.file ? await storeUpload(req.file) : { img: null, thumbnail: null };

  try {
    const { rows } = await pool.query(
      `INSERT INTO categories (name, description, img, thumbnail, status, created_at, updated_at)
       VALUES ($1::jsonb, $2::jsonb, $3, $4, $5, now(), now())
       RETURNING *`,
      [JSON.stringify(name), JSON.stringify(description), files.img, files.thumbnail, status]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    await removeImages(files.img, files.thumbnail); // the insert failed, so delete the files we just saved
    throw err;
  }
});

/* ================= PUT: update (a new file replaces the old img + thumbnail) ================= */
router.put("/:id", ...guard, uploadOne, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });

  const { rows: existing } = await pool.query("SELECT * FROM categories WHERE id = $1", [id]);
  if (!existing[0]) return res.status(404).json({ error: "Category not found." });

  const name = parseI18n(req.body.name, 120);
  const description = parseI18n(req.body.description, 500) || {};
  if (!name?.en) return res.status(400).json({ error: "The English name is required." });
  const status = Number(req.body.status) === 0 ? 0 : 1;

  // start from what is already stored
  let img = existing[0].img;
  let thumbnail = existing[0].thumbnail;
  let uploaded = null;

  if (req.file) {
    uploaded = await storeUpload(req.file); // new file chosen
    img = uploaded.img;
    thumbnail = uploaded.thumbnail;
  } else if (req.body.removeImage === "1") {
    img = null; // "Remove image" clicked
    thumbnail = null;
  } // otherwise: keep the current image untouched

  try {
    const { rows } = await pool.query(
      `UPDATE categories
       SET name = $1::jsonb, description = $2::jsonb, img = $3, thumbnail = $4, status = $5, updated_at = now()
       WHERE id = $6
       RETURNING *`,
      [JSON.stringify(name), JSON.stringify(description), img, thumbnail, status, id]
    );
    // only after the database update succeeded: delete the OLD files
    if (img !== existing[0].img) await removeImages(existing[0].img, existing[0].thumbnail);
    res.json(rows[0]);
  } catch (err) {
    if (uploaded) await removeImages(uploaded.img, uploaded.thumbnail); // update failed, drop the new files
    throw err;
  }
});

/* ================= DELETE: also deletes the image files ================= */
router.delete("/:id", ...guard, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });

  try {
    const { rows } = await pool.query("DELETE FROM categories WHERE id = $1 RETURNING *", [id]);
    if (!rows[0]) return res.status(404).json({ error: "Category not found." });
    await removeImages(rows[0].img, rows[0].thumbnail);
    res.json({ message: "Category deleted successfully", id });
  } catch (err) {
    if (err.code === "23503") // foreign key: menu items still use this category
      return res.status(409).json({ error: "This category is used by menu items. Move or delete them first." });
    throw err;
  }
});

export default router;