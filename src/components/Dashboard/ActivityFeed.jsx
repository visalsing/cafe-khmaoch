import React from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Clock, Coffee, CreditCard, Wallet, X } from "lucide-react";
import { dual } from "../../utils/currency";
import { timeAgo } from "../../utils/dashboardFormat";

const describe = (o) => {
  if (o.status === "cancelled")
    return { icon: X, title: "Order cancelled", color: "text-red-500", bg: "bg-red-100 dark:bg-red-900/30" };
  if (o.source === "online" && o.status === "pending")
    return { icon: Bell, title: "New online order", color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30" };
  if (o.status === "preparing")
    return { icon: Coffee, title: "Order being prepared", color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30" };
  if (o.status === "ready")
    return { icon: Coffee, title: "Order ready", color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-900/30" };
  if (o.paymentStatus === "unpaid")
    return { icon: Wallet, title: "Completed, not paid yet", color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30" };
  return {
    icon: CreditCard,
    title: o.source === "pos" ? "Counter sale completed" : "Online order completed",
    color: "text-emerald-500",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
  };
};

export default function ActivityFeed({ recent = [] }) {
  const navigate = useNavigate();
  const list = recent.slice(0, 6);

  return (
    <div className="rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/80">
      <div className="flex items-center justify-between border-b border-slate-200/50 p-6 dark:border-slate-700/50">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Activity Feed</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Recent order activity</p>
        </div>
        <button onClick={() => navigate("/dashboard/orders")} className="text-sm font-medium text-amber-600 hover:text-amber-700">
          View All
        </button>
      </div>

      <div className="p-6">
        {list.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No activity yet.</p>
        ) : (
          <div className="space-y-4">
            {list.map((o) => {
              const a = describe(o);
              const count = (o.items || []).reduce((n, i) => n + i.qty, 0);
              return (
                <div key={o.id} className="flex items-start space-x-4 rounded-xl p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <div className={`rounded-lg p-2 ${a.bg}`}>
                    <a.icon className={`h-4 w-4 ${a.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-white">{a.title}</h4>
                    <p className="truncate text-sm text-slate-600 dark:text-slate-400">
                      {o.orderNumber} · {dual(o.total).riel} · {count} item{count === 1 ? "" : "s"}
                    </p>
                    <div className="mt-1 flex items-center space-x-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">{timeAgo(o.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}