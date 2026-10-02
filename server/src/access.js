import { query } from "./db.js";

export const ALL_KEYS = ["dashboard", "pos", "orders", "menu", "reports", "pages", "users", "roles"];
export const ADMIN_ONLY = ["roles"]; // can never be given to staff
export const DEFAULT_STAFF = ["dashboard", "pos", "orders"];

export async function staffPermissions() {
  const { rows } = await query("SELECT permission FROM role_permissions WHERE role = 'staff'");
  return rows.map((r) => r.permission).filter((k) => ALL_KEYS.includes(k) && !ADMIN_ONLY.includes(k));
}

export async function permissionsFor(role) {
  if (role === "admin") return ALL_KEYS;
  if (role === "staff") return staffPermissions();
  return []; // customers never enter the dashboard
}

export async function accessMatrix() {
  return { admin: ALL_KEYS, staff: await staffPermissions(), customer: [] };
}