import multer from "multer";
import { saveImage } from "./storage.js";

// 1 image, max 5 MB, kept in memory, then processed by sharp into img + thumbnail
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only JPG, PNG, WebP or GIF images are allowed.")),
});

// middleware: reads the form field named "image"
export const uploadOne = (req, res, next) =>
  upload.single("image")(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE")
      return res
        .status(413)
        .json({ error: "The image is too large (max 5 MB)." });
    res.status(400).json({ error: err.message || "Upload failed." });
  });

// saves the full image + the thumbnail into uploads/<folder>/img and uploads/<folder>/thumbnails
export async function storeUpload(file, folder) {
  try {
    return await saveImage(file.buffer, folder);
  } catch {
    throw Object.assign(new Error("That file is not a valid image."), {
      status: 400,
    });
  }
}
