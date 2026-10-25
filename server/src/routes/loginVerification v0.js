import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { query } from "../db.js";
import { RESEND_COOLDOWN_SECONDS, clientInfo, issueOtp, verifyOtp, logEvent } from "../otp.js";

// Used by the LOGIN page, before the user is signed in.
// Mounted in app.js as:  app.use("/api/login-verification", loginVerificationRoutes);
//
// Flow:
//   1. /start   email + password are right but the email is NOT verified -> a code is emailed,
//               a short-lived verifyToken is returned (it proves "the password was correct").
//   2. /verify  verifyToken + 6-digit code -> the email becomes verified.
//   3. The login page then calls the normal login, which now succeeds.
// This route NEVER signs anyone in and sets no cookie.

const router = Router();
const OTP_PURPOSE = "email_verification";
const TOKEN_PURPOSE = "login_verification";
const TOKEN_MINUTES = 15;
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const FAIL = "That code is incorrect or has expired. Check it, or request a new code.";

const secret = () => `${process.env.OTP_SECRET || process.env.JWT_SECRET}:login-verification-token`;

const limit = (max, message) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
  });
const startLimiter = limit(30, "Too many attempts. Please try again in a few minutes.");
const verifyLimiter = limit(20, "Too many attempts. Please try again in a few minutes.");
const resendLimiter = limit(10, "Too many requests. Please try again in a few minutes.");

const bad = (res, status, error) => res.status(status).json({ error });
const clip = (v, max) => String(v ?? "").trim().slice(0, max);

const signVerifyToken = (userId) =>
  jwt.sign({ sub: userId, purpose: TOKEN_PURPOSE }, secret(), { expiresIn: `${TOKEN_MINUTES}m` });

function readVerifyToken(token) {
  try {
    const p = jwt.verify(String(token ?? ""), secret());
    return p.purpose === TOKEN_PURPOSE && Number.isInteger(p.sub) ? p.sub : null;
  } catch {
    return null;
  }
}

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

// emails a fresh code unless one was sent a moment ago. Returns the seconds until "Resend" works.
async function sendCode(req, user) {
  const { rows } = await query(
    `SELECT resend_available_at FROM email_otp
      WHERE user_id = $1 AND purpose = $2 ORDER BY created_at DESC LIMIT 1`,
    [user.id, OTP_PURPOSE],
  );
  const wait = rows[0]?.resend_available_at ? new Date(rows[0].resend_available_at) - Date.now() : 0;
  if (wait > 0) return { sent: false, wait: Math.ceil(wait / 1000) };

  // only ONE open code per user and purpose
  await query(
    `UPDATE email_otp SET status = 'revoked', revoked_at = now()
      WHERE user_id = $1 AND purpose = $2 AND status IN ('pending', 'verified')`,
    [user.id, OTP_PURPOSE],
  );
  await issueOtp({ user, purpose: OTP_PURPOSE, ctx: clientInfo(req) });
  return { sent: true, wait: RESEND_COOLDOWN_SECONDS };
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
  if (!(await bcrypt.compare(password, user.password_hash))) return res.json(NO);

  let resendAfter = RESEND_COOLDOWN_SECONDS;
  try {
    resendAfter = (await sendCode(req, user)).wait;
  } catch (err) {
    console.error("[login-verification] start failed:", err);
    return bad(res, 502, "We could not send the verification email. Please try again later.");
  }

  res.json({ ok: true, needsVerification: true, verifyToken: signVerifyToken(user.id), resendAfter });
});

/* ===== 2. check the code ===== */
router.post("/verify", verifyLimiter, async (req, res) => {
  const code = String(req.body?.code ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return bad(res, 400, "Enter the 6-digit code from your email.");

  const userId = readVerifyToken(req.body?.verifyToken);
  if (!userId) return bad(res, 400, "This verification session has expired. Please sign in again.");

  const user = await loadUnverifiedUser(userId);
  if (!user) return bad(res, 400, "This verification session has expired. Please sign in again.");

  const ctx = clientInfo(req);
  const result = await verifyOtp({ user, purpose: OTP_PURPOSE, code, ctx });
  if (!result.ok) return bad(res, 400, FAIL);

  await query(`UPDATE email_otp SET status = 'used', used_at = now() WHERE id = $1`, [result.otpId]);
  await query(
    `INSERT INTO user_verifications (user_id, is_verified_email, email_verified_at, email_updated_at)
     VALUES ($1, true, now(), now())
     ON CONFLICT (user_id) DO UPDATE
       SET is_verified_email = true, email_verified_at = now(), verified_by = NULL`,
    [user.id],
  );
  await logEvent({ otpId: result.otpId, userId: user.id, type: "email_verified", ctx });
  res.json({ ok: true });
});

/* ===== 3. send a new code ===== */
router.post("/resend", resendLimiter, async (req, res) => {
  const userId = readVerifyToken(req.body?.verifyToken);
  if (!userId) return bad(res, 400, "This verification session has expired. Please sign in again.");

  const user = await loadUnverifiedUser(userId);
  if (!user) return bad(res, 400, "This verification session has expired. Please sign in again.");

  try {
    const { sent, wait } = await sendCode(req, user);
    if (!sent) return bad(res, 429, `Please wait ${wait} seconds before sending again.`);
    res.json({ ok: true, resendAfter: wait });
  } catch (err) {
    console.error("[login-verification] resend failed:", err);
    bad(res, 502, "We could not send the verification email. Please try again later.");
  }
});

export default router;