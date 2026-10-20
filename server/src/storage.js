
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import DOMPurify from "isomorphic-dompurify";

export const UPLOADS_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "uploads"
);

const URL_BASE = "/api/uploads";
const IMG = "img";
const THUMB = "thumbnails";
const SVG = "svg";

export const MAX_SVG_BYTES = 512 * 1024; // 512 KB

// Folders allowed for raster images.
export const ENTITIES = [
  "categories",
  "drinks_types",
  "products",
  "hero",
  "levels_options",
  "country_flags",
  "avatars"
];

// Only these entities can also store SVG files.
export const SVG_ENTITIES = ["country_flags"];

/* =========================================================
   Create upload directories
   ========================================================= */

for (const entity of ENTITIES) {
  for (const sub of [IMG, THUMB]) {
    await fs.mkdir(path.join(UPLOADS_ROOT, entity, sub), {
      recursive: true,
    });
  }
}

for (const entity of SVG_ENTITIES) {
  await fs.mkdir(path.join(UPLOADS_ROOT, entity, SVG), {
    recursive: true,
  });
}

/* =========================================================
   Raster image: save image + thumbnail
   ========================================================= */

export async function saveImage(buffer, entity) {
  if (!ENTITIES.includes(entity)) {
    throw new Error(`Unknown upload folder: ${entity}`);
  }

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw Object.assign(new Error("The image file is empty."), {
      status: 400,
    });
  }

  const name = `${crypto.randomUUID()}.webp`;

  const imgPath = path.join(UPLOADS_ROOT, entity, IMG, name);
  const thumbPath = path.join(UPLOADS_ROOT, entity, THUMB, name);

  try {
    const base = sharp(buffer).rotate();

    await base
      .clone()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toFile(imgPath);

    await base
      .clone()
      .resize(320, 320, { fit: "cover" })
      .webp({ quality: 75 })
      .toFile(thumbPath);
  } catch (err) {
    await Promise.all([
      fs.rm(imgPath, { force: true }),
      fs.rm(thumbPath, { force: true }),
    ]);

    throw err;
  }

  return {
    img: `${URL_BASE}/${entity}/${IMG}/${name}`,
    thumbnail: `${URL_BASE}/${entity}/${THUMB}/${name}`,
  };
}

/* =========================================================
   SVG: sanitize and save as a separate .svg file
   ========================================================= */

function sanitizeSvg(text) {
  if (typeof text !== "string" || text.includes("\u0000")) {
    return null;
  }

  const clean = DOMPurify.sanitize(text, {
    USE_PROFILES: {
      svg: true,
      svgFilters: true,
    },
    FORBID_TAGS: [
      "script",
      "foreignObject",
      "iframe",
      "object",
      "embed",
    ],
  }).trim();

  // Reject documents whose root is not SVG.
  const withoutXmlDeclaration = clean.replace(
    /^<\?xml[\s\S]*?\?>\s*/i,
    ""
  );

  if (!/^<svg(?:\s|>)/i.test(withoutXmlDeclaration)) {
    return null;
  }

  // Add the standard SVG namespace if it is missing.
  const rootTag = withoutXmlDeclaration.match(/^<svg\b[^>]*>/i)?.[0];

  if (!rootTag) {
    return null;
  }

  if (!/\sxmlns\s*=/i.test(rootTag)) {
    return clean.replace(
      /^(\s*(?:<\?xml[\s\S]*?\?>\s*)?)<svg\b/i,
      '$1<svg xmlns="http://www.w3.org/2000/svg"'
    );
  }

  return clean;
}

export async function saveSvg(buffer, entity) {
  if (!SVG_ENTITIES.includes(entity)) {
    throw new Error(`SVG uploads are not enabled for: ${entity}`);
  }

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw Object.assign(new Error("The SVG file is empty."), {
      status: 400,
    });
  }

  if (buffer.length > MAX_SVG_BYTES) {
    throw Object.assign(
      new Error("The SVG is too large (maximum 512 KB)."),
      { status: 413 }
    );
  }

  const clean = sanitizeSvg(buffer.toString("utf8"));

  if (!clean) {
    throw Object.assign(new Error("That file is not a valid SVG."), {
      status: 400,
    });
  }

  const directory = path.join(UPLOADS_ROOT, entity, SVG);
  await fs.mkdir(directory, { recursive: true });

  const name = `${crypto.randomUUID()}.svg`;
  const filePath = path.join(directory, name);

  await fs.writeFile(filePath, clean, "utf8");

  return {
    svg: `${URL_BASE}/${entity}/${SVG}/${name}`,
  };
}

/* =========================================================
   Remove files saved by this application
   ========================================================= */

export async function removeImages(...urls) {
  for (const url of urls) {
    if (typeof url !== "string" || !url.startsWith(`${URL_BASE}/`)) {
      continue;
    }

    const parts = url.split("/");
    // ["", "api", "uploads", entity, folder, filename]

    if (parts.length !== 6) {
      continue;
    }

    const [, , , entity, folder, file] = parts;

    const isSvg = folder === SVG && /^[\w-]+\.svg$/i.test(file || "");

    const isRaster =
      [IMG, THUMB].includes(folder) &&
      /^[\w-]+\.webp$/i.test(file || "");

    if (!ENTITIES.includes(entity)) {
      continue;
    }

    if (folder === SVG && !SVG_ENTITIES.includes(entity)) {
      continue;
    }

    if (!isSvg && !isRaster) {
      continue;
    }

    const filePath = path.join(UPLOADS_ROOT, entity, folder, file);

    // Ensure the resolved file stays inside the uploads directory.
    const resolved = path.resolve(filePath);
    const root = path.resolve(UPLOADS_ROOT) + path.sep;

    if (!resolved.startsWith(root)) {
      continue;
    }

    await fs.rm(resolved, { force: true });
  }
}
