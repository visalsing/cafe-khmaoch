import React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import ChartCard, { TipBox } from "./ChartCard.jsx";

const COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#f43f5e", "#64748b"];

// the biggest `max - 1` items stay, the rest become one "Other" slice
export function topWithOther(items, max = 5, otherLabel = "Other") {
  const sorted = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  if (sorted.length <= max) return sorted;
  const rest = sorted.slice(max - 1);
  return [...sorted.slice(0, max - 1), { key: "other", label: otherLabel, value: rest.reduce((s, i) => s + i.value, 0), sub: "" }];
}

export default function DonutCard({ title, subtitle, items = [], format = String }) {
  const total = items.reduce((s, i) => s + i.value, 0);

  return (
    <ChartCard title={title} subtitle={subtitle}>
      {total <= 0 ? (
        <div className="flex h-48 flex-col items-center justify-center text-sm text-slate-400">
          <div className="mb-2 text-4xl">☕</div>
          No data in this period
        </div>
      ) : (
        <>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={items} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={42} outerRadius={78} paddingAngle={4} stroke="none">
                  {items.map((item, i) => (
                    <Cell key={item.key ?? item.label} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <TipBox title={payload[0].name}>
                        <p className="text-slate-600 dark:text-slate-300">{format(payload[0].value)}</p>
                      </TipBox>
                    ) : null
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-4 space-y-2.5">
            {items.map((item, i) => (
              <li key={item.key ?? item.label} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="truncate text-sm text-slate-600 dark:text-slate-400" title={item.label}>
                    {item.label}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold text-slate-800 dark:text-white">{Math.round((item.value / total) * 100)}%</span>
                  <span className="block text-[10px] text-slate-400">
                    {format(item.value)}
                    {item.sub ? ` · ${item.sub}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </ChartCard>
  );
}