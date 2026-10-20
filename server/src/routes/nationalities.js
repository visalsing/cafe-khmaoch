import express from "express";
import { pool } from "../db.js";
import { requireAuth, requirePermission, optionalAuth } from "../middleware.js";

const router = express.Router();
const guard = [requireAuth, requirePermission("menu")];

// Catches errors from async handlers
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(`[nationalities] ${req.method} ${req.originalUrl}:`, err);
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
      `SELECT * FROM nationalities ${all ? "" : "WHERE status = 0"} ORDER BY sort_num ASC, id ASC`
    );
    res.json(rows);
  })
);

/* ================= POST: create ================= */
router.post(
  "/",
  ...guard,
  wrap(async (req, res) => {
    const nationality = parseI18n(req.body.nationality, 120);
    const nationCode = String(req.body.nation_code ?? "").trim().slice(0, 30);
    const countryFlagsId = req.body.country_flags_id ? Number(req.body.country_flags_id) : null;
    const status = Number(req.body.status) === 1 ? 1 : 0; // 0 = active, 1 = not active
    const sortNum = Number(req.body.sort_num) || 0;

    if (!nationality?.en) {
      return res.status(400).json({ error: "The English name for the nationality is required." });
    }

    const { rows } = await pool.query(
      `INSERT INTO nationalities (nationality, nation_code, country_flags_id, status, sort_num)
       VALUES ($1::jsonb, $2, $3, $4, $5)
       RETURNING *`,
      [JSON.stringify(nationality), nationCode, countryFlagsId, status, sortNum]
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

    const { rows: existing } = await pool.query("SELECT * FROM nationalities WHERE id = $1", [id]);
    if (!existing[0]) return res.status(404).json({ error: "Nationality not found." });

    const nationality = parseI18n(req.body.nationality, 120);
    const nationCode = req.body.nation_code !== undefined ? String(req.body.nation_code).trim().slice(0, 30) : existing[0].nation_code;
    const countryFlagsId = req.body.country_flags_id !== undefined ? (req.body.country_flags_id ? Number(req.body.country_flags_id) : null) : existing[0].country_flags_id;
    const status = req.body.status !== undefined ? (Number(req.body.status) === 1 ? 1 : 0) : existing[0].status;
    const sortNum = req.body.sort_num !== undefined ? Number(req.body.sort_num) : existing[0].sort_num;

    if (!nationality?.en) {
      return res.status(400).json({ error: "The English name for the nationality is required." });
    }

    const { rows } = await pool.query(
      `UPDATE nationalities
       SET nationality = $1::jsonb, nation_code = $2, country_flags_id = $3, status = $4, sort_num = $5
       WHERE id = $6
       RETURNING *`,
      [JSON.stringify(nationality), nationCode, countryFlagsId, status, sortNum, id]
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

    const { rows } = await pool.query("DELETE FROM nationalities WHERE id = $1 RETURNING *", [id]);
    if (!rows[0]) return res.status(404).json({ error: "Nationality not found." });
    res.json({ message: "Nationality deleted successfully", id });
  })
);

export default router;