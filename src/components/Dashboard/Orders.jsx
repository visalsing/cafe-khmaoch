import React, { useEffect, useState } from "react";
import { orderService } from "../../services/api";
import ReceiptModal from "./Receipt";

const money = (n) => `$${Number(n).toFixed(2)}`;
const STATUSES = ["pending", "preparing", "ready", "completed", "cancelled"];
const statusCls = {
  pending: "bg-amber-100 text-amber-700",
  preparing: "bg-blue-100 text-blue-700",
  ready: "bg-purple-100 text-purple-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = () => orderService.list().then(setOrders);

  useEffect(() => {
    load();
    const onStorage = (e) => e.key === "bb_orders_v1" && load(); // new online orders from another tab
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const changeStatus = async (id, status) => {
    const updated = await orderService.updateStatus(id, status);
    setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
  };

  const today = new Date().toDateString();
  const todays = orders.filter((o) => new Date(o.createdAt).toDateString() === today && o.status !== "cancelled");
  const todaySales = todays.reduce((s, o) => s + o.total, 0);
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  const shown = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Orders</h1>

      <div className="grid grid-cols-3 gap-4 max-w-2xl">
        {[
          ["Orders today", todays.length],
          ["Sales today", money(todaySales)],
          ["Pending", pendingCount],
        ].map(([label, value]) => (
          <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-2xl font-extrabold">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {["all", ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl capitalize ${
              filter === s ? "bg-amber-600 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4">Order</th><th className="p-4">Time</th><th className="p-4">Source</th>
              <th className="p-4">Type</th><th className="p-4">Customer</th><th className="p-4">Payment</th>
              <th className="p-4">Status</th><th className="p-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-slate-500">No orders.</td></tr>}
            {shown.map((o) => (
              <tr key={o.id} onClick={() => setSelected(o)} className="border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                <td className="p-4 font-semibold">{o.number}</td>
                <td className="p-4">{new Date(o.createdAt).toLocaleString()}</td>
                <td className="p-4 capitalize">{o.source}</td>
                <td className="p-4 capitalize">{o.orderType}</td>
                <td className="p-4">{o.customer?.name || "-"}</td>
                <td className="p-4 uppercase">{o.paymentMethod}</td>
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={o.status}
                    onChange={(e) => changeStatus(o.id, e.target.value)}
                    className={`px-2 py-1 rounded-full text-xs font-semibold capitalize border-0 ${statusCls[o.status] || "bg-slate-100"}`}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-4 text-right font-bold">{money(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && <ReceiptModal order={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}