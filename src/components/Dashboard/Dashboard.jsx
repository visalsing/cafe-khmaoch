import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw, Target } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { dashboardService } from "../../services/api";
import { dual } from "../../utils/currency";
import { useDashboard } from "../../utils/useDashboard.js";
import StatsGrid from "./StatsGrid.jsx";
import QueueBoard from "./QueueBoard.jsx";
import ChartSection from "./ChartSection.jsx";
import TableSection from "./TableSection.jsx";
import ActivityFeed from "./ActivityFeed.jsx";
import AdminInsights from "./AdminInsights.jsx";

const RANGES = [7, 30, 90];

/* ---------- the daily goals (administrators) ---------- */
function GoalsModal({ goals, onClose, onSaved }) {
  const [sales, setSales] = useState(goals.sales ? String(goals.sales) : "");
  const [orders, setOrders] = useState(goals.orders ? String(goals.orders) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await dashboardService.setGoals(Number(sales) || 0, Math.round(Number(orders) || 0));
      await onSaved();
      onClose();
    } catch (err) {
      setError(err.message || "Could not save the goals.");
      setBusy(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <form
        onSubmit={save}
        role="dialog"
        aria-modal="true"
        aria-label="Daily goals"
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
      >
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Daily goals</h3>
          <p className="text-sm text-slate-500">They fill the progress bars on the cards. Use 0 to hide a bar.</p>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Sales goal (៛)</span>
          <input type="number" min="0" step="1000" value={sales} onChange={(e) => setSales(e.target.value)} placeholder="800000" className={inputCls} />
          {Number(sales) > 0 && <span className="mt-1 block text-xs text-slate-400">{dual(Number(sales)).usd}</span>}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Orders goal</span>
          <input type="number" min="0" step="1" value={orders} onChange={(e) => setOrders(e.target.value)} placeholder="40" className={inputCls} />
        </label>

        {error && <p role="alert" className="text-sm text-rose-500">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-amber-500 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {busy ? "Saving..." : "Save goals"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, can } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const canManage = isAdmin || Boolean(can?.("orders")); // may the user change order statuses here?

  const [range, setRange] = useState(7);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const { data, loading, refreshing, error, reload, silentReload } = useDashboard(range);

  const updated = data?.generatedAt
    ? new Date(data.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white">Café Overview</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            {updated && ` · updated ${updated}, refreshes by itself`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800" role="group" aria-label="Period">
            {RANGES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRange(n)}
                aria-pressed={range === n}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  range === n ? "bg-amber-600 text-white" : "text-slate-600 hover:text-amber-600 dark:text-slate-300"
                }`}
              >
                {n} days
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={reload}
            disabled={refreshing}
            title="Refresh"
            aria-label="Refresh the dashboard"
            className="rounded-xl border border-slate-200 bg-white p-2.5 transition-colors hover:border-amber-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
          >
            <RotateCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>

          {isAdmin && data && (
            <button
              type="button"
              onClick={() => setGoalsOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Target className="h-4 w-4" /> Goals
            </button>
          )}

          <button
            onClick={() => navigate("/dashboard/pos")}
            className="w-fit rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-amber-700"
          >
            ☕ Open POS
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
          <span className="min-w-0 break-words">{error}</span>
          <button onClick={reload} className="shrink-0 font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* while another period loads, the old numbers stay but fade */}
      <div className={`space-y-6 transition-opacity ${loading && data ? "opacity-60" : ""}`}>
        <StatsGrid data={data} range={range} />

        <QueueBoard orders={data?.open || []} queue={data?.queue} canManage={canManage} onChanged={silentReload} />

        <ChartSection data={data} range={range} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <TableSection recent={data?.recent || []} products={data?.products || []} range={range} />
          </div>
          <div>
            <ActivityFeed recent={data?.recent || []} />
          </div>
        </div>

        {isAdmin && <AdminInsights admin={data?.admin} range={range} />}
      </div>

      {goalsOpen && data && <GoalsModal goals={data.goals} onClose={() => setGoalsOpen(false)} onSaved={silentReload} />}
    </div>
  );
}

export default Dashboard;