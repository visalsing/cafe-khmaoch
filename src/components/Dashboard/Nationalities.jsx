import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  X,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import { nationalitiesService, countryFlagsService } from "../../services/api";
import {
  inputCls,
  I18nInput,
  useList,
  asList,
  tr,
  cleanI18n,
  bySort,
  fmtDate,
} from "./Shared.jsx";

/* ---------- Alert Component ---------- */
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

const fmtDateTime = (v) => (v ? new Date(v).toLocaleString() : "—");

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
            {code.toUpperCase()}
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
  nationality: {},
  nation_code: "",
  country_flags_id: "",
  status: 0,
  sort_num: 0,
};

const formFromNationality = (n) => ({
  nationality: n.nationality || {},
  nation_code: n.nation_code || "",
  country_flags_id: n.country_flags_id ?? "",
  status: n.status,
  sort_num: n.sort_num ?? 0,
});

const stableTexts = (o) =>
  Object.fromEntries(
    Object.entries(cleanI18n(o)).sort(([a], [b]) => a.localeCompare(b)),
  );

const fingerprint = (f) =>
  JSON.stringify({
    nationality: stableTexts(f.nationality),
    nation_code: String(f.nation_code || ""),
    country_flags_id:
      f.country_flags_id === "" ? null : Number(f.country_flags_id),
    status: Number(f.status),
    sort_num: Number(f.sort_num) || 0,
  });

export default function NationalitiesManager() {
  const {
    list: nationalities,
    loading,
    error,
    reload,
  } = useList(nationalitiesService.list);

  const [flags, setFlags] = useState([]);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | 0 (active) | 1 (not active)
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [togglingId, setTogglingId] = useState(null);

  const [notice, setNotice] = useState(null);
  const [modalHidden, setModalHidden] = useState(false);
  const noticeRef = useRef(null);

  const notify = (type, title, message, { returnToForm = false } = {}) =>
    setNotice({ id: Date.now(), type, title, message, returnToForm });

  const dismissNotice = () => {
    if (notice?.returnToForm) setModalHidden(false);
    setNotice(null);
  };

  const closeView = () => setViewing(null);

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

  const loadFlags = () =>
    countryFlagsService
      .list()
      .then((d) => setFlags(asList(d)))
      .catch(() => {});

  useEffect(() => {
    loadFlags();
  }, []);

  const flagMap = useMemo(
    () => new Map(flags.map((f) => [f.id, tr(f.name)])),
    [flags],
  );
  const flagNameMap = (id) => {
    const f = flags.find((item) => item.id === id);
    return f ? tr(f.name) : "—";
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => {
    setForm(emptyForm);
    setNotice(null);
    setModalHidden(false);
    setEditing("new");
  };

  const openEdit = (n) => {
    setForm(formFromNationality(n));
    setNotice(null);
    setModalHidden(false);
    setEditing(n);
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

    if (!form.nationality.en?.trim())
      return warn("The English nationality name is required.");

    const isNew = editing === "new";
    const itemName = form.nationality.en.trim();

    if (!isNew) {
      const textChanged =
        fingerprint(form) !== fingerprint(formFromNationality(editing));
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
        nationality: cleanI18n(form.nationality),
        nation_code: form.nation_code,
        country_flags_id:
          form.country_flags_id === "" ? null : Number(form.country_flags_id),
        status: Number(form.status) === 1 ? 1 : 0,
        sort_num: Number(form.sort_num) || 0,
      };

      if (isNew) await nationalitiesService.create(payload);
      else await nationalitiesService.update(editing.id, payload);

      close();
      await reload();
      notify(
        "success",
        isNew ? "Nationality added" : "Nationality updated",
        isNew
          ? `"${itemName}" was added successfully.`
          : `"${itemName}" was updated successfully.`,
      );
    } catch (err) {
      console.error("Error saving nationality:", err);
      setModalHidden(true);
      notify(
        "error",
        isNew
          ? "Failed to add the nationality"
          : "Failed to update the nationality",
        err.message || "Something went wrong. Please try again.",
        { returnToForm: true },
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (n) => {
    const next = Number(n.status) === 0 ? 1 : 0;
    setTogglingId(n.id);
    try {
      await nationalitiesService.update(n.id, {
        nationality: n.nationality,
        nation_code: n.nation_code,
        country_flags_id: n.country_flags_id,
        status: next,
        sort_num: n.sort_num,
      });
      await reload();
      notify(
        "success",
        "Nationality updated",
        next === 0
          ? `"${tr(n.nationality)}" is now active.`
          : `"${tr(n.nationality)}" is now hidden.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to update status",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([reload(), loadFlags()]);
      notify(
        "success",
        "Nationalities refreshed",
        "Data reloaded successfully.",
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (n) => {
    if (!window.confirm(`Delete nationality "${tr(n.nationality)}"?`)) return;
    try {
      await nationalitiesService.remove(n.id);
      await reload();
      notify(
        "success",
        "Nationality deleted",
        `"${tr(n.nationality)}" was deleted successfully.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to delete nationality",
        err.message || "Something went wrong. Please try again.",
      );
    }
  };

  const activeFilters = statusFilter !== "all" ? 1 : 0;
  const clearFilters = () => setStatusFilter("all");
  const countBy = (fn) => nationalities.filter(fn).length;

  const shown = [...nationalities].sort(bySort).filter((n) => {
    if (statusFilter !== "all" && Number(n.status) !== statusFilter)
      return false;
    return Object.values(n.nationality || {})
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

  const lightboxInfo = viewing ? (
    <div className="space-y-3 text-sm">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
          Nationality Name
        </span>
        <p className="mt-1 font-medium">{tr(viewing.nationality)}</p>
      </div>
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
          Nation Code
        </span>
        <p className="mt-1 text-slate-300 text-xs">
          {viewing.nation_code || "—"}
        </p>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      <style>{`
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(203, 213, 225, 0.6); border-radius: 9999px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.8); }
      `}</style>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Nationalities Manager</h1>
          <p className="text-sm text-slate-500">
            Manage multilingual nationalities and link them with country flags.
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <button
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
            onClick={openNew}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add nationality
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search nationalities..."
          className={`${inputCls} sm:max-w-xs`}
        />
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 hover:border-amber-500 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {showFilters ? "Hide Filters" : "Show Filters"}
          {activeFilters > 0 && (
            <span className="px-1.5 rounded-full bg-amber-600 text-white text-xs leading-5">
              {activeFilters}
            </span>
          )}
        </button>
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
                active={statusFilter === 0}
                onClick={() => setStatusFilter(0)}
              >
                Active ({countBy((n) => Number(n.status) === 0)})
              </Chip>
              <Chip
                active={statusFilter === 1}
                onClick={() => setStatusFilter(1)}
              >
                Not Active ({countBy((n) => Number(n.status) === 1)})
              </Chip>
            </div>
          </div>
          {activeFilters > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-amber-600 font-medium underline"
            >
              Clear filters
            </button>
          )}
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
        <Alert
          type="error"
          title="Could not load nationalities"
          action={
            <button onClick={reload} className="ml-2 font-semibold underline">
              Retry
            </button>
          }
        >
          {error}
        </Alert>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4">Sort #</th>
              <th className="p-4">Nationality Name</th>
              <th className="p-4">Nation Code</th>
              <th className="p-4">Country Flag</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="p-4 text-center text-slate-400" colSpan={6}>
                  Loading...
                </td>
              </tr>
            )}
            {!loading && shown.length === 0 && (
              <tr>
                <td className="p-4 text-center text-slate-400" colSpan={6}>
                  {nationalities.length === 0
                    ? "No nationalities yet."
                    : "No nationalities match your filters."}
                </td>
              </tr>
            )}
            {!loading &&
              paginatedShown.map((n) => {
                const isActive = Number(n.status) === 0;
                return (
                  <tr
                    key={n.id}
                    className="border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="p-4 font-mono text-xs text-slate-500">
                      {n.sort_num ?? 0}
                    </td>
                    <td className="p-4 font-semibold">{tr(n.nationality)}</td>
                    <td className="p-4 font-mono text-xs">
                      {n.nation_code || "—"}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      {flagNameMap(n.country_flags_id)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {isActive ? "Active" : "Not Active"}
                        </span>
                        <Toggle
                          checked={isActive}
                          disabled={togglingId === n.id}
                          label={
                            isActive
                              ? "Deactivate nationality"
                              : "Activate nationality"
                          }
                          onChange={() => toggleStatus(n)}
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setViewing(n)}
                          title="View"
                          aria-label="View details"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(n)}
                          title="Edit"
                          aria-label="Edit"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(n)}
                          title="Delete"
                          aria-label="Delete"
                          className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 transition-colors"
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

      {/* ===== VIEW modal ===== */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeView}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Nationality details"
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-lg font-bold">Nationality details</h3>
              <button
                type="button"
                onClick={closeView}
                aria-label="Close"
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <section className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Nationality Name
                </h5>
                <TextByLang value={viewing.nationality} />
              </section>

              <section className="grid grid-cols-2 gap-4">
                <Field label="Nation Code">{viewing.nation_code || "—"}</Field>
                <Field label="Country Flag">
                  {flagNameMap(viewing.country_flags_id)}
                </Field>
                <Field label="Sort Number">{viewing.sort_num ?? 0}</Field>
                <Field label="Status">
                  {Number(viewing.status) === 0 ? "Active" : "Not Active"}
                </Field>
                <Field label="Created">{fmtDateTime(viewing.created_at)}</Field>
                <Field label="Updated">{fmtDateTime(viewing.updated_at)}</Field>
              </section>
            </div>

            <div className="grid grid-cols-2 gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={closeView}
                className="py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const n = viewing;
                  closeView();
                  openEdit(n);
                }}
                className="py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD / EDIT modal ===== */}
      {editing && (
        <div
          className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm items-center justify-center p-4 ${
            modalHidden ? "hidden" : "flex"
          }`}
        >
          <form
            onSubmit={save}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative"
          >
            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 z-10 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-lg font-bold">
                {editing === "new" ? "Add nationality" : "Edit nationality"}
              </h3>
              <button
                type="button"
                onClick={close}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Nationality Name (all languages)
                </h4>
                <I18nInput
                  expanded
                  required
                  label="Nationality"
                  value={form.nationality}
                  onChange={(v) => setField("nationality", v)}
                  placeholder="e.g. Cambodian"
                />
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-600">
                    Nation Code
                  </label>
                  <input
                    type="text"
                    className={`${inputCls} w-full`}
                    value={form.nation_code}
                    onChange={(e) => setField("nation_code", e.target.value)}
                    placeholder="e.g. KH"
                  />
                </section>

                <section className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-600">
                    Country Flag
                  </label>
                  <select
                    className={`${inputCls} w-full`}
                    value={form.country_flags_id}
                    onChange={(e) =>
                      setField("country_flags_id", e.target.value)
                    }
                  >
                    <option value="">-- None --</option>
                    {flags.map((f) => (
                      <option key={f.id} value={f.id}>
                        {tr(f.name)}
                      </option>
                    ))}
                  </select>
                </section>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-600">
                    Sort Number
                  </label>
                  <input
                    type="number"
                    className={`${inputCls} w-full`}
                    value={form.sort_num}
                    onChange={(e) => setField("sort_num", e.target.value)}
                    placeholder="0"
                  />
                </section>

                <section className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-600">
                    Status
                  </label>
                  <select
                    className={`${inputCls} w-full`}
                    value={form.status}
                    onChange={(e) => setField("status", Number(e.target.value))}
                  >
                    <option value={0}>Active</option>
                    <option value={1}>Not Active</option>
                  </select>
                </section>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={close}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-60"
              >
                {saving && <RotateCcw className="w-4 h-4 animate-spin" />}
                {editing === "new" ? "Create nationality" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
