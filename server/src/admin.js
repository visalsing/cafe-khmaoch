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
  "SELECT id, email, role, status, password_hash FROM users WHERE lower(email) = lower($1)",
  [email]
);
const user = rows[0];

if (!user) {
  console.log("❌ No user with that email in the database.");
} else {
  const match = await bcrypt.compare(password, user.password_hash);
  console.log(`✅ User found: id ${user.id}, role ${user.role}, status ${user.status}`);
  console.log(match ? "✅ .env password matches the saved hash" : "❌ .env password does NOT match the saved hash");
}

const all = await pool.query("SELECT id, email, role, status FROM users ORDER BY id");
console.log("Users in database:");
console.table(all.rows);

if (reset) {
  const hash = await bcrypt.hash(password, 12);
  if (user) {
    await pool.query("UPDATE users SET password_hash = $1, role = 'admin', status = 'active' WHERE id = $2", [hash, user.id]);
  } else {
    await pool.query(
      "INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES ('Admin', '', $1, $2, 'admin')",
      [email, hash]
    );
  }
  console.log(`✅ Admin ready: ${email}. Sign in with the password from .env`);
} else {
  console.log("To make the database match .env, run: npm run admin:reset");
}

await pool.end();