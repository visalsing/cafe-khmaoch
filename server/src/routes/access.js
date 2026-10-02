import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requirePermission } from "../middleware.js";
import { ALL_KEYS, ADMIN_ONLY, DEFAULT_STAFF, accessMatrix } from "../access.js";

const router = Router();
router.use(requireAuth, requirePermission("roles")); // "roles" can only ever belong to admins

async function saveStaff(perms) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM role_permissions WHERE role = 'staff'");
    if (perms.length)
      await client.query("INSERT INTO role_permissions (role, permission) SELECT 'staff', unnest($1::text[])", [perms]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

router.get("/", async (req, res) => res.json(await accessMatrix()));

router.put("/staff", async (req, res) => {
  const perms = Array.isArray(req.body?.permissions) ? req.body.permissions : null;
  if (!perms || perms.some((k) => !ALL_KEYS.includes(k) || ADMIN_ONLY.includes(k)))
    return res.status(400).json({ error: "Invalid permission list." });
  await saveStaff([...new Set(perms)]);
  res.json(await accessMatrix());
});

router.post("/staff/reset", async (req, res) => {
  await saveStaff(DEFAULT_STAFF);
  res.json(await accessMatrix());
});

export default router;