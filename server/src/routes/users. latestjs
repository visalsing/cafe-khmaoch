import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import { requireAuth, requirePermission, publicUser } from "../middleware.js";

const router = Router();
router.use(requireAuth, requirePermission("users"));

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const ROLES = ["admin", "staff", "customer"];
const STATUSES = ["active", "blocked"];
const isAdmin = (req) => req.user.role === "admin";

async function wouldRemoveLastAdmin(target, nextRole, nextStatus) {
  const wasActiveAdmin = target.role === "admin" && target.status === "active";
  const stillActiveAdmin = nextRole === "admin" && nextStatus === "active";
  if (!wasActiveAdmin || stillActiveAdmin) return false;
  const { rows } = await query("SELECT count(*)::int AS n FROM users WHERE role = 'admin' AND status = 'active'");
  return rows[0].n <= 1;
}

router.get("/", async (req, res) => {
  const { rows } = await query("SELECT * FROM users ORDER BY created_at DESC");
  res.json(rows.map(publicUser));
});

router.post("/", async (req, res) => {
  const b = req.body || {};
  const firstName = String(b.firstName || "").trim();
  const email = String(b.email || "").trim();
  const password = String(b.password || "");
  const role = isAdmin(req) ? b.role || "customer" : "customer"; // staff can only create customers
  const status = b.status || "active";
  const avatar = String(b.avatar || "");

  if (!firstName) return res.status(400).json({ error: "First name is required." });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Please enter a valid email." });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
  if (!ROLES.includes(role) || !STATUSES.includes(status)) return res.status(400).json({ error: "Invalid role or status." });
  if (avatar.length > 200000) return res.status(400).json({ error: "That photo is too large." });

  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, role, status, avatar)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [firstName, String(b.lastName || "").trim(), email, String(b.phone || "").trim(), hash, role, status, avatar]
    );
    res.status(201).json(publicUser(rows[0]));
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "That email is already used by another user." });
    throw err;
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await query("SELECT * FROM users WHERE id = $1", [id]);
  const target = rows[0];
  if (!target) return res.status(404).json({ error: "User not found." });
  if (!isAdmin(req) && target.role !== "customer")
    return res.status(403).json({ error: "Only admins can change staff or admin accounts." });

  const b = req.body || {};
  const next = {
    first_name: b.firstName !== undefined ? String(b.firstName).trim() : target.first_name,
    last_name: b.lastName !== undefined ? String(b.lastName).trim() : target.last_name,
    email: b.email !== undefined ? String(b.email).trim() : target.email,
    phone: b.phone !== undefined ? String(b.phone).trim() : target.phone,
    avatar: b.avatar !== undefined ? String(b.avatar) : target.avatar,
    role: b.role !== undefined ? b.role : target.role,
    status: b.status !== undefined ? b.status : target.status,
  };

  if (!next.first_name) return res.status(400).json({ error: "First name is required." });
  if (!EMAIL_RE.test(next.email)) return res.status(400).json({ error: "Please enter a valid email." });
  if (!ROLES.includes(next.role) || !STATUSES.includes(next.status)) return res.status(400).json({ error: "Invalid role or status." });
  if (next.avatar.length > 200000) return res.status(400).json({ error: "That photo is too large." });
  if (!isAdmin(req) && next.role !== "customer") return res.status(403).json({ error: "Only admins can assign that role." });
  if (id === req.user.id && (next.role !== target.role || next.status !== target.status))
    return res.status(400).json({ error: "You can't change the role or status of your own account." });
  if (await wouldRemoveLastAdmin(target, next.role, next.status))
    return res.status(409).json({ error: "There must be at least one active admin." });

  let hash = target.password_hash;
  if (b.password) {
    if (String(b.password).length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
    hash = await bcrypt.hash(String(b.password), 12);
  }

  try {
    const { rows: out } = await query(
      `UPDATE users SET first_name = $1, last_name = $2, email = $3, phone = $4, avatar = $5,
              role = $6, status = $7, password_hash = $8
       WHERE id = $9 RETURNING *`,
      [next.first_name, next.last_name, next.email, next.phone, next.avatar, next.role, next.status, hash, id]
    );
    res.json(publicUser(out[0]));
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "That email is already used by another user." });
    throw err;
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await query("SELECT * FROM users WHERE id = $1", [id]);
  const target = rows[0];
  if (!target) return res.json({ ok: true });
  if (id === req.user.id) return res.status(400).json({ error: "You can't delete your own account." });
  if (!isAdmin(req) && target.role !== "customer") return res.status(403).json({ error: "Only admins can delete staff or admin accounts." });
  if (await wouldRemoveLastAdmin(target, null, null)) return res.status(409).json({ error: "There must be at least one active admin." });

  await query("DELETE FROM users WHERE id = $1", [id]);
  res.json({ ok: true });
});

export default router;