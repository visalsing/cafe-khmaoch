import pg from "pg";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 15000, // the first request after idle can be slow (Neon wakes up)
});

export const query = (text, params) => pool.query(text, params);