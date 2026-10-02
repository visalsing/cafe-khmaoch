import { round2 } from "../../utils/orderCalc";

export const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
export const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};
export const isOnDay = (iso, day) => startOfDay(iso).getTime() === startOfDay(day).getTime();
export const dayKey = (d) => new Date(d).toLocaleDateString("en-CA"); // YYYY-MM-DD (local time)

export const activeOrders = (orders) => orders.filter((o) => o.status !== "cancelled");
export const sumTotal = (orders) => round2(orders.reduce((s, o) => s + o.total, 0));

// null = no data to compare with (shown as "New")
export const pctChange = (now, before) => {
  if (!before) return now ? null : 0;
  return Math.round(((now - before) / before) * 100);
};
export const formatChange = (c) => (c === null ? "New" : `${c > 0 ? "+" : ""}${c}%`);

export const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m > 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
};

export const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  preparing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ready: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};