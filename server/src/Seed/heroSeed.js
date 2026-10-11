import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' }); // Adjust relative path if running from root vs src/Seed

import { pathToFileURL } from "node:url";
import pkg from 'pg';
const { Pool } = pkg;

console.log("Checking DB URL:", process.env.DATABASE_URL ? "Loaded successfully ✅" : "Still undefined ❌");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export const heroSeed = [
  {
    tag: { en: "Café & Drinks", km: "កាហ្វេ និង ភេសជ្ជៈ" },
    title: { en: "Bean & Blossom ☕", km: "ប៊ីន & ប្លូសូម ☕" },
    text: { en: "Freshly roasted coffee, handcrafted in a cozy corner of the city.", km: "កាហ្វេឆ្ងាញ់ស្រស់ៗ រៀបចំដោយយកចិត្តទុកដាក់។" },
    img: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1600&q=80",
    thumbnail: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=100&q=80",
    cta: { en: "Order Drinks", km: "កុម្ម៉ង់ភេសជ្ជៈ" },
    link: "#shop",
    status: 1,
  },
  {
    tag: { en: "Signature Latte", km: "ឡាតេពិសេស" },
    title: { en: "Sip Something Special", km: "ភ្លក់រសជាតិពិសេស" },
    text: { en: "Silky espresso, steamed milk and house-made caramel in every cup.", km: "អេសប្រេសូដ៏រលោង ជាមួយទឹកដោះគោ និងខារ៉ាមែល។" },
    img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1600&q=80",
    thumbnail: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=100&q=80",
    cta: { en: "View Coffee Menu", km: "មើលមុខទំនិញកាហ្វេ" },
    link: "/shop",
    status: 1,
  },
  {
    tag: { en: "Fresh Bakery", km: "នំខេកស្រស់ៗ" },
    title: { en: "Baked Every Morning", km: "ដុតថ្មីៗរាល់ព្រឹក" },
    text: { en: "Warm croissants and pastries, the perfect partner for your brew.", km: "ក្រូសង់ និងនំផាត់ស្រស់ៗ សម្រាប់ញ៉ាំជាមួយកាហ្វេ។" },
    img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1600&q=80",
    thumbnail: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=100&q=80",
    cta: { en: "See Pastries", km: "មើលនំផ្សេងៗ" },
    link: "/shop",
    status: 1,
  },
  {
    tag: { en: "Visit Us", km: "មកលេងយើងខ្ញុំ" },
    title: { en: "Gather. Relax. Enjoy.", km: "ជួបជុំ សម្រាក ភាពរីករាយ" },
    text: { en: "A cozy place for meetups, study sessions or a quiet afternoon.", km: "កន្លែងដ៏ស្រស់ស្អាតសម្រាប់ជួបជុំ ឬសិក្សា។" },
    img: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1600&q=80",
    thumbnail: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=100&q=80",
    cta: { en: "Find Us", km: "ទីតាំងរបស់យើង" },
    link: "#contact",
    status: 1,
  },
];

export async function seedHero(db = pool, { force = false } = {}) {
  const client = await db.connect();
  try {
    console.log("🌱 Starting NeonDB hero slides seeding...");
    await client.query("BEGIN");

    if (force) {
      await client.query("DELETE FROM hero_slides");
    } else {
      const { rows } = await client.query("SELECT 1 FROM hero_slides LIMIT 1");
      if (rows.length) {
        await client.query("ROLLBACK");
        console.log("ℹ️ hero_slides already has data, nothing to do.");
        return 0;
      }
    }

    for (const [i, s] of heroSeed.entries()) {
      const query = `
        INSERT INTO hero_slides (tag, title, text, img, thumbnail, cta, link, status, sort_num, created_at, updated_at)
        VALUES ($1::jsonb, $2::jsonb, $3::jsonb, $4, $5, $6::jsonb, $7, $8, $9, now(), now())
      `;

      await client.query(query, [
        JSON.stringify(s.tag),
        JSON.stringify(s.title),
        JSON.stringify(s.text),
        s.img,
        s.thumbnail,
        JSON.stringify(s.cta),
        s.link,
        s.status,
        i
      ]);

      console.log(`-> Successfully seeded hero slide: (${s.title.en})`);
    }

    await client.query("COMMIT");
    console.log(`✅ Successfully seeded ${heroSeed.length} hero slides into NeonDB!`);
    return heroSeed.length;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error seeding hero slides:", err);
    throw err;
  } finally {
    client.release();
  }
}

// Run directly from root: node --env-file=.env src/Seed/heroSeed.js
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedHero(pool)
    .catch((e) => { process.exitCode = 1; })
    .finally(() => pool.end());
}