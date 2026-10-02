import { MoreHorizontal, TrendingDown, TrendingUp } from "lucide-react";
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { money, round2 } from "../../utils/orderCalc";
import { STATUS_COLORS, activeOrders, daysAgo, formatChange, pctChange, startOfDay } from "./dashboardUtils";

const summarize = (items) => {
  if (!items.length) return "-";
  const first = `${items[0].qty} × ${items[0].title}`;
  return items.length > 1 ? `${first} +${items.length - 1} more` : first;
};

function TableSection({ orders = [] }) {
  const navigate = useNavigate();
  const recent = orders.slice(0, 5); // orders are stored newest first

  // best sellers: last 7 days vs the 7 days before
  const topProducts = useMemo(() => {
    const weekStart = startOfDay(daysAgo(6)).getTime();
    const prevStart = startOfDay(daysAgo(13)).getTime();
    const cur = {};
    const prev = {};
    activeOrders(orders).forEach((o) => {
      const t = new Date(o.createdAt).getTime();
      const bucket = t >= weekStart ? cur : t >= prevStart ? prev : null;
      if (!bucket) return;
      o.items.forEach((i) => {
        bucket[i.title] = bucket[i.title] || { qty: 0, revenue: 0 };
        bucket[i.title].qty += i.qty;
        bucket[i.title].revenue = round2(bucket[i.title].revenue + i.qty * i.price);
      });
    });
    return Object.entries(cur)
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 4)
      .map(([name, v]) => ({ name, ...v, change: pctChange(v.qty, prev[name]?.qty || 0) }));
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Recent Orders */}
      <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Recent Orders</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Latest from the counter and online</p>
          </div>
          <button onClick={() => navigate("/dashboard/orders")} className="text-amber-600 hover:text-amber-700 text-sm font-medium">
            View All
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {["Order", "Customer", "Items", "Amount", "Status", "Time", ""].map((h) => (
                  <th key={h} className="text-left p-4 text-sm font-semibold text-slate-600 dark:text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-slate-400">No orders yet. Make a sale in the POS to see it here.</td>
                </tr>
              )}
              {recent.map((o) => (
                <tr key={o.id} className="border-b border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-4"><span className="text-sm font-medium text-amber-600">{o.number}</span></td>
                  <td className="p-4"><span className="text-sm text-slate-800 dark:text-white">{o.customer?.name || "Walk-in"}</span></td>
                  <td className="p-4"><span className="text-sm text-slate-800 dark:text-white">{summarize(o.items)}</span></td>
                  <td className="p-4"><span className="text-sm font-medium text-slate-800 dark:text-white">{money(o.total)}</span></td>
                  <td className="p-4">
                    <span className={`font-medium text-xs px-3 py-1 rounded-full capitalize ${STATUS_COLORS[o.status] || STATUS_COLORS.completed}`}>{o.status}</span>
                  </td>
                  <td className="p-4"><span className="text-sm text-slate-800 dark:text-white">{new Date(o.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span></td>
                  <td className="p-4"><MoreHorizontal className="w-4 h-4 text-slate-400" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
        <div className="p-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Top Drinks & Treats</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Best sellers in the last 7 days</p>
          </div>
          <button onClick={() => navigate("/dashboard/reports")} className="text-amber-600 hover:text-amber-700 text-sm font-medium">
            Full report
          </button>
        </div>

        <div className="px-6 pb-6 space-y-2">
          {topProducts.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">No sales in the last 7 days.</p>}
          {topProducts.map((p) => {
            const up = p.change === null || p.change >= 0;
            return (
              <div key={p.name} className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-white">{p.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{p.qty} sold</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{money(p.revenue)}</p>
                  <div className="flex items-center justify-end space-x-1">
                    {up ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                    <span className={`text-xs font-medium ${up ? "text-emerald-500" : "text-red-500"}`}>{formatChange(p.change)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TableSection;