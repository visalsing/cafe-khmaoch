import React, { useCallback, useEffect, useState } from "react";

export const LANGS = [
  { code: "en", label: "English" },
  { code: "km", label: "ខ្មែរ" },
  { code: "zh", label: "中文" },
  { code: "lo", label: "ລາວ" },
  { code: "ja", label: "日本語" },
  { code: "vi", label: "Tiếng Việt" },
];

export const inputCls =
  "w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-amber-500";

// Show a translated value, falling back to English.
export const tr = (obj, lang = "en") => (obj && (obj[lang] || obj.en)) || "";

// Trim every language and drop the empty ones (the DB only requires "en").
export const cleanI18n = (obj) =>
  Object.fromEntries(
    Object.entries(obj || {})
      .map(([k, v]) => [k, String(v ?? "").trim()])
      .filter(([, v]) => v),
  );

// Accept either [..] or { items | rows | data: [..] } from the API.
export const asList = (d) =>
  Array.isArray(d) ? d : d?.items || d?.rows || d?.data || [];

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

export const money = (n) =>
  n === null || n === undefined || n === "" ? "—" : `$${Number(n).toFixed(2)}`;

export const bySort = (a, b) => (a.sort_num - b.sort_num) || (a.id - b.id);

// `fetcher` must be a stable function (e.g. a service method).
export function useList(fetcher) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setList(asList(await fetcher()));
    } catch (e) {
      setError(e.message || "Could not load data.");
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { list, loading, error, reload };
}

// English is required; other languages are optional and tucked away.
export function I18nInput({ label, value, onChange, multiline = false, placeholder }) {
  const v = value || {};
  const set = (code, text) => onChange({ ...v, [code]: text });
  const Field = multiline ? "textarea" : "input";
  const extra = multiline ? { rows: 2 } : {};
  const othersFilled = LANGS.slice(1).filter((l) => v[l.code]).length;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
        {label} (English){!multiline && " *"}
      </label>
      <Field
        {...extra}
        className={`${inputCls} ${multiline ? "resize-none" : ""}`}
        placeholder={placeholder}
        value={v.en || ""}
        onChange={(e) => set("en", e.target.value)}
      />
      <details className="text-sm">
        <summary className="cursor-pointer text-blue-500">
          Other languages{othersFilled ? ` (${othersFilled} filled)` : ""}
        </summary>
        <div className="mt-2 space-y-2">
          {LANGS.slice(1).map((l) => (
            <div key={l.code} className="flex items-start gap-2">
              <span className="w-16 pt-2 text-xs text-slate-500">{l.label}</span>
              <Field
                {...extra}
                className={`${inputCls} ${multiline ? "resize-none" : ""}`}
                value={v[l.code] || ""}
                onChange={(e) => set(l.code, e.target.value)}
              />
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

export function StatusPill({ status, onClick, on = "Active", off = "Inactive" }) {
  const active = Number(status) === 1;
  return (
    <button
      type="button"
      onClick={onClick}
      title="Click to toggle"
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
      }`}
    >
      {active ? on : off}
    </button>
  );
}