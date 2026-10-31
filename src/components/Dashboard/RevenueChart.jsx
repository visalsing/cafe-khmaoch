
import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { dual } from "../../utils/currency";
import {
  compactKHR,
  dayLabel,
  formatChange,
  pctChange,
} from "../../utils/dashboardFormat";
import ChartCard, { TipBox } from "./ChartCard.jsx";

// --------------------------------------------------
// Tooltip
// --------------------------------------------------

function Tip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null;

  const pos =
    Number(payload.find((p) => p.dataKey === "pos")?.value) || 0;

  const online =
    Number(payload.find((p) => p.dataKey === "online")?.value) || 0;

  const show = (value) => {
    if (metric !== "sales") return value.toLocaleString();

    const d = dual(value);
    return `${d.riel} (${d.usd})`;
  };

  return (
    <TipBox title={dayLabel(label)}>
      <p className="text-amber-600">
        Counter: {show(pos)}
      </p>

      <p className="text-sky-600">
        Online: {show(online)}
      </p>

      <p className="mt-1 border-t border-slate-100 pt-1 font-semibold text-slate-800 dark:border-slate-700 dark:text-white">
        Total: {show(pos + online)}
      </p>
    </TipBox>
  );
}

// --------------------------------------------------
// Change Indicator
// --------------------------------------------------

function ChangeIndicator({ current, previous, range }) {
  const change = pctChange(current, previous);
  const up = change === null || change >= 0;

  return (
    <span className="inline-flex items-center gap-1">
      {up ? (
        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
      )}

      <span
        className={`font-semibold ${
          up ? "text-emerald-500" : "text-red-500"
        }`}
      >
        {formatChange(change)}
      </span>

      <span className="text-slate-400">
        vs previous {range} days
      </span>
    </span>
  );
}

// --------------------------------------------------
// Summary
// --------------------------------------------------

function MetricSummary({
  title,
  value,
  current,
  previous,
  range,
  metric,
}) {
  const formatted =
    metric === "sales"
      ? (() => {
          const amount = dual(value);
          return `${amount.riel} ${amount.usd}`;
        })()
      : `${Number(value).toLocaleString()} orders`;

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {title}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-800 dark:text-white">
        {formatted}
      </p>

      <div className="mt-1 text-xs">
        <ChangeIndicator
          current={current}
          previous={previous}
          range={range}
        />
      </div>
    </div>
  );
}

// --------------------------------------------------
// Reusable Chart
// --------------------------------------------------

function RevenueBarChart({ data, metric, height = "h-72" }) {
  const isSales = metric === "sales";

  const empty = data.every(
    (d) => (Number(d.pos) || 0) + (Number(d.online) || 0) === 0,
  );

  if (empty) {
    return (
      <div className={`${height} flex flex-col items-center justify-center text-sm text-slate-400`}>
        <div className="mb-2 text-4xl">☕</div>

        {isSales
          ? "No paid sales in this period"
          : "No orders in this period"}
      </div>
    );
  }

  return (
    <div className={height}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
        >
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

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            opacity={0.3}
            vertical={false}
          />

          <XAxis
            dataKey="day"
            tickFormatter={dayLabel}
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />

          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={56}
            allowDecimals={false}
            tickFormatter={isSales ? compactKHR : (v) => v}
          />

          <Tooltip
            content={<Tip metric={metric} />}
            cursor={{ fill: "rgba(245, 158, 11, 0.08)" }}
          />

          <Bar
            dataKey="pos"
            name="Counter"
            stackId="sales"
            fill="url(#revPos)"
            maxBarSize={32}
          />

          <Bar
            dataKey="online"
            name="Online"
            stackId="sales"
            fill="url(#revOnline)"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// --------------------------------------------------
// Legend
// --------------------------------------------------

function ChartLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-600" />
        <span className="text-sm text-slate-600 dark:text-slate-400">
          Counter
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-gradient-to-r from-sky-400 to-blue-500" />
        <span className="text-sm text-slate-600 dark:text-slate-400">
          Online
        </span>
      </div>
    </div>
  );
}

// --------------------------------------------------
// Main Revenue Chart
// --------------------------------------------------

export default function RevenueChart({
  trend = [],
  totals,
  range = 7,
}) {
  const [metric, setMetric] = useState("all");

  const isSales = metric === "sales";
  const isOrders = metric === "orders";
  const isAll = metric === "all";

  // Revenue data
  const salesData = useMemo(
    () =>
      trend.map((d) => ({
        day: d.day,
        pos: Number(d.posSales) || 0,
        online: Number(d.onlineSales) || 0,
      })),
    [trend],
  );

  // Orders data
  const ordersData = useMemo(
    () =>
      trend.map((d) => ({
        day: d.day,
        pos: Number(d.posOrders) || 0,
        online: Number(d.onlineOrders) || 0,
      })),
    [trend],
  );

  const salesCurrent = Number(totals?.sales) || 0;
  const salesPrevious = Number(totals?.prevSales) || 0;

  const ordersCurrent = Number(totals?.orders) || 0;
  const ordersPrevious = Number(totals?.prevOrders) || 0;

  const salesAmount = dual(salesCurrent);

  // Selected chart data
  const data = isOrders ? ordersData : salesData;

  // ------------------------------------------------
  // Metric Buttons
  // ------------------------------------------------

  const metricButtons = (
    <div
      className="flex overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold dark:border-slate-700"
      role="group"
      aria-label="Metric"
    >
      {[
        ["all", "All"],
        ["sales", "Sales"],
        ["orders", "Orders"],
      ].map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => setMetric(id)}
          aria-pressed={metric === id}
          className={`px-3 py-1.5 transition-colors ${
            metric === id
              ? "bg-amber-600 text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  // ------------------------------------------------
  // Header
  // ------------------------------------------------

  const header = (
    <div className="flex flex-wrap items-center gap-4">
      <ChartLegend />
      {metricButtons}
    </div>
  );

  // ------------------------------------------------
  // All View
  // ------------------------------------------------

  if (isAll) {
    return (
      <ChartCard
        title="Sales Overview"
        subtitle={
          <span>
            Revenue and orders in the last {range} days
          </span>
        }
        right={header}
      >
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetricSummary
              title="Total Revenue"
              value={salesCurrent}
              current={salesCurrent}
              previous={salesPrevious}
              range={range}
              metric="sales"
            />

            <MetricSummary
              title="Total Orders"
              value={ordersCurrent}
              current={ordersCurrent}
              previous={ordersPrevious}
              range={range}
              metric="orders"
            />
          </div>

          {/* Revenue Chart */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Revenue
              </h4>

              <span className="text-xs text-slate-400">
                {salesAmount.riel} ({salesAmount.usd})
              </span>
            </div>

            <RevenueBarChart
              data={salesData}
              metric="sales"
              height="h-64"
            />
          </div>

          {/* Orders Chart */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Orders
              </h4>

              <span className="text-xs text-slate-400">
                {ordersCurrent.toLocaleString()} orders
              </span>
            </div>

            <RevenueBarChart
              data={ordersData}
              metric="orders"
              height="h-64"
            />
          </div>
        </div>
      </ChartCard>
    );
  }

  // ------------------------------------------------
  // Sales / Orders View
  // ------------------------------------------------

  const current = isSales ? salesCurrent : ordersCurrent;
  const previous = isSales ? salesPrevious : ordersPrevious;
  const change = pctChange(current, previous);
  const up = change === null || change >= 0;

  return (
    <ChartCard
      title="Sales Overview"
      subtitle={
        <span className="inline-flex flex-wrap items-center gap-x-2">
          <span>
            {isSales
              ? `${salesAmount.riel} ${salesAmount.usd}`
              : `${ordersCurrent.toLocaleString()} orders`}{" "}
            in the last {range} days
          </span>

          <span className="inline-flex items-center gap-1">
            {up ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
            )}

            <span
              className={`font-semibold ${
                up ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {formatChange(change)}
            </span>

            <span className="text-slate-400">
              vs previous {range} days
            </span>
          </span>
        </span>
      }
      right={header}
    >
      <RevenueBarChart
        data={data}
        metric={metric}
        height="h-72"
      />
    </ChartCard>
  );
}
