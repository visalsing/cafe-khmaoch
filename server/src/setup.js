import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { pool } from "./db.js";
import { DEFAULT_STAFF } from "./access.js";

await pool.query(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));

const staff = await pool.query("SELECT 1 FROM role_permissions WHERE role = 'staff' LIMIT 1");
if (!staff.rows.length) {
  for (const p of DEFAULT_STAFF)
    await pool.query("INSERT INTO role_permissions (role, permission) VALUES ('staff', $1)", [p]);
}

const admins = await pool.query("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1");
if (!admins.rows.length) {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 8 characters) in server/.env");
    process.exit(1);
  }
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await pool.query(
    "INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES ('Admin', '', $1, $2, 'admin')",
    [ADMIN_EMAIL.trim(), hash]
  );
  console.log(`Created admin: ${ADMIN_EMAIL}`);
}

console.log("Database ready");
await pool.end();