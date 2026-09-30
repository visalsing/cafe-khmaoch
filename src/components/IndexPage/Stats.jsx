import React from "react";

export default function Stats({ stats }) {
  return (
    <section id="stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {stats.map((stat, idx) => (
        <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              {stat.change}
            </span>
          </div>
        </div>
      ))}
    </section>
  );
}