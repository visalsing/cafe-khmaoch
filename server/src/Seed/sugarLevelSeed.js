import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const sugarLevelSeed = [
  {
    name: { en: "No Sugar", km: "គ្មានស្ករ" },
    description: { en: "0% sugar", km: "ស្ករ ០%" },
    status: 1,
    sort_num: 1,
  },
  {
    name: { en: "25% Sugar", km: "ស្ករ ២៥%" },
    description: { en: "25% sugar", km: "ស្ករ ២៥%" },
    status: 1,
    sort_num: 2,
  },
  {
    name: { en: "50% Sugar", km: "ស្ករ ៥០%" },
    description: { en: "50% sugar", km: "ស្ករ ៥០%" },
    status: 1,
    sort_num: 3,
  },
  {
    name: { en: "75% Sugar", km: "ស្ករ ៧៥%" },
    description: { en: "75% sugar", km: "ស្ករ ៧៥%" },
    status: 1,
    sort_num: 4,
  },
  {
    name: { en: "100% Sugar", km: "ស្ករ ១០០%" },
    description: { en: "100% sugar", km: "ស្ករ ១០០%" },
    status: 1,
    sort_num: 5,
  },
];

async function runSeeder() {
  const client = await pool.connect();

  try {
    console.log("🌱 Starting sugar_level seeding...");

    for (const item of sugarLevelSeed) {
      await client.query(
        `INSERT INTO sugar_level
          (name, description, status, sort_num)
         VALUES ($1::jsonb, $2::jsonb, $3, $4)`,
        [
          JSON.stringify(item.name),
          JSON.stringify(item.description),
          item.status,
          item.sort_num,
        ]
      );

      console.log(`-> Successfully seeded: ${item.name.en}`);
    }

    console.log("✅ sugar_level seeding completed!");
  } catch (err) {
    console.error("❌ Error seeding sugar_level:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runSeeder();