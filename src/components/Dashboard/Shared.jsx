import React, { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export const LANGS = [
  { code: "en", label: "English" },
  { code: "km", label: "ខ្មែរ" },
  { code: "zh", label: "中文" },
  { code: "lo", label: "ລາວ" },
  { code: "ja", label: "日本語" },
  // { code: "vi", label: "Tiếng Việt" },
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

export const bySort = (a, b) => a.sort_num - b.sort_num || a.id - b.id;

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
      return true; // loaded
    } catch (e) {
      setError(e.message || "Could not load data.");
      return false; // failed (the error is also kept in `error`)
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
export function I18nInput({
  label,
  value,
  onChange,
  multiline = false,
  placeholder,
  required = !multiline,
}) {
  const v = value || {};
  const set = (code, text) => onChange({ ...v, [code]: text });
  const Field = multiline ? "textarea" : "input";
  const extra = multiline ? { rows: 2 } : {};
  const othersFilled = LANGS.slice(1).filter((l) => v[l.code]).length;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
        {label} (English){required && " *"}
      </label>
      <Field
        {...extra}
        className={`${inputCls} ${multiline ? "resize-none" : ""}`}
        placeholder={placeholder}
        value={v.en || ""}
        onChange={(e) => set("en", e.target.value)}
      />
      <details className="text-sm">
        <summary className="cursor-pointer text-amber-500">
          Other languages{othersFilled ? ` (${othersFilled} filled)` : ""}
        </summary>
        <div className="mt-2 ml-2 pl-3 space-y-2 border-l-2 border-amber-500">
          {LANGS.slice(1).map((l) => (
            <div key={l.code} className="flex items-center gap-2">
              <span className="w-16 text-xs text-slate-500">{l.label}</span>
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

export function StatusPill({
  status,
  onClick,
  on = "Active",
  off = "Inactive",
}) {
  const active = Number(status) === 1;
  return (
    <button
      type="button"
      onClick={onClick}
      title="Click to toggle"
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        active
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-200 text-slate-600"
      }`}
    >
      {active ? on : off}
    </button>
  );
}

/* =========================================================
   Pagination (client side): rows-per-page select + « ‹ 1 2 3 › »
   ========================================================= */
export const PAGE_SIZES = [10, 20, 30, 40, 50, 100];

function PageButton({ children, onClick, disabled, active, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      className={`min-w-9 h-9 px-2 inline-flex items-center justify-center rounded-lg text-sm font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? "bg-amber-600 border-amber-600 text-white"
          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-500 disabled:hover:border-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
  sizes = PAGE_SIZES,
}) {
  if (!total) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(page, 1), totalPages);
  const from = (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  // show at most 5 page numbers around the current page
  const windowSize = 5;
  let start = Math.max(1, current - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages = [];
  for (let i = start; i <= end; i++) pages.push(i);

  const atStart = current === 1;
  const atEnd = current === totalPages;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-slate-500">
        <label className="flex items-center gap-2">
          Rows per page
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className="px-3 py-1.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-amber-500"
          >
            {sizes.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <span>
          Showing {from}–{to} of {total}
        </span>
      </div>

      <nav className="flex items-center gap-1" aria-label="Pagination">
        <PageButton label="First page" disabled={atStart} onClick={() => onPage(1)}>
          <ChevronsLeft className="w-4 h-4" />
        </PageButton>
        <PageButton
          label="Previous page"
          disabled={atStart}
          onClick={() => onPage(current - 1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </PageButton>

        {pages.map((n) => (
          <PageButton
            key={n}
            label={`Page ${n}`}
            active={n === current}
            onClick={() => onPage(n)}
          >
            {n}
          </PageButton>
        ))}

        <PageButton
          label="Next page"
          disabled={atEnd}
          onClick={() => onPage(current + 1)}
        >
          <ChevronRight className="w-4 h-4" />
        </PageButton>
        <PageButton
          label="Last page"
          disabled={atEnd}
          onClick={() => onPage(totalPages)}
        >
          <ChevronsRight className="w-4 h-4" />
        </PageButton>
      </nav>
    </div>
  );
}