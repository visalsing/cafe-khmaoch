
import express from "express";
import multer from "multer";
import { pool } from "../db.js";
import {
  requireAuth,
  requirePermission,
  optionalAuth,
} from "../middleware.js";
import {
  saveImage,
  saveSvg,
  removeImages,
  MAX_SVG_BYTES,
} from "../storage.js";

const router = express.Router();

const FOLDER = "country_flags";
const guard = [requireAuth, requirePermission("menu")];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const RASTER_RE = /^image\/(jpeg|png|webp|gif)$/i;

const isSvgFile = (file) =>
  file.mimetype === "image/svg+xml" ||
  /\.svg$/i.test(file.originalname || "");

/* =========================================================
   Upload middleware

   image -> raster image
   svg   -> separate SVG file
   ========================================================= */

const upload = multer({
  storage: multer.memoryStorage(),

  // Multer's limit applies to each individual file.
  limits: {
    fileSize: MAX_IMAGE_BYTES,
    files: 2,
  },

  fileFilter: (req, file, cb) => {
    if (file.fieldname === "image") {
      if (!RASTER_RE.test(file.mimetype)) {
        return cb(
          new Error("The image must be JPG, PNG, WebP or GIF.")
        );
      }

      return cb(null, true);
    }

    if (file.fieldname === "svg") {
      if (!isSvgFile(file)) {
        return cb(new Error("The SVG field only accepts .svg files."));
      }

      return cb(null, true);
    }

    return cb(new Error("Unexpected file field."));
  },
});

const uploadFields = (req, res, next) => {
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "svg", maxCount: 1 },
  ])(req, res, (err) => {
    if (!err) return next();

    if (
      err instanceof multer.MulterError &&
      err.code === "LIMIT_FILE_SIZE"
    ) {
      return res.status(413).json({
        error: "Upload too large. Images maximum 5 MB; SVG maximum 512 KB.",
      });
    }

    return res.status(err.status || 400).json({
      error: err.message || "Upload failed.",
    });
  });
};

/* =========================================================
   Store uploads

   IMPORTANT:
   Raster images use saveImage().
   SVG files use saveSvg().
   ========================================================= */

async function storeUpload(file, isSvg = false) {
  if (!file?.buffer) {
    throw Object.assign(new Error("No uploaded file was provided."), {
      status: 400,
    });
  }

  if (isSvg) {
    if (file.buffer.length > MAX_SVG_BYTES) {
      throw Object.assign(
        new Error("The SVG is too large (maximum 512 KB)."),
        { status: 413 }
      );
    }

    // This returns { svg: "/api/uploads/country_flags/svg/....svg" }
    return saveSvg(file.buffer, FOLDER);
  }

  // This returns { img, thumbnail }
  return saveImage(file.buffer, FOLDER);
}

/* =========================================================
   I18n helper
   ========================================================= */

const LANG_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

function parseI18n(raw, max) {
  let obj;

  try {
    obj = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    obj = null;
  }

  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return null;
  }

  const out = {};

  for (const [lang, text] of Object.entries(obj)) {
    if (!LANG_RE.test(lang)) continue;

    const value = String(text ?? "")
      .trim()
      .slice(0, max);

    if (value) out[lang] = value;
  }

  return out;
}

/* =========================================================
   GET: public list
   ========================================================= */

router.get("/", optionalAuth, async (req, res) => {
  try {
    const all = req.permissions?.includes("menu");

    const { rows } = await pool.query(
      `SELECT *
       FROM country_flags
       ${all ? "" : "WHERE status = 1"}
       ORDER BY sort_num ASC, id ASC`
    );

    res.json(rows);
  } catch (err) {
    console.error("GET /country-flags error:", err);

    res.status(500).json({
      error: "Failed to load country flags.",
    });
  }
});

/* =========================================================
   POST: create
   ========================================================= */

router.post("/", ...guard, uploadFields, async (req, res) => {
  let imgFiles = { img: "", thumbnail: "" };
  let svgFile = { svg: "" };

  try {
    const name = parseI18n(req.body.name, 120);
    const description = parseI18n(req.body.description, 500) || {};

    if (!name?.en) {
      return res.status(400).json({
        error: "The English name is required.",
      });
    }

    const native_name = String(req.body.native_name || "")
      .trim()
      .slice(0, 120);

    const icon = String(req.body.icon || "")
      .trim()
      .slice(0, 100);

    const sort_num = Number(req.body.sort_num) || 0;
    const status = Number(req.body.status) === 0 ? 0 : 1;

    const imageFile = req.files?.image?.[0];
    const uploadedSvg = req.files?.svg?.[0];

    if (imageFile) {
      imgFiles = await storeUpload(imageFile, false);
    }

    if (uploadedSvg) {
      svgFile = await storeUpload(uploadedSvg, true);
    }

    const { rows } = await pool.query(
      `INSERT INTO country_flags
        (
          name,
          native_name,
          description,
          img,
          thumbnail,
          icon,
          svg,
          status,
          sort_num,
          created_at,
          updated_at
        )
       VALUES
        ($1::jsonb, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, now(), now())
       RETURNING *`,
      [
        JSON.stringify(name),
        native_name,
        JSON.stringify(description),
        imgFiles.img || "",
        imgFiles.thumbnail || "",
        icon,
        svgFile.svg || "",
        status,
        sort_num,
      ]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /country-flags error:", err);

    await removeImages(
      imgFiles.img,
      imgFiles.thumbnail,
      svgFile.svg
    ).catch((cleanupErr) => {
      console.error("Upload cleanup error:", cleanupErr);
    });

    return res.status(err.status || 500).json({
      error: err.message || "Failed to create country flag.",
    });
  }
});

/* =========================================================
   PUT: update
   ========================================================= */

router.put("/:id", ...guard, uploadFields, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid id." });
  }

  let newImgUploaded = null;
  let newSvgUploaded = null;

  try {
    const { rows: existingRows } = await pool.query(
      "SELECT * FROM country_flags WHERE id = $1",
      [id]
    );

    const existing = existingRows[0];

    if (!existing) {
      return res.status(404).json({
        error: "Country flag not found.",
      });
    }

    const name = parseI18n(req.body.name, 120);
    const description = parseI18n(req.body.description, 500) || {};

    if (!name?.en) {
      return res.status(400).json({
        error: "The English name is required.",
      });
    }

    const native_name = String(
      req.body.native_name ?? existing.native_name ?? ""
    )
      .trim()
      .slice(0, 120);

    const icon = String(req.body.icon ?? existing.icon ?? "")
      .trim()
      .slice(0, 100);

    const sort_num =
      req.body.sort_num !== undefined
        ? Number(req.body.sort_num) || 0
        : existing.sort_num;

    const status =
      req.body.status !== undefined
        ? Number(req.body.status) === 0
          ? 0
          : 1
        : existing.status;

    let img = existing.img || "";
    let thumbnail = existing.thumbnail || "";
    let svg = existing.svg || "";

    const imageFile = req.files?.image?.[0];
    const svgFile = req.files?.svg?.[0];

    /* ----- Raster image ----- */

    if (imageFile) {
      newImgUploaded = await storeUpload(imageFile, false);

      img = newImgUploaded.img;
      thumbnail = newImgUploaded.thumbnail;
    } else if (req.body.removeImage === "1") {
      img = "";
      thumbnail = "";
    }

    /* ----- SVG: save separately from raster image ----- */

    if (svgFile) {
      newSvgUploaded = await storeUpload(svgFile, true);

      // This is the URL returned by storage.saveSvg().
      svg = newSvgUploaded.svg;
    } else if (req.body.removeSvg === "1") {
      svg = "";
    }

    /* ----- Save all fields, including the SVG URL ----- */

    const { rows } = await pool.query(
      `UPDATE country_flags
       SET
         name = $1::jsonb,
         native_name = $2,
         description = $3::jsonb,
         img = $4,
         thumbnail = $5,
         icon = $6,
         svg = $7,
         status = $8,
         sort_num = $9,
         updated_at = now()
       WHERE id = $10
       RETURNING *`,
      [
        JSON.stringify(name),
        native_name,
        JSON.stringify(description),
        img,
        thumbnail,
        icon,
        svg,
        status,
        sort_num,
        id,
      ]
    );

    const updated = rows[0];

    /* ----- Delete replaced files after successful DB update ----- */

    const oldFilesToDelete = [];

    if (img !== (existing.img || "")) {
      oldFilesToDelete.push(existing.img, existing.thumbnail);
    }

    if (svg !== (existing.svg || "")) {
      oldFilesToDelete.push(existing.svg);
    }

    if (oldFilesToDelete.length) {
      await removeImages(...oldFilesToDelete).catch((err) => {
        console.error("Old upload cleanup error:", err);
      });
    }

    return res.json(updated);
  } catch (err) {
    console.error(`PUT /country-flags/${id} error:`, err);

    // If the DB update fails, clean up newly uploaded files.
    if (newImgUploaded) {
      await removeImages(
        newImgUploaded.img,
        newImgUploaded.thumbnail
      ).catch((cleanupErr) => {
        console.error("Image cleanup error:", cleanupErr);
      });
    }

    if (newSvgUploaded) {
      await removeImages(newSvgUploaded.svg).catch((cleanupErr) => {
        console.error("SVG cleanup error:", cleanupErr);
      });
    }

    return res.status(err.status || 500).json({
      error: err.message || "Failed to update country flag.",
    });
  }
});

/* =========================================================
   DELETE
   ========================================================= */

router.delete("/:id", ...guard, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid id." });
  }

  try {
    const { rows } = await pool.query(
      `DELETE FROM country_flags
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (!rows[0]) {
      return res.status(404).json({
        error: "Country flag not found.",
      });
    }

    await removeImages(
      rows[0].img,
      rows[0].thumbnail,
      rows[0].svg
    );

    return res.json({
      message: "Country flag deleted successfully",
      id,
    });
  } catch (err) {
    console.error("DELETE /country-flags/:id error:", err);

    return res.status(err.status || 500).json({
      error: err.message || "Failed to delete country flag.",
    });
  }
});

export default router;
