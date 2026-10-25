
import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import {
  requireAuth,
  publicUser,
  USER_SELECT,
} from "../middleware.js";
import { uploadOne, storeUpload } from "../upload.js";
import { removeImages } from "../storage.js";
import {
  issueOtp,
  verifyOtp,
  clientInfo,
} from "../otp.js";

const router = Router();

router.use(requireAuth);

const FOLDER = "avatars";
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const EMAIL_CHANGE_PURPOSE = "email_change";

const bad = (res, status, error) =>
  res.status(status).json({ error });

const text = (value, fallback = "", max = 255) =>
  String(value ?? fallback ?? "").trim().slice(0, max);

const idOrNull = (value) => {
  if (value === undefined) return undefined;
  if (value === null || String(value).trim() === "") return null;

  const number = Number(value);

  return Number.isInteger(number) && number > 0
    ? number
    : NaN;
};

const isInactive = (user) =>
  user.is_removed === true ||
  user.is_removed === 1 ||
  user.is_blocked === true ||
  user.is_blocked === 1 ||
  user.status === false ||
  user.status === 0;

async function loadOwnUser(userId) {
  const id = Number(userId);

  if (!Number.isInteger(id) || id <= 0) return null;

  const { rows } = await query(
    `${USER_SELECT} WHERE u.id = $1`,
    [id],
  );

  return rows[0] || null;
}

function dbProblem(error) {
  if (error.code === "23505") {
    return [409, "That email is already used by another account."];
  }

  if (error.code === "23503") {
    const messages = {
      users_gender_id_fkey: "The selected gender does not exist.",
      users_nationality_id_fkey:
        "The selected nationality does not exist.",
    };

    return [
      400,
      messages[error.constraint] ||
        "One of the selected options does not exist.",
    ];
  }

  return null;
}

/* ================= GET OWN PROFILE ================= */

router.get("/", async (req, res, next) => {
  try {
    const user = await loadOwnUser(req.user.id);

    if (!user || isInactive(user)) {
      return bad(res, 404, "Profile not found or account inactive.");
    }

    return res.json(publicUser(user));
  } catch (error) {
    next(error);
  }
});

/* ================= UPDATE OWN PROFILE ================= */

// Email changes must use the OTP endpoints below.
// Role, position, permission and account status cannot be changed here.

router.put("/", uploadOne, async (req, res, next) => {
  let uploaded = null;
  let databaseUpdated = false;

  try {
    const userId = Number(req.user.id);
    const target = await loadOwnUser(userId);

    if (!target || isInactive(target)) {
      return bad(res, 404, "Profile not found or account inactive.");
    }

    const body = req.body || {};

    const firstName = text(body.firstName, target.first_name, 100);

    if (!firstName) {
      return bad(res, 400, "First name is required.");
    }

    const readOptionalId = (key, currentValue) => {
      const value = idOrNull(body[key]);

      if (value === undefined) {
        return currentValue ?? null;
      }

      return value;
    };

    const genderId = readOptionalId("genderId", target.gender_id);
    const nationalityId = readOptionalId(
      "nationalityId",
      target.nationality_id,
    );

    if ([genderId, nationalityId].some(Number.isNaN)) {
      return bad(res, 400, "One of the selected options is invalid.");
    }

    const lastName = text(body.lastName, target.last_name, 100);
    const firstNameNative = text(
      body.firstNameNative,
      target.first_name_native,
      100,
    );
    const lastNameNative = text(
      body.lastNameNative,
      target.last_name_native,
      100,
    );
    const phone = text(body.phone, target.phone, 40);
    const address = text(body.address, target.address, 500);
    const region = text(body.region, target.region, 100);
    const country = text(body.country, target.country, 100);
    const description = text(
      body.description,
      target.description,
      2000,
    );

    // Deliberately do not read or update body.email here.
    let avatar = target.avatar || "";
    let avatarThumbnail = target.avatar_thumbnail || "";

    if (req.file) {
      uploaded = await storeUpload(req.file, FOLDER);
      avatar = uploaded.img;
      avatarThumbnail = uploaded.thumbnail;
    } else if (
      body.removeAvatar === "1" ||
      body.removeAvatar === 1 ||
      body.removeAvatar === true
    ) {
      avatar = "";
      avatarThumbnail = "";
    }

    await query(
      `UPDATE users
       SET first_name = $1,
           last_name = $2,
           first_name_native = $3,
           last_name_native = $4,
           gender_id = $5,
           nationality_id = $6,
           address = $7,
           region = $8,
           country = $9,
           description = $10,
           phone = $11,
           avatar = $12,
           avatar_thumbnail = $13
       WHERE id = $14`,
      [
        firstName,
        lastName,
        firstNameNative,
        lastNameNative,
        genderId,
        nationalityId,
        address,
        region,
        country,
        description,
        phone,
        avatar,
        avatarThumbnail,
        userId,
      ],
    );

    databaseUpdated = true;

    if (
      avatar !== (target.avatar || "") ||
      avatarThumbnail !== (target.avatar_thumbnail || "")
    ) {
      await removeImages(
        target.avatar,
        target.avatar_thumbnail,
      );
    }

    const updatedUser = await loadOwnUser(userId);

    return res.json({
      ...publicUser(updatedUser),
      emailChanged: false,
    });
  } catch (error) {
    if (!databaseUpdated && uploaded) {
      try {
        await removeImages(uploaded.img, uploaded.thumbnail);
      } catch (cleanupError) {
        console.error("[profile] Avatar cleanup failed:", cleanupError);
      }
    }

    const known = dbProblem(error);

    if (known) {
      return bad(res, known[0], known[1]);
    }

    next(error);
  }
});

/* ================= REQUEST EMAIL CHANGE ================= */

// POST /api/profile/email-change/request
// Sends the OTP to the requested NEW email without changing users.email.

router.post("/email-change/request", async (req, res, next) => {
  try {
    const userId = Number(req.user.id);
    const email = String(req.body?.email ?? "").trim().toLowerCase();

    if (email.length > 254 || !EMAIL_RE.test(email)) {
      return bad(res, 400, "Please enter a valid email address.");
    }

    const user = await loadOwnUser(userId);

    if (!user || isInactive(user)) {
      return bad(res, 403, "This account is not active.");
    }

    if (email === String(user.email).trim().toLowerCase()) {
      return bad(
        res,
        400,
        "Enter an email address different from your current one.",
      );
    }

    const existing = await query(
      `SELECT id
       FROM users
       WHERE lower(email) = $1
         AND id <> $2
         AND is_removed = 0
       LIMIT 1`,
      [email, userId],
    );

    if (existing.rows.length > 0) {
      return bad(res, 409, "That email is already used by another account.");
    }

    // issueOtp uses user.email as its delivery destination.
    // Use a copy with the proposed email, not the database user's email.
    const otpUser = { ...user, email };

    const result = await issueOtp({
      user: otpUser,
      purpose: EMAIL_CHANGE_PURPOSE,
      ctx: clientInfo(req),
    });

    if (result?.ok === false) {
      return bad(
        res,
        result.status || 429,
        result.message || "Could not send a verification code.",
      );
    }

    return res.json({
      ok: true,
      message: "Verification code sent to the new email address.",
      retryAfter:
        result?.retryAfter ??
        result?.resendAfter ??
        60,
    });
  } catch (error) {
    console.error("[email-change/request]", error);

    const known = dbProblem(error);
    if (known) return bad(res, known[0], known[1]);

    next(error);
  }
});

/* ================= VERIFY EMAIL CHANGE ================= */

// POST /api/profile/email-change/verify
// The email must match the destination saved on the OTP record.

router.post("/email-change/verify", async (req, res, next) => {
  try {
    const userId = Number(req.user.id);
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const code = String(req.body?.code ?? "").trim();

    if (email.length > 254 || !EMAIL_RE.test(email)) {
      return bad(res, 400, "Please enter a valid email address.");
    }

    if (!/^\d{6}$/.test(code)) {
      return bad(res, 400, "Enter the 6-digit verification code.");
    }

    const user = await loadOwnUser(userId);

    if (!user || isInactive(user)) {
      return bad(res, 403, "This account is not active.");
    }

    if (email === String(user.email).trim().toLowerCase()) {
      return bad(res, 400, "That is already your current email address.");
    }

    // Check availability again in case another account claimed it.
    const existing = await query(
      `SELECT id
       FROM users
       WHERE lower(email) = $1
         AND id <> $2
         AND is_removed = 0
       LIMIT 1`,
      [email, userId],
    );

    if (existing.rows.length > 0) {
      return bad(res, 409, "That email is already used by another account.");
    }

    const result = await verifyOtp({
      user,
      purpose: EMAIL_CHANGE_PURPOSE,
      code,
      ctx: clientInfo(req),
    });

    if (!result?.ok || !result.otpId) {
      return bad(
        res,
        400,
        "The code is invalid, expired, or has already been used.",
      );
    }

    // Confirm the OTP belongs to this account and destination.
    // This assumes verifyOtp leaves the successfully verified record
    // in status='verified'. Confirm that against your actual otp.js.
    const otpResult = await query(
      `SELECT id, email, status
       FROM email_otp
       WHERE id = $1
         AND user_id = $2
         AND purpose = $3
       LIMIT 1`,
      [result.otpId, userId, EMAIL_CHANGE_PURPOSE],
    );

    const otp = otpResult.rows[0];

    if (
      !otp ||
      String(otp.email).trim().toLowerCase() !== email ||
      otp.status !== "verified"
    ) {
      return bad(
        res,
        400,
        "This code was not issued for that email address or is no longer valid.",
      );
    }

    // Transactionally change the email, mark it verified, and consume the OTP.
    // The guarded UPDATE also prevents a concurrent duplicate email claim.
    await query("BEGIN");

    try {
      const updated = await query(
        `UPDATE users u
         SET email = $1
         WHERE u.id = $2
           AND u.is_removed = 0
           AND u.status <> 0
           AND u.is_blocked = 0
           AND NOT EXISTS (
             SELECT 1
             FROM users other
             WHERE lower(other.email) = $1
               AND other.id <> $2
               AND other.is_removed = 0
           )
         RETURNING u.id`,
        [email, userId],
      );

      if (!updated.rows.length) {
        await query("ROLLBACK");
        return bad(
          res,
          409,
          "That email is no longer available, or your account is inactive.",
        );
      }

      await query(
        `INSERT INTO user_verifications
           (user_id, is_verified_email, email_verified_at,
            email_updated_at, verified_by)
         VALUES ($1, TRUE, now(), now(), NULL)
         ON CONFLICT (user_id) DO UPDATE
           SET is_verified_email = TRUE,
               email_verified_at = now(),
               email_updated_at = now(),
               verified_by = NULL`,
        [userId],
      );

      const consumed = await query(
        `UPDATE email_otp
         SET status = 'used'
         WHERE id = $1
           AND user_id = $2
           AND purpose = $3
           AND status = 'verified'
         RETURNING id`,
        [result.otpId, userId, EMAIL_CHANGE_PURPOSE],
      );

      if (!consumed.rows.length) {
        throw new Error("OTP was already consumed or is no longer valid.");
      }

      await query("COMMIT");
    } catch (error) {
      await query("ROLLBACK");
      throw error;
    }

    const updatedUser = await loadOwnUser(userId);

    return res.json({
      ok: true,
      message: "Email changed and verified successfully.",
      user: publicUser(updatedUser),
    });
  } catch (error) {
    console.error("[email-change/verify]", error);

    if (error.code === "23505") {
      return bad(res, 409, "That email is already used by another account.");
    }

    next(error);
  }
});

/* ================= CHANGE OWN PASSWORD ================= */

// Retained for compatibility with existing callers.
// If you intend to require OTP for every password change, disable this
// endpoint after confirming no frontend still calls it.

router.put("/password", async (req, res, next) => {
  try {
    const userId = Number(req.user.id);
    const { currentPassword, newPassword } = req.body || {};

    if (
      typeof currentPassword !== "string" ||
      !currentPassword ||
      typeof newPassword !== "string" ||
      !newPassword
    ) {
      return bad(
        res,
        400,
        "Current password and new password are required.",
      );
    }

    if (newPassword.length < 8 || Buffer.byteLength(newPassword, "utf8") > 72) {
      return bad(
        res,
        400,
        "The new password must be at least 8 characters and no more than 72 bytes.",
      );
    }

    const { rows } = await query(
      `SELECT id, password_hash, status, is_blocked, is_removed
       FROM users
       WHERE id = $1`,
      [userId],
    );

    const user = rows[0];

    if (!user || isInactive(user)) {
      return bad(res, 403, "This account is not active.");
    }

    const matches = await bcrypt.compare(
      currentPassword,
      user.password_hash,
    );

    if (!matches) {
      return bad(res, 400, "Current password is incorrect.");
    }

    const samePassword = await bcrypt.compare(
      newPassword,
      user.password_hash,
    );

    if (samePassword) {
      return bad(
        res,
        400,
        "Your new password must be different from your current password.",
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await query(
      `UPDATE users
       SET password_hash = $1
       WHERE id = $2`,
      [passwordHash, userId],
    );

    return res.json({ message: "Password changed successfully." });
  } catch (error) {
    next(error);
  }
});

export default router;
