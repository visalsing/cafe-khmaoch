import React from "react";

export default function Themes({ currentTheme, onSelectTheme }) {
  const themes = [
    { id: "light", label: "Light", icon: "☀️" },
    { id: "dark", label: "Dark", icon: "🌙" },
    { id: "system", label: "System", icon: "💻" },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Appearance
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Customize how Café ខ្មោច looks on your device.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-2">
        {themes.map((theme) => {
          const isSelected = currentTheme === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onSelectTheme(theme.id)}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                isSelected
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 shadow-sm"
                  : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-amber-300"
              }`}
            >
              <span className="text-2xl mb-1">{theme.icon}</span>
              <span>{theme.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}