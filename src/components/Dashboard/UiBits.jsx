import React from "react";
import { X } from "lucide-react";

const ALERT_STYLES = {
  success: "bg-green-50 border-green-500 text-green-800 dark:bg-green-950/30 dark:text-green-300",
  error: "bg-red-50 border-red-500 text-red-800 dark:bg-red-950/30 dark:text-red-300",
  warning: "bg-yellow-50 border-yellow-500 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300",
};

// left accent border + close (X) button
export function Alert({ type = "success", title, children, onClose, action }) {
  return (
    <div role="alert" className={`relative border-l-4 rounded-r-lg px-4 py-3 ${onClose ? "pr-12" : ""} ${ALERT_STYLES[type]}`}>
      {title && <p className="font-bold">{title}</p>}
      <p className="text-sm">
        {children}
        {action}
      </p>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-0 bottom-0 right-0 px-4 flex items-center opacity-60 hover:opacity-100 transition-opacity"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

// pill button (filters, multi-select)
export function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
        active
          ? "bg-amber-600 border-amber-600 text-white"
          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-500"
      }`}
    >
      {children}
    </button>
  );
}

// on/off switch
export function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 disabled:opacity-50 disabled:cursor-wait ${
        checked ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export const LANG_LABELS = { en: "English", km: "ខ្មែរ", zh: "中文", lo: "ລາວ", ja: "日本語", vi: "Tiếng Việt" };
export const fmtDate = (v) => (v ? new Date(v).toLocaleString() : "—");

// all translations of one text, English first
export function TextByLang({ value }) {
  const entries = Object.entries(value || {})
    .filter(([, text]) => text)
    .sort(([a], [b]) => (a === "en" ? -1 : b === "en" ? 1 : a.localeCompare(b)));
  if (entries.length === 0) return <p className="text-slate-400">—</p>;
  return (
    <ul className="space-y-1.5">
      {entries.map(([code, text]) => (
        <li key={code} className="flex gap-3">
          <span className="w-20 shrink-0 pt-0.5 text-xs text-slate-400">{LANG_LABELS[code] || code.toUpperCase()}</span>
          <span className="text-slate-800 dark:text-slate-100 break-words">{text}</span>
        </li>
      ))}
    </ul>
  );
}

export function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-500 mb-0.5">{label}</div>
      <div className="text-sm text-slate-800 dark:text-slate-100">{children}</div>
    </div>
  );
}