import { products as seedProducts } from "../components/Data/menuData";

// Automatically use Vercel's environment variable online, or fallback to local proxy
const API_BASE = import.meta.env.VITE_API_URL || "";

/* =========================================================
   Shared helpers (localStorage: menu, orders, hero)
   ========================================================= */
const MENU_KEY = "bb_menu_v1";
const ORDERS_KEY = "bb_orders_v1";
const HERO_KEY = "bb_hero_v1";
const DEFAULT_IMG =
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80";

const wait = (ms = 120) => new Promise((r) => setTimeout(r, ms)); // fake network delay

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const toNumber = (v) => Number(String(v).replace(/[^0-9.]/g, "")) || 0;

/* =========================================================
   MENU (still localStorage for now)
   ========================================================= */
const loadMenu = () => {
  const saved = read(MENU_KEY, null);
  if (saved) return saved;
  const seeded = seedProducts.map((p) => ({
    ...p,
    price: toNumber(p.price), // "$4.50" -> 4.5
    available: true,
  }));
  write(MENU_KEY, seeded);
  return seeded;
};

export const menuService = {
  async list() {
    await wait();
    return loadMenu();
  },

  async create(data) {
    await wait();
    const items = loadMenu();
    const item = {
      rating: 0,
      reviews: 0,
      badge: "New",
      available: true,
      ...data,
      img: data.img || DEFAULT_IMG,
      price: Number(data.price),
      id: Date.now(),
    };
    write(MENU_KEY, [item, ...items]);
    return item;
  },

  async update(id, changes) {
    await wait();
    const items = loadMenu();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error("Item not found");
    const updated = {
      ...items[idx],
      ...changes,
      id,
      img: changes.img || items[idx].img || DEFAULT_IMG,
      price: Number(changes.price ?? items[idx].price),
    };
    items[idx] = updated;
    write(MENU_KEY, items);
    return updated;
  },

  async remove(id) {
    await wait();
    write(
      MENU_KEY,
      loadMenu().filter((i) => i.id !== id),
    );
    return true;
  },

  async reset() {
    await wait();
    localStorage.removeItem(MENU_KEY);
    return loadMenu();
  },
};

/* =========================================================
   ORDERS (still localStorage for now)
   ========================================================= */
export const orderService = {
  async list() {
    await wait();
    return read(ORDERS_KEY, []); // newest first
  },

  async create(data) {
    await wait();
    const orders = read(ORDERS_KEY, []);
    const order = {
      source: "pos", // "online" for storefront orders
      status: "completed",
      ...data,
      id: Date.now(),
      number: `BB-${String(orders.length + 1).padStart(4, "0")}`,
      createdAt: new Date().toISOString(),
    };
    write(ORDERS_KEY, [order, ...orders]);
    return order;
  },

  async updateStatus(id, status) {
    await wait();
    const orders = read(ORDERS_KEY, []);
    const idx = orders.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error("Order not found");
    orders[idx] = { ...orders[idx], status };
    write(ORDERS_KEY, orders);
    return orders[idx];
  },
};

/* =========================================================
   HERO (still localStorage for now)
   ========================================================= */
const SEED_HERO = [
  {
    id: 1,
    visible: true,
    tag: "Café & Drinks",
    title: "Bean & Blossom ☕",
    text: "Freshly roasted coffee, handcrafted in a cozy corner of the city.",
    img: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1600&q=80",
    cta: "Order Drinks",
    link: "#shop",
  },
  {
    id: 2,
    visible: true,
    tag: "Signature Latte",
    title: "Sip Something Special",
    text: "Silky espresso, steamed milk and house-made caramel in every cup.",
    img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1600&q=80",
    cta: "View Coffee Menu",
    link: "/shop",
  },
  {
    id: 3,
    visible: true,
    tag: "Fresh Bakery",
    title: "Baked Every Morning",
    text: "Warm croissants and pastries, the perfect partner for your brew.",
    img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1600&q=80",
    cta: "See Pastries",
    link: "/shop",
  },
  {
    id: 4,
    visible: true,
    tag: "Visit Us",
    title: "Gather. Relax. Enjoy.",
    text: "A cozy place for meetups, study sessions or a quiet afternoon.",
    img: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1600&q=80",
    cta: "Find Us",
    link: "#contact",
  },
];

const loadHero = () => {
  const saved = read(HERO_KEY, null);
  if (saved) return saved;
  write(HERO_KEY, SEED_HERO);
  return SEED_HERO;
};

export const heroService = {
  async list() {
    await wait();
    return loadHero();
  },
  async create(data) {
    await wait();
    const slide = { visible: true, ...data, id: Date.now() };
    write(HERO_KEY, [...loadHero(), slide]);
    return slide;
  },
  async update(id, changes) {
    await wait();
    const slides = loadHero();
    const idx = slides.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error("Slide not found");
    slides[idx] = { ...slides[idx], ...changes, id };
    write(HERO_KEY, slides);
    return slides[idx];
  },
  async remove(id) {
    await wait();
    write(
      HERO_KEY,
      loadHero().filter((s) => s.id !== id),
    );
    return true;
  },
  async reorder(ids) {
    await wait();
    const map = new Map(loadHero().map((s) => [s.id, s]));
    const next = ids.map((id) => map.get(id)).filter(Boolean);
    write(HERO_KEY, next);
    return next;
  },
  async reset() {
    await wait();
    localStorage.removeItem(HERO_KEY);
    return loadHero();
  },
};

/* =========================================================
   BACKEND API (Express + Neon PostgreSQL)
   Auth, users, roles & permissions
   ========================================================= */
// async function http(path, { method = "GET", body } = {}) {
//   const res = await fetch(`/api${path}`, {
//     method,
//     credentials: "include", // sends the login cookie
//     headers: body ? { "Content-Type": "application/json" } : undefined,
//     body: body ? JSON.stringify(body) : undefined,
//   });
//   const data = await res.json().catch(() => ({}));
//   if (!res.ok) {
//     const err = new Error(data.error || "Request failed.");
//     err.status = res.status;
//     throw err;
//   }
//   return data;
// }

async function http(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method,
      credentials: "include", // sends the login cookie
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const err = new Error("Cannot reach the server. Please try again.");
    err.status = 0;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (HTTP ${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const authService = {
  login: (email, password) =>
    http("/auth/login", { method: "POST", body: { email, password } }),
  register: (data) => http("/auth/register", { method: "POST", body: data }),
  logout: () => http("/auth/logout", { method: "POST" }),
  me: () => http("/auth/me"),
};

export const userService = {
  list: () => http("/users"),
  create: (data) => http("/users", { method: "POST", body: data }),
  update: (id, changes) =>
    http(`/users/${id}`, { method: "PUT", body: changes }),
  remove: (id) => http(`/users/${id}`, { method: "DELETE" }),
};

export const accessService = {
  get: () => http("/access"),
  saveStaff: (permissions) =>
    http("/access/staff", { method: "PUT", body: { permissions } }),
  reset: () => http("/access/staff/reset", { method: "POST" }),
};
