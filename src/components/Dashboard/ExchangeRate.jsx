import React, { useEffect, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  X,
  SlidersHorizontal,
  RotateCcw,
  Coins,
  ExternalLink,
} from "lucide-react";
import {
  exchangeRateService,
  currenciesService,
  countryFlagsService,
  assetUrl,
} from "../../services/api";
import CustomSelect from "./CustomSelect";
import Pagination from "./Pagination";
import {
  inputCls,
  I18nInput,
  useList,
  tr,
  cleanI18n,
  bySort,
  fmtDate,
} from "./Shared.jsx";

const ALERT_STYLES = {
  success:
    "bg-green-50 border-green-500 text-green-800 dark:bg-green-950/30 dark:text-green-300",
  error:
    "bg-red-50 border-red-500 text-red-800 dark:bg-red-950/30 dark:text-red-300",
  warning:
    "bg-yellow-50 border-yellow-500 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300",
};

function Alert({ type = "success", title, children, onClose, action }) {
  return (
    <div
      role="alert"
      className={`relative border-l-4 rounded-r-lg px-4 py-3 ${
        onClose ? "pr-12" : ""
      } ${ALERT_STYLES[type]}`}
    >
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

function Chip({ active, onClick, children }) {
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

function Toggle({ checked, onChange, disabled, label }) {
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

const LANG_LABELS = {
  en: "English",
  km: "ខ្មែរ",
  zh: "中文",
  lo: "ລາວ",
  ja: "日本語",
  vi: "Tiếng Việt",
};

function TextByLang({ value }) {
  const entries = Object.entries(value || {})
    .filter(([, text]) => text)
    .sort(([a], [b]) =>
      a === "en" ? -1 : b === "en" ? 1 : a.localeCompare(b),
    );
  if (entries.length === 0) return <p className="text-slate-400">—</p>;
  return (
    <ul className="space-y-1.5">
      {entries.map(([code, text]) => (
        <li key={code} className="flex gap-3">
          <span className="w-20 shrink-0 pt-0.5 text-xs text-slate-400">
            {LANG_LABELS[code] || code.toUpperCase()}
          </span>
          <span className="text-slate-800 dark:text-slate-100 break-words">
            {text}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-500 mb-0.5">{label}</div>
      <div className="text-sm text-slate-800 dark:text-slate-100">
        {children}
      </div>
    </div>
  );
}

const emptyForm = {
  currencies_id: "",
  value: "",
  description: {},
  country_flags_id: "",
  status: 1,
  sort_num: 0,
};

const formFromRate = (r) => ({
  currencies_id: r.currencies_id ?? "",
  value: r.value ?? "",
  description: r.description || {},
  country_flags_id: r.country_flags_id ?? "",
  status: r.status,
  sort_num: r.sort_num ?? 0,
});

const stableTexts = (o) =>
  Object.fromEntries(
    Object.entries(cleanI18n(o)).sort(([a], [b]) => a.localeCompare(b)),
  );

const fingerprint = (f) =>
  JSON.stringify({
    currencies_id: Number(f.currencies_id),
    value: Number(f.value),
    description: stableTexts(f.description),
    country_flags_id: f.country_flags_id ? Number(f.country_flags_id) : null,
    status: Number(f.status),
    sort_num: Number(f.sort_num),
  });

export default function ExchangeRate() {
  const {
    list: rates,
    loading,
    error,
    reload,
  } = useList(exchangeRateService.list);

  const [currencies, setCurrencies] = useState([]);
  const [flags, setFlags] = useState([]);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [togglingId, setTogglingId] = useState(null);

  const [notice, setNotice] = useState(null);
  const [modalHidden, setModalHidden] = useState(false);
  const noticeRef = useRef(null);

  useEffect(() => {
    currenciesService.list().then(setCurrencies).catch(console.error);
    countryFlagsService.list().then(setFlags).catch(console.error);
  }, []);

  const currencyMap = new Map(currencies.map((c) => [c.id, c]));
  const flagMap = new Map(flags.map((f) => [f.id, f]));

  const notify = (type, title, message, { returnToForm = false } = {}) =>
    setNotice({ id: Date.now(), type, title, message, returnToForm });

  const dismissNotice = () => {
    if (notice?.returnToForm) setModalHidden(false);
    setNotice(null);
  };

  const closeView = () => {
    setViewing(null);
  };

  useEffect(() => {
    if (!notice || notice.type === "error" || notice.returnToForm) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (notice)
      noticeRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
  }, [notice]);

  useEffect(() => {
    if (!viewing) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setViewing(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewing]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, pageSize]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => {
    setForm(emptyForm);
    setNotice(null);
    setModalHidden(false);
    setEditing("new");
  };

  const openEdit = (r) => {
    setForm(formFromRate(r));
    setNotice(null);
    setModalHidden(false);
    setEditing(r);
  };

  const close = () => {
    setEditing(null);
    setModalHidden(false);
  };

  const save = async (e) => {
    e.preventDefault();

    const warn = (message) => {
      setModalHidden(true);
      notify("warning", "Please check the form", message, {
        returnToForm: true,
      });
    };

    if (!form.currencies_id) return warn("A valid currency is required.");
    if (
      form.value === "" ||
      isNaN(Number(form.value)) ||
      Number(form.value) < 0
    )
      return warn("A valid non-negative exchange value is required.");

    const isNew = editing === "new";
    const curr = currencyMap.get(Number(form.currencies_id));
    const itemName = curr ? tr(curr.name) : "Exchange Rate";

    if (!isNew) {
      const textChanged =
        fingerprint(form) !== fingerprint(formFromRate(editing));
      if (!textChanged) {
        close();
        return notify(
          "warning",
          "No changes",
          "There is nothing updated/changed.",
        );
      }
    }

    setSaving(true);
    try {
      const payload = {
        currencies_id: Number(form.currencies_id),
        value: Number(form.value),
        description: cleanI18n(form.description),
        country_flags_id: form.country_flags_id
          ? Number(form.country_flags_id)
          : null,
        status: Number(form.status),
        sort_num: Number(form.sort_num) || 0,
      };

      if (isNew) await exchangeRateService.create(payload);
      else await exchangeRateService.update(editing.id, payload);

      close();
      await reload();
      notify(
        "success",
        isNew ? "Exchange rate added" : "Exchange rate updated",
        isNew
          ? `Exchange rate for "${itemName}" was added successfully.`
          : `Exchange rate for "${itemName}" was updated successfully.`,
      );
    } catch (err) {
      console.error("Error saving exchange rate:", err);
      setModalHidden(true);
      notify(
        "error",
        isNew
          ? "Failed to add exchange rate"
          : "Failed to update exchange rate",
        err.message || "Something went wrong. Please try again.",
        { returnToForm: true },
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (r) => {
    const next = Number(r.status) === 1 ? 0 : 1;
    setTogglingId(r.id);
    try {
      const payload = {
        currencies_id: r.currencies_id,
        value: r.value,
        description: cleanI18n(r.description),
        country_flags_id: r.country_flags_id || null,
        status: next,
        sort_num: r.sort_num || 0,
      };

      await exchangeRateService.update(r.id, payload);
      await reload();
      notify(
        "success",
        "Exchange rate updated",
        next === 1
          ? "Exchange rate was activated successfully."
          : "Exchange rate was hidden successfully.",
      );
    } catch (err) {
      notify(
        "error",
        "Failed to update exchange rate",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const ok = await reload();
      if (ok !== false)
        notify(
          "success",
          "Exchange rates refreshed",
          "Exchange rates were reloaded from database.",
        );
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (r) => {
    if (!window.confirm("Delete this exchange rate?")) return;
    try {
      await exchangeRateService.remove(r.id);
      await reload();
      notify(
        "success",
        "Exchange rate deleted",
        "Exchange rate was deleted successfully.",
      );
    } catch (err) {
      notify(
        "error",
        "Failed to delete exchange rate",
        err.message || "Something went wrong.",
      );
    }
  };

  const activeFilters = statusFilter !== "all" ? 1 : 0;
  const clearFilters = () => setStatusFilter("all");
  const countBy = (fn) => rates.filter(fn).length;

  const shown = [...rates].sort(bySort).filter((r) => {
    if (statusFilter !== "all" && Number(r.status) !== statusFilter)
      return false;
    const curr = currencyMap.get(r.currencies_id);
    const currName = curr ? Object.values(curr.name || {}).join(" ") : "";
    const desc = Object.values(r.description || {}).join(" ");
    const searchable = `${currName} ${r.value} ${desc}`.toLowerCase();
    return searchable.includes(query.toLowerCase());
  });

  const totalPages = Math.max(1, Math.ceil(shown.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedShown =
    pageSize === "all"
      ? shown
      : shown.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Exchange Rate Manager</h1>
          <p className="text-sm text-slate-500">
            Manage exchange values, target currencies, and flag mappings.
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 hover:border-amber-500 disabled:opacity-60 transition-colors"
          >
            <RotateCcw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            type="button"
            onClick={openNew}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add exchange rate
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exchange rates..."
          className={`${inputCls} sm:max-w-xs`}
        />
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 hover:border-amber-500 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>
        <a
          href="https://www.nbc.gov.kh/english/economic_research/exchange_rate.php"
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 hover:border-amber-500 bg-white dark:bg-slate-900 transition-colors"
        >
          <Coins className="w-4 h-4 text-amber-600" />
          <span>National Bank of Cambodia</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </a>
      </div>

      {showFilters && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-sm">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500">Status</div>
            <div className="flex flex-wrap gap-2">
              <Chip
                active={statusFilter === "all"}
                onClick={() => setStatusFilter("all")}
              >
                All
              </Chip>
              <Chip
                active={statusFilter === 1}
                onClick={() => setStatusFilter(1)}
              >
                Active ({countBy((r) => Number(r.status) === 1)})
              </Chip>
              <Chip
                active={statusFilter === 0}
                onClick={() => setStatusFilter(0)}
              >
                Hidden ({countBy((r) => Number(r.status) === 0)})
              </Chip>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div ref={noticeRef}>
          <Alert
            key={notice.id}
            type={notice.type}
            title={notice.title}
            onClose={dismissNotice}
            action={
              notice.returnToForm && (
                <button
                  type="button"
                  onClick={dismissNotice}
                  className="ml-2 font-semibold underline"
                >
                  Back to the form
                </button>
              )
            }
          >
            {notice.message}
          </Alert>
        </div>
      )}

      {error && (
        <Alert type="error" title="Could not load exchange rates">
          {error}
        </Alert>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4">Currency</th>
              <th className="p-4">Exchange Value</th>
              <th className="p-4">Country Flag</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="p-4 text-center text-slate-400" colSpan={5}>
                  Loading...
                </td>
              </tr>
            )}
            {!loading &&
              paginatedShown.map((r) => {
                const isActive = Number(r.status) === 1;
                const curr = currencyMap.get(r.currencies_id);
                const flag = flagMap.get(r.country_flags_id);

                // Get the SVG asset path (falls back safely if none attached)
                const flagSvgUrl = flag?.svg ? assetUrl(flag.svg) : null;

                return (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50"
                  >
                    {/* Currency Name & Symbol */}
                    <td className="p-4">
                      <div className="font-semibold">
                        {curr ? tr(curr.name) : "—"}
                      </div>
                      <div className="text-xs font-mono font-bold text-amber-600">
                        {curr?.currency_symbol || ""}
                      </div>
                    </td>

                    {/* Exchange Value */}
                    <td className="p-4 font-mono font-bold text-slate-800 dark:text-slate-100">
                      {Number(r.value).toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 6,
                      })}
                    </td>

                    {/* Country Flag (SVG + Name) */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {flagSvgUrl ? (
                          <img
                            src={flagSvgUrl}
                            alt=""
                            className="w-8 h-6 object-contain rounded bg-slate-100 dark:bg-slate-800 p-0.5 shadow-sm"
                          />
                        ) : (
                          <div className="w-8 h-6 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
                            —
                          </div>
                        )}
                        <span className="text-slate-700 dark:text-slate-300">
                          {flag ? tr(flag.name) : "—"}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {isActive ? "Active" : "Hidden"}
                        </span>
                        <Toggle
                          checked={isActive}
                          disabled={togglingId === r.id}
                          onChange={() => toggleStatus(r)}
                        />
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setViewing(r)}
                          className="p-2 rounded-lg hover:bg-slate-100 text-sky-600"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="p-2 rounded-lg hover:bg-slate-100"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(r)}
                          className="p-2 rounded-lg hover:bg-rose-50 text-rose-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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

      {viewing && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeView}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-lg font-bold">Exchange rate details</h3>
              <button
                type="button"
                onClick={closeView}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
              {/* Highlighted Value Card */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Exchange Value
                  </span>
                  <div className="text-2xl font-black font-mono text-amber-700 dark:text-amber-300 mt-0.5">
                    {viewing.value !== undefined
                      ? Number(viewing.value).toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 6,
                        })
                      : "—"}
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    Number(viewing.status) === 1
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {Number(viewing.status) === 1 ? "Active" : "Hidden"}
                </span>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Currency">
                  <div className="font-semibold text-slate-800 dark:text-slate-100">
                    {currencyMap.get(viewing.currencies_id)
                      ? tr(currencyMap.get(viewing.currencies_id).name)
                      : "—"}
                    {currencyMap.get(viewing.currencies_id)
                      ?.currency_symbol && (
                      <span className="ml-2 font-mono text-amber-600 text-xs">
                        (
                        {currencyMap.get(viewing.currencies_id).currency_symbol}
                        )
                      </span>
                    )}
                  </div>
                </Field>

                <Field label="Country Flag">
                  {(() => {
                    const flag = flagMap.get(viewing.country_flags_id);
                    const flagSvgUrl = flag?.svg ? assetUrl(flag.svg) : null;
                    return flag ? (
                      <div className="flex items-center gap-2">
                        {flagSvgUrl ? (
                          <img
                            src={flagSvgUrl}
                            alt=""
                            className="w-6 h-4 object-contain rounded bg-slate-100 dark:bg-slate-800 p-0.5 shadow-sm"
                          />
                        ) : (
                          <div className="w-6 h-4 rounded bg-slate-200 dark:bg-slate-800" />
                        )}
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          {tr(flag.name)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    );
                  })()}
                </Field>
              </div>

              <Field label="Description">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                  <TextByLang value={viewing.description} />
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                <div>
                  <span className="block font-semibold text-slate-500">
                    Created
                  </span>
                  {fmtDate(viewing.created_at)}
                </div>
                <div>
                  <span className="block font-semibold text-slate-500">
                    Updated
                  </span>
                  {fmtDate(viewing.updated_at)}
                </div>
              </div>
            </div>

            <div className="flex justify-end px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={closeView}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div
          className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm items-center justify-center p-4 ${modalHidden ? "hidden" : "flex"}`}
        >
          <form
            onSubmit={save}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col relative"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-lg font-bold">
                {editing === "new" ? "Add Exchange Rate" : "Edit Exchange Rate"}
              </h3>
              <button
                type="button"
                onClick={close}
                className="p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Currency
                  </label>
                  <CustomSelect
                    value={form.currencies_id}
                    onChange={(v) => setField("currencies_id", v)}
                    options={currencies.map((c) => ({
                      value: c.id,
                      label: `${tr(c.name)}${c.currency_symbol ? ` (${c.currency_symbol})` : ""}`,
                    }))}
                    placeholder="Select Currency..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Exchange Value
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={form.value}
                    onChange={(e) => setField("value", e.target.value)}
                    placeholder="e.g. 1 or 4100"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Country Flag
                  </label>
                  <CustomSelect
                    value={form.country_flags_id}
                    onChange={(v) => setField("country_flags_id", v)}
                    options={[
                      { value: "", label: "No country flag" },
                      ...flags.map((f) => {
                        const flagSvgUrl = f.svg ? assetUrl(f.svg) : null;
                        return {
                          value: f.id,
                          label: (
                            <span className="flex items-center gap-2">
                              {flagSvgUrl ? (
                                <img
                                  src={flagSvgUrl}
                                  alt=""
                                  className="w-5 h-4 object-contain rounded bg-slate-100 dark:bg-slate-800 p-0.5 shrink-0"
                                />
                              ) : (
                                <span className="w-5 h-4 rounded bg-slate-200 dark:bg-slate-800 inline-block shrink-0" />
                              )}
                              <span className="truncate">{tr(f.name)}</span>
                            </span>
                          ),
                        };
                      }),
                    ]}
                    placeholder="Select Country Flag..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Sort Number
                  </label>
                  <input
                    type="number"
                    value={form.sort_num}
                    onChange={(e) => setField("sort_num", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <I18nInput
                label="Description"
                value={form.description}
                onChange={(v) => setField("description", v)}
              />
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 rounded-xl border border-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                {saving ? "Saving..." : "Save Exchange Rate"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
