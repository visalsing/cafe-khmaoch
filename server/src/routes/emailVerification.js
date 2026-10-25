import { Router } from "express";
import rateLimit from "express-rate-limit";
import { query } from "../db.js";
import { requireAuth } from "../middleware.js";
import { RESEND_COOLDOWN_SECONDS, clientInfo, issueOtp, verifyOtp, logEvent } from "../otp.js";

// The ACCOUNT OWNER uses these routes (any signed-in user), not the admin.
// Mounted in app.js as:  app.use("/api/email-verification", emailVerificationRoutes);

const router = Router();
const PURPOSE = "email_verification";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

router.use(requireAuth, limiter);

const otpUser = (req) => ({ id: req.user.id, email: req.user.email, first_name: req.user.first_name });

/* ===== current state (the page uses it to decide what to show) ===== */
router.get("/status", (req, res) => {
  res.json({
    isVerifiedEmail: req.user.is_verified_email === true,
    email: req.user.email,
  });
});

/* ===== send (or re-send) a code to the signed-in user's own email ===== */
router.post("/request", async (req, res) => {
  if (req.user.is_verified_email) return res.json({ ok: true, alreadyVerified: true });

  const { rows } = await query(
    `SELECT resend_available_at FROM email_otp
      WHERE user_id = $1 AND purpose = $2 ORDER BY created_at DESC LIMIT 1`,
    [req.user.id, PURPOSE],
  );
  const wait = rows[0]?.resend_available_at ? new Date(rows[0].resend_available_at) - Date.now() : 0;
  if (wait > 0)
    return res.status(429).json({ error: `Please wait ${Math.ceil(wait / 1000)} seconds before sending again.` });

  try {
    // only ONE open code per user and purpose
    await query(
      `UPDATE email_otp SET status = 'revoked', revoked_at = now()
        WHERE user_id = $1 AND purpose = $2 AND status IN ('pending', 'verified')`,
      [req.user.id, PURPOSE],
    );
    await issueOtp({ user: otpUser(req), purpose: PURPOSE, ctx: clientInfo(req) });
  } catch (err) {
    console.error("[email-verification] request failed:", err);
    return res.status(502).json({ error: "The email could not be sent. Please try again later." });
  }
  res.json({ ok: true, resendAfter: RESEND_COOLDOWN_SECONDS });
});

/* ===== check the code, mark the email as verified ===== */
router.post("/verify", async (req, res) => {
  const code = String(req.body?.code ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: "Enter the 6-digit code from your email." });

  const ctx = clientInfo(req);
  const user = otpUser(req);

  const result = await verifyOtp({ user, purpose: PURPOSE, code, ctx });
  if (!result.ok) return res.status(400).json({ error: "That code is incorrect or has expired. Check it, or request a new code." });

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

export default router;