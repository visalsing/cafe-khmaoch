
import React from "react";
import { useNavigate } from "react-router-dom";
import { TrendingDown, TrendingUp } from "lucide-react";
import useLocalized from "../../hooks/useLocalized";
import { dual } from "../../utils/currency";
import {
  PAYMENT_LABEL,
  STATUS_LABEL,
  STATUS_STYLE,
  formatChange,
  itemsSummary,
  pctChange,
  timeAgo,
} from "../../utils/dashboardFormat";

const PRODUCT_COLORS = [
  "from-amber-400 to-orange-500",
  "from-blue-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-purple-400 to-violet-600",
  "from-pink-400 to-rose-500",
  "from-cyan-400 to-sky-600",
  "from-red-400 to-rose-600",
  "from-lime-400 to-green-600",
  "from-fuchsia-400 to-purple-600",
  "from-yellow-400 to-amber-600",
];

export default function TableSection({
  recent = [],
  products = [],
  range = 7,
}) {
  const navigate = useNavigate();
  const tr = useLocalized();

  const rows = recent.slice(0, 5);
  const maxQty = Math.max(1, ...products.map((p) => Number(p.qty) || 0));

  return (
    <div className="space-y-6">
      {/* Recent Orders */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/50 bg-white backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/80">
        <div className="flex items-center justify-between border-b border-slate-200/50 p-6 dark:border-slate-700/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              Recent Orders
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Latest from the counter and online
            </p>
          </div>

          <button
            onClick={() => navigate("/dashboard/orders")}
            className="text-sm font-medium text-amber-600 hover:text-amber-700"
          >
            View All
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {[
                  "Order",
                  "Customer",
                  "Items",
                  "Amount",
                  "Payment",
                  "Status",
                  "Time",
                ].map((h) => (
                  <th
                    key={h}
                    className="p-4 text-left text-sm font-semibold text-slate-600 dark:text-slate-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-sm text-slate-400"
                  >
                    No orders yet. Make a sale in the POS to see it here.
                  </td>
                </tr>
              )}

              {rows.map((o) => {
                const amount = dual(o.total);
                const paid = o.paymentStatus === "paid";

                return (
                  <tr
                    key={o.id}
                    onClick={() => navigate("/dashboard/orders")}
                    className="cursor-pointer border-b border-slate-200/50 transition-colors hover:bg-slate-50/50 dark:border-slate-700/50 dark:hover:bg-slate-800/50"
                  >
                    <td className="p-4 text-sm font-medium text-amber-600">
                      {o.orderNumber}
                    </td>

                    <td className="p-4 text-sm text-slate-800 dark:text-white">
                      {o.customer?.name || "Walk-in"}
                    </td>

                    <td className="max-w-[16rem] truncate p-4 text-sm text-slate-800 dark:text-white">
                      {itemsSummary(o.items, tr)}
                    </td>

                    <td className="whitespace-nowrap p-4 text-sm font-medium text-slate-800 dark:text-white">
                      {amount.riel}
                      <span className="block text-[10px] font-normal text-slate-400">
                        {amount.usd}
                      </span>
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          paid
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        }`}
                      >
                        {paid
                          ? PAYMENT_LABEL[o.paymentMethod] || "Paid"
                          : "Unpaid"}
                      </span>
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          STATUS_STYLE[o.status] || ""
                        }`}
                      >
                        {STATUS_LABEL[o.status] || o.status}
                      </span>
                    </td>

                    <td className="whitespace-nowrap p-4 text-sm text-slate-800 dark:text-white">
                      {timeAgo(o.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Drinks & Treats */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/80">
        <div className="flex items-center justify-between p-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              Top Drinks & Treats
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Best sellers in the last {range} days
            </p>
          </div>

          <button
            onClick={() => navigate("/dashboard/reports")}
            className="text-sm font-medium text-amber-600 hover:text-amber-700"
          >
            Full report
          </button>
        </div>

        <div className="space-y-2 px-6 pb-6">
          {products.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-400">
              No sales in this period.
            </p>
          )}

          {products.map((p, index) => {
            const change = pctChange(p.qty, p.prevQty);
            const up = change === null || change >= 0;
            const revenue = dual(p.revenue);

            // Give each product its own color.
            const color =
              PRODUCT_COLORS[index % PRODUCT_COLORS.length];

            return (
              <div
                key={p.productId ?? tr(p.name)}
                className="rounded-xl p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                      {tr(p.name)}
                    </h4>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {p.qty} sold
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">
                      {revenue.riel}
                    </p>

                    <div className="flex items-center justify-end space-x-1">
                      {up ? (
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}

                      <span
                        className={`text-xs font-medium ${
                          up ? "text-emerald-500" : "text-red-500"
                        }`}
                      >
                        {formatChange(change)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Product-specific progress color */}
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-500`}
                    style={{
                      width: `${((Number(p.qty) || 0) / maxQty) * 100}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
