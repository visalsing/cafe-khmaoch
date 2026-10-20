import { pool, query } from "./db.js";

// Add this export to server/src/access.js
export const DEFAULT_STAFF = ["dashboard", "pos", "orders"];

// Fetch all permission slugs dynamically from the database permissions table
export async function getAllKeys() {
  const { rows } = await pool.query("SELECT slug FROM permissions WHERE status = 1");
  return rows.map((p) => p.slug);
}

// Fetch admin-only permission slugs dynamically
export async function getAdminOnlyKeys() {
  const { rows } = await pool.query("SELECT slug FROM permissions WHERE admin_only = true AND status = 1");
  return rows.map((p) => p.slug);
}

// Fetch permissions assigned to a specific role code (e.g. 'staff', 'admin') via database joins
export async function permissionsForRoleCode(roleCode) {
  if (roleCode === "admin") {
    return getAllKeys();
  }
  if (roleCode === "customer") {
    return []; // Customers never enter the dashboard
  }

  // const { rows } = await pool.query(
  //   `SELECT p.slug 
  //    FROM permissions p
  //    JOIN role_permissions rp ON p.id = rp.permission_id
  //    JOIN roles r ON r.id = rp.role_id
  //    WHERE r.code = $1 AND p.status = 1`,
  //   [roleCode]
  // );
    const { rows } = await pool.query(
    `SELECT p.slug
     FROM permissions p
     JOIN role_permissions rp ON p.id = rp.permission_id
     JOIN roles r ON r.id = rp.role_id
     WHERE r.code = $1
       AND p.status = 1
       AND p.admin_only = false`,
    [roleCode]
  );
  
  return rows.map((r) => r.slug);
}

// Alias function required by middleware.js
export async function permissionsFor(roleCode) {
  return permissionsForRoleCode(roleCode);
}

// Helper for checking a user's permissions directly using their role_id from the users table
export async function permissionsForUser(userId) {
  const { rows: userRows } = await pool.query(
    `SELECT r.code 
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1 AND u.is_removed = 0`,
    [userId]
  );

  if (!userRows[0]) return [];
  return permissionsForRoleCode(userRows[0].code);
}

// // Generate an access matrix mapping each active role code to its respective permissions array
// export async function accessMatrix() {
//   const { rows: roles } = await pool.query("SELECT code FROM roles WHERE status = 1");
//   const matrix = {};

//   for (const role of roles) {
//     matrix[role.code] = await permissionsForRoleCode(role.code);
//   }
  
//   // Ensure customer defaults to empty array even if omitted
//   matrix["customer"] = [];

//   return matrix;
// }
export async function accessMatrix() {
  const [{ rows: roles }, { rows: perms }, { rows: links }] = await Promise.all([
    query("SELECT id, code, role_title, description, status, sort_num FROM roles ORDER BY sort_num, id"),
    query("SELECT id, slug, module, name, description, status, sort_num, admin_only FROM permissions WHERE slug <> '' ORDER BY sort_num, id"),
    query("SELECT role_id, permission_id FROM role_permissions"),
  ]);
  const usable = perms.filter((p) => p.status === 1);
  const slugById = new Map(usable.filter((p) => !p.admin_only).map((p) => [p.id, p.slug]));

  const matrix = {};
  for (const r of roles) {
    const key = r.code || `role-${r.id}`;
    if (r.code === "admin") matrix[key] = usable.map((p) => p.slug);
    else if (r.code === "customer") matrix[key] = [];
    else matrix[key] = links.filter((l) => l.role_id === r.id).map((l) => slugById.get(l.permission_id)).filter(Boolean);
  }

  // ← new: the same lists, keyed by role id (the new page reads these)
  const byRole = {};
  for (const r of roles) byRole[r.id] = matrix[r.code || `role-${r.id}`];

  return {
    ...matrix,
    byRole, // ← new
    rolesList: roles.map((r) => ({
      id: r.id, code: r.code, title: r.role_title, description: r.description, status: r.status, sort: r.sort_num,
      editable: r.code !== "admin" && r.code !== "customer",
    })),
    permissionsList: perms.map((p) => ({
      id: p.id, slug: p.slug, module: p.module, name: p.name, description: p.description, status: p.status, adminOnly: p.admin_only,
    })),
  };
}