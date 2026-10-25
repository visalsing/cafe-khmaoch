import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { query } from "../db.js";
import { permissionsFor } from "../access.js";
import { COOKIE, cookieOptions, signToken, requireAuth, publicUser, canSignIn, USER_SELECT } from "../middleware.js";

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
  return { user: publicUser(user), permissions: await permissionsFor(user) };
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

  await query("UPDATE users SET last_login_at = now() WHERE id = $1", [user.id]);
  user.last_login_at = new Date();
  res.json(await startSession(res, user));
});

// customer sign-up (always the "customer" role)
router.post("/register", limiter, async (req, res) => {
  const b = req.body || {};
  const firstName = clip(b.firstName, 100);
  const email = clip(b.email, 254);
  const password = String(b.password || "");
  if (!firstName) return res.status(400).json({ error: "First name is required." });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Please enter a valid email." });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });

  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      `INSERT INTO users (first_name, last_name, first_name_native, last_name_native, email, phone, password_hash, role_id, last_login_at)
       SELECT $1, $2, $3, $4, $5, $6, $7, r.id, now() FROM roles r WHERE r.code = 'customer'
       RETURNING id`,
      [firstName, clip(b.lastName, 100), clip(b.firstNameNative, 100), clip(b.lastNameNative, 100), email, clip(b.phone, 40), hash],
    );
    if (!rows[0]) return res.status(500).json({ error: "The customer role is missing. Run npm run db:setup." });

    const { rows: full } = await query(`${USER_SELECT} WHERE u.id = $1`, [rows[0].id]);
    res.status(201).json(await startSession(res, full[0]));
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "That email is already registered." });
    throw err;
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE, { path: "/" });
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user), permissions: req.permissions });
});

export default router;