import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { query } from "../db.js";
import { sendEmail } from "../email.js";
import {
  RESEND_COOLDOWN_SECONDS,
  clientInfo,
  issueOtp,
  verifyOtp,
  logEvent,
  passwordChangedEmail,
} from "../otp.js";

const router = Router();
const PURPOSE = "password_reset";
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const RESET_TOKEN_MINUTES = 10;

// the token that proves "this browser just entered the right code". It is NOT the login cookie.
const resetSecret = () => `${process.env.OTP_SECRET || process.env.JWT_SECRET}:password-reset-token`;

const limit = (max, message) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
  });
const requestLimiter = limit(10, "Too many requests. Please try again in a few minutes.");
const verifyLimiter = limit(20, "Too many attempts. Please try again in a few minutes.");
const confirmLimiter = limit(10, "Too many attempts. Please try again in a few minutes.");

const bad = (res, status, error) => res.status(status).json({ error });
const clip = (v, max) => String(v ?? "").trim().slice(0, max);

// only accounts that may sign in can reset a password
async function findUser(email) {
  const { rows } = await query(
    `SELECT id, email, first_name FROM users
      WHERE lower(email) = lower($1) AND is_removed = 0 AND status = 1 AND is_blocked = 0`,
    [email],
  );
  return rows[0] || null;
}

/* ===== 1. ask for a code ===== */
router.post("/request", requestLimiter, async (req, res) => {
  const email = clip(req.body?.email, 254);
  if (!EMAIL_RE.test(email)) return bad(res, 400, "Please enter a valid email address.");

  // SAME answer whether or not the account exists, and sent BEFORE the slow work (no timing hint either)
  res.json({
    ok: true,
    resendAfter: RESEND_COOLDOWN_SECONDS,
    message: "If an account exists for that email, a code is on its way.",
  });

  try {
    const user = await findUser(email);
    if (user) await issueOtp({ user, purpose: PURPOSE, ctx: clientInfo(req) });
  } catch (err) {
    console.error("[password-reset] request failed:", err);
  }
});

/* ===== 2. check the code, hand out the reset token ===== */
router.post("/verify", verifyLimiter, async (req, res) => {
  const email = clip(req.body?.email, 254);
  const code = String(req.body?.code ?? "").replace(/\s/g, "");
  if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) return bad(res, 400, "Enter the 6-digit code from your email.");

  // one message for every failure (wrong, expired, locked, unknown account), so nothing leaks
  const FAIL = "That code is incorrect or has expired. Check it, or request a new code.";
  const ctx = clientInfo(req);

  const user = await findUser(email);
  if (!user) return bad(res, 400, FAIL);

  const result = await verifyOtp({ user, purpose: PURPOSE, code, ctx });
  if (!result.ok) return bad(res, 400, FAIL);

  await logEvent({ otpId: result.otpId, userId: user.id, type: "reset_started", ctx });
  const resetToken = jwt.sign({ sub: user.id, otp: result.otpId, purpose: PURPOSE }, resetSecret(), {
    expiresIn: `${RESET_TOKEN_MINUTES}m`,
  });
  res.json({ ok: true, resetToken });
});

/* ===== 3. set the new password ===== */
router.post("/confirm", confirmLimiter, async (req, res) => {
  const ctx = clientInfo(req);
  const password = String(req.body?.password ?? "");
  if (password.length < 8) return bad(res, 400, "Password must be at least 8 characters.");
  if (Buffer.byteLength(password) > 72) return bad(res, 400, "That password is too long (72 characters at most).");

  const EXPIRED = "This reset session has expired. Please start again.";
  let payload;
  try {
    payload = jwt.verify(String(req.body?.resetToken ?? ""), resetSecret());
  } catch {
    return bad(res, 400, EXPIRED);
  }
  if (payload.purpose !== PURPOSE || !Number.isInteger(payload.otp) || !Number.isInteger(payload.sub))
    return bad(res, 400, EXPIRED);

  const hash = await bcrypt.hash(password, 12);

  // ONE statement: the code is marked "used" and the password changes together, and only if it is still "verified"
  const { rows } = await query(
    `WITH used AS (
       UPDATE email_otp SET status = 'used', used_at = now()
        WHERE id = $1 AND user_id = $2 AND purpose = $3 AND status = 'verified'
          AND verified_at > now() - ($4::int * interval '1 minute')
        RETURNING user_id
     )
     UPDATE users SET password_hash = $5
      WHERE id IN (SELECT user_id FROM used) AND is_removed = 0 AND status = 1 AND is_blocked = 0
      RETURNING id, email, first_name`,
    [payload.otp, payload.sub, PURPOSE, RESET_TOKEN_MINUTES, hash],
  );
  const user = rows[0];

  if (!user) {
    await logEvent({
      otpId: payload.otp, userId: payload.sub, type: "reset_failed",
      details: { reason: "not_verified_or_expired" }, ctx,
    });
    return bad(res, 400, EXPIRED);
  }

  // any other code still open for this account is cancelled
  await query(
    `UPDATE email_otp SET status = 'revoked', revoked_at = now()
      WHERE user_id = $1 AND status IN ('pending', 'verified')`,
    [user.id],
  );
  await logEvent({ otpId: payload.otp, userId: user.id, type: "reset_completed", ctx });

  res.json({ ok: true });

  // "your password was changed" notice (the reset itself does not depend on it)
  sendEmail({ to: user.email, ...passwordChangedEmail({ name: user.first_name }) }).catch((err) =>
    console.error("[password-reset] notice email failed:", err.message),
  );
});

export default router;