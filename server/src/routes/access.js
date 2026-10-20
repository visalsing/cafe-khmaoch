import { Router } from "express";
import { pool, query } from "../db.js";
import { requireAuth, requirePermission } from "../middleware.js";
import { DEFAULT_STAFF, accessMatrix } from "../access.js";

const router = Router();
router.use(requireAuth, requirePermission("roles")); // "roles" is admin-only, so only admins get here

const bad = (res, status, error) => res.status(status).json({ error });

// admin always has everything and customer never has anything: every other role is editable
async function editableRole(id) {
  const { rows } = await query("SELECT id, code FROM roles WHERE id = $1", [Number.isInteger(id) ? id : 0]);
  const role = rows[0];
  if (!role) return { error: [404, "Role not found."] };
  if (role.code === "admin" || role.code === "customer") return { error: [400, "This role's permissions cannot be changed."] };
  return { role };
}

// every slug must exist, be active, and not be admin-only. Returns the clean list, or null
async function validSlugs(slugs) {
  if (!Array.isArray(slugs)) return null;
  const unique = [...new Set(slugs.map(String))];
  if (!unique.length) return [];
  const { rows } = await query(
    "SELECT slug FROM permissions WHERE slug = ANY($1::text[]) AND status = 1 AND NOT admin_only",
    [unique],
  );
  return rows.length === unique.length ? unique : null;
}

async function saveRolePermissions(roleId, slugs) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM role_permissions WHERE role_id = $1", [roleId]);
    if (slugs.length)
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT $1, id FROM permissions WHERE slug = ANY($2::text[]) AND status = 1 AND NOT admin_only`,
        [roleId, slugs],
      );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function staffRoleId() {
  const { rows } = await query("SELECT id FROM roles WHERE code = 'staff'");
  return rows[0]?.id ?? null;
}

router.get("/", async (req, res) => res.json(await accessMatrix()));

// any editable role:  PUT /api/access/roles/3   { permissions: ["pos", "orders"] }
router.put("/roles/:id", async (req, res) => {
  const { role, error } = await editableRole(Number(req.params.id));
  if (error) return bad(res, ...error);
  const slugs = await validSlugs(req.body?.permissions);
  if (!slugs) return bad(res, 400, "Invalid permission list.");
  await saveRolePermissions(role.id, slugs);
  res.json(await accessMatrix());
});

// shortcut used by the current Roles & Permissions page (the "staff" role)
router.put("/staff", async (req, res) => {
  const id = await staffRoleId();
  if (!id) return bad(res, 404, "The staff role does not exist. Run npm run db:setup.");
  const slugs = await validSlugs(req.body?.permissions);
  if (!slugs) return bad(res, 400, "Invalid permission list.");
  await saveRolePermissions(id, slugs);
  res.json(await accessMatrix());
});

router.post("/staff/reset", async (req, res) => {
  const id = await staffRoleId();
  if (!id) return bad(res, 404, "The staff role does not exist. Run npm run db:setup.");
  await saveRolePermissions(id, DEFAULT_STAFF);
  res.json(await accessMatrix());
});

export default router;