import React, { useEffect, useState } from "react";
import { orderService } from "../../services/api";
import ReceiptModal from "./Receipt";

const money = (n) => `$${Number(n).toFixed(2)}`;

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    orderService.list().then(setOrders);
  }, []);

  const today = new Date().toDateString();
  const todays = orders.filter((o) => new Date(o.createdAt).toDateString() === today);
  const todaySales = todays.reduce((s, o) => s + o.total, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Orders</h1>

      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs text-slate-500">Orders today</p>
          <p className="text-2xl font-extrabold">{todays.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs text-slate-500">Sales today</p>
          <p className="text-2xl font-extrabold text-amber-600">{money(todaySales)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4">Order</th><th className="p-4">Time</th><th className="p-4">Type</th>
              <th className="p-4">Payment</th><th className="p-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500">No orders yet.</td></tr>}
            {orders.map((o) => (
              <tr key={o.id} onClick={() => setSelected(o)} className="border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                <td className="p-4 font-semibold">{o.number}</td>
                <td className="p-4">{new Date(o.createdAt).toLocaleString()}</td>
                <td className="p-4 capitalize">{o.orderType}</td>
                <td className="p-4 uppercase">{o.paymentMethod}</td>
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