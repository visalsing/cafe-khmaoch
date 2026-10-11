import express from "express";
import multer from "multer";
import { pool } from "../db.js";
import { requireAuth, requirePermission, optionalAuth } from "../middleware.js";
import { saveImage, removeImages } from "../storage.js";
import { seedHero } from "../Seed/heroSeed.js";

const router = express.Router();
const FOLDER = "hero"; // must also be allowed in storage.js
const PERMISSION = "hero"; // change to the permission your dashboard uses for this page
const guard = [requireAuth, requirePermission(PERMISSION)];

// Catches errors from async handlers (Express 4 does not do this by itself).
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(`[hero] ${req.method} ${req.originalUrl}:`, err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  });

// Only delete files that live on OUR server (seed slides use external URLs).
const isLocal = (p) => typeof p === "string" && p.startsWith("/");
const dropFiles = (img, thumb) =>
  removeImages(isLocal(img) ? img : null, isLocal(thumb) ? thumb : null);

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
  } catch (err) {
    console.error("[hero] saveImage failed:", err);
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

const pick = (obj, lang) => (obj && (obj[lang] || obj.en)) || "";

// Reads + validates the text fields shared by POST and PUT.
function readFields(body) {
  const title = parseI18n(body.title, 120);
  if (!title?.en) return { error: "The English title is required." };
  const tag = parseI18n(body.tag, 60) || {};
  const text = parseI18n(body.text, 300) || {};
  const cta = parseI18n(body.cta, 40) || {};

  const link = String(body.link ?? "").trim().slice(0, 200);
  if (link && !/^(#|\/|https?:\/\/)/i.test(link))
    return { error: "The link must start with #, / or http(s)://" };

  const status = Number(body.status) === 0 ? 0 : 1;
  return { v: { title, tag, text, cta, link, status } };
}

/* ================= GET =================
   - public:  GET /api/hero?lang=km   -> visible slides, already translated to plain strings
   - manager: GET /api/hero?raw=1     -> every slide with the full { en, km, ... } objects
*/
router.get(
  "/",
  optionalAuth,
  wrap(async (req, res) => {
    const manager = req.permissions?.includes(PERMISSION);

    if (req.query.raw === "1") {
      if (!manager) return res.status(403).json({ error: "Not allowed." });
      const { rows } = await pool.query("SELECT * FROM hero_slides ORDER BY sort_num ASC, id ASC");
      return res.json(rows);
    }

    const lang = LANG_RE.test(String(req.query.lang || "")) ? String(req.query.lang) : "en";
    const { rows } = await pool.query(
      "SELECT * FROM hero_slides WHERE status = 1 ORDER BY sort_num ASC, id ASC"
    );
    res.json(
      rows.map((r) => ({
        id: r.id,
        tag: pick(r.tag, lang),
        title: pick(r.title, lang),
        text: pick(r.text, lang),
        cta: pick(r.cta, lang),
        link: r.link,
        img: r.img,
      }))
    );
  })
);

/* ================= PUT /reorder  { ids: [3,1,2] } (must be BEFORE /:id) ================= */
router.put(
  "/reorder",
  ...guard,
  wrap(async (req, res) => {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number) : [];
    if (!ids.length || !ids.every(Number.isInteger))
      return res.status(400).json({ error: "ids must be a list of slide ids." });

    await pool.query(
      `UPDATE hero_slides h SET sort_num = v.ord - 1
       FROM unnest($1::int[]) WITH ORDINALITY AS v(id, ord)
       WHERE h.id = v.id`,
      [ids]
    );
    res.json({ ok: true });
  })
);

/* ================= POST /reset: back to the default slides ================= */
router.post(
  "/reset",
  ...guard,
  wrap(async (req, res) => {
    const { rows: old } = await pool.query("SELECT img, thumbnail FROM hero_slides");
    await seedHero(pool, { force: true });
    for (const o of old) await dropFiles(o.img, o.thumbnail); // remove the uploaded files we no longer use
    const { rows } = await pool.query("SELECT * FROM hero_slides ORDER BY sort_num ASC, id ASC");
    res.json(rows);
  })
);

/* ================= POST: create ================= */
router.post(
  "/",
  ...guard,
  uploadOne,
  wrap(async (req, res) => {
    const { v, error } = readFields(req.body);
    if (error) return res.status(400).json({ error });
    if (!req.file) return res.status(400).json({ error: "An image is required." });

    const files = await storeUpload(req.file);

    try {
      const { rows } = await pool.query(
        `INSERT INTO hero_slides (tag, title, text, img, thumbnail, cta, link, status, sort_num)
         VALUES ($1::jsonb, $2::jsonb, $3::jsonb, $4, $5, $6::jsonb, $7, $8,
                 (SELECT COALESCE(MAX(sort_num), -1) + 1 FROM hero_slides))
         RETURNING *`,
        [
          JSON.stringify(v.tag), JSON.stringify(v.title), JSON.stringify(v.text),
          files.img, files.thumbnail, JSON.stringify(v.cta), v.link, v.status,
        ]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      await dropFiles(files.img, files.thumbnail); // insert failed: delete the files we just saved
      throw err;
    }
  })
);

/* ================= PATCH status: quick show/hide (JSON body) ================= */
router.patch(
  "/:id/status",
  ...guard,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });
    const status = Number(req.body.status) === 0 ? 0 : 1;
    const { rows } = await pool.query(
      "UPDATE hero_slides SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Slide not found." });
    res.json(rows[0]);
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

    const { rows: existing } = await pool.query("SELECT * FROM hero_slides WHERE id = $1", [id]);
    if (!existing[0]) return res.status(404).json({ error: "Slide not found." });

    const { v, error } = readFields(req.body);
    if (error) return res.status(400).json({ error });
    if (!req.file && req.body.removeImage === "1")
      return res.status(400).json({ error: "A slide needs an image. Choose a new one instead." });

    let img = existing[0].img;
    let thumbnail = existing[0].thumbnail;
    let uploaded = null;

    if (req.file) {
      uploaded = await storeUpload(req.file);
      img = uploaded.img;
      thumbnail = uploaded.thumbnail;
    } // otherwise keep the current image

    try {
      const { rows } = await pool.query(
        `UPDATE hero_slides
         SET tag = $1::jsonb, title = $2::jsonb, text = $3::jsonb, img = $4, thumbnail = $5,
             cta = $6::jsonb, link = $7, status = $8
         WHERE id = $9
         RETURNING *`,
        [
          JSON.stringify(v.tag), JSON.stringify(v.title), JSON.stringify(v.text),
          img, thumbnail, JSON.stringify(v.cta), v.link, v.status, id,
        ]
      );
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

    const { rows } = await pool.query("DELETE FROM hero_slides WHERE id = $1 RETURNING *", [id]);
    if (!rows[0]) return res.status(404).json({ error: "Slide not found." });
    await dropFiles(rows[0].img, rows[0].thumbnail);
    res.json({ message: "Slide deleted successfully", id });
  })
);

export default router;