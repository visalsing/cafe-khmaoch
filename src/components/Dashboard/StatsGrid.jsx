import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, Banknote, Coffee, Receipt, Users, Wallet } from "lucide-react";
import { dual } from "../../utils/currency";
import { formatChange, khr, pctChange } from "../../utils/dashboardFormat";

function Money({ value }) {
  const p = dual(value);
  return (
    <>
      <span className="block">{p.riel}</span>
      <span className="block text-xs font-medium text-slate-400">{p.usd}</span>
    </>
  );
}

export default function StatsGrid({ data, range = 7 }) {
  const navigate = useNavigate();
  const ready = Boolean(data);
  const t = data?.today;
  const q = data?.queue;
  const c = data?.customers;
  const goals = data?.goals || { sales: 0, orders: 0 };

  const salesGoal = ready && goals.sales > 0;
  const ordersGoal = ready && goals.orders > 0;

  const cards = [
    {
      key: "sales",
      title: "Today's Sales",
      hint: "Paid orders only",
      value: ready ? <Money value={t.sales} /> : null,
      change: ready ? pctChange(t.sales, t.salesYesterday) : undefined,
      progress: salesGoal ? Math.min(100, (t.sales / goals.sales) * 100) : null,
      goalText: salesGoal ? `${Math.round((t.sales / goals.sales) * 100)}% of ${khr(goals.sales)} goal` : "",
      icon: Banknote,
      bar: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      text: "text-emerald-600 dark:text-emerald-400",
    },
    {
      key: "orders",
      title: "Orders Today",
      hint: "All orders except cancelled",
      value: ready ? String(t.orders) : null,
      change: ready ? pctChange(t.orders, t.ordersYesterday) : undefined,
      progress: ordersGoal ? Math.min(100, (t.orders / goals.orders) * 100) : null,
      goalText: ordersGoal ? `${t.orders} of ${goals.orders} daily goal` : "",
      icon: Coffee,
      bar: "from-amber-500 to-orange-600",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      text: "text-amber-600 dark:text-amber-400",
    },
    {
      key: "avg",
      title: "Average Order",
      hint: "Paid orders only",
      value: ready ? <Money value={t.avg} /> : null,
      change: ready ? pctChange(t.avg, t.avgYesterday) : undefined,
      icon: Receipt,
      bg: "bg-purple-50 dark:bg-purple-900/20",
      text: "text-purple-600 dark:text-purple-400",
    },
    {
      key: "collect",
      title: "To Collect",
      value: ready ? <Money value={q.unpaidTotal} /> : null,
      sub: ready ? (q.unpaidCount ? `${q.unpaidCount} unpaid order${q.unpaidCount > 1 ? "s" : ""}` : "Everything is paid") : "",
      alert: ready && q.unpaidCount > 0,
      onClick: () => navigate("/dashboard/orders"),
      icon: Wallet,
      bg: "bg-blue-50 dark:bg-blue-900/20",
      text: "text-blue-600 dark:text-blue-400",
    },
    {
      key: "customers",
      title: "Customers",
      value: ready ? String(c.total) : null,
      sub: ready ? `+${c.newToday} today · +${c.newRange} in ${range} days` : "",
      icon: Users,
      bg: "bg-rose-50 dark:bg-rose-900/20",
      text: "text-rose-600 dark:text-rose-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((s) => {
        const hasChange = s.change !== undefined;
        const up = s.change === null || s.change >= 0;
        const Wrapper = s.onClick ? "button" : "div";
        return (
          <Wrapper
            key={s.key}
            type={s.onClick ? "button" : undefined}
            onClick={s.onClick}
            className={`group rounded-2xl border bg-white/80 p-5 text-left backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/20 dark:bg-slate-900/80 dark:hover:shadow-slate-900/20 ${
              s.alert ? "border-amber-300 dark:border-amber-700" : "border-slate-200/50 dark:border-slate-700/50"
            } ${s.onClick ? "cursor-pointer" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-400" title={s.hint}>
                  {s.title}
                </p>
                <div className="mb-3 text-2xl font-bold text-slate-800 dark:text-white">{s.value ?? "…"}</div>

                {hasChange ? (
                  <div className="flex flex-wrap items-center gap-x-2">
                    {up ? <ArrowUpRight className="h-4 w-4 text-emerald-500" /> : <ArrowDownRight className="h-4 w-4 text-red-500" />}
                    <span className={`text-sm font-semibold ${up ? "text-emerald-500" : "text-red-500"}`}>{formatChange(s.change)}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">vs same time yesterday</span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{s.sub}</p>
                )}
              </div>
              <div className={`rounded-xl p-3 transition-all duration-300 group-hover:scale-110 ${s.bg}`}>
                <s.icon className={`h-5 w-5 ${s.text}`} />
              </div>
            </div>

            {s.progress !== null && s.progress !== undefined && (
              <div className="mt-4">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className={`h-full rounded-full bg-gradient-to-r ${s.bar} transition-all duration-500`} style={{ width: `${s.progress}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">{s.goalText}</p>
              </div>
            )}
          </Wrapper>
        );
      })}
    </div>
  );
}