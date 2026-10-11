import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export const UPLOADS_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "uploads");
const URL_BASE = "/api/uploads";
const IMG = "img";
const THUMB = "thumbnails";

// One folder per kind of content. To add another manager later (menu_items, hero_slides, ...),
// just add its name here and the folders are created automatically.
export const ENTITIES = ["categories", "drinks_types", "products", "hero", "maps"];

for (const entity of ENTITIES)
  for (const sub of [IMG, THUMB]) await fs.mkdir(path.join(UPLOADS_ROOT, entity, sub), { recursive: true });

// Takes the uploaded file's bytes and a folder name, returns the two URLs to store in the database
export async function saveImage(buffer, entity) {
  if (!ENTITIES.includes(entity)) throw new Error(`Unknown upload folder: ${entity}`);

  const name = `${crypto.randomUUID()}.webp`;
  const imgPath = path.join(UPLOADS_ROOT, entity, IMG, name);
  const thumbPath = path.join(UPLOADS_ROOT, entity, THUMB, name);

  try {
    const base = sharp(buffer).rotate(); // respects phone photo orientation, drops EXIF/GPS data
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

// Deletes files that WE saved. Anything else (like an Unsplash link) is left alone.
export async function removeImages(...urls) {
  for (const url of urls) {
    if (!url || !url.startsWith(`${URL_BASE}/`)) continue;
    const [, , , entity, folder, file] = url.split("/"); // ["", "api", "uploads", "categories", "img", "abc.webp"]
    if (!ENTITIES.includes(entity) || ![IMG, THUMB].includes(folder) || !/^[\w-]+\.webp$/.test(file || "")) continue;
    await fs.rm(path.join(UPLOADS_ROOT, entity, folder, file), { force: true });
  }
}