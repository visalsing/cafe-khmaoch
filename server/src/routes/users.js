import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import { requireAuth, requirePermission, publicUser, USER_SELECT } from "../middleware.js";
import { uploadOne, storeUpload } from "../upload.js";
import { removeImages } from "../storage.js";

const router = Router();
router.use(requireAuth, requirePermission("users"));

const FOLDER = "avatars"; // uploads/avatars/img + uploads/avatars/thumbnails
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const isAdmin = (req) => req.user.role_code === "admin";
const canManage = (req, target) => isAdmin(req) || target.role_code === "customer"; // staff manage customers only
const bad = (res, status, error) => res.status(status).json({ error });

const FK_MESSAGES = {
  users_gender_id_fkey: "The selected gender does not exist.",
  users_nationality_id_fkey: "The selected nationality does not exist.",
  users_position_id_fkey: "The selected position does not exist.",
  users_permission_id_fkey: "The selected permission does not exist.",
  users_role_id_fkey: "The selected role does not exist.",
};
function dbProblem(err) {
  if (err.code === "23505") return [409, "That email is already used by another user."];
  if (err.code === "23503") return [400, FK_MESSAGES[err.constraint] || "One of the selected options does not exist."];
  return null;
}

/* ---------- small readers (work for JSON and for multipart text fields) ---------- */
const text = (v, fallback, max) => String(v ?? fallback ?? "").trim().slice(0, max);
const idOrNull = (v) => { // blank -> null, valid -> number, invalid -> NaN
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : NaN;
};
const bit = (v, fallback) => { // only real 1/0 values count; anything else keeps the fallback
  if (v === true || v === 1 || v === "1" || v === "true") return 1;
  if (v === false || v === 0 || v === "0" || v === "false") return 0;
  return fallback;
};

async function loadUser(id) {
  if (!Number.isInteger(id)) return null;
  const { rows } = await query(`${USER_SELECT} WHERE u.id = $1`, [id]);
  return rows[0] || null;
}

// undefined = not provided, null = provided but unknown, otherwise { id, code }
async function findRole(body) {
  if (body.roleId !== undefined && String(body.roleId).trim() !== "") {
    const id = Number(body.roleId);
    const { rows } = await query("SELECT id, code FROM roles WHERE id = $1", [Number.isInteger(id) ? id : 0]);
    return rows[0] || null;
  }
  if (body.role) {
    const { rows } = await query("SELECT id, code FROM roles WHERE code = $1", [String(body.role)]);
    return rows[0] || null;
  }
  return undefined;
}

/* ---------- "there must always be one active admin" ---------- */
const isActiveAdmin = (u) => u.role_code === "admin" && u.status === 1 && u.is_blocked === 0 && u.is_removed === 0;
async function lastAdminWouldGo(target, next) {
  if (!isActiveAdmin(target) || isActiveAdmin(next)) return false;
  const { rows } = await query(
    `SELECT count(*)::int AS n FROM users u JOIN roles r ON r.id = u.role_id
      WHERE r.code = 'admin' AND u.status = 1 AND u.is_blocked = 0 AND u.is_removed = 0`,
  );
  return rows[0].n <= 1;
}

// only admins assign the extra permission, and never an admin-only one
async function checkPermissionChoice(req, v, existing) {
  if (v.permissionId === (existing?.permission_id ?? null)) return null;
  if (!isAdmin(req)) return [403, "Only admins can assign a permission."];
  if (v.permissionId === null) return null;
  const { rows } = await query("SELECT admin_only FROM permissions WHERE id = $1", [v.permissionId]);
  if (!rows[0]) return [400, "The selected permission does not exist."];
  if (rows[0].admin_only) return [400, "That permission can only belong to admins."];
  return null;
}

function readFields(body, e = null) {
  const firstName = text(body.firstName, e?.first_name, 100);
  const email = text(body.email, e?.email, 254);
  if (!firstName) return { error: "First name is required." };
  if (!EMAIL_RE.test(email)) return { error: "Please enter a valid email." };

  const pick = (key, current) => (body[key] === undefined ? (current ?? null) : idOrNull(body[key]));
  const genderId = pick("genderId", e?.gender_id);
  const nationalityId = pick("nationalityId", e?.nationality_id);
  const positionId = pick("positionId", e?.position_id);
  const permissionId = pick("permissionId", e?.permission_id);
  if ([genderId, nationalityId, positionId, permissionId].some(Number.isNaN))
    return { error: "One of the selected options is invalid." };

  return {
    v: {
      firstName, email,
      lastName: text(body.lastName, e?.last_name, 100),
      firstNameNative: text(body.firstNameNative, e?.first_name_native, 100),
      lastNameNative: text(body.lastNameNative, e?.last_name_native, 100),
      phone: text(body.phone, e?.phone, 40),
      address: text(body.address, e?.address, 500),
      region: text(body.region, e?.region, 100),
      country: text(body.country, e?.country, 100),
      description: text(body.description, e?.description, 2000),
      genderId, nationalityId, positionId, permissionId,
      status: bit(body.status, e?.status ?? 1),
      isBlocked: bit(body.isBlocked, e?.is_blocked ?? 0),
    },
  };
}

/* ================= LIST: ?removed=1 shows the removed users instead ================= */
router.get("/", async (req, res) => {
  const removed = req.query.removed === "1" ? 1 : 0;
  const { rows } = await query(`${USER_SELECT} WHERE u.is_removed = $1 ORDER BY u.created_at DESC`, [removed]);
  res.json(rows.map(publicUser));
});

/* ================= CREATE ================= */
router.post("/", uploadOne, async (req, res) => {
  const b = req.body || {};
  const { v, error } = readFields(b);
  if (error) return bad(res, 400, error);

  const password = String(b.password || "");
  if (password.length < 8) return bad(res, 400, "Password must be at least 8 characters.");

  // admins choose the role, everyone else can only create customers
  let role = isAdmin(req) ? await findRole(b) : undefined;
  if (role === null) return bad(res, 400, "That role does not exist.");
  if (role === undefined) role = await findRole({ role: "customer" });
  if (!role) return bad(res, 500, "The customer role is missing. Run npm run db:setup.");

  const permProblem = await checkPermissionChoice(req, v, null);
  if (permProblem) return bad(res, permProblem[0], permProblem[1]);

  let files = { img: "", thumbnail: "" };
  try {
    if (req.file) files = await storeUpload(req.file, FOLDER); // 1 upload -> img + thumbnail
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      `INSERT INTO users
         (first_name, last_name, first_name_native, last_name_native, gender_id, nationality_id,
          address, region, country, description, email, phone, password_hash,
          role_id, position_id, permission_id, status, is_blocked, avatar, avatar_thumbnail)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING id`,
      [
        v.firstName, v.lastName, v.firstNameNative, v.lastNameNative, v.genderId, v.nationalityId,
        v.address, v.region, v.country, v.description, v.email, v.phone, hash,
        role.id, v.positionId, v.permissionId, v.status, v.isBlocked, files.img, files.thumbnail,
      ],
    );
    res.status(201).json(publicUser(await loadUser(rows[0].id)));
  } catch (err) {
    await removeImages(files.img, files.thumbnail); // don't leave orphan files
    const known = dbProblem(err);
    if (known) return bad(res, known[0], known[1]);
    throw err;
  }
});

/* ================= UPDATE ================= */
router.put("/:id", uploadOne, async (req, res) => {
  const id = Number(req.params.id);
  const target = await loadUser(id);
  if (!target) return bad(res, 404, "User not found.");
  if (target.is_removed === 1) return bad(res, 409, "This user was removed. Restore the user before editing.");
  if (!canManage(req, target)) return bad(res, 403, "Only admins can change staff or admin accounts.");

  const b = req.body || {};
  const { v, error } = readFields(b, target);
  if (error) return bad(res, 400, error);

  const role = isAdmin(req) ? await findRole(b) : undefined;
  if (role === null) return bad(res, 400, "That role does not exist.");
  const next = {
    role_id: role ? role.id : target.role_id,
    role_code: role ? role.code : target.role_code,
    status: v.status,
    is_blocked: v.isBlocked,
    is_removed: 0,
  };

  if (id === req.user.id && (next.role_id !== target.role_id || next.status !== target.status || next.is_blocked !== target.is_blocked))
    return bad(res, 400, "You can't change the role or status of your own account.");
  if (await lastAdminWouldGo(target, next)) return bad(res, 409, "There must be at least one active admin.");

  const permProblem = await checkPermissionChoice(req, v, target);
  if (permProblem) return bad(res, permProblem[0], permProblem[1]);

  let hash = target.password_hash;
  if (b.password) {
    if (String(b.password).length < 8) return bad(res, 400, "Password must be at least 8 characters.");
    hash = await bcrypt.hash(String(b.password), 12);
  }

  let avatar = target.avatar;
  let avatarThumb = target.avatar_thumbnail;
  let uploaded = null;
  let committed = false;

  try {
    if (req.file) {
      uploaded = await storeUpload(req.file, FOLDER);
      avatar = uploaded.img;
      avatarThumb = uploaded.thumbnail;
    } else if (bit(b.removeAvatar, 0) === 1) {
      avatar = "";
      avatarThumb = "";
    }

    await query(
      `UPDATE users SET
         first_name = $1, last_name = $2, first_name_native = $3, last_name_native = $4,
         gender_id = $5, nationality_id = $6, address = $7, region = $8, country = $9, description = $10,
         email = $11, phone = $12, password_hash = $13, role_id = $14, position_id = $15, permission_id = $16,
         status = $17, is_blocked = $18, avatar = $19, avatar_thumbnail = $20
       WHERE id = $21`,
      [
        v.firstName, v.lastName, v.firstNameNative, v.lastNameNative,
        v.genderId, v.nationalityId, v.address, v.region, v.country, v.description,
        v.email, v.phone, hash, next.role_id, v.positionId, v.permissionId,
        v.status, v.isBlocked, avatar, avatarThumb, id,
      ],
    );
    committed = true;

    // only after the database update worked: delete the replaced / removed files
    if (avatar !== target.avatar) await removeImages(target.avatar, target.avatar_thumbnail);
    res.json(publicUser(await loadUser(id)));
  } catch (err) {
    if (!committed && uploaded) await removeImages(uploaded.img, uploaded.thumbnail);
    const known = dbProblem(err);
    if (known) return bad(res, known[0], known[1]);
    throw err;
  }
});

/* ================= quick switches: PATCH /:id/status {status: 0|1}, PATCH /:id/block {blocked: 0|1} ================= */
function flagRoute(column, bodyKey, selfForbiddenValue) {
  return async (req, res) => {
    const id = Number(req.params.id);
    const value = bit(req.body?.[bodyKey], null);
    if (value === null) return bad(res, 400, "Invalid request.");

    const target = await loadUser(id);
    if (!target) return bad(res, 404, "User not found.");
    if (target.is_removed === 1) return bad(res, 409, "This user was removed. Restore the user first.");
    if (!canManage(req, target)) return bad(res, 403, "Only admins can change staff or admin accounts.");
    if (id === req.user.id && value === selfForbiddenValue) return bad(res, 400, "You can't do that to your own account.");
    if (await lastAdminWouldGo(target, { ...target, [column]: value }))
      return bad(res, 409, "There must be at least one active admin.");

    await query(`UPDATE users SET ${column} = $1 WHERE id = $2`, [value, id]); // column is one of the two fixed names below
    res.json(publicUser(await loadUser(id)));
  };
}
router.patch("/:id/status", flagRoute("status", "status", 0));
router.patch("/:id/block", flagRoute("is_blocked", "blocked", 1));

/* ================= REMOVE (soft): email + phone get "Removed-", can be restored ================= */
router.post("/:id/remove", async (req, res) => {
  const id = Number(req.params.id);
  const target = await loadUser(id);
  if (!target) return bad(res, 404, "User not found.");
  if (!canManage(req, target)) return bad(res, 403, "Only admins can remove staff or admin accounts.");
  if (id === req.user.id) return bad(res, 400, "You can't remove your own account.");
  if (target.is_removed === 1) return bad(res, 409, "This user is already removed.");
  if (await lastAdminWouldGo(target, { ...target, is_removed: 1 }))
    return bad(res, 409, "There must be at least one active admin.");

  await query(
    `UPDATE users
        SET is_removed = 1, removed_at = now(),
            email = CASE WHEN email LIKE 'Removed-%' THEN email ELSE 'Removed-' || email END,
            phone = CASE WHEN phone = '' OR phone LIKE 'Removed-%' THEN phone ELSE 'Removed-' || phone END
      WHERE id = $1`,
    [id],
  );
  res.json(publicUser(await loadUser(id)));
});

/* ================= RESTORE ================= */
router.post("/:id/restore", async (req, res) => {
  const id = Number(req.params.id);
  const target = await loadUser(id);
  if (!target) return bad(res, 404, "User not found.");
  if (!canManage(req, target)) return bad(res, 403, "Only admins can restore staff or admin accounts.");
  if (target.is_removed !== 1) return bad(res, 409, "This user is not removed.");

  try {
    await query(
      `UPDATE users
          SET is_removed = 0, removed_at = NULL,
              email = regexp_replace(email, '^Removed-', ''),
              phone = regexp_replace(phone, '^Removed-', '')
        WHERE id = $1`,
      [id],
    );
    res.json(publicUser(await loadUser(id)));
  } catch (err) {
    if (err.code === "23505") return bad(res, 409, "Another user already uses that email, so this account can't be restored.");
    throw err;
  }
});

/* ================= DELETE (permanent): the row and the avatar files are gone ================= */
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const target = await loadUser(id);
  if (!target) return bad(res, 404, "User not found.");
  if (!canManage(req, target)) return bad(res, 403, "Only admins can delete staff or admin accounts.");
  if (id === req.user.id) return bad(res, 400, "You can't delete your own account.");
  if (await lastAdminWouldGo(target, { ...target, is_removed: 1 }))
    return bad(res, 409, "There must be at least one active admin.");

  try {
    await query("DELETE FROM users WHERE id = $1", [id]);
  } catch (err) {
    if (err.code === "23503") return bad(res, 409, "This user has related records. Remove the user instead of deleting.");
    throw err;
  }
  await removeImages(target.avatar, target.avatar_thumbnail);
  res.json({ ok: true });
});

export default router;