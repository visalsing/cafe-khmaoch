// import { products as seedProducts } from "../components/Data/menuData";

// If VITE_API_URL is NOT set, API_BASE is "" and requests go to "/api/..."
// on the same domain (Vite proxy locally, vercel.json rewrite online).
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

/* =========================================================
   Shared helpers (localStorage: menu, orders)
   ========================================================= */
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
   BACKEND API (Express + Neon PostgreSQL)
   Auth, users, roles & permissions
   ========================================================= */

async function http(path, { method = "GET", body } = {}) {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  let res;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method,
      credentials: "include",
      headers: body && !isForm ? { "Content-Type": "application/json" } : undefined,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
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

// "/api/uploads/images/x.webp" -> full URL (also works when the API is on another domain)
export const assetUrl = (p) => (p && p.startsWith("/") ? `${API_BASE}${p}` : p || "");

export const categoryService = {
  list: () => http("/categories"),
  create: (formData) => http("/categories", { method: "POST", body: formData }),
  update: (id, formData) => http(`/categories/${id}`, { method: "PUT", body: formData }),
  remove: (id) => http(`/categories/${id}`, { method: "DELETE" }),
};

export const drinksTypesService = {
  list: () => http("/drinks-types"),
  create: (formData) => http("/drinks-types", { method: "POST", body: formData }),
  update: (id, formData) => http(`/drinks-types/${id}`, { method: "PUT", body: formData }),
  remove: (id) => http(`/drinks-types/${id}`, { method: "DELETE" }),
};

export const productService = {
  list: () => http("/products"),
  create: (formData) => http("/products", { method: "POST", body: formData }),
  update: (id, formData) => http(`/products/${id}`, { method: "PUT", body: formData }),
  setStatus: (id, status) => http(`/products/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id) => http(`/products/${id}`, { method: "DELETE" }),
};

/* =========================================================
   CUSTOMIZATION LEVEL SERVICES (Sugar, Ice, Coffee, Options)
   ========================================================= */

export const sugarLevelService = {
  list: () => http("/sugar-levels"),
  create: (formData) => http("/sugar-levels", { method: "POST", body: formData }),
  update: (id, formData) => http(`/sugar-levels/${id}`, { method: "PUT", body: formData }),
  setStatus: (id, status) => http(`/sugar-levels/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id) => http(`/sugar-levels/${id}`, { method: "DELETE" }),
};

export const iceLevelService = {
  list: () => http("/ice-levels"),
  create: (formData) => http("/ice-levels", { method: "POST", body: formData }),
  update: (id, formData) => http(`/ice-levels/${id}`, { method: "PUT", body: formData }),
  setStatus: (id, status) => http(`/ice-levels/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id) => http(`/ice-levels/${id}`, { method: "DELETE" }),
};

export const coffeeLevelService = {
  list: () => http("/coffee-levels"),
  create: (formData) => http("/coffee-levels", { method: "POST", body: formData }),
  update: (id, formData) => http(`/coffee-levels/${id}`, { method: "PUT", body: formData }),
  setStatus: (id, status) => http(`/coffee-levels/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id) => http(`/coffee-levels/${id}`, { method: "DELETE" }),
};

export const levelsOptionsService = {
  list: () => http("/levels-options"),
  create: (formData) => http("/levels-options", { method: "POST", body: formData }),
  update: (id, formData) => http(`/levels-options/${id}`, { method: "PUT", body: formData }),
  setStatus: (id, status) => http(`/levels-options/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id) => http(`/levels-options/${id}`, { method: "DELETE" }),
};

export const heroService = {
  // staff with the "pages" permission also receive hidden slides; everyone else only gets the visible ones
  list: () => http("/hero?all=1"),
  create: (formData) => http("/hero", { method: "POST", body: formData }),
  update: (id, formData) => http(`/hero/${id}`, { method: "PUT", body: formData }),
  setStatus: (id, status) => http(`/hero/${id}/status`, { method: "PATCH", body: { status } }),
  reorder: (ids) => http("/hero/reorder", { method: "PUT", body: { ids } }),
  reset: () => http("/hero/reset", { method: "POST" }),
  remove: (id) => http(`/hero/${id}`, { method: "DELETE" }),
};

export const mapService = {
  // dashboard: every map with full { en, km } texts (needs login)
  list: () => http("/maps?raw=1"),
  // storefront: visible maps, already translated to one language (public)
  listPublic: (lang = "en") => http(`/maps?lang=${lang}`),
  create: (formData) => http("/maps", { method: "POST", body: formData }),
  update: (id, formData) => http(`/maps/${id}`, { method: "PUT", body: formData }),
  setStatus: (id, status) => http(`/maps/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id) => http(`/maps/${id}`, { method: "DELETE" }),
};