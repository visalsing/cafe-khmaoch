import express from "express";
import multer from "multer";
import { pool } from "../db.js";
import { requireAuth, requirePermission } from "../middleware.js";
import { saveImage, removeImages } from "../storage.js";

const router = express.Router();
const FOLDER = "qr";
const guard = [requireAuth, requirePermission("pages")]; // same permission as maps / hero slides

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

const LANG_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
function parseI18n(raw, max) {
  let obj;
  try { obj = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { obj = null; }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const out = {};
  for (const [lang, text] of Object.entries(obj)) {
    if (!LANG_RE.test(lang)) continue;
    const s = String(text ?? "").trim().slice(0, max);
    if (s) out[lang] = s;
  }
  return out;
}

// "" = no link, null = invalid, otherwise the cleaned http(s) link
function cleanUrl(raw) {
  const s = String(raw ?? "").trim().slice(0, 500);
  if (!s) return "";
  try {
    return /^https?:$/.test(new URL(s).protocol) ? s : null;
  } catch {
    return null;
  }
}

/* PUBLIC: the one QR shown on the website (or null) */
router.get("/selected", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM qr_images WHERE is_selected = 1 AND status = 1 LIMIT 1"
  );
  res.json(rows[0] || null);
});

/* LIST (dashboard only) */
router.get("/", ...guard, async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM qr_images ORDER BY sort_num ASC, id ASC");
  res.json(rows);
});

/* CREATE (never selected on creation: use the Select button) */
router.post("/", ...guard, uploadOne, async (req, res) => {
  const name = parseI18n(req.body.name, 120);
  const description = parseI18n(req.body.description, 500) || {};
  if (!name?.en) return res.status(400).json({ error: "The English name is required." });
  const url = cleanUrl(req.body.url);
  if (url === null) return res.status(400).json({ error: "The URL must start with http:// or https://." });
  const status = Number(req.body.status) === 0 ? 0 : 1;

  const files = req.file ? await storeUpload(req.file) : { img: "", thumbnail: "" };
  try {
    const { rows } = await pool.query(
      `INSERT INTO qr_images (name, description, img, thumbnail, url, status)
       VALUES ($1::jsonb, $2::jsonb, $3, $4, $5, $6) RETURNING *`,
      [JSON.stringify(name), JSON.stringify(description), files.img, files.thumbnail, url, status]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    await removeImages(files.img, files.thumbnail);
    throw err;
  }
});

/* UPDATE */
router.put("/:id", ...guard, uploadOne, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });
  const { rows: existing } = await pool.query("SELECT * FROM qr_images WHERE id = $1", [id]);
  if (!existing[0]) return res.status(404).json({ error: "QR code not found." });

  const name = parseI18n(req.body.name, 120);
  const description = parseI18n(req.body.description, 500) || {};
  if (!name?.en) return res.status(400).json({ error: "The English name is required." });
  const url = cleanUrl(req.body.url);
  if (url === null) return res.status(400).json({ error: "The URL must start with http:// or https://." });
  const status = Number(req.body.status) === 0 ? 0 : 1;

  let img = existing[0].img;
  let thumbnail = existing[0].thumbnail;
  let uploaded = null;
  if (req.file) {
    uploaded = await storeUpload(req.file);
    img = uploaded.img;
    thumbnail = uploaded.thumbnail;
  } else if (req.body.removeImage === "1") {
    img = "";
    thumbnail = "";
  }

  if (existing[0].is_selected === 1 && (status === 0 || !img))
    return res.status(409).json({ error: "This QR is selected on the website. Select another QR first." });

  try {
    const { rows } = await pool.query(
      `UPDATE qr_images
       SET name=$1::jsonb, description=$2::jsonb, img=$3, thumbnail=$4, url=$5, status=$6
       WHERE id=$7 RETURNING *`,
      [JSON.stringify(name), JSON.stringify(description), img, thumbnail, url, status, id]
    );
    if (img !== existing[0].img) await removeImages(existing[0].img, existing[0].thumbnail);
    res.json(rows[0]);
  } catch (err) {
    if (uploaded) await removeImages(uploaded.img, uploaded.thumbnail);
    throw err;
  }
});

/* SELECT: exactly one selected, all others are unselected, in one transaction */
router.put("/:id/select", ...guard, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT * FROM qr_images WHERE id = $1 FOR UPDATE", [id]);
    if (!rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "QR code not found." });
    }
    if (Number(rows[0].status) !== 1 || !rows[0].img) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Only an active QR with an image can be selected." });
    }
    await client.query("UPDATE qr_images SET is_selected = 0 WHERE is_selected = 1 AND id <> $1", [id]);
    const { rows: done } = await client.query(
      "UPDATE qr_images SET is_selected = 1 WHERE id = $1 RETURNING *", [id]
    );
    await client.query("COMMIT");
    res.json(done[0]);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
});

/* DELETE */
router.delete("/:id", ...guard, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });

  const { rows: existing } = await pool.query("SELECT is_selected FROM qr_images WHERE id = $1", [id]);
  if (!existing[0]) return res.status(404).json({ error: "QR code not found." });
  if (existing[0].is_selected === 1)
    return res.status(409).json({ error: "This QR is selected on the website. Select another QR first." });

  const { rows } = await pool.query("DELETE FROM qr_images WHERE id = $1 RETURNING *", [id]);
  await removeImages(rows[0].img, rows[0].thumbnail);
  res.json({ message: "QR code deleted successfully", id });
});

export default router;