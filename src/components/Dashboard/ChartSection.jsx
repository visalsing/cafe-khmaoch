import React from "react";
import RevenueChart from "./RevenueChart.jsx";
import SalesChart from "./SalesChart.jsx";

function ChartSection({ orders = [], menuItems = [] }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2">
        <RevenueChart orders={orders} />
      </div>
      <div className="space-y-6">
        <SalesChart orders={orders} menuItems={menuItems} />
      </div>
    </div>
  );
}

export default ChartSection;