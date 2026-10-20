import multer from "multer";
import { saveImage, saveSvg } from "./storage.js";

const MAX_FILE = 5 * 1024 * 1024;
const RASTER_RE = /^image\/(jpeg|png|webp|gif)$/;
const isSvgFile = (file) => file.mimetype === "image/svg+xml" || file.originalname.toLowerCase().endsWith(".svg");

const memory = multer.memoryStorage();

// 1 raster image (field "image")
const rasterOnly = multer({
  storage: memory,
  limits: { fileSize: MAX_FILE, files: 1 },
  fileFilter: (req, file, cb) =>
    RASTER_RE.test(file.mimetype) ? cb(null, true) : cb(new Error("Only JPG, PNG, WebP or GIF images are allowed.")),
});

// raster image (field "image") + independent SVG (field "svg"): each field only accepts its own type
const rasterAndSvg = multer({
  storage: memory,
  limits: { fileSize: MAX_FILE, files: 2 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "image")
      return RASTER_RE.test(file.mimetype) ? cb(null, true) : cb(new Error("The image must be a JPG, PNG, WebP or GIF."));
    if (file.fieldname === "svg")
      return isSvgFile(file) ? cb(null, true) : cb(new Error("The SVG field only accepts .svg files."));
    cb(new Error("Unexpected file field."));
  },
});

function sendUploadError(err, res) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "The file is too large (max 5 MB)." });
    return res.status(400).json({ error: "Unexpected upload field." });
  }
  return res.status(400).json({ error: err.message || "Upload failed." });
}

// middleware: reads the form field named "image"
export const uploadOne = (req, res, next) =>
  rasterOnly.single("image")(req, res, (err) => (err ? sendUploadError(err, res) : next()));

// middleware: reads "image" and "svg" (both optional) into req.files.image[0] / req.files.svg[0]
export const uploadImageAndSvg = (req, res, next) =>
  rasterAndSvg.fields([{ name: "image", maxCount: 1 }, { name: "svg", maxCount: 1 }])(req, res, (err) =>
    err ? sendUploadError(err, res) : next(),
  );

// saves the full image + the thumbnail into uploads/<folder>/img and uploads/<folder>/thumbnails
export async function storeUpload(file, folder) {
  try {
    return await saveImage(file.buffer, folder);
  } catch {
    throw Object.assign(new Error("That file is not a valid image."), { status: 400 });
  }
}

// cleans and saves an SVG into uploads/<folder>/svg
export async function storeSvg(file, folder) {
  try {
    return await saveSvg(file.buffer, folder);
  } catch (err) {
    if (err.status) throw err;
    console.error("[upload] saveSvg failed:", err);
    throw Object.assign(new Error("That file is not a valid SVG."), { status: 400 });
  }
}