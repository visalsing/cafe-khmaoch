import { pathToFileURL } from "node:url";
import { pool } from "../db.js";

// The 4 default slides (English only: add the other languages from the dashboard).
export const heroSeed = [
  {
    tag: { en: "Café & Drinks" },
    title: { en: "Bean & Blossom ☕" },
    text: { en: "Freshly roasted coffee, handcrafted in a cozy corner of the city." },
    img: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1600&q=80",
    cta: { en: "Order Drinks" },
    link: "#shop",
  },
  {
    tag: { en: "Signature Latte" },
    title: { en: "Sip Something Special" },
    text: { en: "Silky espresso, steamed milk and house-made caramel in every cup." },
    img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1600&q=80",
    cta: { en: "View Coffee Menu" },
    link: "/shop",
  },
  {
    tag: { en: "Fresh Bakery" },
    title: { en: "Baked Every Morning" },
    text: { en: "Warm croissants and pastries, the perfect partner for your brew." },
    img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1600&q=80",
    cta: { en: "See Pastries" },
    link: "/shop",
  },
  {
    tag: { en: "Visit Us" },
    title: { en: "Gather. Relax. Enjoy." },
    text: { en: "A cozy place for meetups, study sessions or a quiet afternoon." },
    img: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1600&q=80",
    cta: { en: "Find Us" },
    link: "#contact",
  },
];

/**
 * Inserts the default slides.
 *  - force=false: only when the table is empty (safe to call on every start)
 *  - force=true : deletes ALL slides first (used by the dashboard "Reset" button)
 * Returns how many slides were inserted.
 */
export async function seedHero(db = pool, { force = false } = {}) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    if (force) {
      await client.query("DELETE FROM hero_slides");
    } else {
      const { rows } = await client.query("SELECT 1 FROM hero_slides LIMIT 1");
      if (rows.length) {
        await client.query("ROLLBACK");
        return 0;
      }
    }

    for (const [i, s] of heroSeedData.entries()) {
      await client.query(
        `INSERT INTO hero_slides (tag, title, text, img, cta, link, status, sort_num)
         VALUES ($1::jsonb, $2::jsonb, $3::jsonb, $4, $5::jsonb, $6, 1, $7)`,
        [JSON.stringify(s.tag), JSON.stringify(s.title), JSON.stringify(s.text), s.img, JSON.stringify(s.cta), s.link, i]
      );
    }

    await client.query("COMMIT");
    return heroSeedData.length;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Run directly:  node src/Seed/heroSeed.js
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedHero(pool)
    .then((n) => console.log(n ? `Seeded ${n} hero slides.` : "hero_slides already has data, nothing to do."))
    .catch((e) => { console.error(e); process.exitCode = 1; })
    .finally(() => pool.end());
}