import React, { useEffect, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  X,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import { currenciesService, countryFlagsService } from "../../services/api";
import ImageLightbox from "./ImageLightbox";
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
  name: {},
  currency_symbol: "",
  description: {},
  country_flags_id: "",
  status: 1,
  sort_num: 0,
};

const formFromCurrency = (c) => ({
  name: c.name || {},
  currency_symbol: c.currency_symbol || "",
  description: c.description || {},
  country_flags_id: c.country_flags_id ?? "",
  status: c.status,
  sort_num: c.sort_num ?? 0,
});

const stableTexts = (o) =>
  Object.fromEntries(
    Object.entries(cleanI18n(o)).sort(([a], [b]) => a.localeCompare(b)),
  );

const fingerprint = (f) =>
  JSON.stringify({
    name: stableTexts(f.name),
    currency_symbol: f.currency_symbol,
    description: stableTexts(f.description),
    country_flags_id: f.country_flags_id,
    status: Number(f.status),
    sort_num: Number(f.sort_num),
  });

export default function Currencies() {
  const {
    list: currencies,
    loading,
    error,
    reload,
  } = useList(currenciesService.list);

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
    countryFlagsService.list().then(setFlags).catch(console.error);
  }, []);

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

  const openEdit = (c) => {
    setForm(formFromCurrency(c));
    setNotice(null);
    setModalHidden(false);
    setEditing(c);
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

    if (!form.name.en?.trim()) return warn("The English name is required.");

    const isNew = editing === "new";
    const itemName = form.name.en.trim();

    if (!isNew) {
      const textChanged =
        fingerprint(form) !== fingerprint(formFromCurrency(editing));
      if (!textChanged) {
        close();
        return notify("warning", "No changes", "There is nothing updated/changed.");
      }
    }

    setSaving(true);
    try {
      const payload = {
        name: cleanI18n(form.name),
        currency_symbol: form.currency_symbol || null,
        description: cleanI18n(form.description),
        country_flags_id: form.country_flags_id ? Number(form.country_flags_id) : null,
        status: Number(form.status),
        sort_num: Number(form.sort_num) || 0,
      };

      if (isNew) await currenciesService.create(payload);
      else await currenciesService.update(editing.id, payload);

      close();
      await reload();
      notify(
        "success",
        isNew ? "Currency added" : "Currency updated",
        isNew
          ? `"${itemName}" was added successfully.`
          : `"${itemName}" was updated successfully.`,
      );
    } catch (err) {
      console.error("Error saving currency:", err);
      setModalHidden(true);
      notify(
        "error",
        isNew ? "Failed to add the currency" : "Failed to update the currency",
        err.message || "Something went wrong. Please try again.",
        { returnToForm: true },
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (c) => {
    const next = Number(c.status) === 1 ? 0 : 1;
    setTogglingId(c.id);
    try {
      const payload = {
        name: cleanI18n(c.name),
        currency_symbol: c.currency_symbol || null,
        description: cleanI18n(c.description),
        country_flags_id: c.country_flags_id || null,
        status: next,
        sort_num: c.sort_num || 0,
      };

      await currenciesService.update(c.id, payload);
      await reload();
      notify(
        "success",
        "Currency updated",
        next === 1
          ? `"${tr(c.name)}" was activated successfully.`
          : `"${tr(c.name)}" was hidden successfully.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to update the currency",
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
        notify("success", "Currencies refreshed", "Currencies were reloaded from database.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete currency "${tr(c.name)}"?`)) return;
    try {
      await currenciesService.remove(c.id);
      await reload();
      notify("success", "Currency deleted", `"${tr(c.name)}" was deleted successfully.`);
    } catch (err) {
      notify("error", "Failed to delete the currency", err.message || "Something went wrong.");
    }
  };

  const activeFilters = statusFilter !== "all" ? 1 : 0;
  const clearFilters = () => setStatusFilter("all");
  const countBy = (fn) => currencies.filter(fn).length;

  const shown = [...currencies].sort(bySort).filter((c) => {
    if (statusFilter !== "all" && Number(c.status) !== statusFilter)
      return false;
    return Object.values(c.name || {})
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase());
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
          <h1 className="text-2xl font-extrabold">Currencies Manager</h1>
          <p className="text-sm text-slate-500">
            Manage store currencies, symbols, and formatting flags.
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 hover:border-amber-500 disabled:opacity-60 transition-colors"
          >
            <RotateCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={openNew}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add currency
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search currencies..."
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
      </div>

      {showFilters && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-sm">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500">Status</div>
            <div className="flex flex-wrap gap-2">
              <Chip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
                All
              </Chip>
              <Chip active={statusFilter === 1} onClick={() => setStatusFilter(1)}>
                Active ({countBy((c) => Number(c.status) === 1)})
              </Chip>
              <Chip active={statusFilter === 0} onClick={() => setStatusFilter(0)}>
                Hidden ({countBy((c) => Number(c.status) === 0)})
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
        <Alert type="error" title="Could not load currencies">
          {error}
        </Alert>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4">Currency</th>
              <th className="p-4">Symbol</th>
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
            {!loading && paginatedShown.map((c) => {
              const isActive = Number(c.status) === 1;
              const flag = flagMap.get(c.country_flags_id);
              return (
                <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50">
                  <td className="p-4 font-semibold">{tr(c.name)}</td>
                  <td className="p-4 font-mono font-bold text-amber-600">{c.currency_symbol || "—"}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">
                    {flag ? tr(flag.name) : "—"}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                        {isActive ? "Active" : "Hidden"}
                      </span>
                      <Toggle
                        checked={isActive}
                        disabled={togglingId === c.id}
                        onChange={() => toggleStatus(c)}
                      />
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setViewing(c)} className="p-2 rounded-lg hover:bg-slate-100 text-sky-600">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-slate-100">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c)} className="p-2 rounded-lg hover:bg-rose-50 text-rose-500">
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

      <Pagination page={currentPage} pageSize={pageSize} total={shown.length} onPage={setPage} onPageSize={setPageSize} />

      {viewing && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeView}>
          <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-lg font-bold">Currency details</h3>
              <button type="button" onClick={closeView} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <Field label="Name"><TextByLang value={viewing.name} /></Field>
              <Field label="Symbol">{viewing.currency_symbol || "—"}</Field>
              <Field label="Description"><TextByLang value={viewing.description} /></Field>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm items-center justify-center p-4 ${modalHidden ? "hidden" : "flex"}`}>
          <form onSubmit={save} className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col relative">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-lg font-bold">{editing === "new" ? "Add Currency" : "Edit Currency"}</h3>
              <button type="button" onClick={close} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Currency Symbol</label>
                  <input
                    value={form.currency_symbol}
                    onChange={(e) => setField("currency_symbol", e.target.value)}
                    placeholder="e.g. ៛ or $"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Country Flag</label>
                  <CustomSelect
                    value={form.country_flags_id}
                    onChange={(v) => setField("country_flags_id", v)}
                    options={flags.map((f) => ({ value: f.id, label: tr(f.name) }))}
                    placeholder="Select Country Flag..."
                  />
                </div>
              </div>

              <I18nInput expanded required label="Name" value={form.name} onChange={(v) => setField("name", v)} />
              <I18nInput label="Description" value={form.description} onChange={(v) => setField("description", v)} />
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button type="button" onClick={close} className="px-4 py-2 rounded-xl border border-slate-300 font-semibold">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                {saving ? "Saving..." : "Save Currency"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}