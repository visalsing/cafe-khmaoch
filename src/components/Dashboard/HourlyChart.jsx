import React from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dual } from "../../utils/currency";
import { hourLabel } from "../../utils/dashboardFormat";
import ChartCard, { TipBox } from "./ChartCard.jsx";

function Tip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const sales = dual(d.sales);
  return (
    <TipBox title={`${hourLabel(d.hour)} – ${hourLabel((d.hour + 1) % 24)}`}>
      <p className="text-slate-600 dark:text-slate-300">
        {d.orders} order{d.orders === 1 ? "" : "s"}
      </p>
      <p className="text-slate-500">
        {sales.riel} <span className="text-slate-400">{sales.usd}</span>
      </p>
    </TipBox>
  );
}

export default function HourlyChart({ data = [], range = 7 }) {
  const peak = data.reduce((best, d) => (d.orders > best.orders ? d : best), { orders: 0, hour: -1 });

  return (
    <ChartCard
      title="Busy Hours"
      subtitle={peak.orders > 0 ? `Busiest: ${hourLabel(peak.hour)} – ${hourLabel((peak.hour + 1) % 24)} (${peak.orders} orders) · last ${range} days` : `Orders by hour of the day · last ${range} days`}
    >
      {peak.orders === 0 ? (
        <div className="flex h-56 items-center justify-center text-sm text-slate-400">No orders in this period</div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} vertical={false} />
              <XAxis dataKey="hour" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} interval={0} tickFormatter={(h) => (h % 3 === 0 ? hourLabel(h) : "")} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
              <Tooltip content={<Tip />} cursor={{ fill: "rgba(139, 92, 246, 0.08)" }} />
              <Bar dataKey="orders" radius={[4, 4, 0, 0]} maxBarSize={22}>
                {data.map((d) => (
                  <Cell key={d.hour} fill={d.hour === peak.hour ? "#7c3aed" : "#a78bfa"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}