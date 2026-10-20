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

// ONE place that loads a user together with its role. Add a WHERE after it.
export const USER_SELECT = `
  SELECT u.*, r.code AS role_code, r.role_title AS role_title
    FROM users u
    JOIN roles r ON r.id = u.role_id`;

// may this account use the system right now?
export const canSignIn = (u) => u.status === 1 && u.is_blocked === 0 && u.is_removed === 0;

// never send password_hash to the browser. `role` stays the role CODE so the dashboard keeps working
export const publicUser = (u) => ({
  id: u.id,
  firstName: u.first_name,
  lastName: u.last_name,
  firstNameNative: u.first_name_native,
  lastNameNative: u.last_name_native,
  genderId: u.gender_id,
  nationalityId: u.nationality_id,
  address: u.address,
  region: u.region,
  country: u.country,
  description: u.description,
  email: u.email,
  phone: u.phone,
  role: u.role_code,
  roleId: u.role_id,
  roleTitle: u.role_title,
  positionId: u.position_id,
  permissionId: u.permission_id,
  status: u.status,
  isBlocked: u.is_blocked,
  isRemoved: u.is_removed,
  avatar: u.avatar,
  avatarThumbnail: u.avatar_thumbnail,
  createdAt: u.created_at,
  updatedAt: u.updated_at,
  removedAt: u.removed_at,
  lastLoginAt: u.last_login_at,
});

// must be signed in, otherwise 401
export async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: "Not signed in." });

  let userId;
  try {
    userId = jwt.verify(token, process.env.JWT_SECRET).sub;
  } catch {
    return res.status(401).json({ error: "Not signed in." });
  }

  // loaded on EVERY request, so blocking / removing someone or changing a role takes effect immediately
  const { rows } = await query(`${USER_SELECT} WHERE u.id = $1`, [userId]);
  const user = rows[0];
  if (!user || !canSignIn(user)) {
    res.clearCookie(COOKIE, { path: "/" });
    return res.status(401).json({ error: "Not signed in." });
  }
  req.user = user;
  // FIX: Pass user.role_code instead of the full user object
  req.permissions = await permissionsFor(user.role_code);
  next();
}

// signed in OR guest: attaches req.user / req.permissions when there is a valid login, never rejects
export async function optionalAuth(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (token) {
    try {
      const userId = jwt.verify(token, process.env.JWT_SECRET).sub;
      const { rows } = await query(`${USER_SELECT} WHERE u.id = $1`, [userId]);
      if (rows[0] && canSignIn(rows[0])) {
        req.user = rows[0];
        // FIX: Pass rows[0].role_code instead of the full user object
        req.permissions = await permissionsFor(rows[0].role_code);
      }
    } catch {
      /* invalid or expired token: treat as a guest */
    }
  }
  next();
}

// use AFTER requireAuth: needs this exact permission
export const requirePermission = (key) => (req, res, next) =>
  req.permissions.includes(key)
    ? next()
    : res.status(403).json({ error: "You don't have permission to do that." });

// use AFTER requireAuth: needs at least ONE of these permissions
export const requireAnyPermission = (...keys) => (req, res, next) =>
  keys.some((k) => req.permissions.includes(k))
    ? next()
    : res.status(403).json({ error: "You don't have permission to do that." });