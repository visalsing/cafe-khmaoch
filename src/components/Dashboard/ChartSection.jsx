import React from "react";
import { PAYMENT_LABEL, TYPE_LABEL, khr } from "../../utils/dashboardFormat";
import DonutCard from "./DonutCard.jsx";
import HeatmapCard from "./HeatmapCard.jsx";
import HourlyChart from "./HourlyChart.jsx";
import PreferencesCard from "./PreferencesCard.jsx";
import RevenueChart from "./RevenueChart.jsx";
import SalesChart from "./SalesChart.jsx";
import SpeedCard from "./SpeedCard.jsx";

export default function ChartSection({ data, range = 7 }) {
  if (!data) {
    return <div className="h-72 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/50" />;
  }

  const payments = data.payments.map((p) => ({
    key: p.method,
    label: PAYMENT_LABEL[p.method] || p.method,
    value: p.amount,
    sub: `${p.count}×`,
  }));

  // one slice per order type (counter and online added together)
  const byType = {};
  data.orderTypes.forEach((r) => {
    byType[r.type] = (byType[r.type] || 0) + r.count;
  });
  const types = Object.entries(byType).map(([type, count]) => ({
    key: type,
    label: TYPE_LABEL[type] || type,
    value: count,
    sub: "",
  }));
  const online = data.orderTypes.filter((r) => r.source === "online").reduce((s, r) => s + r.count, 0);
  const all = data.orderTypes.reduce((s, r) => s + r.count, 0);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="xl:col-span-2">
        <RevenueChart trend={data.trend} totals={data.trendTotals} range={range} />
      </div>
      <SalesChart categories={data.categories} range={range} />

      <div className="xl:col-span-2">
        <HourlyChart data={data.hours} range={range} />
      </div>
      <DonutCard title="Payment Methods" subtitle="Money received" items={payments} format={khr} />

      <div className="xl:col-span-2">
        <HeatmapCard cells={data.heat} range={range} />
      </div>
      <DonutCard
        title="Order Types"
        subtitle={all ? `${Math.round((online / all) * 100)}% of orders came from the website` : "Orders in the period"}
        items={types}
      />

      <div className="xl:col-span-2">
        <PreferencesCard prefs={data.prefs} range={range} />
      </div>
      <SpeedCard speed={data.speed} range={range} />
    </div>
  );
}