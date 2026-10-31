
import React, { useMemo, useState } from "react";
import useLocalized from "../../hooks/useLocalized.js";
import { SIZE_LABEL } from "../../utils/dashboardFormat.js";
import ChartCard from "./ChartCard.jsx";

const TABS = [
  {
    id: "sugar",
    label: "Sugar",
    color: "pink",
    active: "bg-pink-600 text-white",
    gradient: "from-pink-400 to-rose-500",
  },
  {
    id: "ice",
    label: "Ice",
    color: "blue",
    active: "bg-blue-600 text-white",
    gradient: "from-sky-400 to-blue-600",
  },
  {
    id: "coffee",
    label: "Coffee",
    color: "amber",
    active: "bg-amber-800 text-white",
    gradient: "from-amber-600 to-yellow-900",
  },
  {
    id: "size",
    label: "Size",
    color: "purple",
    active: "bg-purple-600 text-white",
    gradient: "from-violet-400 to-purple-600",
  },
  {
    id: "type",
    label: "Hot / Iced",
    color: "teal",
    active: "bg-teal-600 text-white",
    gradient: "from-teal-400 to-emerald-600",
  },
];

export default function PreferencesCard({ prefs, range = 7 }) {
  const tr = useLocalized();
  const [tab, setTab] = useState("sugar");

  const activeTab = TABS.find((t) => t.id === tab) || TABS[0];

  const rows = useMemo(
    () =>
      (prefs?.[tab] || []).map((r) => ({
        label:
          tab === "size"
            ? SIZE_LABEL[r.name] || String(r.name)
            : tr(r.name),
        qty: Number(r.qty) || 0,
      })),
    [prefs, tab, tr],
  );

  const total = rows.reduce((sum, r) => sum + r.qty, 0);
  const max = Math.max(1, ...rows.map((r) => r.qty));

  return (
    <ChartCard
      title="What Customers Choose"
      subtitle={`Drinks sold per choice · last ${range} days`}
      right={
        <div
          className="flex flex-wrap gap-1 rounded-xl border border-slate-200 p-1 dark:border-slate-700"
          role="tablist"
          aria-label="Customer preferences"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                tab === t.id
                  ? `${t.active} shadow-sm`
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      }
    >
      {rows.length === 0 ? (
        <div className="flex h-44 items-center justify-center text-sm text-slate-400">
          No orders with this choice yet
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const percentage =
              total > 0 ? Math.round((r.qty / total) * 100) : 0;

            return (
              <li key={r.label}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span
                    className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-200"
                    title={r.label}
                  >
                    {r.label}
                  </span>

                  <span className="shrink-0 text-slate-500">
                    <b className="text-slate-800 dark:text-white">
                      {r.qty}
                    </b>{" "}
                    · {percentage}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${activeTab.gradient} transition-all duration-500 ease-out`}
                    style={{
                      width: `${(r.qty / max) * 100}%`,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ChartCard>
  );
}
