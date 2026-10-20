
import multer from "multer";
import * as storage from "./storage.js";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const SVG_MAX_BYTES = storage.MAX_SVG_BYTES ?? 512 * 1024;

const RASTER_RE = /^image\/(jpeg|png|webp|gif)$/i;

const isSvgFile = (file) =>
  file.mimetype === "image/svg+xml" ||
  /\.svg$/i.test(file.originalname || "");

// Return upload errors as JSON.
const sendUploadError = (err, res) => {
  if (
    err instanceof multer.MulterError &&
    err.code === "LIMIT_FILE_SIZE"
  ) {
    return res.status(413).json({
      error: `The uploaded file is too large. SVG maximum: ${Math.round(
        SVG_MAX_BYTES / 1024
      )} KB; raster image maximum: 5 MB.`,
    });
  }

  return res.status(err.status || 400).json({
    error: err.message || "Upload failed.",
  });
};

/* =========================================================
   1. One raster image (field: "image")
      Saves image + thumbnail.
   ========================================================= */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_BYTES,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname !== "image") {
      return cb(new Error("Unexpected file field."));
    }

    if (!RASTER_RE.test(file.mimetype)) {
      return cb(
        new Error("Only JPG, PNG, WebP or GIF images are allowed.")
      );
    }

    cb(null, true);
  },
});

export const uploadOne = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) return sendUploadError(err, res);
    next();
  });
};

export async function storeUpload(file, folder) {
  if (!file) {
    throw Object.assign(new Error("No image file was provided."), {
      status: 400,
    });
  }

  try {
    return await storage.saveImage(file.buffer, folder);
  } catch (err) {
    console.error("[upload] saveImage failed:", err);

    throw Object.assign(
      new Error("That file could not be saved as an image."),
      { status: err.status || 400 }
    );
  }
}

/* =========================================================
   2. Raster image + separate SVG
      Fields:
        image -> JPG / PNG / WebP / GIF
        svg   -> SVG
      Either field can be omitted.
   ========================================================= */

const uploadBoth = multer({
  storage: multer.memoryStorage(),

  // Multer applies this per file. SVG has an additional
  // 512 KB check in storeSvg().
  limits: {
    fileSize: MAX_BYTES,
    files: 2,
  },

  fileFilter: (req, file, cb) => {
    if (file.fieldname === "image") {
      if (!RASTER_RE.test(file.mimetype)) {
        return cb(
          new Error("The image must be a JPG, PNG, WebP or GIF file.")
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

export const uploadImageAndSvg = (req, res, next) => {
  uploadBoth.fields([
    { name: "image", maxCount: 1 },
    { name: "svg", maxCount: 1 },
  ])(req, res, (err) => {
    if (err) return sendUploadError(err, res);
    next();
  });
};

/* =========================================================
   3. Basic SVG validation
      storage.saveSvg() sanitizes again before writing.
   ========================================================= */

export function checkSvg(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw Object.assign(new Error("The SVG file is empty."), {
      status: 400,
    });
  }

  if (buffer.length > SVG_MAX_BYTES) {
    throw Object.assign(
      new Error("The SVG is too large (maximum 512 KB)."),
      { status: 413 }
    );
  }

  const text = buffer.toString("utf8").trim();

  const bad = (message) => {
    throw Object.assign(new Error(message), { status: 400 });
  };

  if (text.includes("\u0000")) {
    bad("The SVG file contains invalid characters.");
  }

  // Permit an optional XML declaration before the root SVG tag.
  const withoutXmlDeclaration = text.replace(
    /^<\?xml[\s\S]*?\?>\s*/i,
    ""
  );

  if (!/^<svg(?:\s|>)/i.test(withoutXmlDeclaration)) {
    bad("That file is not a valid SVG.");
  }

  // Reject executable or embedded content.
  if (
    /<script\b|<foreignObject\b|<iframe\b|<embed\b|<object\b|<!ENTITY\b/i.test(
      text
    ) ||
    /\son[a-z][\w:-]*\s*=/i.test(text) ||
    /javascript\s*:/i.test(text)
  ) {
    bad("This SVG contains scripts or unsafe content, so it was rejected.");
  }
}

/* =========================================================
   4. Save SVG independently
      Returns: { svg: "/api/uploads/country_flags/svg/..." }
   ========================================================= */

export async function storeSvg(file, folder) {
  if (!file) {
    throw Object.assign(new Error("No SVG file was provided."), {
      status: 400,
    });
  }

  checkSvg(file.buffer);

  if (typeof storage.saveSvg !== "function") {
    throw Object.assign(
      new Error(
        "SVG uploads are not configured on the server. Check storage.js."
      ),
      { status: 500 }
    );
  }

  try {
    return await storage.saveSvg(file.buffer, folder);
  } catch (err) {
    console.error("[upload] saveSvg failed:", err);

    throw Object.assign(
      new Error(err.message || "That SVG could not be saved."),
      { status: err.status || 500 }
    );
  }
}
