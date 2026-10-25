import jwt from "jsonwebtoken";
import { query } from "./db.js";
import { RESEND_COOLDOWN_SECONDS, clientInfo, issueOtp } from "./otp.js";

// Shared by routes/auth.js (register) and routes/loginVerification.js (sign-in gate).

export const OTP_PURPOSE = "email_verification";
const TOKEN_PURPOSE = "login_verification";
const TOKEN_MINUTES = 15;

const secret = () =>
  `${process.env.OTP_SECRET || process.env.JWT_SECRET}:login-verification-token`;

// proves "this browser knew the right password for this account" (it is NOT a login cookie)
export const signVerifyToken = (userId) =>
  jwt.sign({ sub: userId, purpose: TOKEN_PURPOSE }, secret(), {
    expiresIn: `${TOKEN_MINUTES}m`,
  });

export function readVerifyToken(token) {
  try {
    const p = jwt.verify(String(token ?? ""), secret());
    return p.purpose === TOKEN_PURPOSE && Number.isInteger(p.sub)
      ? p.sub
      : null;
  } catch {
    return null;
  }
}

// Emails a fresh code unless one was sent a moment ago.
// user = { id, email, first_name }. Returns { sent, wait } where wait = seconds until "Resend" works.
export async function sendCode(req, user) {
  const { rows } = await query(
    `SELECT resend_available_at FROM email_otp
      WHERE user_id = $1 AND purpose = $2 ORDER BY created_at DESC LIMIT 1`,
    [user.id, OTP_PURPOSE],
  );
  const wait = rows[0]?.resend_available_at
    ? new Date(rows[0].resend_available_at) - Date.now()
    : 0;
  if (wait > 0) return { sent: false, wait: Math.ceil(wait / 1000) };

  // only ONE open code per user and purpose
  await query(
    `UPDATE email_otp SET status = 'revoked', revoked_at = now()
      WHERE user_id = $1 AND purpose = $2 AND status IN ('pending', 'verified')`,
    [user.id, OTP_PURPOSE],
  );
  //   await issueOtp({ user, purpose: OTP_PURPOSE, ctx: clientInfo(req) });
  //   return { sent: true, wait: RESEND_COOLDOWN_SECONDS };
  const result = await issueOtp({
    user,
    purpose: OTP_PURPOSE,
    ctx: clientInfo(req),
  });

  if (!result.sent) {
    return {
      sent: false,
      wait: result.wait ?? RESEND_COOLDOWN_SECONDS,
    };
  }

  return {
    sent: true,
    wait: RESEND_COOLDOWN_SECONDS,
  };
}
