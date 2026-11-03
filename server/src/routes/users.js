import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import {
  requireAuth,
  requireAdmin,
  publicUser,
  USER_SELECT,
} from "../middleware.js";
import { uploadOne, storeUpload } from "../upload.js";
import { removeImages } from "../storage.js";
import { issueOtp, clientInfo, logEvent } from "../otp.js";

const router = Router();
// Only the Admin role (role_id = 1) can use anything in this file.
router.use(requireAuth, requireAdmin);

const FOLDER = "avatars"; // uploads/avatars/img + uploads/avatars/thumbnails
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const VERIFY_PURPOSE = "email_verification";
const bad = (res, status, error) => res.status(status).json({ error });

// position_ids is an integer[] column, so it has no foreign key: positions are checked in checkPositionChoice()
const FK_MESSAGES = {
  users_gender_id_fkey: "The selected gender does not exist.",
  users_nationality_id_fkey: "The selected nationality does not exist.",
  users_permission_id_fkey: "The selected permission does not exist.",
  users_role_id_fkey: "The selected role does not exist.",
  users_theme_id_fkey: "The selected theme does not exist.",
};

function dbProblem(err) {
  if (err.code === "23505")
    return [409, "That email is already used by another user."];
  if (err.code === "23503")
    return [
      400,
      FK_MESSAGES[err.constraint] ||
        "One of the selected options does not exist.",
    ];
  return null;
}

/* ---------- small readers (work for JSON and for multipart text fields) ---------- */
const text = (v, fallback, max) =>
  String(v ?? fallback ?? "")
    .trim()
    .slice(0, max);
const idOrNull = (v) => {
  // blank -> null, valid -> number, invalid -> NaN
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : NaN;
};
// list of ids: undefined = not provided, null = invalid, otherwise a de-duplicated array.
// Accepts a JSON array string ("[1,2]"), a comma list ("1,2"), a real array, or a single id.
const idList = (v) => {
  if (v === undefined) return undefined;
  let list = v;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    try {
      list = JSON.parse(s);
    } catch {
      list = s.split(",");
    }
  }
  if (!Array.isArray(list)) list = [list];
  const out = [];
  for (const x of list) {
    const n = Number(x);
    if (!Number.isInteger(n) || n <= 0) return null;
    if (!out.includes(n)) out.push(n);
  }
  return out;
};
const bit = (v, fallback) => {
  // only real 1/0 values count; anything else keeps the fallback
  if (v === true || v === 1 || v === "1" || v === "true") return 1;
  if (v === false || v === 0 || v === "0" || v === "false") return 0;
  return fallback;
};
const preferenceBit = (value, current = 1) => {
  if (value === undefined) return current ?? 1;

  if (value === true || value === 1 || value === "1" || value === "true") {
    return 1;
  }

  if (value === false || value === 0 || value === "0" || value === "false") {
    return 0;
  }

  return null;
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
    const { rows } = await query("SELECT id, code FROM roles WHERE id = $1", [
      Number.isInteger(id) ? id : 0,
    ]);
    return rows[0] || null;
  }
  if (body.role) {
    const { rows } = await query("SELECT id, code FROM roles WHERE code = $1", [
      String(body.role),
    ]);
    return rows[0] || null;
  }
  return undefined;
}

/* ---------- "there must always be one active admin" ---------- */
const isActiveAdmin = (u) =>
  u.role_code === "admin" &&
  u.status === 1 &&
  u.is_blocked === 0 &&
  u.is_removed === 0;
async function lastAdminWouldGo(target, next) {
  if (!isActiveAdmin(target) || isActiveAdmin(next)) return false;
  const { rows } = await query(
    `SELECT count(*)::int AS n FROM users u JOIN roles r ON r.id = u.role_id
      WHERE r.code = 'admin' AND u.status = 1 AND u.is_blocked = 0 AND u.is_removed = 0`,
  );
  return rows[0].n <= 1;
}

// the extra permission can never be an admin-only one
async function checkPermissionChoice(v) {
  if (v.permissionId === null) return null;
  const { rows } = await query(
    "SELECT admin_only FROM permissions WHERE id = $1",
    [v.permissionId],
  );
  if (!rows[0]) return [400, "The selected permission does not exist."];
  if (rows[0].admin_only)
    return [400, "That permission can only belong to admins."];
  return null;
}

// theme appearance, dark, light, system
async function checkThemeChoice(v) {
  if (v.themeId === null) return null;

  const { rows } = await query(
    "SELECT 1 FROM themes WHERE id = $1 AND status = 1",
    [v.themeId],
  );

  if (!rows[0])
    return [400, "The selected theme does not exist or is unavailable."];

  return null;
}

// every selected position must exist (replaces the foreign key an integer[] column cannot have)
async function checkPositionChoice(v) {
  if (!v.positionIds.length) return null;
  const { rows } = await query(
    "SELECT count(*)::int AS n FROM positions WHERE id = ANY($1::int[])",
    [v.positionIds],
  );
  if (rows[0].n !== v.positionIds.length)
    return [400, "One of the selected positions does not exist."];
  return null;
}

/* ---------- email verification ----------
   Marks the address "unverified" and emails a 6-digit code to it.
   The account OWNER types the code after signing in (routes/emailVerification.js);
   the admin only triggers it. */
async function sendVerification(req, userId) {
  const { rows } = await query(
    "SELECT id, email, first_name FROM users WHERE id = $1 AND is_removed = 0",
    [userId],
  );
  if (!rows[0]) return false;

  await query(
    `INSERT INTO user_verifications (user_id, is_verified_email, email_updated_at)
     VALUES ($1, false, now())
     ON CONFLICT (user_id) DO UPDATE
       SET is_verified_email = false, email_verified_at = NULL, verified_by = NULL, email_updated_at = now()`,
    [userId],
  );
  // only ONE open code per user and purpose
  await query(
    `UPDATE email_otp SET status = 'revoked', revoked_at = now()
      WHERE user_id = $1 AND purpose = $2 AND status IN ('pending', 'verified')`,
    [userId, VERIFY_PURPOSE],
  );
  await issueOtp({
    user: rows[0],
    purpose: VERIFY_PURPOSE,
    ctx: clientInfo(req),
  });
  return true;
}

function readFields(body, e = null) {
  const firstName = text(body.firstName, e?.first_name, 100);
  const email = text(body.email, e?.email, 254);
  if (!firstName) return { error: "First name is required." };
  if (!EMAIL_RE.test(email)) return { error: "Please enter a valid email." };

  const pick = (key, current) =>
    body[key] === undefined ? (current ?? null) : idOrNull(body[key]);
  const genderId = pick("genderId", e?.gender_id);
  const nationalityId = pick("nationalityId", e?.nationality_id);
  const permissionId = pick("permissionId", e?.permission_id);
  const themeId = pick("themeId", e?.theme_id);
  // if ([genderId, nationalityId, permissionId].some(Number.isNaN))
  //   return { error: "One of the selected options is invalid." };
  if ([genderId, nationalityId, permissionId, themeId].some(Number.isNaN))
    return { error: "One of the selected options is invalid." };

  // positions: not sent = keep the current ones, sent = replace them with the new list
  const sentPositions = idList(body.positionIds);
  if (sentPositions === null)
    return { error: "One of the selected positions is invalid." };
  const positionIds =
    sentPositions === undefined ? (e?.position_ids ?? []) : sentPositions;

  const isFullname = preferenceBit(body.isFullname, e?.is_fullname ?? 1);

  const isNfullname = preferenceBit(body.isNfullname, e?.is_nfullname ?? 1);

  if (isFullname === null || isNfullname === null) {
    return {
      error: "Name display preferences must be either 0 or 1.",
    };
  }

  return {
    v: {
      firstName,
      email,
      lastName: text(body.lastName, e?.last_name, 100),
      firstNameNative: text(body.firstNameNative, e?.first_name_native, 100),
      lastNameNative: text(body.lastNameNative, e?.last_name_native, 100),
      phone: text(body.phone, e?.phone, 40),
      address: text(body.address, e?.address, 500),
      region: text(body.region, e?.region, 100),
      country: text(body.country, e?.country, 100),
      description: text(body.description, e?.description, 2000),
      genderId,
      nationalityId,
      positionIds,
      permissionId,
      themeId,
      status: bit(body.status, e?.status ?? 1),
      isBlocked: bit(body.isBlocked, e?.is_blocked ?? 0),
      isFullname,
      isNfullname,
    },
  };
}

/* ================= LIST: ?removed=1 shows the removed users instead ================= */
router.get("/", async (req, res) => {
  const removed = req.query.removed === "1" ? 1 : 0;
  const { rows } = await query(
    `${USER_SELECT} WHERE u.is_removed = $1 ORDER BY u.created_at DESC`,
    [removed],
  );
  res.json(rows.map(publicUser));
});

/* ================= CREATE ================= */
router.post("/", uploadOne, async (req, res) => {
  const b = req.body || {};
  const { v, error } = readFields(b);
  if (error) return bad(res, 400, error);

  const password = String(b.password || "");
  if (password.length < 8)
    return bad(res, 400, "Password must be at least 8 characters.");

  let role = await findRole(b);
  if (role === null) return bad(res, 400, "That role does not exist.");
  if (role === undefined) role = await findRole({ role: "customer" });
  if (!role)
    return bad(res, 500, "The customer role is missing. Run npm run db:setup.");

  const permProblem = await checkPermissionChoice(v);
  if (permProblem) return bad(res, permProblem[0], permProblem[1]);

  const themeProblem = await checkThemeChoice(v);
  if (themeProblem) return bad(res, themeProblem[0], themeProblem[1]);

  const posProblem = await checkPositionChoice(v);
  if (posProblem) return bad(res, posProblem[0], posProblem[1]);

  let files = { img: "", thumbnail: "" };
  let newId;
  try {
    if (req.file) files = await storeUpload(req.file, FOLDER); // 1 upload -> img + thumbnail
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      `INSERT INTO users
         (first_name, last_name, first_name_native, last_name_native, gender_id, nationality_id,
          address, region, country, description, email, phone, password_hash,
          role_id, position_ids, permission_id, status, is_blocked, avatar, avatar_thumbnail, is_fullname, is_nfullname
          , theme_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::int[],$16,$17,$18,$19,$20,$21,$22,$23)
       RETURNING id`,
      [
        v.firstName,
        v.lastName,
        v.firstNameNative,
        v.lastNameNative,
        v.genderId,
        v.nationalityId,
        v.address,
        v.region,
        v.country,
        v.description,
        v.email,
        v.phone,
        hash,
        role.id,
        v.positionIds,
        v.permissionId,
        v.status,
        v.isBlocked,
        files.img,
        files.thumbnail,
        v.isFullname,
        v.isNfullname,
        v.themeId,
      ],
    );
    newId = rows[0].id;
  } catch (err) {
    await removeImages(files.img, files.thumbnail); // don't leave orphan files
    const known = dbProblem(err);
    if (known) return bad(res, known[0], known[1]);
    throw err;
  }

  // the user is saved; a failing email must NOT undo that
  let verificationSent = false;
  try {
    verificationSent = await sendVerification(req, newId);
  } catch (e) {
    console.error("[users] verification email failed:", e.message);
  }
  res
    .status(201)
    .json({ ...publicUser(await loadUser(newId)), verificationSent });
});

/* ================= UPDATE ================= */
router.put("/:id", uploadOne, async (req, res) => {
  const id = Number(req.params.id);
  const target = await loadUser(id);
  if (!target) return bad(res, 404, "User not found.");
  if (target.is_removed === 1)
    return bad(
      res,
      409,
      "This user was removed. Restore the user before editing.",
    );

  const b = req.body || {};
  const { v, error } = readFields(b, target);
  if (error) return bad(res, 400, error);

  const role = await findRole(b);
  if (role === null) return bad(res, 400, "That role does not exist.");
  const next = {
    role_id: role ? role.id : target.role_id,
    role_code: role ? role.code : target.role_code,
    status: v.status,
    is_blocked: v.isBlocked,
    is_removed: 0,
  };

  if (
    id === req.user.id &&
    (next.role_id !== target.role_id ||
      next.status !== target.status ||
      next.is_blocked !== target.is_blocked)
  )
    return bad(
      res,
      400,
      "You can't change the role or status of your own account.",
    );
  if (await lastAdminWouldGo(target, next))
    return bad(res, 409, "There must be at least one active admin.");

  const permProblem = await checkPermissionChoice(v);
  if (permProblem) return bad(res, permProblem[0], permProblem[1]);

  const themeProblem = await checkThemeChoice(v);
  if (themeProblem) return bad(res, themeProblem[0], themeProblem[1]);

  const posProblem = await checkPositionChoice(v);
  if (posProblem) return bad(res, posProblem[0], posProblem[1]);

  let hash = target.password_hash;
  if (b.password) {
    if (String(b.password).length < 8)
      return bad(res, 400, "Password must be at least 8 characters.");
    hash = await bcrypt.hash(String(b.password), 12);
  }

  const emailChanged = v.email.toLowerCase() !== target.email.toLowerCase();

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
         email = $11, phone = $12, password_hash = $13, role_id = $14, position_ids = $15::int[], permission_id = $16,
         status = $17, is_blocked = $18, avatar = $19, avatar_thumbnail = $20, is_fullname = $21, is_nfullname = $22,
         theme_id = $23
       WHERE id = $24`,
      [
        v.firstName,
        v.lastName,
        v.firstNameNative,
        v.lastNameNative,
        v.genderId,
        v.nationalityId,
        v.address,
        v.region,
        v.country,
        v.description,
        v.email,
        v.phone,
        hash,
        next.role_id,
        v.positionIds,
        v.permissionId,
        v.status,
        v.isBlocked,
        avatar,
        avatarThumb,
        v.isFullname,
        v.isNfullname,
        v.themeId,
        id,
      ],
    );
    committed = true;

    // only after the database update worked: delete the replaced / removed files
    if (avatar !== target.avatar)
      await removeImages(target.avatar, target.avatar_thumbnail);
  } catch (err) {
    if (!committed && uploaded)
      await removeImages(uploaded.img, uploaded.thumbnail);
    const known = dbProblem(err);
    if (known) return bad(res, known[0], known[1]);
    throw err;
  }

  // a new email address is unverified until its owner enters the code
  let verificationSent = false;
  if (emailChanged) {
    try {
      verificationSent = await sendVerification(req, id);
    } catch (e) {
      console.error("[users] verification email failed:", e.message);
    }
  }
  res.json({ ...publicUser(await loadUser(id)), verificationSent });
});

/* ================= quick switches: PATCH /:id/status {status: 0|1}, PATCH /:id/block {blocked: 0|1} ================= */
function flagRoute(column, bodyKey, selfForbiddenValue) {
  return async (req, res) => {
    const id = Number(req.params.id);
    const value = bit(req.body?.[bodyKey], null);
    if (value === null) return bad(res, 400, "Invalid request.");

    const target = await loadUser(id);
    if (!target) return bad(res, 404, "User not found.");
    if (target.is_removed === 1)
      return bad(res, 409, "This user was removed. Restore the user first.");
    if (id === req.user.id && value === selfForbiddenValue)
      return bad(res, 400, "You can't do that to your own account.");
    if (await lastAdminWouldGo(target, { ...target, [column]: value }))
      return bad(res, 409, "There must be at least one active admin.");

    await query(`UPDATE users SET ${column} = $1 WHERE id = $2`, [value, id]); // column is one of the two fixed names below
    res.json(publicUser(await loadUser(id)));
  };
}
router.patch("/:id/status", flagRoute("status", "status", 0));
router.patch("/:id/block", flagRoute("is_blocked", "blocked", 1));

/* ================= EMAIL VERIFICATION (admin side) ================= */
// send (or re-send) a code to the user's email; the OWNER enters it after signing in
router.post("/:id/send-verification", async (req, res) => {
  const id = Number(req.params.id);
  const target = await loadUser(id);
  if (!target) return bad(res, 404, "User not found.");
  if (target.is_removed === 1) return bad(res, 409, "Restore the user first.");
  if (target.is_verified_email)
    return bad(res, 409, "This email is already verified.");

  const { rows } = await query(
    `SELECT resend_available_at FROM email_otp
      WHERE user_id = $1 AND purpose = $2 ORDER BY created_at DESC LIMIT 1`,
    [id, VERIFY_PURPOSE],
  );
  const wait = rows[0]?.resend_available_at
    ? new Date(rows[0].resend_available_at) - Date.now()
    : 0;
  if (wait > 0)
    return bad(
      res,
      429,
      `Please wait ${Math.ceil(wait / 1000)} seconds before sending again.`,
    );

  try {
    await sendVerification(req, id);
  } catch (e) {
    console.error("[users] verification email failed:", e.message);
    return bad(
      res,
      502,
      "The email could not be sent. Check the email settings.",
    );
  }
  res.json(publicUser(await loadUser(id)));
});

// admin override, e.g. you confirmed the person in person. It is logged.
router.post("/:id/mark-verified", async (req, res) => {
  const id = Number(req.params.id);
  const target = await loadUser(id);
  if (!target) return bad(res, 404, "User not found.");
  if (target.is_removed === 1) return bad(res, 409, "Restore the user first.");

  await query(
    `INSERT INTO user_verifications (user_id, is_verified_email, email_verified_at, email_updated_at, verified_by)
     VALUES ($1, true, now(), now(), $2)
     ON CONFLICT (user_id) DO UPDATE
       SET is_verified_email = true, email_verified_at = now(), verified_by = $2`,
    [id, req.user.id],
  );
  await query(
    `UPDATE email_otp SET status = 'revoked', revoked_at = now()
      WHERE user_id = $1 AND purpose = $2 AND status IN ('pending', 'verified')`,
    [id, VERIFY_PURPOSE],
  );
  await logEvent({
    otpId: null,
    userId: id,
    type: "admin_marked_verified",
    details: { by: req.user.id },
    ctx: clientInfo(req),
  });
  res.json(publicUser(await loadUser(id)));
});

/* ================= REMOVE (soft): email + phone get "Removed-", can be restored ================= */
router.post("/:id/remove", async (req, res) => {
  const id = Number(req.params.id);
  const target = await loadUser(id);
  if (!target) return bad(res, 404, "User not found.");
  if (id === req.user.id)
    return bad(res, 400, "You can't remove your own account.");
  if (target.is_removed === 1)
    return bad(res, 409, "This user is already removed.");
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
  if (target.is_removed !== 1)
    return bad(res, 409, "This user is not removed.");

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
    if (err.code === "23505")
      return bad(
        res,
        409,
        "Another user already uses that email, so this account can't be restored.",
      );
    throw err;
  }
});

/* ================= DELETE (permanent): the row and the avatar files are gone ================= */
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const target = await loadUser(id);
  if (!target) return bad(res, 404, "User not found.");
  if (id === req.user.id)
    return bad(res, 400, "You can't delete your own account.");
  if (await lastAdminWouldGo(target, { ...target, is_removed: 1 }))
    return bad(res, 409, "There must be at least one active admin.");

  try {
    await query("DELETE FROM users WHERE id = $1", [id]);
  } catch (err) {
    if (err.code === "23503")
      return bad(
        res,
        409,
        "This user has related records. Remove the user instead of deleting.",
      );
    throw err;
  }
  await removeImages(target.avatar, target.avatar_thumbnail);
  res.json({ ok: true });
});

export default router;
