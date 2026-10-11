import fs from 'fs';
import path from 'path';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration() {
  try {
    const sql = fs.readFileSync(path.resolve('src/db/schema.sql'), 'utf8');
    console.log('🔄 Running schema migration...');
    await pool.query(sql);
    console.log('✅ Schema updated successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await pool.end();
  }
}

runMigration();

// node --env-file=.env src/migrate.js