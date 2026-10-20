import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const iceLevelSeed = [
    {
    name: { en: "Normal Ice", km: "ទឹកកកធម្មតា" },
    description: { en: "Normal ice", km: "ទឹកកកធម្មតា" },
    status: 1,
    sort_num: 3,
    array_categories: [],
    array_drinkstypes: [],
  },
  {
    name: { en: "Less Ice", km: "ទឹកកកតិច" },
    description: { en: "Less ice", km: "ទឹកកកតិច" },
    status: 1,
    sort_num: 2,
    array_categories: [],
    array_drinkstypes: [],
  },
  {
    name: { en: "Extra Ice", km: "ទឹកកកច្រើន" },
    description: { en: "Extra ice", km: "ទឹកកកច្រើន" },
    status: 1,
    sort_num: 4,
    array_categories: [],
    array_drinkstypes: [],
  },
    {
    name: { en: "Outside Ice", km: "ទឹកកកក្រៅ" },
    description: { en: "Outside ice", km: "ទឹកកកក្រៅ" },
    status: 1,
    sort_num: 4,
    array_categories: [],
    array_drinkstypes: [],
  },
];

async function runSeeder() {
  const client = await pool.connect();

  try {
    console.log("🌱 Starting ice_level seeding...");

    for (const item of iceLevelSeed) {
      await client.query(
        `INSERT INTO ice_level
          (name, description, status, sort_num,
           array_categories, array_drinkstypes)
         VALUES ($1::jsonb, $2::jsonb, $3, $4, $5, $6)`,
        [
          JSON.stringify(item.name),
          JSON.stringify(item.description),
          item.status,
          item.sort_num,
          item.array_categories,
          item.array_drinkstypes,
        ]
      );

      console.log(`-> Successfully seeded: ${item.name.en}`);
    }

    console.log("✅ ice_level seeding completed!");
  } catch (err) {
    console.error("❌ Error seeding ice_level:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runSeeder();