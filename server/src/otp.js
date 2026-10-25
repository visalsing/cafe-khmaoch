import crypto from "node:crypto";
import net from "node:net";
import { query } from "./db.js";
import { sendEmail } from "./email.js";

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;
export const RESEND_COOLDOWN_SECONDS = 60;
export const MAX_REQUESTS_PER_HOUR = 5;
export const MAX_ATTEMPTS = 5;

/* ---------- code + hash ---------- */
const secret = () => {
  const s = process.env.OTP_SECRET || process.env.JWT_SECRET;
  if (!s) throw new Error("Set OTP_SECRET (or JWT_SECRET) in server/.env");
  return s;
};

// HMAC with a server secret: a leaked database alone cannot brute-force a 6-digit code
const hashCode = (userId, purpose, code) =>
  crypto.createHmac("sha256", secret()).update(`${userId}:${purpose}:${code}`).digest("hex");

const sameHash = (a, b) => {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const generateCode = () => String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");

/* ---------- request context (ip + browser) ---------- */
export function clientInfo(req) {
  const raw = req.ip ? String(req.ip).split("%")[0] : "";
  return {
    ip: net.isIP(raw) ? raw : null,
    ua: String(req.get("user-agent") || "").slice(0, 400) || null,
  };
}

// a failed log line must never break the reset flow
export async function logEvent({ otpId = null, userId = null, type, details = {}, ctx }) {
  try {
    await query(
      `INSERT INTO email_otp_events (email_otp_id, user_id, event_type, event_details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
      [otpId, userId, type, JSON.stringify(details), ctx?.ip ?? null, ctx?.ua ?? null],
    );
  } catch (err) {
    console.error("[otp] could not log event:", err.message);
  }
}

/* ---------- emails ---------- */
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function passwordResetEmail({ name, code }) {
  const hello = name ? `Hi ${name},` : "Hi,";
  return {
    subject: "Your Café ខ្មោច password reset code",
    text: `${hello}

Your password reset code is: ${code}

It expires in ${OTP_TTL_MINUTES} minutes. If you did not ask to reset your password, you can ignore this email and your password will stay the same.

Never share this code with anyone.

Café ខ្មោច`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#292524">
  <h2 style="margin:0 0 12px;color:#d97706">Café ខ្មោច</h2>
  <p>${esc(hello)}</p>
  <p>Use this code to reset your password:</p>
  <p style="font-size:32px;font-weight:700;letter-spacing:8px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;text-align:center;margin:16px 0">${code}</p>
  <p style="color:#78716c;font-size:14px">The code expires in ${OTP_TTL_MINUTES} minutes. If you did not ask to reset your password, you can ignore this email and your password will stay the same.</p>
  <p style="color:#78716c;font-size:14px"><b>Never share this code with anyone.</b></p>
</div>`,
  };
}

export function passwordChangedEmail({ name }) {
  const hello = name ? `Hi ${name},` : "Hi,";
  return {
    subject: "Your Café ខ្មោច password was changed",
    text: `${hello}

The password of your Café ខ្មោច account was just changed. If this was you, no action is needed.

If it was not you, reset your password again right away.

Café ខ្មោច`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#292524">
  <h2 style="margin:0 0 12px;color:#d97706">Café ខ្មោច</h2>
  <p>${esc(hello)}</p>
  <p>The password of your account was just changed. If this was you, no action is needed.</p>
  <p><b>If it was not you,</b> reset your password again right away.</p>
</div>`,
  };
}

/* ---------- create a code and email it ---------- */
export async function issueOtp({ user, purpose = "password_reset", ctx }) {
  const { rows: recent } = await query(
    `SELECT count(*)::int AS n, max(created_at) AS last_at
       FROM email_otp
      WHERE user_id = $1 AND purpose = $2 AND created_at > now() - interval '1 hour'`,
    [user.id, purpose],
  );
  const requests = recent[0].n;

  if (requests >= MAX_REQUESTS_PER_HOUR) {
    await logEvent({ userId: user.id, type: "requested", details: { skipped: "too_many_requests" }, ctx });
    return { sent: false };
  }

  // a code was sent a moment ago: wait for the cooldown
  const { rows: waiting } = await query(
    `SELECT 1 FROM email_otp
      WHERE user_id = $1 AND purpose = $2 AND status = 'pending' AND resend_available_at > now() LIMIT 1`,
    [user.id, purpose],
  );
  if (waiting[0]) {
    await logEvent({ userId: user.id, type: "requested", details: { skipped: "cooldown" }, ctx });
    return { sent: false };
  }

  // only the newest code works
  await query(
    `UPDATE email_otp SET status = 'revoked', revoked_at = now()
      WHERE user_id = $1 AND purpose = $2 AND status IN ('pending', 'verified')`,
    [user.id, purpose],
  );

  const code = generateCode();
  const { rows } = await query(
    `INSERT INTO email_otp
       (user_id, purpose, otp_hash, email, expires_at, max_attempts,
        resend_count, last_resend_at, resend_available_at, request_ip, request_user_agent)
     VALUES ($1, $2, $3, $4, now() + ($5::int * interval '1 minute'), $6,
             $7, $8, now() + ($9::int * interval '1 second'), $10, $11)
     RETURNING id`,
    [
      user.id, purpose, hashCode(user.id, purpose, code), user.email, OTP_TTL_MINUTES, MAX_ATTEMPTS,
      requests, recent[0].last_at, RESEND_COOLDOWN_SECONDS, ctx?.ip ?? null, ctx?.ua ?? null,
    ],
  );
  const otpId = rows[0].id;
  await logEvent({ otpId, userId: user.id, type: requests > 0 ? "resend_requested" : "requested", ctx });

  try {
    await sendEmail({ to: user.email, ...passwordResetEmail({ name: user.first_name, code }) });
    await query("UPDATE email_otp SET delivery_status = 'sent', sent_at = now() WHERE id = $1", [otpId]);
    await logEvent({ otpId, userId: user.id, type: "email_sent", ctx });
    return { sent: true };
  } catch (err) {
    console.error("[otp] email failed:", err.message);
    await query("UPDATE email_otp SET delivery_status = 'failed', delivery_error = $2 WHERE id = $1", [
      otpId,
      String(err.message).slice(0, 300),
    ]);
    await logEvent({ otpId, userId: user.id, type: "email_failed", details: { error: err.message }, ctx });
    return { sent: false };
  }
}

/* ---------- check a code ---------- */
// Returns { ok: true, otpId } or { ok: false }. The reason is only written to the event log, never sent to the browser.
export async function verifyOtp({ user, purpose = "password_reset", code, ctx }) {
  const { rows } = await query(
    `SELECT *, (expires_at <= now()) AS is_expired
       FROM email_otp
      WHERE user_id = $1 AND purpose = $2 AND status = 'pending'
      ORDER BY created_at DESC LIMIT 1`,
    [user.id, purpose],
  );
  const otp = rows[0];

  if (!otp) {
    await logEvent({ userId: user.id, type: "verification_failed", details: { reason: "no_pending_code" }, ctx });
    return { ok: false };
  }

  if (otp.is_expired) {
    await query("UPDATE email_otp SET status = 'expired' WHERE id = $1", [otp.id]);
    await logEvent({ otpId: otp.id, userId: user.id, type: "otp_expired", ctx });
    return { ok: false };
  }

  if (!sameHash(otp.otp_hash, hashCode(user.id, purpose, code))) {
    const { rows: updated } = await query(
      `UPDATE email_otp
          SET attempts = attempts + 1,
              status = CASE WHEN attempts + 1 >= max_attempts THEN 'locked' ELSE status END
        WHERE id = $1 RETURNING status`,
      [otp.id],
    );
    const locked = updated[0]?.status === "locked";
    await logEvent({
      otpId: otp.id,
      userId: user.id,
      type: locked ? "otp_locked" : "verification_failed",
      details: { reason: "wrong_code" },
      ctx,
    });
    return { ok: false };
  }

  // the status check makes this atomic: two parallel requests cannot both succeed
  const { rows: done } = await query(
    `UPDATE email_otp
        SET status = 'verified', verified_at = now(), verification_ip = $2, verification_user_agent = $3
      WHERE id = $1 AND status = 'pending' RETURNING id`,
    [otp.id, ctx?.ip ?? null, ctx?.ua ?? null],
  );
  if (!done[0]) return { ok: false };

  await logEvent({ otpId: otp.id, userId: user.id, type: "verification_succeeded", ctx });
  return { ok: true, otpId: otp.id };
}