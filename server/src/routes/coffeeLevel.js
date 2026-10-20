import express from "express";
import multer from "multer";
import { pool } from "../db.js";
import { requireAuth, requirePermission, optionalAuth } from "../middleware.js";
import { saveImage, removeImages } from "../storage.js";

const router = express.Router();
const FOLDER = "coffee_levels";
const guard = [requireAuth, requirePermission("menu")];

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(`[coffee_level] ${req.method} ${req.originalUrl}:`, err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  });

const noFile = { img: "", thumbnail: "" };
const dropFiles = (img, thumb) => removeImages(img || null, thumb || null);

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
    console.error("[coffee_level] saveImage failed:", err);
    throw Object.assign(
      new Error(`That file is not a valid image. (${err.message})`),
      { status: 400 },
    );
  }
}

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

const parseMoney = (v) => {
  if (v === undefined || v === null || String(v).trim() === "") return 0.0;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n < 100000000
    ? Math.round(n * 100) / 100
    : NaN;
};

function parseIdArray(raw) {
  if (!raw) return [];
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(arr)) {
      return arr
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n > 0);
    }
  } catch {
    if (typeof raw === "string") {
      return raw
        .split(",")
        .map((n) => Number(n.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
    }
  }
  return [];
}

function parseLevelsOptionsId(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : NaN;
}

function readFields(body) {
  const name = parseI18n(body.name, 120);
  if (!name?.en) return { error: "The English name is required." };
  const description = parseI18n(body.description, 500) || {};

  const price = parseMoney(body.price);
  if (Number.isNaN(price)) return { error: "Price must be 0 or more." };

  const levelsOptionsId = parseLevelsOptionsId(body.levels_options_id);
  if (Number.isNaN(levelsOptionsId)) {
    return { error: "Invalid levels options ID." };
  }

  const status = Number(body.status) === 0 ? 0 : 1;
  const sortNum = Number.parseInt(body.sort_num, 10) || 0;
  const arrayCategories = parseIdArray(body.array_categories);
  const arrayDrinkstypes = parseIdArray(body.array_drinkstypes);

  return {
    v: {
      name,
      description,
      price,
      status,
      sortNum,
      arrayCategories,
      arrayDrinkstypes,
      levelsOptionsId,
    },
  };
}

router.get(
  "/",
  optionalAuth,
  wrap(async (req, res) => {
    const all = req.permissions?.includes("menu");
    const where = all ? [] : ["status = 1"];
    const { rows } = await pool.query(
      `SELECT * FROM coffee_level ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY sort_num ASC, id ASC`,
    );
    res.json(rows);
  }),
);

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
        `INSERT INTO coffee_level (
         name, price, description, status, sort_num,
         array_categories, array_drinkstypes,
         levels_options_id, img, thumbnail
        )
        VALUES (
          $1::jsonb, $2, $3::jsonb, $4, $5,
          $6::integer[], $7::integer[],
          $8, $9, $10
        )
        RETURNING *`,
        [
          JSON.stringify(v.name),
          v.price,
          JSON.stringify(v.description),
          v.status,
          v.sortNum,
          v.arrayCategories,
          v.arrayDrinkstypes,
          v.levelsOptionsId,
          files.img,
          files.thumbnail,
        ],
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      await dropFiles(files.img, files.thumbnail);
      throw err;
    }
  }),
);

router.patch(
  "/:id/status",
  ...guard,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
      return res.status(400).json({ error: "Invalid id." });
    const status = Number(req.body.status) === 0 ? 0 : 1;
    const { rows } = await pool.query(
      "UPDATE coffee_level SET status = $1 WHERE id = $2 RETURNING *",
      [status, id],
    );
    if (!rows[0])
      return res.status(404).json({ error: "Coffee level not found." });
    res.json(rows[0]);
  }),
);

router.put(
  "/:id",
  ...guard,
  uploadOne,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
      return res.status(400).json({ error: "Invalid id." });

    const { rows: existing } = await pool.query(
      "SELECT * FROM coffee_level WHERE id = $1",
      [id],
    );
    if (!existing[0])
      return res.status(404).json({ error: "Coffee level not found." });

    const { v, error } = readFields(req.body);
    if (error) return res.status(400).json({ error });

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

    try {
      const { rows } = await pool.query(
        `UPDATE coffee_level SET
    name = $1::jsonb,
    price = $2,
    description = $3::jsonb,
    status = $4,
    sort_num = $5,
    array_categories = $6::integer[],
    array_drinkstypes = $7::integer[],
    levels_options_id = $8,
    img = $9,
    thumbnail = $10
  WHERE id = $11
  RETURNING *`,
        [
          JSON.stringify(v.name),
          v.price,
          JSON.stringify(v.description),
          v.status,
          v.sortNum,
          v.arrayCategories,
          v.arrayDrinkstypes,
          v.levelsOptionsId,
          img,
          thumbnail,
          id,
        ],
      );

      if (img !== existing[0].img)
        await dropFiles(existing[0].img, existing[0].thumbnail);
      res.json(rows[0]);
    } catch (err) {
      if (uploaded) await dropFiles(uploaded.img, uploaded.thumbnail);
      throw err;
    }
  }),
);

router.delete(
  "/:id",
  ...guard,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
      return res.status(400).json({ error: "Invalid id." });

    const { rows } = await pool.query(
      "DELETE FROM coffee_level WHERE id = $1 RETURNING *",
      [id],
    );
    if (!rows[0])
      return res.status(404).json({ error: "Coffee level not found." });
    await dropFiles(rows[0].img, rows[0].thumbnail);
    res.json({ message: "Coffee level deleted successfully", id });
  }),
);

export default router;
