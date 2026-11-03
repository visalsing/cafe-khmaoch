import { Router } from "express";
import { pool, query } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware.js";

const router = Router();

const COLS =
  "id, code, name, description, icon, status, is_selected, sort_num, created_at, updated_at";
const ICON_RE = /^[A-Za-z0-9]{0,50}$/; // the NAME of an icon, never code
const LANG_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
const bad = (res, status, error) => res.status(status).json({ error });

// Catches errors from async handlers (never leaves a request hanging)
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(`[themes] ${req.method} ${req.originalUrl}:`, err);
    if (!res.headersSent) bad(res, 500, "Something went wrong on the server.");
  });

// { en, km, ... } from JSON text or an object; empty translations are dropped
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

/* ================= PUBLIC: the active themes (what the Settings pages offer) ================= */
router.get(
  "/",
  wrap(async (req, res) => {
    const { rows } = await query(
      `SELECT ${COLS} FROM themes WHERE status = 1 ORDER BY sort_num ASC, id ASC`,
    );
    res.json(rows);
  }),
);

/* ================= ADMIN: every theme, hidden ones too ================= */
router.get(
  "/all",
  requireAuth,
  requireAdmin,
  wrap(async (req, res) => {
    const { rows } = await query(
      `SELECT ${COLS} FROM themes ORDER BY sort_num ASC, id ASC`,
    );
    res.json(rows);
  }),
);

/* ================= MY CHOICE (any signed-in user): users.theme_id, NULL = use the default ================= */
router.get(
  "/me",
  requireAuth,
  wrap(async (req, res) => {
    const { rows } = await query("SELECT theme_id FROM users WHERE id = $1", [
      req.user.id,
    ]);
    res.json({ themeId: rows[0]?.theme_id ?? null });
  }),
);

router.patch(
  "/me",
  requireAuth,
  wrap(async (req, res) => {
    const raw = req.body?.themeId;
    let themeId = null; // blank / null = "no personal choice, follow the default"

    if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
      themeId = Number(raw);
      if (!Number.isInteger(themeId) || themeId <= 0)
        return bad(res, 400, "Invalid theme.");
      const { rows } = await query(
        "SELECT 1 FROM themes WHERE id = $1 AND status = 1",
        [themeId],
      );
      if (!rows[0]) return bad(res, 400, "That theme is not available.");
    }

    await query("UPDATE users SET theme_id = $1 WHERE id = $2", [
      themeId,
      req.user.id,
    ]);
    res.json({ themeId });
  }),
);

/* ================= ADMIN: edit texts, icon, order, status (the code never changes) ================= */
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
    const description = parseI18n(b.description, 500) || {};

    const icon = String(b.icon ?? "").trim();
    if (!ICON_RE.test(icon))
      return bad(res, 400, "The icon must be an icon name (letters and numbers only).");

    const sortNum = Number.parseInt(b.sort_num, 10) || 0;
    const status = Number(b.status) === 0 ? 0 : 1;

    const { rows: existing } = await query(
      "SELECT is_selected FROM themes WHERE id = $1",
      [id],
    );
    if (!existing[0]) return bad(res, 404, "Theme not found.");
    if (existing[0].is_selected === 1 && status === 0)
      return bad(
        res,
        409,
        "The default theme can't be hidden. Make another theme the default first.",
      );

    const { rows } = await query(
      `UPDATE themes
          SET name = $1::jsonb, description = $2::jsonb, icon = $3, sort_num = $4, status = $5
        WHERE id = $6
        RETURNING ${COLS}`,
      [JSON.stringify(name), JSON.stringify(description), icon, sortNum, status, id],
    );
    res.json(rows[0]);
  }),
);

/* ================= ADMIN: show / hide (the default theme can't be hidden) ================= */
router.patch(
  "/:id/status",
  requireAuth,
  requireAdmin,
  wrap(async (req, res) => {
    const id = idOf(req);
    if (!id) return bad(res, 400, "Invalid id.");
    const status = Number(req.body?.status) === 0 ? 0 : 1;

    const { rows: existing } = await query(
      "SELECT is_selected FROM themes WHERE id = $1",
      [id],
    );
    if (!existing[0]) return bad(res, 404, "Theme not found.");
    if (existing[0].is_selected === 1 && status === 0)
      return bad(
        res,
        409,
        "The default theme can't be hidden. Make another theme the default first.",
      );

    const { rows } = await query(
      `UPDATE themes SET status = $1 WHERE id = $2 RETURNING ${COLS}`,
      [status, id],
    );
    res.json(rows[0]);
  }),
);

/* ================= ADMIN: make this the default theme =================
   Done in ONE transaction: the unique index allows a single default, so the old one
   is switched off first and the new one switched on, or nothing changes at all. */
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
        "SELECT status FROM themes WHERE id = $1 FOR UPDATE",
        [id],
      );
      if (!found[0]) {
        await client.query("ROLLBACK");
        return bad(res, 404, "Theme not found.");
      }
      if (found[0].status !== 1) {
        await client.query("ROLLBACK");
        return bad(res, 409, "Only an active theme can be the default.");
      }

      await client.query(
        "UPDATE themes SET is_selected = 0 WHERE is_selected = 1 AND id <> $1",
        [id],
      );
      const { rows } = await client.query(
        `UPDATE themes SET is_selected = 1 WHERE id = $1 RETURNING ${COLS}`,
        [id],
      );

      await client.query("COMMIT");
      res.json(rows[0]);
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err; // wrap() logs it and answers 500
    } finally {
      client.release();
    }
  }),
);

export default router;