import { Router } from "express";
import { pool, query } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware.js";

const router = Router();

const COLS =
  "id, code, name, swatch, status, is_selected, sort_num, created_at, updated_at";
const LANG_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
const bad = (res, status, error) => res.status(status).json({ error });

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(`[accents] ${req.method} ${req.originalUrl}:`, err);
    if (!res.headersSent) bad(res, 500, "Something went wrong on the server.");
  });

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

const idOf = (req) => {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
};

/* ================= PUBLIC: active accents ================= */
router.get(
  "/",
  wrap(async (req, res) => {
    const { rows } = await query(
      `SELECT ${COLS} FROM accents WHERE status = 1 ORDER BY sort_num ASC, id ASC`,
    );
    res.json(rows);
  }),
);

/* ================= ADMIN: every accent, hidden ones too ================= */
router.get(
  "/all",
  requireAuth,
  requireAdmin,
  wrap(async (req, res) => {
    const { rows } = await query(
      `SELECT ${COLS} FROM accents ORDER BY sort_num ASC, id ASC`,
    );
    res.json(rows);
  }),
);

/* ================= MY CHOICE: users.accent_id, NULL = follow the default ================= */
router.get(
  "/me",
  requireAuth,
  wrap(async (req, res) => {
    const { rows } = await query("SELECT accent_id FROM users WHERE id = $1", [
      req.user.id,
    ]);
    res.json({ accentId: rows[0]?.accent_id ?? null });
  }),
);

router.patch(
  "/me",
  requireAuth,
  wrap(async (req, res) => {
    const raw = req.body?.accentId;
    let accentId = null;

    if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
      accentId = Number(raw);
      if (!Number.isInteger(accentId) || accentId <= 0)
        return bad(res, 400, "Invalid accent.");
      const { rows } = await query(
        "SELECT 1 FROM accents WHERE id = $1 AND status = 1",
        [accentId],
      );
      if (!rows[0]) return bad(res, 400, "That accent is not available.");
    }

    await query("UPDATE users SET accent_id = $1 WHERE id = $2", [
      accentId,
      req.user.id,
    ]);
    res.json({ accentId });
  }),
);

/* ================= ADMIN: edit name, swatch color, order, status (the code never changes) ================= */
router.put(
  "/:id",
  requireAuth,
  requireAdmin,
  wrap(async (req, res) => {
    const id = idOf(req);
    if (!id) return bad(res, 400, "Invalid id.");

    const b = req.body || {};
    const name = parseI18n(b.name, 120);
    if (!name?.en) return bad(res, 400, "The English name is required.");

    const swatch = String(b.swatch ?? "").trim();
    if (!HEX_RE.test(swatch))
      return bad(res, 400, "The color must be a hex code like #e27200.");

    const sortNum = Number.parseInt(b.sort_num, 10) || 0;
    const status = Number(b.status) === 0 ? 0 : 1;

    const { rows: existing } = await query(
      "SELECT is_selected FROM accents WHERE id = $1",
      [id],
    );
    if (!existing[0]) return bad(res, 404, "Accent not found.");
    if (existing[0].is_selected === 1 && status === 0)
      return bad(
        res,
        409,
        "The default accent can't be hidden. Make another accent the default first.",
      );

    const { rows } = await query(
      `UPDATE accents
          SET name = $1::jsonb, swatch = $2, sort_num = $3, status = $4
        WHERE id = $5
        RETURNING ${COLS}`,
      [JSON.stringify(name), swatch.toLowerCase(), sortNum, status, id],
    );
    res.json(rows[0]);
  }),
);

/* ================= ADMIN: show / hide ================= */
router.patch(
  "/:id/status",
  requireAuth,
  requireAdmin,
  wrap(async (req, res) => {
    const id = idOf(req);
    if (!id) return bad(res, 400, "Invalid id.");
    const status = Number(req.body?.status) === 0 ? 0 : 1;

    const { rows: existing } = await query(
      "SELECT is_selected FROM accents WHERE id = $1",
      [id],
    );
    if (!existing[0]) return bad(res, 404, "Accent not found.");
    if (existing[0].is_selected === 1 && status === 0)
      return bad(
        res,
        409,
        "The default accent can't be hidden. Make another accent the default first.",
      );

    const { rows } = await query(
      `UPDATE accents SET status = $1 WHERE id = $2 RETURNING ${COLS}`,
      [status, id],
    );
    res.json(rows[0]);
  }),
);

/* ================= ADMIN: make this the default accent (one transaction) ================= */
router.patch(
  "/:id/select",
  requireAuth,
  requireAdmin,
  wrap(async (req, res) => {
    const id = idOf(req);
    if (!id) return bad(res, 400, "Invalid id.");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows: found } = await client.query(
        "SELECT status FROM accents WHERE id = $1 FOR UPDATE",
        [id],
      );
      if (!found[0]) {
        await client.query("ROLLBACK");
        return bad(res, 404, "Accent not found.");
      }
      if (found[0].status !== 1) {
        await client.query("ROLLBACK");
        return bad(res, 409, "Only an active accent can be the default.");
      }

      await client.query(
        "UPDATE accents SET is_selected = 0 WHERE is_selected = 1 AND id <> $1",
        [id],
      );
      const { rows } = await client.query(
        `UPDATE accents SET is_selected = 1 WHERE id = $1 RETURNING ${COLS}`,
        [id],
      );

      await client.query("COMMIT");
      res.json(rows[0]);
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }),
);

export default router;