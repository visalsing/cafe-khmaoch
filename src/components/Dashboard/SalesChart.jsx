import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { money, round2 } from "../../utils/orderCalc";
import { activeOrders } from "./dashboardUtils";

const COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#f43f5e", "#64748b"];

function SalesChart({ orders = [], menuItems = [] }) {
  const data = useMemo(() => {
    const categoryById = Object.fromEntries(menuItems.map((m) => [m.id, m.category]));
    const map = {};
    activeOrders(orders).forEach((o) =>
      o.items.forEach((i) => {
        const cat = categoryById[i.id] || "Other"; // deleted menu items fall into "Other"
        map[cat] = round2((map[cat] || 0) + i.price * i.qty);
      })
    );
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    return entries.map(([name, value], i) => ({
      name,
      value,
      percent: total ? Math.round((value / total) * 100) : 0,
      color: COLORS[i % COLORS.length],
    }));
  }, [orders, menuItems]);

  return (
    <div className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Sales by Category</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Share of revenue</p>
      </div>

      {data.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-sm">
          <div className="text-4xl mb-2">☕</div>
          No sales yet
        </div>
      ) : (
        <>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={5} dataKey="value">
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
                  }}
                  formatter={(v) => money(v)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3 mt-4">
            {data.map((item) => (
              <div className="flex items-center justify-between" key={item.name}>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-slate-600 dark:text-slate-400">{item.name}</span>
                </div>
                <div className="text-sm font-semibold text-slate-800 dark:text-white">{item.percent}%</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default SalesChart;