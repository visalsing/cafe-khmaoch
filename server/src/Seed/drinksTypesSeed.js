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

const drinksTypesSeed = [
  {
    name: { en: "Iced", km: "ទឹកកក" },
    description: { en: "Cold drinks served with ice", km: "ភេសជ្ជะត្រជាក់ជាមួយទឹកកក" },
    img: "https://images.unsplash.com/photo-1517701604599-bb29b565090c",
    thumbnail: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=100",
    status: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    name: { en: "Hot", km: "ក្តៅ" },
    description: { en: "Warm and hot beverages", km: "ភេសជ្ជៈក្តៅៗ" },
    img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93",
    thumbnail: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=100",
    status: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    name: { en: "Frappé/Smoothie", km: "ក្រឡុក" },
    description: { en: "Blended ice drinks and fruit smoothies", km: "ភេសជ្ជៈปั่นនិងស្មូឌីផ្លែឈើ" },
    img: "https://images.unsplash.com/photo-1553530666-ba11a7da3888",
    thumbnail: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=100",
    status: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    name: { en: "Cream", km: "គ្រីម" },
    description: { en: "Drinks topped with rich cream layer", km: "ភេសជ្ជៈលាយស្រទាប់គ្រីមឆ្ងាញ់" },
    img: "https://images.unsplash.com/photo-1541658016709-82535e94bc69",
    thumbnail: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=100",
    status: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    name: { en: "Soda & Lemon/Lime", km: "សូដានិងក្រូចឆ្មារ" },
    description: { en: "Refreshing carbonated and citrus drinks", km: "ភេសជ្ជៈសូដានិងក្រូចឆ្មារស្រស់ស្រាយ" },
    img: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd",
    thumbnail: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=100",
    status: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    name: { en: "Fragrant Coconut", km: "ដូងក្រអូប" },
    description: { en: "Fresh coconut-based beverages", km: "ភេសជ្ជៈទឹកដូងក្រអូបធម្មជាតិ" },
    img: "https://images.unsplash.com/photo-1525385133512-2f3bdd039a54",
    thumbnail: "https://images.unsplash.com/photo-1525385133512-2f3bdd039a54?w=100",
    status: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

async function runSeeder() {
  const client = await pool.connect();
  try {
    console.log("🌱 Starting NeonDB drinks_type seeding...");

    for (const cat of drinksTypesSeed) {
      const query = `
        INSERT INTO drinks_type (name, description, img, thumbnail, status, "created_at", "updated_at")
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

    console.log("✅ All drinks types seeded successfully into NeonDB!");
  } catch (err) {
    console.error("❌ Error seeding database:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

runSeeder();