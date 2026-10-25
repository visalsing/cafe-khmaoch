import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { query } from "../db.js";
import {
  RESEND_COOLDOWN_SECONDS,
  clientInfo,
  verifyOtp,
  logEvent,
} from "../otp.js";
import {
  OTP_PURPOSE,
  sendCode,
  signVerifyToken,
  readVerifyToken,
} from "../verification.js";

// Used by the LOGIN page, before the user is signed in.
// Mounted in index.js as:  app.use("/api/login-verification", loginVerificationRoutes);
//
// Flow:
//   1. /start   email + password are right but the email is NOT verified -> a code is emailed,
//               a short-lived verifyToken is returned (it proves "the password was correct").
//   2. /verify  verifyToken + 6-digit code -> the email becomes verified.
//   3. The login page then calls the normal login, which now succeeds.
// This route NEVER signs anyone in and sets no cookie.

const router = Router();
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const FAIL =
  "That code is incorrect or has expired. Check it, or request a new code.";
const EXPIRED = "This verification session has expired. Please sign in again.";

const limit = (max, message) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
  });
const startLimiter = limit(
  30,
  "Too many attempts. Please try again in a few minutes.",
);
const verifyLimiter = limit(
  20,
  "Too many attempts. Please try again in a few minutes.",
);
const resendLimiter = limit(
  10,
  "Too many requests. Please try again in a few minutes.",
);

const bad = (res, status, error) => res.status(status).json({ error });
const clip = (v, max) =>
  String(v ?? "")
    .trim()
    .slice(0, max);

// an account that may sign in, but whose email is not verified yet
async function loadUnverifiedUser(id) {
  const { rows } = await query(
    `SELECT u.id, u.email, u.first_name
       FROM users u
       LEFT JOIN user_verifications uv ON uv.user_id = u.id
      WHERE u.id = $1 AND u.is_removed = 0 AND u.status = 1 AND u.is_blocked = 0
        AND COALESCE(uv.is_verified_email, false) = false`,
    [id],
  );
  return rows[0] || null;
}

/* ===== 1. the login page asks: does this sign-in need email verification first? ===== */
router.post("/start", startLimiter, async (req, res) => {
  const email = clip(req.body?.email, 254);
  const password = String(req.body?.password ?? "");
  const NO = { ok: true, needsVerification: false }; // the normal login then shows the real error, if any

  if (!EMAIL_RE.test(email) || !password) return res.json(NO);

  // only accounts with an UNVERIFIED email are interesting here; verified users return at once
  const { rows } = await query(
    `SELECT u.id, u.email, u.first_name, u.password_hash
       FROM users u
       LEFT JOIN user_verifications uv ON uv.user_id = u.id
      WHERE lower(u.email) = lower($1)
        AND u.is_removed = 0 AND u.status = 1 AND u.is_blocked = 0
        AND COALESCE(uv.is_verified_email, false) = false`,
    [email],
  );
  const user = rows[0];
  if (!user) return res.json(NO);

  // the code is only sent when the PASSWORD is right, so nobody can spam a stranger's inbox
  if (!(await bcrypt.compare(password, user.password_hash)))
    return res.json(NO);

  let resendAfter = RESEND_COOLDOWN_SECONDS;
  try {
    resendAfter = (await sendCode(req, user)).wait;
  } catch (err) {
    console.error("[login-verification] start failed:", err);
    return bad(
      res,
      502,
      "We could not send the verification email. Please try again later.",
    );
  }

  res.json({
    ok: true,
    needsVerification: true,
    verifyToken: signVerifyToken(user.id),
    resendAfter,
  });
});

/* ===== 2. check the code ===== */
router.post("/verify", verifyLimiter, async (req, res) => {
  const code = String(req.body?.code ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code))
    return bad(res, 400, "Enter the 6-digit code from your email.");

  const userId = readVerifyToken(req.body?.verifyToken);
  if (!userId) return bad(res, 400, EXPIRED);

  const user = await loadUnverifiedUser(userId);
  if (!user) return bad(res, 400, EXPIRED);

  const ctx = clientInfo(req);
  const result = await verifyOtp({ user, purpose: OTP_PURPOSE, code, ctx });
  if (!result.ok) return bad(res, 400, FAIL);

  await query(
    `UPDATE email_otp SET status = 'used', used_at = now() WHERE id = $1`,
    [result.otpId],
  );
  await query(
    `INSERT INTO user_verifications (user_id, is_verified_email, email_verified_at, email_updated_at)
     VALUES ($1, true, now(), now())
     ON CONFLICT (user_id) DO UPDATE
       SET is_verified_email = true, email_verified_at = now(), verified_by = NULL`,
    [user.id],
  );
  await logEvent({
    otpId: result.otpId,
    userId: user.id,
    type: "email_verified",
    ctx,
  });
  res.json({ ok: true });
});

/* ===== 3. send a new code ===== */
router.post("/resend", resendLimiter, async (req, res) => {
  const userId = readVerifyToken(req.body?.verifyToken);
  if (!userId) return bad(res, 400, EXPIRED);

  const user = await loadUnverifiedUser(userId);
  if (!user) return bad(res, 400, EXPIRED);

  try {
    // const { sent, wait } = await sendCode(req, user);
    // if (!sent) return bad(res, 429, `Please wait ${wait} seconds before sending again.`);
    // res.json({ ok: true, resendAfter: wait });
    const { sent, wait } = await sendCode(req, user);

    if (!sent) {
      return bad(
        res,
        429,
        wait > 0
          ? `Please wait ${wait} seconds before sending again.`
          : "Could not send the verification email. Please try again later.",
      );
    }

    return res.json({ ok: true, resendAfter: wait });
  } catch (err) {
    console.error("[login-verification] resend failed:", err);
    bad(
      res,
      502,
      "We could not send the verification email. Please try again later.",
    );
  }
});

export default router;
