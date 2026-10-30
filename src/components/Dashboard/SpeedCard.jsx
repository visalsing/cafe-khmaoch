import React from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dayLabel } from "../../utils/dashboardFormat";
import ChartCard, { TipBox } from "./ChartCard.jsx";

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <TipBox title={dayLabel(label)}>
      <p className="text-slate-600 dark:text-slate-300">{d.minutes === null ? "No completed orders" : `${d.minutes} min`}</p>
      {d.done > 0 && <p className="text-slate-500">{d.done} completed</p>}
    </TipBox>
  );
}

export default function SpeedCard({ speed, range = 7 }) {
  const has = (speed?.done || 0) > 0;

  return (
    <ChartCard
      title="Order Speed"
      subtitle={`Typical time from order to "Completed" · last ${range} days`}
      right={
        has && (
          <div className="text-right">
            <p className="text-2xl font-extrabold text-slate-800 dark:text-white">{speed.medianMinutes} min</p>
            <p className="text-xs text-slate-400">{speed.done} completed orders</p>
          </div>
        )
      }
    >
      {!has ? (
        <div className="flex h-44 flex-col items-center justify-center px-4 text-center text-sm text-slate-400">
          No completed orders yet. The time is measured when staff press “Complete” on the Live Orders board.
        </div>
      ) : (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={speed.series} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} vertical={false} />
              <XAxis dataKey="day" tickFormatter={dayLabel} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={38} allowDecimals={false} tickFormatter={(v) => `${v}m`} />
              <Tooltip content={<Tip />} />
              <Line type="monotone" dataKey="minutes" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}