import React, { useMemo, useState } from "react";
import { BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Bar } from "recharts";
import { money, round2 } from "../../utils/orderCalc";
import { activeOrders, dayKey, daysAgo, sumTotal } from "./dashboardUtils";

function RevenueChart({ orders = [] }) {
  const [hoveredBar, setHoveredBar] = useState(null);
  const [range, setRange] = useState("7d");

  const data = useMemo(() => {
    const days = range === "7d" ? 7 : 30;
    const map = {};
    for (let i = days - 1; i >= 0; i--) map[dayKey(daysAgo(i))] = { pos: 0, online: 0 };

    activeOrders(orders).forEach((o) => {
      const k = dayKey(o.createdAt);
      if (!map[k]) return;
      const key = o.source === "online" ? "online" : "pos";
      map[k][key] = round2(map[k][key] + o.total);
    });

    return Object.entries(map).map(([k, v]) => ({ label: k.slice(5), ...v })); // "MM-DD"
  }, [orders, range]);

  const total = round2(data.reduce((s, d) => s + d.pos + d.online, 0));

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 shadow-xl transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Sales Overview</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {money(total)} in the last {range === "7d" ? "7" : "30"} days
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full" />
            <span className="text-sm text-slate-600 dark:text-slate-400">POS</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gradient-to-r from-sky-400 to-blue-500 rounded-full" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Online</span>
          </div>
          <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            {["7d", "30d"].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 ${range === r ? "bg-amber-600 text-white" : "bg-transparent text-slate-600 dark:text-slate-300"}`}
              >
                {r === "7d" ? "7 days" : "30 days"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 5 }} onMouseLeave={() => setHoveredBar(null)}>
            <defs>
              <linearGradient id="posGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
              <linearGradient id="onlineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} vertical={false} />
            <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} interval={range === "30d" ? 3 : 0} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "none",
                borderRadius: "12px",
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
              }}
              cursor={{ fill: "transparent" }}
              formatter={(value, name) => [money(value), name]}
            />
            {/* POS bar keeps your lift + shadow hover effect */}
            <Bar
              dataKey="pos"
              name="POS"
              fill="url(#posGradient)"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
              shape={(props) => {
                const { x, y, width, height, fill, index } = props;
                const isHovered = hoveredBar === index;
                return (
                  <rect
                    x={x}
                    y={isHovered ? y - 6 : y}
                    width={width}
                    height={isHovered ? height + 6 : height}
                    rx={4}
                    ry={4}
                    fill={fill}
                    filter={isHovered ? "drop-shadow(0px 8px 12px rgba(245, 158, 11, 0.4))" : "none"}
                    opacity={hoveredBar === null || isHovered ? 1 : 0.35}
                    style={{ transition: "all 0.25s ease-in-out", cursor: "pointer" }}
                    onMouseEnter={() => setHoveredBar(index)}
                  />
                );
              }}
            />
            <Bar dataKey="online" name="Online" fill="url(#onlineGradient)" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default RevenueChart;