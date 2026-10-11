import express from "express";
import multer from "multer";
import { pool } from "../db.js";
import { requireAuth, requirePermission, optionalAuth } from "../middleware.js";
import { saveImage, removeImages } from "../storage.js";

const router = express.Router();
const FOLDER = "products";
const guard = [requireAuth, requirePermission("menu")];

// Catches errors from async handlers (Express 4 does not do this by itself).
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(`[products] ${req.method} ${req.originalUrl}:`, err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  });

// img/thumbnail columns are NOT NULL DEFAULT '' -> never store null
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
      return res
        .status(413)
        .json({ error: "The image is too large (max 5 MB)." });
    res.status(400).json({ error: err.message || "Upload failed." });
  });

async function storeUpload(file) {
  try {
    return await saveImage(file.buffer, FOLDER);
  } catch (err) {
    console.error("[products] saveImage failed:", err);
    throw Object.assign(
      new Error(`That file is not a valid image. (${err.message})`),
      { status: 400 },
    );
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
    const s = String(text ?? "")
      .trim()
      .slice(0, max);
    if (s) out[lang] = s;
  }
  return out;
}

// blank -> null, valid -> number (2 decimals), invalid -> NaN
const parseMoney = (v) => {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n < 100000000
    ? Math.round(n * 100) / 100
    : NaN;
};

// blank -> null, valid -> a percentage 0..100 (2 decimals), invalid -> NaN
const parsePercent = (v) => {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 100
    ? Math.round(n * 100) / 100
    : NaN;
};

// blank -> null, valid positive integer -> number, invalid -> NaN
const parseId = (v) => {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : NaN;
};

// Reads + validates the text fields shared by POST and PUT.
function readFields(body) {
  const name = parseI18n(body.name, 120);
  if (!name?.en) return { error: "The English name is required." };
  const description = parseI18n(body.description, 500) || {};

  const price = parseMoney(body.price); // null = no standard price
  const big = parseMoney(body.big_size_price); // null = size not offered
  const small = parseMoney(body.small_size_price);
  if ([price, big, small].some(Number.isNaN))
    return { error: "Prices must be 0 or more." };
  if (price === null && big === null && small === null)
    return {
      error: "Enter at least one price (Price, Big size or Small size).",
    };

  const discount = parsePercent(body.discount_percent); // blank -> null (saved as 0)
  const tax = parsePercent(body.tax_percent); //            blank -> null = use the store default
  if (Number.isNaN(discount) || Number.isNaN(tax))
    return { error: "Discount and tax must be a percentage from 0 to 100." };

  const categoryId = parseId(body.category_id);
  if (categoryId === null || Number.isNaN(categoryId))
    return { error: "Choose a category." };
  const typeId = parseId(body.type_id);
  if (Number.isNaN(typeId)) return { error: "Invalid drinks type." };

  const status = Number(body.status) === 0 ? 0 : 1;
  const sortNum = Number.parseInt(body.sort_num, 10) || 0;

  return {
    v: {
      name,
      description,
      price,
      big,
      small,
      categoryId,
      typeId,
      status,
      sortNum,
      discountPercent: discount ?? 0,
      taxPercent: tax, // null = store default
    },
  };
}

const fkMessage = "The selected category or drinks type does not exist.";

/* ================= GET: list (hidden products only for menu managers) ================= */
router.get(
  "/",
  optionalAuth,
  wrap(async (req, res) => {
    const all = req.permissions?.includes("menu");
    const params = [];
    const where = [];
    if (!all) where.push("status = 1");
    if (req.query.category_id) {
      params.push(Number(req.query.category_id));
      where.push(`category_id = $${params.length}`);
    }
    const { rows } = await pool.query(
      `SELECT * FROM products ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY sort_num ASC, id ASC`,
      params,
    );
    res.json(rows);
  }),
);

/* ================= POST: create ================= */
router.post(
  "/",
  ...guard,
  uploadOne,
  wrap(async (req, res) => {
    const { v, error } = readFields(req.body);
    if (error) return res.status(400).json({ error });

    const files = req.file ? await storeUpload(req.file) : noFile;

    try {
      const { rows } = await pool.query(
        `INSERT INTO products
           (name, description, img, thumbnail, price, big_size_price, small_size_price,
            category_id, type_id, status, sort_num, discount_percent, tax_percent)
         VALUES ($1::jsonb, $2::jsonb, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          JSON.stringify(v.name),
          JSON.stringify(v.description),
          files.img,
          files.thumbnail,
          v.price,
          v.big,
          v.small,
          v.categoryId,
          v.typeId,
          v.status,
          v.sortNum,
          v.discountPercent,
          v.taxPercent,
        ],
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      await dropFiles(files.img, files.thumbnail); // insert failed: delete the files we just saved
      if (err.code === "23503")
        return res.status(400).json({ error: fkMessage });
      throw err;
    }
  }),
);

/* ================= PATCH status: quick show/hide from the table (JSON body) ================= */
router.patch(
  "/:id/status",
  ...guard,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
      return res.status(400).json({ error: "Invalid id." });
    const status = Number(req.body.status) === 0 ? 0 : 1;
    const { rows } = await pool.query(
      "UPDATE products SET status = $1 WHERE id = $2 RETURNING *",
      [status, id],
    );
    if (!rows[0]) return res.status(404).json({ error: "Product not found." });
    res.json(rows[0]);
  }),
);

/* ================= PUT: update ================= */
router.put(
  "/:id",
  ...guard,
  uploadOne,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
      return res.status(400).json({ error: "Invalid id." });

    const { rows: existing } = await pool.query(
      "SELECT * FROM products WHERE id = $1",
      [id],
    );
    if (!existing[0])
      return res.status(404).json({ error: "Product not found." });

    const { v, error } = readFields(req.body);
    if (error) return res.status(400).json({ error });

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
        `UPDATE products
         SET name = $1::jsonb, description = $2::jsonb, img = $3, thumbnail = $4,
             price = $5, big_size_price = $6, small_size_price = $7,
             category_id = $8, type_id = $9, status = $10, sort_num = $11,
             discount_percent = $12, tax_percent = $13
         WHERE id = $14
         RETURNING *`,
        [
          JSON.stringify(v.name),
          JSON.stringify(v.description),
          img,
          thumbnail,
          v.price,
          v.big,
          v.small,
          v.categoryId,
          v.typeId,
          v.status,
          v.sortNum,
          v.discountPercent,
          v.taxPercent,
          id,
        ],
      );
      // only after the DB update succeeded: delete the OLD files
      if (img !== existing[0].img)
        await dropFiles(existing[0].img, existing[0].thumbnail);
      res.json(rows[0]);
    } catch (err) {
      if (uploaded) await dropFiles(uploaded.img, uploaded.thumbnail);
      if (err.code === "23503")
        return res.status(400).json({ error: fkMessage });
      throw err;
    }
  }),
);

/* ================= DELETE ================= */
router.delete(
  "/:id",
  ...guard,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
      return res.status(400).json({ error: "Invalid id." });

    try {
      const { rows } = await pool.query(
        "DELETE FROM products WHERE id = $1 RETURNING *",
        [id],
      );
      if (!rows[0])
        return res.status(404).json({ error: "Product not found." });
      await dropFiles(rows[0].img, rows[0].thumbnail);
      res.json({ message: "Product deleted successfully", id });
    } catch (err) {
      // will matter once an order_items table references products
      if (err.code === "23503")
        return res.status(409).json({
          error: "This product is used by orders. Hide it instead of deleting.",
        });
      throw err;
    }
  }),
);

export default router;