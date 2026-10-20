import express from "express";
import { pool } from "../db.js";
import { requireAuth, requirePermission, optionalAuth } from "../middleware.js";

const router = express.Router();
const guard = [requireAuth, requirePermission("menu")]; // Adjust permission slug if needed

// Catches errors from async handlers (Express 4 does not do this by itself).
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(`[permissions] ${req.method} ${req.originalUrl}:`, err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  });

/* ---------- { en, km, ... } helper ---------- */
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
    const s = String(text ?? "").trim().slice(0, max);
    if (s) out[lang] = s;
  }
  return out;
}

/* ================= GET: list ================= */
router.get(
  "/",
  optionalAuth,
  wrap(async (req, res) => {
    const all = req.permissions?.includes("menu");
    const { rows } = await pool.query(
      `SELECT * FROM permissions ${all ? "" : "WHERE status = 1"} ORDER BY sort_num ASC, id ASC`
    );
    res.json(rows);
  })
);

/* ================= POST: create ================= */
router.post(
  "/",
  ...guard,
  wrap(async (req, res) => {
    const name = parseI18n(req.body.name, 120);
    const slug = String(req.body.slug ?? "").trim().toLowerCase().slice(0, 100);
    const module = String(req.body.module ?? "general").trim().toLowerCase().slice(0, 50);
    const description = parseI18n(req.body.description, 500) || {};
    const status = Number(req.body.status) === 0 ? 0 : 1;
    const sortNum = Number(req.body.sort_num) || 0;

    if (!name?.en) {
      return res.status(400).json({ error: "The English permission name is required." });
    }
    if (!slug) {
      return res.status(400).json({ error: "The permission slug is required." });
    }

    const { rows } = await pool.query(
      `INSERT INTO permissions (name, slug, module, description, status, sort_num)
       VALUES ($1::jsonb, $2, $3, $4::jsonb, $5, $6)
       RETURNING *`,
      [JSON.stringify(name), slug, module, JSON.stringify(description), status, sortNum]
    );
    res.status(201).json(rows[0]);
  })
);

/* ================= PUT: update ================= */
router.put(
  "/:id",
  ...guard,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });

    const { rows: existing } = await pool.query("SELECT * FROM permissions WHERE id = $1", [id]);
    if (!existing[0]) return res.status(404).json({ error: "Permission not found." });

    const name = parseI18n(req.body.name, 120);
    const slug = req.body.slug !== undefined ? String(req.body.slug).trim().toLowerCase().slice(0, 100) : existing[0].slug;
    const module = req.body.module !== undefined ? String(req.body.module).trim().toLowerCase().slice(0, 50) : existing[0].module;
    const description = parseI18n(req.body.description, 500) || {};
    const status = Number(req.body.status) === 0 ? 0 : 1;
    const sortNum = req.body.sort_num !== undefined ? Number(req.body.sort_num) : existing[0].sort_num;

    if (!name?.en) {
      return res.status(400).json({ error: "The English permission name is required." });
    }
    if (!slug) {
      return res.status(400).json({ error: "The permission slug is required." });
    }

    const { rows } = await pool.query(
      `UPDATE permissions
       SET name = $1::jsonb, slug = $2, module = $3, description = $4::jsonb, status = $5, sort_num = $6
       WHERE id = $7
       RETURNING *`,
      [JSON.stringify(name), slug, module, JSON.stringify(description), status, sortNum, id]
    );
    res.json(rows[0]);
  })
);

/* ================= DELETE ================= */
router.delete(
  "/:id",
  ...guard,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });

    const { rows } = await pool.query("DELETE FROM permissions WHERE id = $1 RETURNING *", [id]);
    if (!rows[0]) return res.status(404).json({ error: "Permission not found." });
    res.json({ message: "Permission deleted successfully", id });
  })
);

export default router;