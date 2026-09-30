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