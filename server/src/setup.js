import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { pool } from "./db.js";

// { table name -> Set of its column names } for every real table of the current schema
async function snapshot() {
  const { rows } = await pool.query(`
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = current_schema()
      AND t.table_type = 'BASE TABLE'
    ORDER BY c.table_name, c.ordinal_position
  `);
  const tables = new Map();
  for (const { table_name, column_name } of rows) {
    if (!tables.has(table_name)) tables.set(table_name, new Set());
    tables.get(table_name).add(column_name);
  }
  return tables;
}

// Only a report: it never skips or blocks anything. schema.sql always runs completely,
// so CREATE TABLE IF NOT EXISTS leaves existing tables alone and the ALTER ... ADD COLUMN
// lines still add the new columns.
function printReport(before, after) {
  const names = [...new Set([...before.keys(), ...after.keys()])].sort();
  const width = Math.max(...names.map((n) => n.length));
  let created = 0;
  let existing = 0;
  let upgraded = 0;

  console.log(`\nTables (${after.size}):`);
  for (const name of names) {
    const was = before.get(name);
    const now = after.get(name);
    let tag;
    let note = "";

    if (!was) {
      tag = "NEW     ";
      created++;
    } else if (!now) {
      tag = "REMOVED ";
    } else {
      tag = "existing";
      existing++;
      const added = [...now].filter((c) => !was.has(c));
      const removed = [...was].filter((c) => !now.has(c));
      if (added.length) note += `  + ${added.join(", ")}`;
      if (removed.length) note += `  - ${removed.join(", ")}`;
      if (added.length || removed.length) upgraded++;
    }

    console.log(`  ${tag}  ${name.padEnd(width)}${note}`);
  }

  console.log(
    `\n${created} new, ${existing} already existed (${upgraded} upgraded with column changes).\n`
  );
}

try {
  const before = await snapshot();

  // Create tables and migrate the existing database.
  await pool.query(
    readFileSync(new URL("./schema.sql", import.meta.url), "utf8")
  );

  printReport(before, await snapshot());

  // Check whether an admin already exists using the new role_id structure.
  const admins = await pool.query(`
    SELECT 1
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE r.code = 'admin'
      AND u.is_removed = 0
    LIMIT 1
  `);

  if (!admins.rows.length) {
    const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

    if (
      !ADMIN_EMAIL ||
      !ADMIN_PASSWORD ||
      ADMIN_PASSWORD.length < 8
    ) {
      throw new Error(
        "Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 8 characters) in server/.env"
      );
    }

    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    const result = await pool.query(
      `
        INSERT INTO users (
          first_name,
          last_name,
          email,
          password_hash,
          role_id
        )
        SELECT 'Admin', '', $1, $2, id
        FROM roles
        WHERE code = 'admin'
        RETURNING id
      `,
      [ADMIN_EMAIL.trim(), hash]
    );

    if (!result.rows.length) {
      throw new Error(
        "Admin role not found. Check that schema.sql inserts a role with code = 'admin'."
      );
    }

    console.log(`Created admin: ${ADMIN_EMAIL.trim()}`);
  } else {
    console.log("Admin account already exists.");
  }

  console.log("Database ready.");
} catch (error) {
  console.error("Database setup failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}