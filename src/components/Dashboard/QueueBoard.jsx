import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Clock, Coffee } from "lucide-react";
import { orderService } from "../../services/api";
import useLocalized from "../../hooks/useLocalized";
import { dual } from "../../utils/currency";
import { PAYMENT_LABEL, TYPE_LABEL, itemLabel, minutesSince, useNow } from "../../utils/dashboardFormat";

const COLUMNS = [
  { status: "pending", title: "Received", dot: "bg-amber-500", next: "preparing", nextLabel: "Accept" },
  { status: "preparing", title: "Preparing", dot: "bg-blue-500", next: "ready", nextLabel: "Mark ready" },
  { status: "ready", title: "Ready", dot: "bg-purple-500", next: "completed", nextLabel: "Complete" },
];

function QueueCard({ order, column, now, tr, canManage, busy, onMove }) {
  const minutes = minutesSince(order.createdAt, now);
  // an order that waits too long turns red
  const late = (column.status === "pending" && minutes >= 5) || (column.status === "preparing" && minutes >= 15);
  const lines = order.items || [];
  const total = dual(order.total);
  const unpaid = order.paymentStatus === "unpaid";
  const note = order.customer?.notes;

  return (
    <li
      className={`rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900 ${
        late ? "border-rose-300 dark:border-rose-800" : "border-slate-200 dark:border-slate-700"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 dark:text-white">
            {order.dailyNumber ? `#${order.dailyNumber} · ` : ""}
            {order.orderNumber}
          </p>
          <p className="truncate text-xs text-slate-500">
            {TYPE_LABEL[order.orderType] || order.orderType}
            {order.table ? ` · Table ${order.table}` : ""}
            {" · "}
            {order.source === "online" ? "Online" : "Counter"}
            {order.customer?.name ? ` · ${order.customer.name}` : ""}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 text-xs font-semibold ${
            late ? "text-rose-600" : "text-slate-500"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          {minutes} min
        </span>
      </div>

      <ul className="mt-3 space-y-0.5 text-sm text-slate-700 dark:text-slate-300">
        {lines.slice(0, 4).map((l) => (
          <li key={l.id} className="flex gap-2">
            <span className="shrink-0 font-semibold">{l.qty}×</span>
            <span className="min-w-0 break-words">{itemLabel(l, tr)}</span>
          </li>
        ))}
        {lines.length > 4 && <li className="text-xs text-slate-400">+{lines.length - 4} more</li>}
      </ul>

      {note && <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-xs italic text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">“{note}”</p>}

      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="font-bold text-slate-800 dark:text-white">
          {total.riel} <span className="font-normal text-slate-400">{total.usd}</span>
        </span>
        <span
          className={`rounded-full px-2 py-0.5 font-semibold ${
            unpaid
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          }`}
        >
          {unpaid
            ? order.paymentPreference
              ? `Unpaid · prefers ${PAYMENT_LABEL[order.paymentPreference] || order.paymentPreference}`
              : "Unpaid"
            : PAYMENT_LABEL[order.paymentMethod] || "Paid"}
        </span>
      </div>

      {canManage && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onMove(order, column.next)}
            className="flex-1 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
          >
            {busy ? "..." : column.nextLabel}
          </button>
          {column.status !== "ready" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onMove(order, "cancelled")}
              className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/60 dark:hover:bg-rose-950/30"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export default function QueueBoard({ orders = [], queue, canManage, onChanged }) {
  const navigate = useNavigate();
  const tr = useLocalized();
  const now = useNow(30000);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const move = async (order, status) => {
    if (status === "cancelled" && !window.confirm(`Cancel order ${order.orderNumber}?`)) return;
    setBusyId(order.id);
    setError("");
    try {
      await orderService.setStatus(order.id, status);
      await onChanged?.();
    } catch (err) {
      setError(err.message || "Could not change the status.");
    } finally {
      setBusyId(null);
    }
  };

  const waiting = queue?.onlineWaiting || 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/80">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/50 p-6 dark:border-slate-700/50">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Live Orders</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {orders.length === 0 ? "Nothing in the queue right now" : `${orders.length} in progress`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {waiting > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <Bell className="h-3.5 w-3.5" />
              {waiting} online order{waiting > 1 ? "s" : ""} waiting
            </span>
          )}
          <button onClick={() => navigate("/dashboard/orders")} className="text-sm font-medium text-amber-600 hover:text-amber-700">
            View all
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mx-6 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      )}

      {orders.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <Coffee className="mx-auto mb-2 h-8 w-8" />
          <p className="text-sm">All caught up. New orders appear here by themselves.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 p-6 lg:grid-cols-3">
          {COLUMNS.map((column) => {
            const list = orders.filter((o) => o.status === column.status);
            return (
              <div key={column.status}>
                <div className="mb-3 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">{column.title}</h4>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {list.length}
                  </span>
                </div>
                <ul className="space-y-3">
                  {list.map((order) => (
                    <QueueCard
                      key={order.id}
                      order={order}
                      column={column}
                      now={now}
                      tr={tr}
                      canManage={canManage}
                      busy={busyId === order.id}
                      onMove={move}
                    />
                  ))}
                  {list.length === 0 && <li className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400 dark:border-slate-700">Empty</li>}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {!canManage && orders.length > 0 && (
        <p className="px-6 pb-5 text-xs text-slate-400">You can see the queue. Changing an order's status needs the Orders permission.</p>
      )}
    </section>
  );
}