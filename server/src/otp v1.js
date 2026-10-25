
import crypto from "node:crypto";
import { query } from "./db.js";
import { sendEmail } from "./email.js";

// --------------------------------------------------
// OTP configuration
// --------------------------------------------------

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;
export const RESEND_COOLDOWN_SECONDS = 60;
export const MAX_OTP_REQUESTS_PER_HOUR = 5;
export const MAX_OTP_ATTEMPTS = 5;

const PURPOSES = new Set([
  "password_reset",
  "email_verification",
  "email_change",
  "password_change",
]);

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";

const getOtpSecret = () => {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("OTP_SECRET or JWT_SECRET must be configured.");
  }

  return secret;
};

// --------------------------------------------------
// Client information and event logging
// --------------------------------------------------

export function clientInfo(req) {
  return {
    ip: req.ip || null,
    userAgent: req.get?.("user-agent") || null,
  };
}

export async function logEvent({
  otpId = null,
  userId,
  type,
  details = {},
  ctx = {},
}) {
  try {
    await query(
      `INSERT INTO security_events
         (user_id, otp_id, event_type, details, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        userId,
        otpId,
        type,
        JSON.stringify(details),
        ctx.ip || null,
        ctx.userAgent || null,
      ],
    );
  } catch (error) {
    // Logging failures should not expose sensitive OTP information.
    console.error("[otp] Failed to log security event:", error.message);
  }
}

// --------------------------------------------------
// OTP generation and hashing
// --------------------------------------------------

function generateOtp() {
  return crypto
    .randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, "0");
}

function hashOtp({ userId, purpose, code }) {
  return crypto
    .createHmac("sha256", getOtpSecret())
    .update(`${userId}:${purpose}:${code}`)
    .digest("hex");
}

function safeCompareHex(a, b) {
  if (
    typeof a !== "string" ||
    typeof b !== "string" ||
    !/^[a-f0-9]{64}$/i.test(a) ||
    !/^[a-f0-9]{64}$/i.test(b)
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(a, "hex"),
    Buffer.from(b, "hex"),
  );
}

// --------------------------------------------------
// Email templates
// The forget-password URL is exclusive to password_reset.
// --------------------------------------------------

export function passwordResetEmail({
  name,
  code,
  purpose = "password_reset",
}) {
  const isPasswordReset = purpose === "password_reset";
  const recipientName = String(name || "there");

  const subject = isPasswordReset
    ? "Password Reset Verification Code"
    : purpose === "email_verification"
      ? "Email Verification Code"
      : purpose === "email_change"
        ? "Email Change Verification Code"
        : "Password Change Verification Code";

  const resetUrl = `${FRONTEND_URL.replace(/\/+$/, "")}/forget-password`;

  const resetText = isPasswordReset
    ? `\nReset your password here: ${resetUrl}\n`
    : "";

  const resetHtml = isPasswordReset
    ? `
      <p>To continue resetting your password, open this page:</p>
      <p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:12px 20px;background:#d97706;color:#ffffff;text-decoration:none;border-radius:8px;">
          Reset Password
        </a>
      </p>
      <p>If the button does not work, copy this URL:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
    `
    : "";

  return {
    subject,

    text: `
Hello ${recipientName},

Your verification code is: ${code}

This code expires in ${OTP_TTL_MINUTES} minutes.
${resetText}
If you did not request this code, you can ignore this email.
    `.trim(),

    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;">
        <h2>Verification Code</h2>
        <p>Hello ${escapeHtml(recipientName)},</p>
        <p>Your verification code is:</p>

        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:20px 0;">
          ${escapeHtml(code)}
        </div>

        <p>This code expires in ${OTP_TTL_MINUTES} minutes.</p>

        ${resetHtml}

        <p>If you did not request this code, you can ignore this email.</p>
      </div>
    `,
  };
}

export function passwordChangedEmail({ name }) {
  return {
    subject: "Your Password Has Been Changed",
    text: `
Hello ${name || "there"},

Your account password has been changed.

If you did not make this change, contact support immediately.
    `.trim(),

    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;">
        <h2>Password Changed</h2>
        <p>Hello ${escapeHtml(name || "there")},</p>
        <p>Your account password has been changed.</p>
        <p>If you did not make this change, contact support immediately.</p>
      </div>
    `,
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// --------------------------------------------------
// Issue OTP
// --------------------------------------------------

export async function issueOtp({ user, purpose, ctx = {} }) {
  if (!user?.id || !user?.email) {
    throw new Error("A valid user with an email is required.");
  }

  if (!PURPOSES.has(purpose)) {
    throw new Error("Unsupported OTP purpose.");
  }

  // Enforce resend cooldown.
  const recent = await query(
    `SELECT resend_available_at
       FROM email_otp
      WHERE user_id = $1
        AND purpose = $2
      ORDER BY created_at DESC
      LIMIT 1`,
    [user.id, purpose],
  );

  const resendAvailableAt = recent.rows[0]?.resend_available_at;

  if (resendAvailableAt) {
    const remaining =
      new Date(resendAvailableAt).getTime() - Date.now();

    if (remaining > 0) {
      const error = new Error(
        `Please wait ${Math.ceil(remaining / 1000)} seconds before requesting another code.`,
      );
      error.status = 429;
      throw error;
    }
  }

  // Enforce hourly request limit.
  const requestCount = await query(
    `SELECT COUNT(*)::int AS count
       FROM email_otp
      WHERE user_id = $1
        AND purpose = $2
        AND created_at > NOW() - INTERVAL '1 hour'`,
    [user.id, purpose],
  );

  if (requestCount.rows[0].count >= MAX_OTP_REQUESTS_PER_HOUR) {
    const error = new Error("Too many OTP requests. Please try again later.");
    error.status = 429;
    throw error;
  }

  const code = generateOtp();
  const codeHash = hashOtp({
    userId: user.id,
    purpose,
    code,
  });

  // Only one active code per user and purpose.
  await query(
    `UPDATE email_otp
        SET status = 'revoked',
            revoked_at = NOW()
      WHERE user_id = $1
        AND purpose = $2
        AND status IN ('pending', 'verified')`,
    [user.id, purpose],
  );

  const inserted = await query(
    `INSERT INTO email_otp
       (
         user_id,
         purpose,
         code_hash,
         status,
         attempts,
         expires_at,
         resend_available_at,
         created_at
       )
     VALUES
       (
         $1,
         $2,
         $3,
         'pending',
         0,
         NOW() + ($4 * INTERVAL '1 minute'),
         NOW() + ($5 * INTERVAL '1 second'),
         NOW()
       )
     RETURNING id, expires_at, resend_available_at`,
    [
      user.id,
      purpose,
      codeHash,
      OTP_TTL_MINUTES,
      RESEND_COOLDOWN_SECONDS,
    ],
  );

  const otp = inserted.rows[0];

  try {
    await sendEmail({
      to: user.email,
      ...passwordResetEmail({
        name: user.first_name,
        code,
        purpose,
      }),
    });
  } catch (error) {
    await query(
      `UPDATE email_otp
          SET status = 'revoked',
              revoked_at = NOW()
        WHERE id = $1`,
      [otp.id],
    );

    await logEvent({
      otpId: otp.id,
      userId: user.id,
      type: "otp_email_failed",
      details: { purpose },
      ctx,
    });

    throw error;
  }

  await logEvent({
    otpId: otp.id,
    userId: user.id,
    type: "otp_requested",
    details: { purpose },
    ctx,
  });

  return {
    otpId: otp.id,
    expiresAt: otp.expires_at,
    resendAvailableAt: otp.resend_available_at,
    resendAfter: RESEND_COOLDOWN_SECONDS,
  };
}

// --------------------------------------------------
// Verify OTP
// --------------------------------------------------

export async function verifyOtp({
  userId,
  purpose,
  code,
  ctx = {},
}) {
  if (!PURPOSES.has(purpose)) {
    throw new Error("Unsupported OTP purpose.");
  }

  if (!/^\d{6}$/.test(String(code || ""))) {
    return { ok: false, error: "invalid_code" };
  }

  const result = await query(
    `SELECT id, code_hash, status, attempts, expires_at
       FROM email_otp
      WHERE user_id = $1
        AND purpose = $2
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId, purpose],
  );

  const otp = result.rows[0];

  if (!otp || otp.status !== "pending") {
    return { ok: false, error: "invalid_or_expired_code" };
  }

  if (new Date(otp.expires_at).getTime() <= Date.now()) {
    await query(
      `UPDATE email_otp
          SET status = 'expired'
        WHERE id = $1`,
      [otp.id],
    );

    await logEvent({
      otpId: otp.id,
      userId,
      type: "otp_expired",
      details: { purpose },
      ctx,
    });

    return { ok: false, error: "invalid_or_expired_code" };
  }

  if (Number(otp.attempts) >= MAX_OTP_ATTEMPTS) {
    await query(
      `UPDATE email_otp
          SET status = 'revoked',
              revoked_at = NOW()
        WHERE id = $1`,
      [otp.id],
    );

    return { ok: false, error: "too_many_attempts" };
  }

  const submittedHash = hashOtp({
    userId,
    purpose,
    code: String(code),
  });

  if (!safeCompareHex(otp.code_hash, submittedHash)) {
    const attempts = Number(otp.attempts) + 1;
    const locked = attempts >= MAX_OTP_ATTEMPTS;

    await query(
      `UPDATE email_otp
          SET attempts = $2,
              status = CASE WHEN $3 THEN 'revoked' ELSE status END,
              revoked_at = CASE WHEN $3 THEN NOW() ELSE revoked_at END
        WHERE id = $1`,
      [otp.id, attempts, locked],
    );

    await logEvent({
      otpId: otp.id,
      userId,
      type: "otp_invalid_attempt",
      details: { purpose, attempts },
      ctx,
    });

    return {
      ok: false,
      error: locked ? "too_many_attempts" : "invalid_code",
    };
  }

  const verified = await query(
    `UPDATE email_otp
        SET status = 'verified',
            verified_at = NOW()
      WHERE id = $1
        AND status = 'pending'
      RETURNING id`,
    [otp.id],
  );

  if (!verified.rowCount) {
    return { ok: false, error: "invalid_or_expired_code" };
  }

  await logEvent({
    otpId: otp.id,
    userId,
    type: "otp_verified",
    details: { purpose },
    ctx,
  });

  return {
    ok: true,
    otpId: otp.id,
  };
}
