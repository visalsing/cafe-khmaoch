import React from "react";

export default function ChartCard({ title, subtitle, right, children, className = "" }) {
  return (
    <div
      className={`h-full rounded-2xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/80 ${className}`}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

// the little box that appears when you hover a chart
export function TipBox({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800">
      {title && <p className="mb-0.5 font-semibold text-slate-800 dark:text-white">{title}</p>}
      {children}
    </div>
  );
}