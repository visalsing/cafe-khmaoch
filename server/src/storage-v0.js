import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export const UPLOADS_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "uploads");
const URL_BASE = "/api/uploads";
const IMG = "img";
const THUMB = "thumbnails";
const SVG = "svg";

// Added "country_flags" to the entity list
export const ENTITIES = [
  "categories",
  "drinks_types",
  "products",
  "hero",
  "maps",
  "sugar_leve",
  "ice_level",
  "coffee_level",
  "levels_options",
  "country_flags",
  "currencies",
];

// Ensure all subfolders exist for each entity (including SVG)
for (const entity of ENTITIES) {
  const folders = entity === "country_flags" ? [IMG, THUMB, SVG] : [IMG, THUMB];
  for (const sub of folders) {
    await fs.mkdir(path.join(UPLOADS_ROOT, entity, sub), { recursive: true });
  }
}

// Takes the uploaded file's bytes, entity, and optional mimeType/isSvg flag
export async function saveImage(buffer, entity, isSvg = false) {
  if (!ENTITIES.includes(entity)) throw new Error(`Unknown upload folder: ${entity}`);

  // Handle direct SVG uploads
  if (isSvg) {
    const name = `${crypto.randomUUID()}.svg`;
    const svgPath = path.join(UPLOADS_ROOT, entity, SVG, name);

    try {
      await fs.writeFile(svgPath, buffer);
    } catch (err) {
      await fs.rm(svgPath, { force: true });
      throw err;
    }

    return {
      svg: `${URL_BASE}/${entity}/${SVG}/${name}`,
    };
  }

  // Handle standard image uploads (WebP conversion via Sharp)
  const name = `${crypto.randomUUID()}.webp`;
  const imgPath = path.join(UPLOADS_ROOT, entity, IMG, name);
  const thumbPath = path.join(UPLOADS_ROOT, entity, THUMB, name);

  try {
    const base = sharp(buffer).rotate(); // respects photo orientation
    await base.clone()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(imgPath);
    await base.clone()
      .resize(320, 320, { fit: "cover" })
      .webp({ quality: 75 })
      .toFile(thumbPath);
  } catch (err) {
    await Promise.all([fs.rm(imgPath, { force: true }), fs.rm(thumbPath, { force: true })]);
    throw err;
  }

  return {
    img: `${URL_BASE}/${entity}/${IMG}/${name}`,
    thumbnail: `${URL_BASE}/${entity}/${THUMB}/${name}`,
  };
}

// Deletes files saved by the system (WebP or SVG)
export async function removeImages(...urls) {
  for (const url of urls) {
    if (!url || !url.startsWith(`${URL_BASE}/`)) continue;
    const [, , , entity, folder, file] = url.split("/"); // ["", "api", "uploads", "country_flags", "svg", "abc.svg"]
    if (!ENTITIES.includes(entity) || ![IMG, THUMB, SVG].includes(folder)) continue;
    if (!/^[\w-]+\.(webp|svg)$/.test(file || "")) continue;
    
    await fs.rm(path.join(UPLOADS_ROOT, entity, folder, file), { force: true });
  }
}