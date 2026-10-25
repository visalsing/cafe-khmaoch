import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { query } from "../db.js";
import { permissionsFor } from "../access.js";
import { COOKIE, cookieOptions, signToken, requireAuth, publicUser, canSignIn, USER_SELECT } from "../middleware.js";
import { sendCode, signVerifyToken } from "../verification.js";

const router = Router();
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12); // keeps timing equal for unknown emails

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

async function startSession(res, user) {
  res.cookie(COOKIE, signToken(user.id), cookieOptions);
  // permissionsFor takes the role CODE (same as in middleware.js), not the whole user object
  return { user: publicUser(user), permissions: await permissionsFor(user.role_code) };
}

const clip = (v, max) => String(v ?? "").trim().slice(0, max);

router.post("/login", limiter, async (req, res) => {
  const email = clip(req.body?.email, 254);
  const password = String(req.body?.password || "");

  // removed accounts are never found (their email starts with "Removed-")
  const { rows } = await query(`${USER_SELECT} WHERE lower(u.email) = lower($1) AND u.is_removed = 0`, [email]);
  const user = rows[0];
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

  // same message for "no such email" and "wrong password"
  if (!user || !ok) return res.status(401).json({ error: "Wrong email or password." });
  if (user.is_blocked === 1) return res.status(403).json({ error: "This account is blocked. Please contact an admin." });
  if (!canSignIn(user)) return res.status(403).json({ error: "This account is not active. Please contact an admin." });

  // the email must be verified first (the login page handles this with the code step)
  if (!user.is_verified_email)
    return res.status(403).json({ error: "Please verify your email first.", code: "EMAIL_NOT_VERIFIED" });

  await query("UPDATE users SET last_login_at = now() WHERE id = $1", [user.id]);
  user.last_login_at = new Date();
  res.json(await startSession(res, user));
});

// customer sign-up (always the "customer" role). The account is created UNVERIFIED:
// a code is emailed and NOBODY is signed in until the email is verified.
router.post("/register", limiter, async (req, res) => {
  const b = req.body || {};
  const firstName = clip(b.firstName, 100);
  const email = clip(b.email, 254);
  const password = String(b.password || "");
  if (!firstName) return res.status(400).json({ error: "First name is required." });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Please enter a valid email." });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });

  let created;
  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      `INSERT INTO users (first_name, last_name, first_name_native, last_name_native, email, phone, password_hash, role_id)
       SELECT $1, $2, $3, $4, $5, $6, $7, r.id FROM roles r WHERE r.code = 'customer'
       RETURNING id, email, first_name`,
      [firstName, clip(b.lastName, 100), clip(b.firstNameNative, 100), clip(b.lastNameNative, 100), email, clip(b.phone, 40), hash],
    );
    if (!rows[0]) return res.status(500).json({ error: "The customer role is missing. Run npm run db:setup." });
    created = rows[0];
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "That email is already registered." });
    throw err;
  }

  // the account exists; a failing email must not undo that (the login page can send the code again)
  await query(
    `INSERT INTO user_verifications (user_id, is_verified_email, email_updated_at)
     VALUES ($1, false, now()) ON CONFLICT (user_id) DO NOTHING`,
    [created.id],
  );
  let resendAfter = 60;
  let emailSent = true;
  try {
    resendAfter = (await sendCode(req, created)).wait;
  } catch (err) {
    emailSent = false;
    console.error("[register] verification email failed:", err.message);
  }

  res.status(201).json({
    ok: true,
    needsVerification: true,
    emailSent,
    email: created.email,
    verifyToken: signVerifyToken(created.id),
    resendAfter,
  });
});

router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE, { path: "/" });
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user), permissions: req.permissions });
});

export default router;