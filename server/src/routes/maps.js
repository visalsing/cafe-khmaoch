import express from "express";
import multer from "multer";
import { pool } from "../db.js";
import { requireAuth, optionalAuth } from "../middleware.js";
import { saveImage, removeImages } from "../storage.js";

const router = express.Router();
const FOLDER = "maps"; // must also be allowed in storage.js
const guard = [requireAuth]; // logged-in users only, no permission check

// Catches errors from async handlers (Express 4 does not do this by itself).
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(`[maps] ${req.method} ${req.originalUrl}:`, err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  });

// img/thumbnail columns are NOT NULL DEFAULT '' -> never store null
const noFile = { img: "", thumbnail: "" };
const dropFiles = (img, thumb) => removeImages(img || null, thumb || null);

/* ---------- upload: 1 image (the logo), max 5 MB, read into memory, then processed by sharp ---------- */
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
  } catch (err) {
    console.error("[maps] saveImage failed:", err);
    const detail = process.env.NODE_ENV === "production" ? "" : ` (${err.message})`;
    throw Object.assign(
      new Error(`That file is not a valid image.${detail}`),
      { status: 400 }
    );
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
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  const out = {};
  for (const [lang, text] of Object.entries(obj)) {
    if (!LANG_RE.test(lang)) continue;
    const s = String(text ?? "").trim().slice(0, max);
    if (s) out[lang] = s; // empty translations are dropped
  }
  return out;
}

const pick = (obj, lang) => (obj && (obj[lang] || obj.en)) || "";

/* ---------- Google Maps embed: accepts the <iframe ...> code OR the src link ----------
   Only the src URL is stored (never raw HTML), and only if it is a real Google Maps embed. */
function cleanEmbedUrl(raw) {
  let v = String(raw ?? "").trim();
  if (!v) return ""; // empty is allowed
  const m = v.match(/<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i);
  if (m) v = m[1];
  v = v.replace(/&amp;/g, "&").trim();
  let u;
  try {
    u = new URL(v);
  } catch {
    return null;
  }
  const okHost = ["www.google.com", "google.com", "maps.google.com"].includes(u.hostname);
  const isEmbed = u.pathname.startsWith("/maps/embed") || u.searchParams.get("output") === "embed";
  if (u.protocol !== "https:" || !okHost || !isEmbed) return null;
  return v.slice(0, 2000);
}

// Reads + validates the fields shared by POST and PUT.
function readFields(body) {
  const name = String(body.name ?? "").trim().slice(0, 120);
  if (!name) return { error: "The name is required." };

  const map = cleanEmbedUrl(body.map);
  if (map === null)
    return { error: "The map must be a Google Maps embed code or link (Google Maps → Share → Embed a map)." };

  const link = String(body.link ?? "").trim().slice(0, 500);
  if (link && !/^https?:\/\//i.test(link))
    return { error: "The link must start with http:// or https://" };

  return {
    v: {
      name,
      title: parseI18n(body.title, 150),
      subtitle: parseI18n(body.subtitle, 150),
      description: parseI18n(body.description, 600),
      slogan: parseI18n(body.slogan, 200),
      map,
      location: String(body.location ?? "").trim().slice(0, 300),
      link,
      status: Number(body.status) === 0 ? 0 : 1,
    },
  };
}

const COLS =
  "name, title, subtitle, description, slogan, img, thumbnail, map, location, link, status, created_at, updated_at";

// ?raw=1 needs a logged-in user (no permission check); everything else stays public
const rawNeedsLogin = (req, res, next) =>
  req.query.raw === "1" ? requireAuth(req, res, next) : next();

/* ================= GET =================
   - public:  GET /api/maps?lang=km  -> visible maps, already translated to plain strings
   - manager: GET /api/maps?raw=1    -> every map with the full { en, km, ... } objects
*/
router.get(
  "/",
  optionalAuth,
  rawNeedsLogin,
  wrap(async (req, res) => {
    if (req.query.raw === "1") {
      const { rows } = await pool.query("SELECT * FROM maps ORDER BY id ASC");
      return res.json(rows);
    }

    const lang = LANG_RE.test(String(req.query.lang || "")) ? String(req.query.lang) : "en";
    const { rows } = await pool.query("SELECT * FROM maps WHERE status = 1 ORDER BY id ASC");
    res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        title: pick(r.title, lang),
        subtitle: pick(r.subtitle, lang),
        description: pick(r.description, lang),
        slogan: pick(r.slogan, lang),
        img: r.img,
        map: r.map,
        location: r.location,
        link: r.link,
      }))
    );
  })
);

/* ================= POST: create (img + thumbnail created from the uploaded file) ================= */
router.post(
  "/",
  ...guard,
  uploadOne,
  wrap(async (req, res) => {
    const { v, error } = readFields(req.body);
    if (error) return res.status(400).json({ error });

    // no file chosen -> img and thumbnail stay ''
    const files = req.file ? await storeUpload(req.file) : noFile;

    try {
      const { rows } = await pool.query(
        `INSERT INTO maps (${COLS})
         VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6, $7, $8, $9, $10, $11, now(), now())
         RETURNING *`,
        [
          v.name, JSON.stringify(v.title), JSON.stringify(v.subtitle), JSON.stringify(v.description),
          JSON.stringify(v.slogan), files.img, files.thumbnail, v.map, v.location, v.link, v.status,
        ]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      await dropFiles(files.img, files.thumbnail); // the insert failed, so delete the files we just saved
      throw err;
    }
  })
);

/* ================= PATCH status: quick show/hide from the table switch (JSON body) ================= */
router.patch(
  "/:id/status",
  ...guard,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });
    const status = Number(req.body.status) === 0 ? 0 : 1;
    const { rows } = await pool.query(
      "UPDATE maps SET status = $1, updated_at = now() WHERE id = $2 RETURNING *",
      [status, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Map not found." });
    res.json(rows[0]);
  })
);

/* ================= PUT: update (a new logo replaces the old img + thumbnail) ================= */
router.put(
  "/:id",
  ...guard,
  uploadOne,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });

    const { rows: existing } = await pool.query("SELECT * FROM maps WHERE id = $1", [id]);
    if (!existing[0]) return res.status(404).json({ error: "Map not found." });

    const { v, error } = readFields(req.body);
    if (error) return res.status(400).json({ error });

    // start from what is already stored
    let img = existing[0].img;
    let thumbnail = existing[0].thumbnail;
    let uploaded = null;

    if (req.file) {
      uploaded = await storeUpload(req.file); // new logo chosen
      img = uploaded.img;
      thumbnail = uploaded.thumbnail;
    } else if (req.body.removeImage === "1") {
      img = ""; // "Remove image" clicked
      thumbnail = "";
    } // otherwise: keep the current logo untouched

    try {
      const { rows } = await pool.query(
        `UPDATE maps
         SET name = $1, title = $2::jsonb, subtitle = $3::jsonb, description = $4::jsonb, slogan = $5::jsonb,
             img = $6, thumbnail = $7, map = $8, location = $9, link = $10, status = $11, updated_at = now()
         WHERE id = $12
         RETURNING *`,
        [
          v.name, JSON.stringify(v.title), JSON.stringify(v.subtitle), JSON.stringify(v.description),
          JSON.stringify(v.slogan), img, thumbnail, v.map, v.location, v.link, v.status, id,
        ]
      );
      // only after the database update succeeded: delete the OLD files
      if (img !== existing[0].img) await dropFiles(existing[0].img, existing[0].thumbnail);
      res.json(rows[0]);
    } catch (err) {
      if (uploaded) await dropFiles(uploaded.img, uploaded.thumbnail); // update failed, drop the new files
      throw err;
    }
  })
);

/* ================= DELETE: also deletes the image files ================= */
router.delete(
  "/:id",
  ...guard,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });

    const { rows } = await pool.query("DELETE FROM maps WHERE id = $1 RETURNING *", [id]);
    if (!rows[0]) return res.status(404).json({ error: "Map not found." });
    await dropFiles(rows[0].img, rows[0].thumbnail);
    res.json({ message: "Map deleted successfully", id });
  })
);

export default router;