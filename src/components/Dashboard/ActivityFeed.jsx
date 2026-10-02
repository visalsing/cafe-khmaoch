import { Bell, Clock, Coffee, CreditCard, X } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { money } from "../../utils/orderCalc";
import { timeAgo } from "./dashboardUtils";

const describe = (o) => {
  if (o.status === "cancelled")
    return { icon: X, title: "Order cancelled", color: "text-red-500", bgColor: "bg-red-100 dark:bg-red-900/30" };
  if (o.source === "online" && o.status === "pending")
    return { icon: Bell, title: "New online order", color: "text-blue-500", bgColor: "bg-blue-100 dark:bg-blue-900/30" };
  if (o.status === "preparing")
    return { icon: Coffee, title: "Order being prepared", color: "text-amber-500", bgColor: "bg-amber-100 dark:bg-amber-900/30" };
  if (o.status === "ready")
    return { icon: Coffee, title: "Order ready", color: "text-purple-500", bgColor: "bg-purple-100 dark:bg-purple-900/30" };
  return {
    icon: CreditCard,
    title: o.source === "pos" ? "POS sale completed" : "Online order completed",
    color: "text-emerald-500",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  };
};

function ActivityFeed({ orders = [] }) {
  const navigate = useNavigate();
  const recent = orders.slice(0, 6);

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
      <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Activity Feed</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Recent order activity</p>
        </div>
        <button onClick={() => navigate("/dashboard/orders")} className="text-amber-600 hover:text-amber-700 text-sm font-medium">
          View All
        </button>
      </div>

      <div className="p-6">
        {recent.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No activity yet.</p>
        ) : (
          <div className="space-y-4">
            {recent.map((o) => {
              const a = describe(o);
              const count = o.items.reduce((n, i) => n + i.qty, 0);
              return (
                <div key={o.id} className="flex items-start space-x-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className={`p-2 rounded-lg ${a.bgColor}`}>
                    <a.icon className={`w-4 h-4 ${a.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-white">{a.title}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                      {o.number} · {money(o.total)} · {count} item{count > 1 ? "s" : ""}
                    </p>
                    <div className="flex items-center space-x-1 mt-1">
                      <Clock className="w-3 h-3 text-slate-400" />
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

export default ActivityFeed;