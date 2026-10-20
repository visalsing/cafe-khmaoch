import bcrypt from "bcryptjs";
import { pool } from "./db.js";

const email = (process.env.ADMIN_EMAIL || "").trim();
const password = process.env.ADMIN_PASSWORD || "";
const reset = process.argv.includes("--reset");

if (!email || password.length < 8) {
  console.error("ADMIN_EMAIL / ADMIN_PASSWORD missing or shorter than 8 characters in server/.env");
  process.exit(1);
}

console.log(`.env email: "${email}"`);
console.log(`.env password length: ${password.length} characters`);

const { rows } = await pool.query(
  `SELECT u.id, u.email, r.code AS role, u.status, u.is_blocked, u.is_removed, u.password_hash
     FROM users u JOIN roles r ON r.id = u.role_id
    WHERE lower(u.email) = lower($1) AND u.is_removed = 0`,
  [email],
);
const user = rows[0];

if (!user) {
  console.log("❌ No user with that email in the database.");
} else {
  const match = await bcrypt.compare(password, user.password_hash);
  console.log(`✅ User found: id ${user.id}, role ${user.role}, status ${user.status}, blocked ${user.is_blocked}`);
  console.log(match ? "✅ .env password matches the saved hash" : "❌ .env password does NOT match the saved hash");
}

const all = await pool.query(
  `SELECT u.id, u.email, r.code AS role, u.status, u.is_blocked, u.is_removed
     FROM users u JOIN roles r ON r.id = u.role_id ORDER BY u.id`,
);
console.log("Users in database:");
console.table(all.rows);

if (reset) {
  const hash = await bcrypt.hash(password, 12);
  if (user) {
    await pool.query(
      `UPDATE users SET password_hash = $1, role_id = (SELECT id FROM roles WHERE code = 'admin'),
              status = 1, is_blocked = 0, is_removed = 0 WHERE id = $2`,
      [hash, user.id],
    );
  } else {
    await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role_id)
       SELECT 'Admin', '', $1, $2, id FROM roles WHERE code = 'admin'`,
      [email, hash],
    );
  }
  console.log(`✅ Admin ready: ${email}. Sign in with the password from .env`);
} else {
  console.log("To make the database match .env, run: npm run admin:reset");
}

await pool.end();