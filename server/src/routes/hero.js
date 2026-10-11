import express from "express";
import { pool } from "../db.js";
import { requireAuth, requirePermission, optionalAuth } from "../middleware.js";
import { removeImages } from "../storage.js";
import { uploadOne, storeUpload } from "../upload.js";
import { parseI18n } from "../i18n.js";

const router = express.Router();
const FOLDER = "hero";
// "pages" = the same key the dashboard page "Pages > Hero" uses, so what the browser allows, the server allows
const guard = [requireAuth, requirePermission("pages")];

const httpErr = (status, message) => Object.assign(new Error(message), { status });
const J = (o) => JSON.stringify(o);
// the button link may only be "#section" or "/page" (blocks javascript: and other tricks)
const LINK_RE = /^(#[\w-]{1,60}|\/[\w\-./?=&%#]{0,150})?$/;

function readFields(body) {
  const title = parseI18n(body.title, 150);
  if (!title?.en) throw httpErr(400, "The English title is required.");
  const link = String(body.link ?? "").trim();
  if (!LINK_RE.test(link))
    throw httpErr(400, "The button link must start with # (a section) or / (a page), like #shop or /shop.");
  return {
    tag: parseI18n(body.tag, 60) || {},
    title,
    text: parseI18n(body.text, 500) || {},
    cta: parseI18n(body.cta, 40) || {},
    link,
    status: Number(body.status) === 0 ? 0 : 1,
  };
}

/* ---------- GET: everyone sees visible slides; people with "pages" can also ask for hidden ones (?all=1) ---------- */
router.get("/", optionalAuth, async (req, res) => {
  const all = req.query.all === "1" && req.permissions?.includes("pages");
  const { rows } = await pool.query(
    `SELECT * FROM hero_slides ${all ? "" : "WHERE status = 1"} ORDER BY sort_num, id`
  );
  res.json(rows);
});

/* ---------- POST: create (image required) ---------- */
router.post("/", ...guard, uploadOne, async (req, res) => {
  const f = readFields(req.body);
  if (!req.file) return res.status(400).json({ error: "Please choose an image." });
  const files = await storeUpload(req.file, FOLDER);
  try {
    const { rows } = await pool.query(
      `INSERT INTO hero_slides (tag, title, text, cta, link, img, thumbnail, status, sort_num)
       VALUES ($1::jsonb, $2::jsonb, $3::jsonb, $4::jsonb, $5, $6, $7, $8,
               (SELECT COALESCE(MAX(sort_num), 0) + 1 FROM hero_slides))
       RETURNING *`,
      [J(f.tag), J(f.title), J(f.text), J(f.cta), f.link, files.img, files.thumbnail, f.status]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    await removeImages(files.img, files.thumbnail);
    throw err;
  }
});

/* ---------- PUT /reorder  (must stay ABOVE /:id) ---------- */
router.put("/reorder", ...guard, async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number) : null;
  if (!ids?.length || ids.some((n) => !Number.isInteger(n))) return res.status(400).json({ error: "Invalid order." });
  await pool.query(
    `UPDATE hero_slides h SET sort_num = t.ord
     FROM unnest($1::int[]) WITH ORDINALITY AS t(id, ord) WHERE h.id = t.id`,
    [ids]
  );
  const { rows } = await pool.query("SELECT * FROM hero_slides ORDER BY sort_num, id");
  res.json(rows);
});

/* ---------- POST /reset: replace everything with the 4 default slides ---------- */
const U = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;
const DEFAULT_SLIDES = [
  { tag: "Café & Drinks", title: "Bean & Blossom ☕", text: "Freshly roasted coffee, handcrafted in a cozy corner of the city.", cta: "Order Drinks", link: "#shop", img: U("1445116572660-236099ec97a0") },
  { tag: "Signature Latte", title: "Sip Something Special", text: "Silky espresso, steamed milk and house-made caramel in every cup.", cta: "View Coffee Menu", link: "/shop", img: U("1509042239860-f550ce710b93") },
  { tag: "Fresh Bakery", title: "Baked Every Morning", text: "Warm croissants and pastries, the perfect partner for your brew.", cta: "See Pastries", link: "/shop", img: U("1555507036-ab1f4038808a") },
  { tag: "Visit Us", title: "Gather. Relax. Enjoy.", text: "A cozy place for meetups, study sessions or a quiet afternoon.", cta: "Find Us", link: "#contact", img: U("1554118811-1e0d58224f24") },
];

router.post("/reset", ...guard, async (req, res) => {
  const client = await pool.connect();
  let old = [];
  try {
    await client.query("BEGIN");
    ({ rows: old } = await client.query("DELETE FROM hero_slides RETURNING img, thumbnail"));
    for (const [i, s] of DEFAULT_SLIDES.entries()) {
      await client.query(
        `INSERT INTO hero_slides (tag, title, text, cta, link, img, thumbnail, status, sort_num)
         VALUES ($1::jsonb, $2::jsonb, $3::jsonb, $4::jsonb, $5, $6, '', 1, $7)`,
        [J({ en: s.tag }), J({ en: s.title }), J({ en: s.text }), J({ en: s.cta }), s.link, s.img, i + 1]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  for (const o of old) await removeImages(o.img, o.thumbnail); // delete uploaded files we no longer need
  const { rows } = await pool.query("SELECT * FROM hero_slides ORDER BY sort_num, id");
  res.json(rows);
});

/* ---------- PATCH /:id/status (show / hide) ---------- */
router.patch("/:id/status", ...guard, async (req, res) => {
  const id = Number(req.params.id);
  const status = Number(req.body?.status);
  if (!Number.isInteger(id) || ![0, 1].includes(status)) return res.status(400).json({ error: "Invalid request." });
  const { rows } = await pool.query("UPDATE hero_slides SET status = $1 WHERE id = $2 RETURNING *", [status, id]);
  if (!rows[0]) return res.status(404).json({ error: "Slide not found." });
  res.json(rows[0]);
});

/* ---------- PUT /:id (edit; a new image replaces the old files) ---------- */
router.put("/:id", ...guard, uploadOne, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });
  const { rows: ex } = await pool.query("SELECT * FROM hero_slides WHERE id = $1", [id]);
  if (!ex[0]) return res.status(404).json({ error: "Slide not found." });

  const f = readFields(req.body);
  let { img, thumbnail } = ex[0];
  let uploaded = null;
  if (req.file) {
    uploaded = await storeUpload(req.file, FOLDER);
    ({ img, thumbnail } = uploaded);
  }
  try {
    const { rows } = await pool.query(
      `UPDATE hero_slides
       SET tag = $1::jsonb, title = $2::jsonb, text = $3::jsonb, cta = $4::jsonb, link = $5,
           img = $6, thumbnail = $7, status = $8
       WHERE id = $9 RETURNING *`,
      [J(f.tag), J(f.title), J(f.text), J(f.cta), f.link, img, thumbnail, f.status, id]
    );
    if (uploaded) await removeImages(ex[0].img, ex[0].thumbnail); // only after the update worked
    res.json(rows[0]);
  } catch (err) {
    if (uploaded) await removeImages(uploaded.img, uploaded.thumbnail);
    throw err;
  }
});

/* ---------- DELETE ---------- */
router.delete("/:id", ...guard, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });
  const { rows } = await pool.query("DELETE FROM hero_slides WHERE id = $1 RETURNING img, thumbnail", [id]);
  if (!rows[0]) return res.status(404).json({ error: "Slide not found." });
  await removeImages(rows[0].img, rows[0].thumbnail);
  res.json({ message: "Slide deleted", id });
});

export default router;