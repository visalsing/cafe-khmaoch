import { useEffect, useState } from "react";
import { EXCHANGE_RATE, formatKHR, formatUSD } from "./currency";

export const khr = formatKHR;
export const usdText = (value) => `≈ ${formatUSD((Number(value) || 0) / EXCHANGE_RATE)}`;

const oneDecimal = (x) => String(Math.round(x * 10) / 10);

// short money for chart axes: 1.2M៛ / 350K៛ / 900៛
export function compactKHR(value) {
  const n = Math.abs(Number(value) || 0);
  if (n >= 1e6) return `${oneDecimal(n / 1e6)}M៛`;
  if (n >= 1e3) return `${oneDecimal(n / 1e3)}K៛`;
  return `${Math.round(n)}៛`;
}

// null = nothing to compare with ("New")
export function pctChange(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (p === 0) return c === 0 ? 0 : null;
  return Math.round(((c - p) / p) * 100);
}
export const formatChange = (change) => (change === null ? "New" : `${change > 0 ? "+" : ""}${change}%`);

export const PAYMENT_LABEL = { cash: "Cash", card: "Card", qr: "QR", other: "Other" };
export const TYPE_LABEL = { "dine-in": "Dine-in", pickup: "Takeaway", delivery: "Delivery" };
export const SIZE_LABEL = { price: "Regular", big: "Big", small: "Small" };
export const STATUS_LABEL = {
  pending: "Received",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};
export const STATUS_STYLE = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  preparing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  ready: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

// "Iced Latte (Big, 50%, Extra shot)": names come from the database in every language, `tr` picks one
export function itemLabel(item, tr) {
  const name = tr(item.productName) || item.productTitle || item.title || "";
  const opt = item.options || {};
  const bits = [opt.size ? SIZE_LABEL[item.size] : null, tr(opt.sugar), tr(opt.ice), tr(opt.coffee)].filter(Boolean);
  return bits.length ? `${name} (${bits.join(", ")})` : name;
}

export function itemsSummary(items = [], tr) {
  if (!items.length) return "-";
  const first = `${items[0].qty} × ${itemLabel(items[0], tr)}`;
  return items.length > 1 ? `${first} +${items.length - 1} more` : first;
}

export const personName = (first, last) => [first, last].filter(Boolean).join(" ");

export const minutesSince = (value, now = Date.now()) =>
  Math.max(0, Math.floor((now - new Date(value).getTime()) / 60000));

export function timeAgo(value, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - new Date(value).getTime()) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export function durationText(startedAt, endedAt, now = Date.now()) {
  const end = endedAt ? new Date(endedAt).getTime() : now;
  const minutes = Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

// "2026-10-29" -> "Oct 29" (built from the parts, so the time zone can never shift the day)
export function dayLabel(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
export const hourLabel = (h) => `${String(h).padStart(2, "0")}:00`;

// re-renders every `ms`, so "waiting 12 min" keeps counting
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}