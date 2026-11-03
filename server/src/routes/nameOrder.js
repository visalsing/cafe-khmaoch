import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware.js";

const router = Router();

const CHOICES = ["firstLast", "lastFirst"];
const DEFAULTS = { latin: "lastFirst", native: "lastFirst" };

// whatever is in the row, the answer is always two valid choices
const shape = (row) => ({
  latin: CHOICES.includes(row?.name_order_latin) ? row.name_order_latin : DEFAULTS.latin,
  native: CHOICES.includes(row?.name_order_native) ? row.name_order_native : DEFAULTS.native,
});

/* ================= READ: everyone (every page needs it to write names) =================
   A failing read must never break a page, so it falls back to the defaults. */
router.get("/", async (req, res) => {
  try {
    const { rows } = await query(
      "SELECT name_order_latin, name_order_native FROM store_settings WHERE id = 1",
    );
    res.json(shape(rows[0]));
  } catch (err) {
    console.error("[name-order] read failed:", err.message);
    res.json(DEFAULTS);
  }
});

/* ================= SAVE: admins only. Body: { latin?, native? } ================= */
router.put("/", requireAuth, requireAdmin, async (req, res) => {
  const body = req.body || {};
  const next = {};

  for (const key of ["latin", "native"]) {
    if (body[key] === undefined) continue;
    if (!CHOICES.includes(body[key]))
      return res.status(400).json({ error: `Invalid ${key} name order.` });
    next[key] = body[key];
  }
  if (!Object.keys(next).length)
    return res.status(400).json({ error: "Nothing to save." });

  try {
    // store_settings has ONE row (id = 1); create it if it is somehow missing
    const { rows } = await query(
      `INSERT INTO store_settings (id, name_order_latin, name_order_native)
       VALUES (1, COALESCE($1::text, 'lastFirst'), COALESCE($2::text, 'lastFirst'))
       ON CONFLICT (id) DO UPDATE SET
         name_order_latin  = COALESCE($1::text, store_settings.name_order_latin),
         name_order_native = COALESCE($2::text, store_settings.name_order_native)
       RETURNING name_order_latin, name_order_native`,
      [next.latin ?? null, next.native ?? null],
    );
    res.json(shape(rows[0]));
  } catch (err) {
    console.error("[name-order] save failed:", err);
    res.status(500).json({ error: "Could not save the name order." });
  }
});

export default router;