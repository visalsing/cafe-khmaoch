import React, { useCallback, useEffect, useState } from "react";
import {
  RotateCcw,
  Search,
  Receipt as ReceiptIcon,
  Banknote,
  CreditCard,
  QrCode,
  X,
} from "lucide-react";
import { orderService } from "../../services/api";
import { dual } from "../../utils/currency";
import ReceiptModal from "./Receipt";
import Pagination from "./Pagination";
import { Alert, Chip } from "./UiBits";
import { inputCls } from "./Shared.jsx";

const STATUSES = ["pending", "preparing", "ready", "completed", "cancelled"];
const statusCls = {
  pending: "bg-amber-100 text-amber-700",
  preparing: "bg-blue-100 text-blue-700",
  ready: "bg-purple-100 text-purple-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

// two lines: riel on top, dollars under it
function Money({ value, className = "" }) {
  const p = dual(value);
  return (
    <span className={`inline-block text-right ${className}`}>
      <span className="block">{p.riel}</span>
      <span className="block text-[10px] font-normal text-slate-400">
        {p.usd}
      </span>
    </span>
  );
}

/* ---------- take the payment of an unpaid (online) order ---------- */
function PayModal({ order, onClose, onPaid }) {
  // const [method, setMethod] = useState("cash");
  const [method, setMethod] = useState(order.paymentPreference || "cash");
  const [cash, setCash] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const total = Number(order.total) || 0;
  const received = Number(cash) || 0;
  const change =
    method === "cash"
      ? Math.max(0, Math.round((received - total) * 100) / 100)
      : 0;
  const canPay = method !== "cash" || received >= total;

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      onPaid(
        await orderService.addPayment(order.id, {
          method,
          cashReceived: method === "cash" ? received : null,
        }),
      );
    } catch (err) {
      setError(err.message || "The payment could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Take payment"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Payment · {order.orderNumber}</h3>
          <button onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-3xl font-extrabold text-center text-amber-600 dark:text-amber-400">
          {dual(total).riel}
          <span className="block text-sm font-medium text-amber-500/70">
            {dual(total).usd}
          </span>
        </p>

        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "cash", label: "Cash", icon: Banknote },
            { id: "card", label: "Card", icon: CreditCard },
            { id: "qr", label: "QR", icon: QrCode },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMethod(id)}
              className={`py-3 rounded-xl border text-sm font-semibold flex flex-col items-center gap-1 ${
                method === id
                  ? "border-amber-600 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300"
                  : "border-slate-200 dark:border-slate-700"
              }`}
            >
              <Icon className="w-5 h-5" /> {label}
            </button>
          ))}
        </div>

        {method === "cash" && (
          <div className="space-y-3">
            <input
              type="number"
              min="0"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              placeholder="Cash received (៛)"
              className={inputCls}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setCash(String(total))}
                className="flex-1 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold"
              >
                Exact
              </button>
              {[10000, 20000, 50000, 100000].map((v) => (
                <button
                  key={v}
                  onClick={() => setCash(String(v))}
                  className="flex-1 px-1 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold"
                >
                  {v.toLocaleString()}៛
                </button>
              ))}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Change</span>
              <span className="font-bold">{dual(change).riel}</span>
            </div>
          </div>
        )}
        {method === "card" && (
          <p className="text-sm text-slate-500 text-center">
            Tap or insert the card on the terminal, then confirm.
          </p>
        )}
        {method === "qr" && (
          <p className="text-sm text-slate-500 text-center">
            Show the QR code to the customer, then confirm once paid.
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-rose-500 text-center">
            {error}
          </p>
        )}
        <button
          disabled={!canPay || busy}
          onClick={submit}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold"
        >
          {busy ? "Processing..." : "Confirm Payment"}
        </button>
      </div>
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [notice, setNotice] = useState(null);

  const notify = (type, title, message) =>
    setNotice({ id: Date.now(), type, title, message });

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const rows = await orderService.list({ limit: 500 });
      setOrders(Array.isArray(rows) ? rows : []);
      setError("");
      return true;
    } catch (err) {
      setError(err.message || "Could not load the orders.");
      return false;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // new online orders show up by themselves (not while this tab is in the background)
  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (!document.hidden) load({ silent: true });
    }, 15000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!notice || notice.type === "error") return undefined;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, sourceFilter, query, pageSize]);

  const replaceOrder = (updated) =>
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));

  const changeStatus = async (o, status) => {
    if (status === o.status) return;
    if (
      status === "cancelled" &&
      !window.confirm(`Cancel order ${o.orderNumber}?`)
    )
      return;
    setBusyId(o.id);
    try {
      replaceOrder(await orderService.setStatus(o.id, status));
    } catch (err) {
      notify(
        "error",
        "Could not change the status",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (await load({ silent: true }))
        notify(
          "success",
          "Orders refreshed",
          "The orders were reloaded from the database.",
        );
    } finally {
      setRefreshing(false);
    }
  };

  const countBy = (fn) => orders.filter(fn).length;
  const isToday = (o) =>
    new Date(o.createdAt).toDateString() === new Date().toDateString();
  const todays = orders.filter((o) => isToday(o) && o.status !== "cancelled");
  const todaySales = todays
    .filter((o) => o.paymentStatus === "paid")
    .reduce((s, o) => s + o.total, 0);
  const stats = [
    ["Orders today", todays.length],
    [
      "Sales today (paid)",
      <Money key="s" value={todaySales} className="!text-left" />,
    ],
    ["Pending", countBy((o) => o.status === "pending")],
    [
      "Unpaid",
      countBy((o) => o.paymentStatus === "unpaid" && o.status !== "cancelled"),
    ],
  ];

  const q = query.trim().toLowerCase();
  const shown = orders.filter(
    (o) =>
      (statusFilter === "all" || o.status === statusFilter) &&
      (sourceFilter === "all" || o.source === sourceFilter) &&
      (!q ||
        [o.orderNumber, o.customer?.name, o.customer?.phone, o.table]
          .join(" ")
          .toLowerCase()
          .includes(q)),
  );

  const totalPages = Math.max(1, Math.ceil(shown.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = shown.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const selected = orders.find((o) => o.id === selectedId) || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Orders</h1>
          <p className="text-sm text-slate-500">
            Counter and online orders. New online orders appear by themselves.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 hover:border-amber-500 disabled:opacity-60 transition-colors self-start"
        >
          <RotateCcw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />{" "}
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(([label, value]) => (
          <div
            key={label}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4"
          >
            <p className="text-xs text-slate-500">{label}</p>
            <div className="text-2xl font-extrabold">{value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search number, name, phone, table..."
            className={`${inputCls} pl-9`}
          />
        </div>
        {["all", "pos", "online"].map((s) => (
          <Chip
            key={s}
            active={sourceFilter === s}
            onClick={() => setSourceFilter(s)}
          >
            {s === "all"
              ? "All sources"
              : s === "pos"
                ? "Counter (POS)"
                : "Online"}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {["all", ...STATUSES].map((s) => (
          <Chip
            key={s}
            active={statusFilter === s}
            onClick={() => setStatusFilter(s)}
          >
            <span className="capitalize">{s}</span> (
            {s === "all" ? orders.length : countBy((o) => o.status === s)})
          </Chip>
        ))}
      </div>

      {notice && (
        <Alert
          key={notice.id}
          type={notice.type}
          title={notice.title}
          onClose={() => setNotice(null)}
        >
          {notice.message}
        </Alert>
      )}
      {error && (
        <Alert
          type="error"
          title="Could not load the orders"
          action={
            <button
              onClick={() => load()}
              className="ml-2 font-semibold underline"
            >
              Retry
            </button>
          }
        >
          {error}
        </Alert>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4">Order</th>
              <th className="p-4">Source</th>
              <th className="p-4">Type</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Payment</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Total</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && shown.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-400">
                  {orders.length === 0
                    ? "No orders yet."
                    : "No orders match your filters."}
                </td>
              </tr>
            )}
            {!loading &&
              pageItems.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setSelectedId(o.id)}
                  className="border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <td className="p-4">
                    <div className="font-semibold">{o.orderNumber}</div>
                    <div className="text-xs text-slate-400 whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="capitalize">
                      {o.source === "pos" ? "Counter" : "Online"}
                    </div>
                    {o.source === "pos" && o.cashierName && (
                      <div className="text-xs text-slate-400">
                        {o.cashierName}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="capitalize">{o.orderType}</div>
                    {o.table && (
                      <div className="text-xs text-slate-400">
                        Table {o.table}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div>{o.customer?.name || "-"}</div>
                    {o.customer?.phone && (
                      <div className="text-xs text-slate-400">
                        {o.customer.phone}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    {o.paymentStatus === "paid" ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase bg-emerald-100 text-emerald-700">
                        {o.paymentMethod}
                      </span>
                    ) : o.paymentStatus === "refunded" ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-600">
                        Refunded
                      </span>
                    ) : (
                      // <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Unpaid</span>
                      <>
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                          Unpaid
                        </span>
                        {o.paymentPreference && (
                          <div className="mt-0.5 text-[10px] uppercase text-slate-400">
                            prefers {o.paymentPreference}
                          </div>
                        )}
                      </>
                    )}
                  </td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={o.status}
                      disabled={busyId === o.id}
                      onChange={(e) => changeStatus(o, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs font-semibold capitalize border-0 disabled:opacity-50 ${statusCls[o.status] || "bg-slate-100"}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4 text-right font-bold">
                    <Money value={o.total} />
                  </td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      {o.paymentStatus === "unpaid" &&
                        o.status !== "cancelled" && (
                          <button
                            onClick={() => setPayTarget(o)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5"
                          >
                            <Banknote className="w-3.5 h-3.5" /> Take payment
                          </button>
                        )}
                      <button
                        onClick={() => setSelectedId(o.id)}
                        title="Receipt"
                        aria-label="Open the receipt"
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600"
                      >
                        <ReceiptIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={currentPage}
        pageSize={pageSize}
        total={shown.length}
        onPage={setPage}
        onPageSize={setPageSize}
      />

      {selected && (
        <ReceiptModal order={selected} onClose={() => setSelectedId(null)} />
      )}

      {payTarget && (
        <PayModal
          order={payTarget}
          onClose={() => setPayTarget(null)}
          onPaid={(updated) => {
            replaceOrder(updated);
            setPayTarget(null);
            setSelectedId(updated.id);
            notify(
              "success",
              "Payment saved",
              `${updated.orderNumber} is paid.`,
            );
          }}
        />
      )}
    </div>
  );
}
