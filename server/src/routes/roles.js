import express from "express";
import { pool } from "../db.js";
import { requireAuth, requirePermission, optionalAuth } from "../middleware.js";

const router = express.Router();
const guard = [requireAuth, requirePermission("menu")];

// Catches errors from async handlers (Express 4 does not do this by itself).
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(`[roles] ${req.method} ${req.originalUrl}:`, err);
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
      `SELECT * FROM roles ${all ? "" : "WHERE status = 1"} ORDER BY sort_num ASC, id ASC`
    );
    res.json(rows);
  })
);

/* ================= POST: create ================= */
router.post(
  "/",
  ...guard,
  wrap(async (req, res) => {
    const roleTitle = parseI18n(req.body.role_title, 120);
    const description = parseI18n(req.body.description, 500) || {};
    const status = Number(req.body.status) === 0 ? 0 : 1;
    const sortNum = Number(req.body.sort_num) || 0;

    if (!roleTitle?.en) {
      return res.status(400).json({ error: "The English role title is required." });
    }

    const { rows } = await pool.query(
      `INSERT INTO roles (role_title, description, status, sort_num)
       VALUES ($1::jsonb, $2::jsonb, $3, $4)
       RETURNING *`,
      [JSON.stringify(roleTitle), JSON.stringify(description), status, sortNum]
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

    const { rows: existing } = await pool.query("SELECT * FROM roles WHERE id = $1", [id]);
    if (!existing[0]) return res.status(404).json({ error: "Role not found." });

    const roleTitle = parseI18n(req.body.role_title, 120);
    const description = parseI18n(req.body.description, 500) || {};
    const status = Number(req.body.status) === 0 ? 0 : 1;
    const sortNum = req.body.sort_num !== undefined ? Number(req.body.sort_num) : existing[0].sort_num;

    if (!roleTitle?.en) {
      return res.status(400).json({ error: "The English role title is required." });
    }

    const { rows } = await pool.query(
      `UPDATE roles
       SET role_title = $1::jsonb, description = $2::jsonb, status = $3, sort_num = $4
       WHERE id = $5
       RETURNING *`,
      [JSON.stringify(roleTitle), JSON.stringify(description), status, sortNum, id]
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

    const { rows } = await pool.query("DELETE FROM roles WHERE id = $1 RETURNING *", [id]);
    if (!rows[0]) return res.status(404).json({ error: "Role not found." });
    res.json({ message: "Role deleted successfully", id });
  })
);

export default router;