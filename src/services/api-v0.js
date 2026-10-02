import { products as seedProducts } from "../components/Data/menuData";

const MENU_KEY = "bb_menu_v1";
const ORDERS_KEY = "bb_orders_v1";
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
    write(MENU_KEY, loadMenu().filter((i) => i.id !== id));
    return true;
  },

  async reset() {
    await wait();
    localStorage.removeItem(MENU_KEY);
    return loadMenu();
  },
};

export const orderService = {
  async list() {
    await wait();
    return read(ORDERS_KEY, []); // newest first
  },

  async create(data) {
    await wait();
    const orders = read(ORDERS_KEY, []);
    const order = {
      source: "pos", // later: "online" for storefront orders
      // status: "paid",
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

// Hero
const HERO_KEY = "bb_hero_v1";

const SEED_HERO = [
  { id: 1, visible: true, tag: "Café & Drinks", title: "Bean & Blossom ☕",
    text: "Freshly roasted coffee, handcrafted in a cozy corner of the city.",
    img: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1600&q=80",
    cta: "Order Drinks", link: "#shop" },
  { id: 2, visible: true, tag: "Signature Latte", title: "Sip Something Special",
    text: "Silky espresso, steamed milk and house-made caramel in every cup.",
    img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1600&q=80",
    cta: "View Coffee Menu", link: "/shop" },
  { id: 3, visible: true, tag: "Fresh Bakery", title: "Baked Every Morning",
    text: "Warm croissants and pastries, the perfect partner for your brew.",
    img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1600&q=80",
    cta: "See Pastries", link: "/shop" },
  { id: 4, visible: true, tag: "Visit Us", title: "Gather. Relax. Enjoy.",
    text: "A cozy place for meetups, study sessions or a quiet afternoon.",
    img: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1600&q=80",
    cta: "Find Us", link: "#contact" },
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
    write(HERO_KEY, loadHero().filter((s) => s.id !== id));
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

// Authentication

import { DEFAULT_ACCESS } from "../utils/access"; // put this with your other imports at the top of the file

const USERS_KEY = "bb_users_v1";
const ACCESS_KEY = "bb_access_v1";
const DAY = 86400000;

const seedUsers = () => {
  const now = Date.now();
  const mk = (id, firstName, lastName, email, phone, role, status, daysOld) => ({
    id, firstName, lastName, email, phone, role, status,
    avatar: "", lastLoginAt: null,
    createdAt: new Date(now - daysOld * DAY).toISOString(),
  });
  return [
    mk(1, "Visalsing", "Admin", "admin@bean-blossom.test", "+1 555 010 0001", "admin", "active", 90),
    mk(2, "Sophea", "Chan", "sophea@bean-blossom.test", "+1 555 010 0002", "staff", "active", 40),
    mk(3, "Dara", "Kim", "dara@bean-blossom.test", "+1 555 010 0003", "staff", "active", 25),
    mk(4, "Maly", "Sok", "maly@bean-blossom.test", "+1 555 010 0004", "customer", "active", 10),
    mk(5, "Alex", "Tan", "alex@bean-blossom.test", "+1 555 010 0005", "customer", "blocked", 5),
  ];
};

const loadUsers = () => {
  const saved = read(USERS_KEY, null);
  if (saved) return saved;
  const seeded = seedUsers();
  write(USERS_KEY, seeded);
  return seeded;
};

const activeAdmins = (list) => list.filter((u) => u.role === "admin" && u.status === "active");
const emailTaken = (list, email, exceptId) =>
  list.some((u) => u.id !== exceptId && u.email.toLowerCase() === String(email).trim().toLowerCase());

export const userService = {
  async list() {
    await wait();
    return loadUsers();
  },

  async create(data) {
    await wait();
    const users = loadUsers();
    if (emailTaken(users, data.email)) throw new Error("That email is already used by another user.");
    const user = {
      role: "customer", status: "active", avatar: "", phone: "", lastLoginAt: null,
      ...data,
      email: data.email.trim(),
      id: Date.now(),
      createdAt: new Date().toISOString(),
    };
    write(USERS_KEY, [user, ...users]);
    return user;
  },

  async update(id, changes) {
    await wait();
    const users = loadUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error("User not found.");
    const current = users[idx];
    const next = { ...current, ...changes, id };
    if (changes.email && emailTaken(users, changes.email, id)) throw new Error("That email is already used by another user.");
    const losesAdmin = current.role === "admin" && current.status === "active" && !(next.role === "admin" && next.status === "active");
    if (losesAdmin && activeAdmins(users).length <= 1) throw new Error("There must be at least one active admin.");
    users[idx] = next;
    write(USERS_KEY, users);
    return next;
  },

  async remove(id) {
    await wait();
    const users = loadUsers();
    const target = users.find((u) => u.id === id);
    if (!target) return true;
    if (target.role === "admin" && target.status === "active" && activeAdmins(users).length <= 1)
      throw new Error("There must be at least one active admin.");
    write(USERS_KEY, users.filter((u) => u.id !== id));
    return true;
  },
};

export const accessService = {
  async get() {
    await wait();
    return read(ACCESS_KEY, DEFAULT_ACCESS);
  },
  async save(access) {
    await wait();
    write(ACCESS_KEY, access);
    return access;
  },
  async reset() {
    await wait();
    localStorage.removeItem(ACCESS_KEY);
    return DEFAULT_ACCESS;
  },
};