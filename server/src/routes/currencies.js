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

/* ================= GET: public list (hidden currencies only for menu managers) ================= */
router.get("/", optionalAuth, async (req, res) => {
  const all = req.permissions?.includes("menu");
  const { rows } = await pool.query(
    `SELECT * FROM currencies ${all ? "" : "WHERE status = 1"} ORDER BY sort_num ASC, id ASC`
  );
  res.json(rows);
});

/* ================= POST: create currency ================= */
router.post("/", ...guard, async (req, res) => {
  const name = parseI18n(req.body.name, 120);
  const description = parseI18n(req.body.description, 500) || {};
  if (!name?.en) return res.status(400).json({ error: "The English name is required." });

  const currency_symbol = String(req.body.currency_symbol || "").trim().slice(0, 20);
  const country_flags_id = req.body.country_flags_id ? Number(req.body.country_flags_id) : null;
  const status = Number(req.body.status) === 0 ? 0 : 1;
  const sort_num = Number(req.body.sort_num) || 0;

  const { rows } = await pool.query(
    `INSERT INTO currencies 
     (name, currency_symbol, description, country_flags_id, status, sort_num, created_at, updated_at)
     VALUES ($1::jsonb, $2, $3::jsonb, $4, $5, $6, now(), now())
     RETURNING *`,
    [
      JSON.stringify(name),
      currency_symbol,
      JSON.stringify(description),
      country_flags_id,
      status,
      sort_num,
    ]
  );
  res.status(201).json(rows[0]);
});

/* ================= PUT: update currency ================= */
router.put("/:id", ...guard, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });

  const { rows: existing } = await pool.query("SELECT * FROM currencies WHERE id = $1", [id]);
  if (!existing[0]) return res.status(404).json({ error: "Currency not found." });

  const name = parseI18n(req.body.name, 120);
  const description = parseI18n(req.body.description, 500) || {};
  if (!name?.en) return res.status(400).json({ error: "The English name is required." });

  const currency_symbol = String(req.body.currency_symbol ?? existing[0].currency_symbol).trim().slice(0, 20);
  const country_flags_id = req.body.country_flags_id !== undefined ? (req.body.country_flags_id ? Number(req.body.country_flags_id) : null) : existing[0].country_flags_id;
  const status = Number(req.body.status) === 0 ? 0 : 1;
  const sort_num = req.body.sort_num !== undefined ? Number(req.body.sort_num) : existing[0].sort_num;

  const { rows } = await pool.query(
    `UPDATE currencies
     SET name = $1::jsonb, currency_symbol = $2, description = $3::jsonb, 
         country_flags_id = $4, status = $5, sort_num = $6, updated_at = now()
     WHERE id = $7
     RETURNING *`,
    [
      JSON.stringify(name),
      currency_symbol,
      JSON.stringify(description),
      country_flags_id,
      status,
      sort_num,
      id,
    ]
  );
  res.json(rows[0]);
});

/* ================= DELETE: delete currency ================= */
router.delete("/:id", ...guard, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });

  const { rows } = await pool.query("DELETE FROM currencies WHERE id = $1 RETURNING *", [id]);
  if (!rows[0]) return res.status(404).json({ error: "Currency not found." });
  res.json({ message: "Currency deleted successfully", id });
});

export default router;