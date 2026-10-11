import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' }); // <-- Points to server/.env

import pkg from 'pg';
const { Pool } = pkg;

// This will now print your actual NeonDB URL instead of 'undefined'
console.log("Checking DB URL:", process.env.DATABASE_URL ? "Loaded successfully ✅" : "Still undefined ❌");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Often required for NeonDB connections in Node.js
  }
});

const categoriesSeed = [
  {
    name: { en: "Coffee", km: "កាហ្វេ"},
    description: { en: "", km: "" },
    img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93",
    thumbnail: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=100",
    status: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    name: { en: "Tea", km: "តែ" },
    description: { en: "", km: "" },
    img: "https://images.unsplash.com/photo-1576092768241-dec231879fc3",
    thumbnail: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=100",
    status: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    name: { en: "Chocolate", km: "សូកូឡា" },
    description: { en: "", km: "" },
    img: "https://images.unsplash.com/photo-1576092768241-dec231879fc3",
    thumbnail: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=100",
    status: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    name: { en: "Matcha", km: "ម៉ាឆា" },
    description: { en: "", km: "" },
    img: "https://images.unsplash.com/photo-1576092768241-dec231879fc3",
    thumbnail: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=100",
    status: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    name: { en: "soda", km: "សូដា" },
    description: { en: "", km: "" },
    img: "https://images.unsplash.com/photo-1576092768241-dec231879fc3",
    thumbnail: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=100",
    status: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    name: { en: "Ovaltine", km: "អូវ៉ាន់ទីន" },
    description: { en: "", km: "" },
    img: "https://images.unsplash.com/photo-1576092768241-dec231879fc3",
    thumbnail: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=100",
    status: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    name: { en: "Tapae", km: "តាប៉ែ" },
    description: { en: "", km: "" },
    img: "https://images.unsplash.com/photo-1576092768241-dec231879fc3",
    thumbnail: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=100",
    status: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    name: { en: "Black Jelly", km: "ឆៅគួយ" },
    description: { en: "", km: "" },
    img: "https://images.unsplash.com/photo-1576092768241-dec231879fc3",
    thumbnail: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=100",
    status: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    name: { en: "Brown Sugar", km: "ប្រោនស៊ូហ្គ័រ" },
    description: { en: "", km: "" },
    img: "https://images.unsplash.com/photo-1576092768241-dec231879fc3",
    thumbnail: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=100",
    status: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    name: { en: "Fruit", km: "ផ្លែឈើ" },
    description: { en: "", km: "" },
    img: "https://images.unsplash.com/photo-1613478223719-2ab802602423",
    thumbnail: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=100",
    status: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
];

async function runSeeder() {
  const client = await pool.connect();
  try {
    console.log("🌱 Starting NeonDB categories seeding...");

for (const cat of categoriesSeed) {
      const query = `
        INSERT INTO categories (name, description, img, thumbnail, status, "created_at", "updated_at")
        VALUES ($1::jsonb, $2::jsonb, $3, $4, $5, $6, $7)
      `;

      await client.query(query, [
        JSON.stringify(cat.name),
        JSON.stringify(cat.description),
        cat.img,
        cat.thumbnail,
        cat.status,
        cat.created_at,
        cat.updated_at
      ]);

      console.log(`-> Successfully seeded: (${cat.name.en})`);
    }

    console.log("✅ All categories seeded successfully into NeonDB!");
  } catch (err) {
    console.error("❌ Error seeding database:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

runSeeder();

// cd server/src/Seed
// node categoriesSeed.js