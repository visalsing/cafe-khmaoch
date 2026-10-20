import express from "express";
import { pool } from "../db.js";
import { requireAuth, requirePermission, optionalAuth } from "../middleware.js";

const router = express.Router();
const guard = [requireAuth, requirePermission("menu")]; // only menu managers can change data

/* ---------- { en, km, ... } helper (accepts JSON text or an object) ---------- */
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
    if (s) out[lang] = s; // empty translations are dropped
  }
  return out;
}

/* ================= GET: public list (hidden exchange rates only for menu managers) ================= */
router.get("/", optionalAuth, async (req, res) => {
  const all = req.permissions?.includes("menu");
  const { rows } = await pool.query(
    `SELECT * FROM exchange_rate ${all ? "" : "WHERE status = 1"} ORDER BY sort_num ASC, id ASC`
  );
  res.json(rows);
});

/* ================= POST: create exchange rate ================= */
router.post("/", ...guard, async (req, res) => {
  const currencies_id = Number(req.body.currencies_id);
  if (!Number.isInteger(currencies_id)) {
    return res.status(400).json({ error: "A valid currency is required." });
  }

  const value = Number(req.body.value);
  if (isNaN(value) || value < 0) {
    return res.status(400).json({ error: "A valid non-negative exchange value is required." });
  }

  const description = parseI18n(req.body.description, 500) || {};
  const country_flags_id = req.body.country_flags_id ? Number(req.body.country_flags_id) : null;
  const status = Number(req.body.status) === 0 ? 0 : 1;
  const sort_num = Number(req.body.sort_num) || 0;

  const { rows } = await pool.query(
    `INSERT INTO exchange_rate 
     (currencies_id, value, description, country_flags_id, status, sort_num, created_at, updated_at)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6, now(), now())
     RETURNING *`,
    [
      currencies_id,
      value,
      JSON.stringify(description),
      country_flags_id,
      status,
      sort_num,
    ]
  );
  res.status(201).json(rows[0]);
});

/* ================= PUT: update exchange rate ================= */
router.put("/:id", ...guard, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });

  const { rows: existing } = await pool.query("SELECT * FROM exchange_rate WHERE id = $1", [id]);
  if (!existing[0]) return res.status(404).json({ error: "Exchange rate not found." });

  const currencies_id = req.body.currencies_id !== undefined ? Number(req.body.currencies_id) : existing[0].currencies_id;
  if (!Number.isInteger(currencies_id)) {
    return res.status(400).json({ error: "A valid currency is required." });
  }

  const value = req.body.value !== undefined ? Number(req.body.value) : existing[0].value;
  if (isNaN(value) || value < 0) {
    return res.status(400).json({ error: "A valid non-negative exchange value is required." });
  }

  const description = parseI18n(req.body.description, 500) || existing[0].description;
  const country_flags_id = req.body.country_flags_id !== undefined 
    ? (req.body.country_flags_id ? Number(req.body.country_flags_id) : null) 
    : existing[0].country_flags_id;
  
  const status = Number(req.body.status) === 0 ? 0 : 1;
  const sort_num = req.body.sort_num !== undefined ? Number(req.body.sort_num) : existing[0].sort_num;

  const { rows } = await pool.query(
    `UPDATE exchange_rate
     SET currencies_id = $1, value = $2, description = $3::jsonb, 
         country_flags_id = $4, status = $5, sort_num = $6, updated_at = now()
     WHERE id = $7
     RETURNING *`,
    [
      currencies_id,
      value,
      JSON.stringify(description),
      country_flags_id,
      status,
      sort_num,
      id,
    ]
  );
  res.json(rows[0]);
});

/* ================= DELETE: delete exchange rate ================= */
router.delete("/:id", ...guard, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });

  const { rows } = await pool.query("DELETE FROM exchange_rate WHERE id = $1 RETURNING *", [id]);
  if (!rows[0]) return res.status(404).json({ error: "Exchange rate not found." });
  res.json({ message: "Exchange rate deleted successfully", id });
});

export default router;