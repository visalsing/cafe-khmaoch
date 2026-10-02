import jwt from "jsonwebtoken";
import { query } from "./db.js";
import { permissionsFor } from "./access.js";

export const COOKIE = "bb_token";
export const cookieOptions = {
  httpOnly: true,                                   // JavaScript in the page cannot read it
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",    // HTTPS only when deployed
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

export const signToken = (userId) => jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

// never send password_hash to the browser
export const publicUser = (u) => ({
  id: u.id,
  firstName: u.first_name,
  lastName: u.last_name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  status: u.status,
  avatar: u.avatar,
  createdAt: u.created_at,
  lastLoginAt: u.last_login_at,
});

export async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: "Not signed in." });

  let userId;
  try {
    userId = jwt.verify(token, process.env.JWT_SECRET).sub;
  } catch {
    return res.status(401).json({ error: "Not signed in." });
  }

  // load the user on every request, so blocking someone or changing a role takes effect immediately
  const { rows } = await query("SELECT * FROM users WHERE id = $1", [userId]);
  const user = rows[0];
  if (!user || user.status !== "active") {
    res.clearCookie(COOKIE, { path: "/" });
    return res.status(401).json({ error: "Not signed in." });
  }
  req.user = user;
  req.permissions = await permissionsFor(user.role);
  next();
}

export const requirePermission = (key) => (req, res, next) =>
  req.permissions.includes(key)
    ? next()
    : res.status(403).json({ error: "You don't have permission to do that." });