import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const coffeeLevelSeed = [
  {
    name: { en: "Less Coffee", km: "កាហ្វេតិច" },
    price: 0,
    description: { en: "Less Coffee", km: "កាហ្វេតិច" },
    status: 1,
    sort_num: 1,
    array_categories: [],
    array_drinkstypes: [],
  },
  {
    name: { en: "Normal Coffee", km: "កាហ្វេធម្មតា" },
    price: 0,
    description: { en: "Normal Coffee", km: "កាហ្វេធម្មតា" },
    status: 1,
    sort_num: 2,
    array_categories: [],
    array_drinkstypes: [],
  },
  {
    name: { en: "More Coffee", km: "បន្ថែមកាហ្វេ" },
    price: 0.50,
    description: { en: "ັAdd more 1 shot of coffee (extra shot)", km: "បន្ថែមកាហ្វេ១ស្ហតទៀត​ (extra shot)" },
    status: 1,
    sort_num: 2,
    array_categories: [],
    array_drinkstypes: [],
  },
];

async function runSeeder() {
  const client = await pool.connect();

  try {
    console.log("🌱 Starting coffee_level seeding...");

    for (const item of coffeeLevelSeed) {
      await client.query(
        `INSERT INTO coffee_level
          (name, price, description, status, sort_num,
           array_categories, array_drinkstypes)
         VALUES ($1::jsonb, $2, $3::jsonb, $4, $5, $6, $7)`,
        [
          JSON.stringify(item.name),
          item.price,
          JSON.stringify(item.description),
          item.status,
          item.sort_num,
          item.array_categories,
          item.array_drinkstypes,
        ]
      );

      console.log(`-> Successfully seeded: ${item.name.en}`);
    }

    console.log("✅ coffee_level seeding completed!");
  } catch (err) {
    console.error("❌ Error seeding coffee_level:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runSeeder();