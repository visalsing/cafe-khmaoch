import React from "react";
import { useNavigate } from "react-router-dom";
import StatsGrid from "./StatsGrid.jsx";
import ChartSection from "./ChartSection.jsx";
import TableSection from "./TableSection.jsx";
import ActivityFeed from "./ActivityFeed.jsx";
import { useOrders } from "./useOrders.js";
import { useMenu } from "../../context/MenuContext";

function Dashboard() {
  const navigate = useNavigate();
  const { orders, loading } = useOrders();
  const { items } = useMenu();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white">Café Overview</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <button
          onClick={() => navigate("/dashboard/pos")}
          className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-lg w-fit"
        >
          ☕ Open POS
        </button>
      </div>

      <StatsGrid orders={orders} loading={loading} />

      <ChartSection orders={orders} menuItems={items} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <TableSection orders={orders} />
        </div>
        <div>
          <ActivityFeed orders={orders} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;