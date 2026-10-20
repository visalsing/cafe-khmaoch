
import express from "express";
import { pool } from "../db.js";
import {
  requireAuth,
  requirePermission,
  optionalAuth,
} from "../middleware.js";

const router = express.Router();
const guard = [requireAuth, requirePermission("menu")];

// Catches errors from async handlers (Express 4 does not do this by itself).
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(
      `[role_permissions] ${req.method} ${req.originalUrl}:`,
      err
    );

    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }

    // Handle duplicate role-permission assignments.
    if (err.code === "23505") {
      return res.status(409).json({
        error: "This permission is already assigned to this role.",
      });
    }

    // Handle invalid role_id or permission_id references.
    if (err.code === "23503") {
      return res.status(400).json({
        error: "Invalid role_id or permission_id.",
      });
    }

    next(err);
  });

/* ================= GET: list assignments ================= */
router.get(
  "/",
  optionalAuth,
  wrap(async (req, res) => {
    const canManage = req.permissions?.includes("menu");

    const { rows } = await pool.query(
      `SELECT
         rp.id,
         rp.role_id,
         rp.permission_id,
         rp.created_at,
         rp.updated_at,
         r.code AS role_code,
         r.role_title,
         p.slug AS permission_slug,
         p.name AS permission_name,
         p.module AS permission_module
       FROM role_permissions rp
       JOIN roles r ON r.id = rp.role_id
       JOIN permissions p ON p.id = rp.permission_id
       ${canManage ? "" : "WHERE r.status = 1 AND p.status = 1"}
       ORDER BY r.sort_num ASC, r.id ASC, p.sort_num ASC, p.id ASC`
    );

    res.json(rows);
  })
);

/* ================= GET: assignments by role ================= */
router.get(
  "/:roleId",
  optionalAuth,
  wrap(async (req, res) => {
    const roleId = Number(req.params.roleId);

    if (!Number.isInteger(roleId) || roleId <= 0) {
      return res.status(400).json({ error: "Invalid role_id." });
    }

    const canManage = req.permissions?.includes("menu");

    const { rows: roles } = await pool.query(
      `SELECT id, code, role_title, description, status, sort_num
       FROM roles
       WHERE id = $1`,
      [roleId]
    );

    if (!roles.length) {
      return res.status(404).json({ error: "Role not found." });
    }

    if (!canManage && Number(roles[0].status) !== 1) {
      return res.status(404).json({ error: "Role not found." });
    }

    const { rows } = await pool.query(
      `SELECT
         rp.id,
         rp.role_id,
         rp.permission_id,
         rp.created_at,
         rp.updated_at,
         p.slug AS permission_slug,
         p.name AS permission_name,
         p.module AS permission_module,
         p.description AS permission_description,
         p.status AS permission_status,
         p.sort_num AS permission_sort_num
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = $1
         ${canManage ? "" : "AND p.status = 1"}
       ORDER BY p.sort_num ASC, p.id ASC`,
      [roleId]
    );

    res.json({
      role: roles[0],
      permissions: rows,
    });
  })
);

/* ================= POST: assign permission ================= */
router.post(
  "/",
  ...guard,
  wrap(async (req, res) => {
    const roleId = Number(req.body.role_id);
    const permissionId = Number(req.body.permission_id);

    if (!Number.isInteger(roleId) || roleId <= 0) {
      return res.status(400).json({ error: "Valid role_id is required." });
    }

    if (!Number.isInteger(permissionId) || permissionId <= 0) {
      return res.status(400).json({
        error: "Valid permission_id is required.",
      });
    }

    const { rows } = await pool.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       VALUES ($1, $2)
       ON CONFLICT (role_id, permission_id) DO NOTHING
       RETURNING id, role_id, permission_id, created_at, updated_at`,
      [roleId, permissionId]
    );

    if (!rows.length) {
      return res.status(409).json({
        error: "This permission is already assigned to this role.",
      });
    }

    res.status(201).json(rows[0]);
  })
);

/* ================= PUT: update assignment ================= */
router.put(
  "/:id",
  ...guard,
  wrap(async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid id." });
    }

    const { rows: existing } = await pool.query(
      `SELECT id, role_id, permission_id, created_at, updated_at
       FROM role_permissions
       WHERE id = $1`,
      [id]
    );

    if (!existing.length) {
      return res.status(404).json({
        error: "Role-permission assignment not found.",
      });
    }

    const roleId =
      req.body.role_id !== undefined
        ? Number(req.body.role_id)
        : existing[0].role_id;

    const permissionId =
      req.body.permission_id !== undefined
        ? Number(req.body.permission_id)
        : existing[0].permission_id;

    if (!Number.isInteger(roleId) || roleId <= 0) {
      return res.status(400).json({ error: "Valid role_id is required." });
    }

    if (!Number.isInteger(permissionId) || permissionId <= 0) {
      return res.status(400).json({
        error: "Valid permission_id is required.",
      });
    }

    const { rows } = await pool.query(
      `UPDATE role_permissions
       SET role_id = $1,
           permission_id = $2,
           updated_at = now()
       WHERE id = $3
       RETURNING id, role_id, permission_id, created_at, updated_at`,
      [roleId, permissionId, id]
    );

    res.json(rows[0]);
  })
);

/* ================= DELETE: remove assignment ================= */
router.delete(
  "/:id",
  ...guard,
  wrap(async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid id." });
    }

    const { rows } = await pool.query(
      `DELETE FROM role_permissions
       WHERE id = $1
       RETURNING id, role_id, permission_id`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: "Role-permission assignment not found.",
      });
    }

    res.json({
      message: "Role permission removed successfully.",
      ...rows[0],
    });
  })
);

export default router;
