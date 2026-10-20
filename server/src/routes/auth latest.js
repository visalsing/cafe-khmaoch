import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { query } from "../db.js";
import { permissionsFor } from "../access.js";
import { COOKIE, cookieOptions, signToken, requireAuth, publicUser } from "../middleware.js";

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
  return { user: publicUser(user), permissions: await permissionsFor(user.role) };
}

router.post("/login", limiter, async (req, res) => {
  const email = String(req.body?.email || "").trim();
  const password = String(req.body?.password || "");

  const { rows } = await query("SELECT * FROM users WHERE lower(email) = lower($1)", [email]);
  const user = rows[0];
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

  // same message for "no such email" and "wrong password"
  if (!user || !ok) return res.status(401).json({ error: "Wrong email or password." });
  if (user.status !== "active") return res.status(403).json({ error: "This account is blocked. Please contact an admin." });

  const { rows: updated } = await query("UPDATE users SET last_login_at = now() WHERE id = $1 RETURNING *", [user.id]);
  res.json(await startSession(res, updated[0]));
});

// customer sign-up (always the "customer" role)
router.post("/register", limiter, async (req, res) => {
  const { firstName = "", lastName = "", email = "", password = "" } = req.body || {};
  if (!String(firstName).trim()) return res.status(400).json({ error: "First name is required." });
  if (!EMAIL_RE.test(String(email).trim())) return res.status(400).json({ error: "Please enter a valid email." });
  if (String(password).length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });

  try {
    const hash = await bcrypt.hash(String(password), 12);
    const { rows } = await query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, last_login_at)
       VALUES ($1, $2, $3, $4, 'customer', now()) RETURNING *`,
      [String(firstName).trim(), String(lastName).trim(), String(email).trim(), hash]
    );
    res.status(201).json(await startSession(res, rows[0]));
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