import express from "express";
import { pool } from "../db.js";
import { requireAuth, requirePermission, optionalAuth } from "../middleware.js";

const router = express.Router();
const guard = [requireAuth, requirePermission("menu")];

// Catches errors from async handlers (Express 4 does not do this by itself).
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(`[genders] ${req.method} ${req.originalUrl}:`, err);
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
    const { rows } = await pool.query(
      `SELECT * FROM genders ORDER BY sort_num ASC, id ASC`
    );
    res.json(rows);
  })
);

/* ================= POST: create ================= */
router.post(
  "/",
  ...guard,
  wrap(async (req, res) => {
    const gender = parseI18n(req.body.gender, 120);
    const scGender = parseI18n(req.body.sc_gender, 30) || {};
    const sortNum = Number(req.body.sort_num) || 0;

    if (!gender?.en) {
      return res.status(400).json({ error: "The English name for the gender is required." });
    }

    const { rows } = await pool.query(
      `INSERT INTO genders (gender, sc_gender, sort_num)
       VALUES ($1::jsonb, $2::jsonb, $3)
       RETURNING *`,
      [JSON.stringify(gender), JSON.stringify(scGender), sortNum]
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

    const { rows: existing } = await pool.query("SELECT * FROM genders WHERE id = $1", [id]);
    if (!existing[0]) return res.status(404).json({ error: "Gender not found." });

    const gender = parseI18n(req.body.gender, 120);
    const scGender = parseI18n(req.body.sc_gender, 30) || {};
    const sortNum = req.body.sort_num !== undefined ? Number(req.body.sort_num) : existing[0].sort_num;

    if (!gender?.en) {
      return res.status(400).json({ error: "The English name for the gender is required." });
    }

    const { rows } = await pool.query(
      `UPDATE genders
       SET gender = $1::jsonb, sc_gender = $2::jsonb, sort_num = $3
       WHERE id = $4
       RETURNING *`,
      [JSON.stringify(gender), JSON.stringify(scGender), sortNum, id]
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

    const { rows } = await pool.query("DELETE FROM genders WHERE id = $1 RETURNING *", [id]);
    if (!rows[0]) return res.status(404).json({ error: "Gender not found." });
    res.json({ message: "Gender deleted successfully", id });
  })
);

export default router;