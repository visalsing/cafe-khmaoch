import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  RotateCcw,
  Search,
  Receipt as ReceiptIcon,
  Banknote,
  CreditCard,
  QrCode,
  X,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
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

/* =========================================================
   Dates: "26 Oct 2026" + the calendar pop-up
   ========================================================= */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEK_STARTS_ON = 1; // 0 = the week starts on Sunday, 1 = on Monday
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const WEEKDAYS = [...DAY_LABELS.slice(WEEK_STARTS_ON), ...DAY_LABELS.slice(0, WEEK_STARTS_ON)];

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const sameDay = (a, b) =>
  Boolean(a && b) &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
// 26 Oct 2026  (change this one line if you want "26 October 2026" or "26/10/2026")
const fmtDay = (d) => (d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : "");

// the 42 cells (6 weeks) of one month; null = a day that belongs to the next / previous month
function monthCells(year, month) {
  const lead = (new Date(year, month, 1).getDay() - WEEK_STARTS_ON + 7) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length < 42) cells.push(null);
  return cells;
}

const BAND = "bg-accent-100 dark:bg-accent-500/15";

// one month of the calendar
function MonthView({ month, from, to, picking, hover, onPick, onHover }) {
  const today = startOfDay(new Date());
  // while the end date is being picked, preview the range up to the day under the mouse
  const rangeEnd = to || (picking === "to" && from && hover && hover >= from ? hover : null);
  const cells = monthCells(month.getFullYear(), month.getMonth());

  return (
    <div className="w-[17.5rem] shrink-0">
      <p className="mb-2 text-center text-sm font-bold text-slate-800 dark:text-slate-100">
        {MONTHS_LONG[month.getMonth()]} {month.getFullYear()}
      </p>
      <div className="grid grid-cols-7">
        {WEEKDAYS.map((w) => (
          <span key={w} className="h-8 flex items-center justify-center text-[11px] font-semibold uppercase text-slate-400">
            {w}
          </span>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={`blank-${i}`} className="h-9" />;

          const isStart = sameDay(date, from);
          const isEnd = sameDay(date, rangeEnd);
          const inside = Boolean(from && rangeEnd && date > from && date < rangeEnd);
          const hasRange = Boolean(from && rangeEnd && !sameDay(from, rangeEnd));
          const col = i % 7;

          let band = "";
          if (hasRange) {
            if (isStart) band = `${BAND} rounded-l-full`;
            else if (isEnd) band = `${BAND} rounded-r-full`;
            else if (inside)
              band = `${BAND} ${col === 0 ? "rounded-l-full" : ""} ${col === 6 ? "rounded-r-full" : ""}`;
          }

          const edge = isStart || isEnd;
          return (
            <div key={date.getDate()} className={`h-9 flex items-center justify-center ${band}`}>
              <button
                type="button"
                onClick={() => onPick(date)}
                onMouseEnter={() => onHover(date)}
                aria-label={fmtDay(date)}
                aria-pressed={edge}
                className={`h-9 w-9 rounded-full text-sm transition-colors ${
                  edge
                    ? "bg-accent-600 text-white font-bold"
                    : `text-slate-700 dark:text-slate-200 hover:bg-accent-200/70 dark:hover:bg-accent-500/25 ${
                        sameDay(date, today) ? "ring-1 ring-inset ring-accent-500 font-semibold" : ""
                      }`
                }`}
              >
                {date.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// "From [date]  To [date]" with a calendar pop-up (click the start day, then the end day)
function DateRangePicker({ from, to, onChange }) {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState("from"); // which end the next click sets
  const [hover, setHover] = useState(null);
  const [view, setView] = useState(() => startOfMonth(from || new Date()));
  const boxRef = useRef(null);

  const close = () => {
    setOpen(false);
    setHover(null);
  };

  // click outside or Esc closes the pop-up
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) close();
    };
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openFor = (field) => {
    const target = field === "to" && from ? "to" : "from";
    if (open && picking === target) return close();
    setPicking(target);
    setView(startOfMonth(target === "to" ? to || from : from || to || new Date()));
    setHover(null);
    setOpen(true);
  };

  const pick = (d) => {
    if (picking === "to" && from) {
      onChange(d < from ? { from: d, to: from } : { from, to: d });
      close();
    } else if (to && d <= to) {
      // only the start date is being changed
      onChange({ from: d, to });
      close();
    } else {
      onChange({ from: d, to: null });
      setPicking("to");
    }
  };

  const preset = (start, end) => {
    onChange({ from: start, to: end });
    setView(startOfMonth(start));
    close();
  };

  const today = startOfDay(new Date());
  const presets = [
    ["Today", () => preset(today, today)],
    ["Yesterday", () => preset(addDays(today, -1), addDays(today, -1))],
    ["Last 7 days", () => preset(addDays(today, -6), today)],
    ["Last 30 days", () => preset(addDays(today, -29), today)],
    [
      "This month",
      () => preset(startOfMonth(today), new Date(today.getFullYear(), today.getMonth() + 1, 0)),
    ],
    [
      "Last month",
      () =>
        preset(
          new Date(today.getFullYear(), today.getMonth() - 1, 1),
          new Date(today.getFullYear(), today.getMonth(), 0),
        ),
    ],
  ];

  const thisYear = today.getFullYear();
  const firstYear = Math.min(thisYear - 6, view.getFullYear());
  const lastYear = Math.max(thisYear + 1, view.getFullYear());
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i);

  const fieldBtn = (field, value) => {
    const active = open && picking === field;
    return (
      <button
        type="button"
        onClick={() => openFor(field)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={field === "from" ? "Start date" : "End date"}
        className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-900 min-w-[9.5rem] transition-colors ${
          active
            ? "border-accent-500 ring-2 ring-accent-500/20"
            : "border-slate-300 dark:border-slate-700 hover:border-accent-500"
        }`}
      >
        <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
        {value ? (
          <span className="font-medium">{fmtDay(value)}</span>
        ) : (
          <span className="text-slate-400">Select date</span>
        )}
      </button>
    );
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-500">From</span>
        {fieldBtn("from", from)}
        <span className="text-sm font-medium text-slate-500">To</span>
        {fieldBtn("to", to)}
        {(from || to) && (
          <button
            type="button"
            onClick={() => {
              onChange({ from: null, to: null });
              close();
            }}
            className="inline-flex items-center gap-1 px-2.5 py-2 text-sm text-slate-500 hover:text-rose-600 transition-colors"
          >
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Choose a date range"
          className="absolute left-0 top-full mt-2 z-40 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl"
        >
          <div className="flex flex-col md:flex-row">
            {/* shortcuts */}
            <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible p-3 md:w-40 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800">
              {presets.map(([label, run]) => (
                <button
                  key={label}
                  type="button"
                  onClick={run}
                  className="shrink-0 text-left whitespace-nowrap px-3 py-1.5 text-sm rounded-lg text-slate-700 dark:text-slate-200 hover:bg-accent-50 dark:hover:bg-accent-500/10 hover:text-accent-700 dark:hover:text-accent-300 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* calendar */}
            <div className="p-4 overflow-x-auto">
              <div className="flex items-center justify-between gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setView(addMonths(view, -1))}
                  aria-label="Previous month"
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2">
                  <select
                    value={view.getMonth()}
                    onChange={(e) => setView(new Date(view.getFullYear(), Number(e.target.value), 1))}
                    aria-label="Month"
                    className="px-2 py-1 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    {MONTHS_LONG.map((m, i) => (
                      <option key={m} value={i}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    value={view.getFullYear()}
                    onChange={(e) => setView(new Date(Number(e.target.value), view.getMonth(), 1))}
                    aria-label="Year"
                    className="px-2 py-1 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setView(addMonths(view, 1))}
                  aria-label="Next month"
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-6" onMouseLeave={() => setHover(null)}>
                <MonthView
                  month={view}
                  from={from}
                  to={to}
                  picking={picking}
                  hover={hover}
                  onPick={pick}
                  onHover={setHover}
                />
                <div className="hidden md:block">
                  <MonthView
                    month={addMonths(view, 1)}
                    from={from}
                    to={to}
                    picking={picking}
                    hover={hover}
                    onPick={pick}
                    onHover={setHover}
                  />
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500" aria-live="polite">
                {picking === "to" && from
                  ? `Now pick the end date (start: ${fmtDay(from)}).`
                  : "Pick the start date, then the end date."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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

        <p className="text-3xl font-extrabold text-center text-accent-600 dark:text-accent-400">
          {dual(total).riel}
          <span className="block text-sm font-medium text-accent-500/70">
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
                  ? "border-accent-600 bg-accent-50 dark:bg-accent-950/30 text-accent-700 dark:text-accent-300"
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
  const [dateFrom, setDateFrom] = useState(null); // first day (a Date) or null
  const [dateTo, setDateTo] = useState(null); // last day (a Date) or null
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
  }, [statusFilter, sourceFilter, query, pageSize, dateFrom, dateTo]);

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
  // the whole first day (00:00) up to the end of the last day (23:59:59), in this computer's time zone
  const fromMs = dateFrom ? startOfDay(dateFrom).getTime() : null;
  const toMs = dateTo ? endOfDay(dateTo).getTime() : null;
  const shown = orders.filter((o) => {
    const t = new Date(o.createdAt).getTime();
    return (
      (statusFilter === "all" || o.status === statusFilter) &&
      (sourceFilter === "all" || o.source === sourceFilter) &&
      (fromMs === null || t >= fromMs) &&
      (toMs === null || t <= toMs) &&
      (!q ||
        [o.orderNumber, o.customer?.name, o.customer?.phone, o.table]
          .join(" ")
          .toLowerCase()
          .includes(q))
    );
  });

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
          className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 hover:border-accent-500 disabled:opacity-60 transition-colors self-start"
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

      {/* date range: From [date] To [date] */}
      <DateRangePicker
        from={dateFrom}
        to={dateTo}
        onChange={({ from, to }) => {
          setDateFrom(from);
          setDateTo(to);
        }}
      />

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

      {(dateFrom || dateTo) && (
        <p className="text-sm text-slate-500" aria-live="polite">
          {dateFrom && dateTo
            ? sameDay(dateFrom, dateTo)
              ? `Orders on ${fmtDay(dateFrom)}`
              : `Orders from ${fmtDay(dateFrom)} to ${fmtDay(dateTo)}`
            : dateFrom
              ? `Orders from ${fmtDay(dateFrom)} onwards`
              : `Orders up to ${fmtDay(dateTo)}`}
          : <b>{shown.length}</b>
        </p>
      )}

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
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-accent-600 hover:bg-accent-700 text-white flex items-center gap-1.5"
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