import React, { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { dual } from "../../utils/currency";
import { compactKHR, dayLabel, formatChange, pctChange } from "../../utils/dashboardFormat";
import ChartCard, { TipBox } from "./ChartCard.jsx";

function Tip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null;
  const pos = Number(payload.find((p) => p.dataKey === "pos")?.value) || 0;
  const online = Number(payload.find((p) => p.dataKey === "online")?.value) || 0;
  const show = (v) => {
    if (metric !== "sales") return String(v);
    const d = dual(v);
    return `${d.riel} (${d.usd})`;
  };
  return (
    <TipBox title={dayLabel(label)}>
      <p className="text-amber-600">Counter: {show(pos)}</p>
      <p className="text-sky-600">Online: {show(online)}</p>
      <p className="mt-1 border-t border-slate-100 pt-1 font-semibold text-slate-800 dark:border-slate-700 dark:text-white">
        Total: {show(pos + online)}
      </p>
    </TipBox>
  );
}

export default function RevenueChart({ trend = [], totals, range = 7 }) {
  const [metric, setMetric] = useState("sales"); // "sales" | "orders"
  const isSales = metric === "sales";

  const data = useMemo(
    () =>
      trend.map((d) =>
        isSales
          ? { day: d.day, pos: d.posSales, online: d.onlineSales }
          : { day: d.day, pos: d.posOrders, online: d.onlineOrders },
      ),
    [trend, isSales],
  );

  const current = (isSales ? totals?.sales : totals?.orders) || 0;
  const previous = (isSales ? totals?.prevSales : totals?.prevOrders) || 0;
  const change = pctChange(current, previous);
  const up = change === null || change >= 0;
  const empty = data.every((d) => d.pos + d.online === 0);
  const amount = dual(current);

  return (
    <ChartCard
      title="Sales Overview"
      subtitle={
        <span className="inline-flex flex-wrap items-center gap-x-2">
          <span>
            {isSales ? `${amount.riel} ${amount.usd}` : `${current} orders`} in the last {range} days
          </span>
          <span className="inline-flex items-center gap-1">
            {up ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" /> : <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />}
            <span className={`font-semibold ${up ? "text-emerald-500" : "text-red-500"}`}>{formatChange(change)}</span>
            <span className="text-slate-400">vs previous {range} days</span>
          </span>
        </span>
      }
      right={
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-600" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Counter</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-gradient-to-r from-sky-400 to-blue-500" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Online</span>
          </div>
          <div className="flex overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold dark:border-slate-700" role="group" aria-label="Metric">
            {[
              ["sales", "Sales"],
              ["orders", "Orders"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMetric(id)}
                aria-pressed={metric === id}
                className={`px-3 py-1.5 ${metric === id ? "bg-amber-600 text-white" : "text-slate-600 dark:text-slate-300"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {empty ? (
        <div className="flex h-72 flex-col items-center justify-center text-sm text-slate-400">
          <div className="mb-2 text-4xl">☕</div>
          {isSales ? "No paid sales in this period" : "No orders in this period"}
        </div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ea580c" />
                </linearGradient>
                <linearGradient id="revOnline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} vertical={false} />
              <XAxis dataKey="day" tickFormatter={dayLabel} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={56} allowDecimals={false} tickFormatter={isSales ? compactKHR : (v) => v} />
              <Tooltip content={<Tip metric={metric} />} cursor={{ fill: "rgba(245, 158, 11, 0.08)" }} />
              <Bar dataKey="pos" name="Counter" stackId="sales" fill="url(#revPos)" maxBarSize={32} />
              <Bar dataKey="online" name="Online" stackId="sales" fill="url(#revOnline)" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}