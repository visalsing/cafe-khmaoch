import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

import pkg from "pg";
const { Pool } = pkg;

console.log(
  "Checking DB URL:",
  process.env.DATABASE_URL ? "Loaded successfully ✅" : "Still undefined ❌"
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const levelsOptionsSeed = [
  {
    id: 1,
    name: { en: "Sugar Level", km: "កម្រិតស្ករ" },
    description: {
      en: "Choose the sugar level",
      km: "ជ្រើសរើសកម្រិតស្ករ",
    },
    status: 1,
    sort_num: 1,
    array_categories: [],
    array_drinkstypes: [],
  },
  {
    id: 2,
    name: { en: "Ice Level", km: "កម្រិតទឹកកក" },
    description: {
      en: "Choose the ice level",
      km: "ជ្រើសរើសកម្រិតទឹកកក",
    },
    status: 1,
    sort_num: 2,
    array_categories: [],
    array_drinkstypes: [],
  },
  {
    id: 3,
    name: { en: "Coffee Level", km: "កម្រិតកាហ្វេ" },
    description: {
      en: "Choose the coffee level",
      km: "ជ្រើសរើសកម្រិតកាហ្វេ",
    },
    status: 1,
    sort_num: 3,
    array_categories: [],
    array_drinkstypes: [],
  },
];

async function runSeeder() {
  const client = await pool.connect();

  try {
    console.log("🌱 Starting levels_options seeding...");

    for (const item of levelsOptionsSeed) {
      const query = `
        INSERT INTO levels_options (
          id, name, description, status, sort_num,
          array_categories, array_drinkstypes
        )
        VALUES ($1, $2::jsonb, $3::jsonb, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `;

      await client.query(query, [
        item.id,
        JSON.stringify(item.name),
        JSON.stringify(item.description),
        item.status,
        item.sort_num,
        item.array_categories,
        item.array_drinkstypes,
      ]);

      console.log(`-> Successfully checked: ${item.name.en}`);
    }

    await client.query(`
      SELECT setval(
        pg_get_serial_sequence('levels_options', 'id'),
        COALESCE((SELECT MAX(id) FROM levels_options), 1),
        EXISTS (SELECT 1 FROM levels_options)
      )
    `);

    console.log("✅ levels_options seeding completed!");
  } catch (err) {
    console.error("❌ Error seeding levels_options:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runSeeder();