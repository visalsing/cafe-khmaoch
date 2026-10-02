import React, { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { orderService } from "../../services/api";

const money = (n) => `$${Number(n).toFixed(2)}`;
const round2 = (n) => Math.round(n * 100) / 100;
const dayKey = (d) => d.toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
const COLORS = ["#d97706", "#0ea5e9", "#10b981", "#8b5cf6", "#f43f5e"];

const RANGES = [
  { id: "today", label: "Today", days: 1 },
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "all", label: "All time", days: null },
];

export default function Reports() {
  const [orders, setOrders] = useState([]);
  const [rangeId, setRangeId] = useState("7d");
  const range = RANGES.find((r) => r.id === rangeId);

  useEffect(() => {
    orderService.list().then(setOrders);
  }, []);

  const filtered = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (range.days) start.setDate(start.getDate() - (range.days - 1));
    return orders.filter(
      (o) => o.status !== "cancelled" && (!range.days || new Date(o.createdAt) >= start)
    );
  }, [orders, range]);

  const revenue = round2(filtered.reduce((s, o) => s + o.total, 0));
  const itemsSold = filtered.reduce((s, o) => s + o.items.reduce((n, i) => n + i.qty, 0), 0);
  const avgOrder = filtered.length ? round2(revenue / filtered.length) : 0;

  const byDay = useMemo(() => {
    const map = {};
    if (range.days) {
      for (let i = range.days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        map[dayKey(d)] = 0; // show days with no sales as zero
      }
    }
    filtered.forEach((o) => {
      const k = dayKey(new Date(o.createdAt));
      map[k] = round2((map[k] || 0) + o.total);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, sales]) => ({ date: date.slice(5), sales }));
  }, [filtered, range]);

  const byPayment = useMemo(() => {
    const map = {};
    filtered.forEach((o) => (map[o.paymentMethod] = round2((map[o.paymentMethod] || 0) + o.total)));
    return Object.entries(map).map(([name, value]) => ({ name: name.toUpperCase(), value }));
  }, [filtered]);

  const bySource = useMemo(() => {
    const map = {};
    filtered.forEach((o) => (map[o.source] = (map[o.source] || 0) + 1));
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const topItems = useMemo(() => {
    const map = {};
    filtered.forEach((o) =>
      o.items.forEach((i) => {
        map[i.title] = map[i.title] || { title: i.title, qty: 0, revenue: 0 };
        map[i.title].qty += i.qty;
        map[i.title].revenue = round2(map[i.title].revenue + i.qty * i.price);
      })
    );
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [filtered]);

  const exportCsv = () => {
    const rows = [
      ["Order", "Date", "Source", "Type", "Payment", "Status", "Subtotal", "Discount", "Tax", "Total"],
      ...filtered.map((o) => [
        o.number, new Date(o.createdAt).toLocaleString(), o.source, o.orderType, o.paymentMethod,
        o.status, o.subtotal, o.discount, o.tax, o.total,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${rangeId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const card = "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <h1 className="text-2xl font-extrabold">Sales Reports</h1>
        <div className="flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRangeId(r.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl ${
                rangeId === r.id ? "bg-amber-600 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {r.label}
            </button>
          ))}
          <button onClick={exportCsv} disabled={!filtered.length} className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 disabled:opacity-40">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["Revenue", money(revenue)],
          ["Orders", filtered.length],
          ["Avg. order", money(avgOrder)],
          ["Items sold", itemsSold],
        ].map(([label, value]) => (
          <div key={label} className={card}>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{value}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={`${card} text-center py-16 text-slate-500`}>
          <div className="text-5xl mb-2">📊</div>
          <p>No orders in this period. Make a sale in the POS or place an online order to see data here.</p>
        </div>
      ) : (
        <>
          <div className={card}>
            <h3 className="font-bold mb-4">Sales by day</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDay}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v) => money(v)} />
                  <Bar dataKey="sales" fill="#d97706" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={card}>
              <h3 className="font-bold mb-4">Payment methods</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byPayment} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                      {byPayment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => money(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={card}>
              <h3 className="font-bold mb-4">Orders by source</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={bySource} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                      {bySource.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={card}>
              <h3 className="font-bold mb-4">Top items</h3>
              <ul className="space-y-3 text-sm">
                {topItems.map((t, i) => (
                  <li key={t.title} className="flex items-center justify-between gap-3">
                    <span className="truncate">{i + 1}. {t.title}</span>
                    <span className="text-right shrink-0">
                      <span className="font-bold">{t.qty}</span>
                      <span className="text-slate-500"> sold · {money(t.revenue)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}