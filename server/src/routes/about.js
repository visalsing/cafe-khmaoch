import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, query } from "../db.js";
import { requireAuth, requirePermission } from "../middleware.js";
import { MAX_HTML, cleanHtml } from "../richText.js";

const router = Router();

const LANGS = ["en", "km", "zh", "lo", "ja", "vi"];
const ICONS = ["coffee", "flame", "sprout", "leaf", "heart", "users", "award", "star", "clock", "map-pin", "sparkles", "cake", "wheat", "truck", "shield-check"];
const MAX_IMAGES = 12;
const MAX_HIGHLIGHTS = 6;
const MAX_FILE = 8 * 1024 * 1024;

const UPLOAD_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../uploads");
const IMG_DIR = path.join(UPLOAD_ROOT, "about", "img");
const THUMB_DIR = path.join(UPLOAD_ROOT, "about", "thumbnails");

class Bad extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
const run = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof Bad) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

/* ---------- helpers ---------- */

// {"en": "...", "km": "..."}: known languages only, trimmed, cut to `max` characters, empty ones dropped
function i18n(value, max) {
  const out = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const code of LANGS) {
      const s = typeof value[code] === "string" ? value[code].replace(/\s+/g, " ").trim().slice(0, max) : "";
      if (s) out[code] = s;
    }
  }
  return out;
}

// a short, stable id of a picture (a hash of its path), used by the dashboard to delete and reorder
const keyOf = (img) => crypto.createHash("sha1").update(String(img)).digest("hex").slice(0, 12);

function present(row) {
  const r = row || {};
  const images = r.images || [];
  return {
    status: Number(r.status ?? 1),
    title: r.title || {},
    subtitle: r.subtitle || {},
    storyLabel: r.story_label || {},
    storyHeading: r.story_heading || {},
    storyBody: r.story_body || {},
    statValue: r.stat_value || {},
    statCaption: r.stat_caption || {},
    images: images.map((img, i) => ({
      key: keyOf(img),
      img,
      thumbnail: r.thumbnails?.[i] || img,
      alt: r.image_alts?.[i] || {},
    })),
    highlights: Array.isArray(r.highlights) ? r.highlights : [],
    updatedAt: r.updated_at || null,
  };
}

async function readPage() {
  const { rows } = await query("SELECT * FROM about_page WHERE id = 1");
  return present(rows[0]);
}

// delete our own files only (pictures that came from another website have nothing on this disk)
async function removeFiles(...stored) {
  for (const p of stored.flat()) {
    if (typeof p !== "string" || !p.startsWith("about/")) continue;
    const full = path.resolve(UPLOAD_ROOT, p);
    if (!full.startsWith(UPLOAD_ROOT + path.sep)) continue;
    await fs.unlink(full).catch(() => {});
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE, files: 6 },
  fileFilter: (_req, file, cb) =>
    /^image\/(jpeg|png|webp|avif|gif)$/.test(file.mimetype)
      ? cb(null, true)
      : cb(Object.assign(new Error("type"), { code: "BAD_TYPE" })), // SVG is refused on purpose (it can carry scripts)
});
const receive = (req, res, next) =>
  upload.array("images", 6)(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "Each picture can be 8 MB at most." });
    if (err.code === "BAD_TYPE") return res.status(400).json({ error: "Only JPG, PNG, WebP, AVIF or GIF pictures are allowed." });
    return res.status(400).json({ error: "The pictures could not be read." });
  });

const SAVE_SQL = `
  INSERT INTO about_page
    (id, status, title, subtitle, story_label, story_heading, story_body, stat_value, stat_caption,
     images, thumbnails, image_alts, highlights)
  VALUES (1, $1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb,
          $9::text[], $10::text[], $11::jsonb, $12::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status, title = EXCLUDED.title, subtitle = EXCLUDED.subtitle,
    story_label = EXCLUDED.story_label, story_heading = EXCLUDED.story_heading, story_body = EXCLUDED.story_body,
    stat_value = EXCLUDED.stat_value, stat_caption = EXCLUDED.stat_caption,
    images = EXCLUDED.images, thumbnails = EXCLUDED.thumbnails, image_alts = EXCLUDED.image_alts,
    highlights = EXCLUDED.highlights`;

/* ---------- public: the website reads this ---------- */
router.get("/", run(async (_req, res) => {
  res.set("Cache-Control", "no-cache");
  res.json(await readPage());
}));

/* ---------- save the texts, the order of the pictures and their alt text ---------- */
router.put("/", requireAuth, requirePermission("pages"), run(async (req, res) => {
  const b = req.body || {};

  // the long text: cleaned HTML per language
  const storyBody = {};
  const rawBody = b.storyBody && typeof b.storyBody === "object" ? b.storyBody : {};
  for (const code of LANGS) {
    const html = cleanHtml(rawBody[code]);
    if (html.length > MAX_HTML)
      throw new Bad(`The story (${code}) is too long: ${html.length} of ${MAX_HTML} characters of formatted text.`);
    if (html) storyBody[code] = html;
  }

  const highlights = (Array.isArray(b.highlights) ? b.highlights : [])
    .slice(0, MAX_HIGHLIGHTS)
    .map((h) => ({
      icon: ICONS.includes(h?.icon) ? h.icon : "coffee",
      title: i18n(h?.title, 80),
      text: i18n(h?.text, 240),
    }))
    .filter((h) => Object.keys(h.title).length || Object.keys(h.text).length);

  const wanted = Array.isArray(b.gallery) ? b.gallery : [];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // the pictures are read INSIDE the transaction: one uploaded a moment ago is never lost by this save
    const { rows } = await client.query("SELECT images, thumbnails, image_alts FROM about_page WHERE id = 1 FOR UPDATE");
    const cur = rows[0] || { images: [], thumbnails: [], image_alts: [] };
    const items = cur.images.map((img, i) => ({
      key: keyOf(img),
      img,
      thumbnail: cur.thumbnails[i] || img,
      alt: cur.image_alts[i] || {},
    }));
    const byKey = new Map(items.map((it) => [it.key, it]));
    const ordered = [];
    const seen = new Set();
    for (const g of wanted) {
      const it = byKey.get(String(g?.key));
      if (!it || seen.has(it.key)) continue;
      seen.add(it.key);
      ordered.push({ ...it, alt: g.alt === undefined ? it.alt : i18n(g.alt, 160) });
    }
    for (const it of items) if (!seen.has(it.key)) ordered.push(it);

    await client.query(SAVE_SQL, [
      Number(b.status) === 0 ? 0 : 1,
      JSON.stringify(i18n(b.title, 120)),
      JSON.stringify(i18n(b.subtitle, 300)),
      JSON.stringify(i18n(b.storyLabel, 60)),
      JSON.stringify(i18n(b.storyHeading, 200)),
      JSON.stringify(storyBody),
      JSON.stringify(i18n(b.statValue, 40)),
      JSON.stringify(i18n(b.statCaption, 160)),
      ordered.map((o) => o.img),
      ordered.map((o) => o.thumbnail),
      JSON.stringify(ordered.map((o) => o.alt)),
      JSON.stringify(highlights),
    ]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  res.json(await readPage());
}));

/* ---------- add pictures (acts at once) ---------- */
router.post("/images", requireAuth, requirePermission("pages"), receive, run(async (req, res) => {
  const files = req.files || [];
  if (!files.length) throw new Bad("Choose at least one picture (JPG, PNG, WebP, AVIF or GIF).");

  await query("INSERT INTO about_page (id) VALUES (1) ON CONFLICT (id) DO NOTHING");
  const { rows } = await query("SELECT cardinality(images) AS n FROM about_page WHERE id = 1");
  if (rows[0].n + files.length > MAX_IMAGES)
    throw new Bad(`The gallery holds ${MAX_IMAGES} pictures at most (it has ${rows[0].n} now).`);

  await fs.mkdir(IMG_DIR, { recursive: true });
  await fs.mkdir(THUMB_DIR, { recursive: true });

  const made = [];
  try {
    for (const file of files) {
      const key = `${crypto.randomUUID()}.webp`;
      const source = () => sharp(file.buffer, { limitInputPixels: 50_000_000 }).rotate(); // .rotate() follows the phone's orientation
      await source()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(path.join(IMG_DIR, key));
      await source().resize({ width: 480, height: 320, fit: "cover" }).webp({ quality: 74 }).toFile(path.join(THUMB_DIR, key));
      made.push({ img: `about/img/${key}`, thumbnail: `about/thumbnails/${key}` });
    }
  } catch {
    await removeFiles(made.flatMap((m) => [m.img, m.thumbnail]));
    throw new Bad("One of the files is not a valid picture.");
  }

  try {
    const done = await query(
      `UPDATE about_page
          SET images = images || $1::text[], thumbnails = thumbnails || $2::text[], image_alts = image_alts || $3::jsonb
        WHERE id = 1 AND cardinality(images) + $4::int <= ${MAX_IMAGES}`,
      [made.map((m) => m.img), made.map((m) => m.thumbnail), JSON.stringify(made.map(() => ({}))), made.length],
    );
    if (!done.rowCount) throw new Bad(`The gallery holds ${MAX_IMAGES} pictures at most.`);
  } catch (err) {
    await removeFiles(made.flatMap((m) => [m.img, m.thumbnail]));
    throw err;
  }

  res.status(201).json(await readPage());
}));

/* ---------- delete a picture (acts at once) ---------- */
router.delete("/images/:key", requireAuth, requirePermission("pages"), run(async (req, res) => {
  const key = String(req.params.key);
  let removed;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT images, thumbnails, image_alts FROM about_page WHERE id = 1 FOR UPDATE");
    const cur = rows[0];
    const idx = cur ? cur.images.findIndex((img) => keyOf(img) === key) : -1;
    if (idx < 0) throw new Bad("That picture was not found.", 404);

    removed = [cur.images[idx], cur.thumbnails[idx]];
    const keep = (_v, i) => i !== idx;
    await client.query("UPDATE about_page SET images = $1::text[], thumbnails = $2::text[], image_alts = $3::jsonb WHERE id = 1", [
      cur.images.filter(keep),
      cur.thumbnails.filter(keep),
      JSON.stringify(cur.image_alts.filter(keep)),
    ]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  await removeFiles(removed);
  res.json(await readPage());
}));

export default router;