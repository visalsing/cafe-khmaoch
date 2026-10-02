import { ArrowDownRight, ArrowUpRight, Bell, Coffee, DollarSign, Receipt } from "lucide-react";
import React, { useMemo } from "react";
import { money, round2 } from "../../utils/orderCalc";
import { activeOrders, daysAgo, formatChange, isOnDay, pctChange, sumTotal } from "./dashboardUtils";

// Change these to your real daily targets
const DAILY_SALES_GOAL = 200;
const DAILY_ORDERS_GOAL = 40;

function StatsGrid({ orders = [], loading }) {
  const stats = useMemo(() => {
    const active = activeOrders(orders);
    const today = active.filter((o) => isOnDay(o.createdAt, new Date()));
    const yesterday = active.filter((o) => isOnDay(o.createdAt, daysAgo(1)));

    const salesToday = sumTotal(today);
    const salesYesterday = sumTotal(yesterday);
    const avgToday = today.length ? round2(salesToday / today.length) : 0;
    const avgYesterday = yesterday.length ? round2(salesYesterday / yesterday.length) : 0;
    const waiting = orders.filter((o) => o.source === "online" && o.status === "pending").length;

    return [
      {
        title: "Today's Sales",
        value: money(salesToday),
        change: pctChange(salesToday, salesYesterday),
        progress: Math.min(100, (salesToday / DAILY_SALES_GOAL) * 100),
        goalText: `${Math.round((salesToday / DAILY_SALES_GOAL) * 100)}% of ${money(DAILY_SALES_GOAL)} goal`,
        icon: DollarSign,
        color: "from-emerald-500 to-teal-600",
        bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
        textColor: "text-emerald-600 dark:text-emerald-400",
      },
      {
        title: "Orders Today",
        value: String(today.length),
        change: pctChange(today.length, yesterday.length),
        progress: Math.min(100, (today.length / DAILY_ORDERS_GOAL) * 100),
        goalText: `${today.length} of ${DAILY_ORDERS_GOAL} daily goal`,
        icon: Coffee,
        color: "from-amber-500 to-orange-600",
        bgColor: "bg-amber-50 dark:bg-amber-900/20",
        textColor: "text-amber-600 dark:text-amber-400",
      },
      {
        title: "Online Orders Waiting",
        value: String(waiting),
        sub: waiting ? "Open Orders to accept them" : "All caught up",
        icon: Bell,
        color: "from-blue-500 to-indigo-600",
        bgColor: "bg-blue-50 dark:bg-blue-900/20",
        textColor: "text-blue-600 dark:text-blue-400",
      },
      {
        title: "Average Order",
        value: money(avgToday),
        change: pctChange(avgToday, avgYesterday),
        icon: Receipt,
        color: "from-purple-500 to-violet-600",
        bgColor: "bg-purple-50 dark:bg-purple-900/20",
        textColor: "text-purple-600 dark:text-purple-400",
      },
    ];
  }, [orders]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((s) => {
        const hasChange = s.change !== undefined;
        const up = s.change === null || s.change >= 0;
        return (
          <div
            key={s.title}
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-slate-900/20 transition-all duration-300 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">{s.title}</p>
                <p className="text-3xl font-bold text-slate-800 dark:text-white mb-4">{loading ? "…" : s.value}</p>
                {hasChange ? (
                  <div className="flex items-center space-x-2">
                    {up ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : <ArrowDownRight className="w-4 h-4 text-red-500" />}
                    <span className={`text-sm font-semibold ${up ? "text-emerald-500" : "text-red-500"}`}>
                      {formatChange(s.change)}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">vs yesterday</span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{s.sub}</p>
                )}
              </div>
              <div className={`p-3 rounded-xl ${s.bgColor} group-hover:scale-110 transition-all duration-300`}>
                <s.icon className={`w-6 h-6 ${s.textColor}`} />
              </div>
            </div>

            {s.progress !== undefined && (
              <div className="mt-4">
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${s.color} rounded-full transition-all duration-500`}
                    style={{ width: `${s.progress}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">{s.goalText}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default StatsGrid;