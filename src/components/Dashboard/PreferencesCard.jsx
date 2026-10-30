import React, { useMemo, useState } from "react";
import useLocalized from "../../hooks/useLocalized.js";
import { SIZE_LABEL } from "../../utils/dashboardFormat.js";
import ChartCard from "./ChartCard.jsx";

const TABS = [
  { id: "sugar", label: "Sugar" },
  { id: "ice", label: "Ice" },
  { id: "coffee", label: "Coffee" },
  { id: "size", label: "Size" },
  { id: "type", label: "Hot / Iced" },
];

export default function PreferencesCard({ prefs, range = 7 }) {
  const tr = useLocalized();
  const [tab, setTab] = useState("sugar");

  const rows = useMemo(
    () =>
      (prefs?.[tab] || []).map((r) => ({
        label: tab === "size" ? SIZE_LABEL[r.name] || String(r.name) : tr(r.name),
        qty: r.qty,
      })),
    [prefs, tab, tr],
  );
  const total = rows.reduce((s, r) => s + r.qty, 0);
  const max = Math.max(1, ...rows.map((r) => r.qty));

  return (
    <ChartCard
      title="What Customers Choose"
      subtitle={`Drinks sold per choice · last ${range} days`}
      right={
        <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 p-1 dark:border-slate-700" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === t.id ? "bg-amber-600 text-white" : "text-slate-600 hover:text-amber-600 dark:text-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      }
    >
      {rows.length === 0 ? (
        <div className="flex h-44 items-center justify-center text-sm text-slate-400">No orders with this choice yet</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-200" title={r.label}>
                  {r.label}
                </span>
                <span className="shrink-0 text-slate-500">
                  <b className="text-slate-800 dark:text-white">{r.qty}</b> · {Math.round((r.qty / total) * 100)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${(r.qty / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}