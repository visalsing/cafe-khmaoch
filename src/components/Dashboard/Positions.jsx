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
import { positionsService } from "../../services/api";
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

const LANG_LABELS = {
  en: "English",
  km: "ខ្មែរ",
  zh: "中文",
  lo: "ລາវ",
  ja: "日本語",
  vi: "Tiếng Việt",
};

const fmtDateTime = (v) => (v ? new Date(v).toLocaleString() : "—");

// Render title arrays
function ArrayByLang({ value }) {
  const entries = Object.entries(value || {})
    .filter(([, arr]) => Array.isArray(arr) ? arr.length > 0 : Boolean(arr))
    .sort(([a], [b]) => (a === "en" ? -1 : b === "en" ? 1 : a.localeCompare(b)));

  if (entries.length === 0) return <p className="text-slate-400">—</p>;

  return (
    <ul className="space-y-1.5">
      {entries.map(([code, arr]) => {
        const text = Array.isArray(arr) ? arr.join(", ") : String(arr);
        return (
          <li key={code} className="flex gap-3">
            <span className="w-20 shrink-0 pt-0.5 text-xs text-slate-400">
              {LANG_LABELS[code] || code.toUpperCase()}
            </span>
            <span className="text-slate-800 dark:text-slate-100 break-words font-medium">
              {text}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function TextByLang({ value }) {
  const entries = Object.entries(value || {})
    .filter(([, text]) => text)
    .sort(([a], [b]) => (a === "en" ? -1 : b === "en" ? 1 : a.localeCompare(b)));

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
      <div className="text-sm text-slate-800 dark:text-slate-100">{children}</div>
    </div>
  );
}

// Convert object of comma-separated strings or arrays into arrays for API payload
const parseTitleInput = (obj) => {
  const out = {};
  for (const [lang, val] of Object.entries(obj || {})) {
    if (Array.isArray(val)) {
      out[lang] = val.map((s) => String(s).trim()).filter(Boolean);
    } else if (typeof val === "string") {
      out[lang] = val.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return out;
};

// Convert API array object to comma-separated string object for inputs
const formatTitleForInput = (obj) => {
  const out = {};
  for (const [lang, val] of Object.entries(obj || {})) {
    if (Array.isArray(val)) {
      out[lang] = val.join(", ");
    } else {
      out[lang] = String(val || "");
    }
  }
  return out;
};

const emptyForm = { position_title: {}, description: {}, status: 1, sort_num: 0 };

const formFromPosition = (p) => ({
  position_title: formatTitleForInput(p.position_title),
  description: p.description || {},
  status: p.status,
  sort_num: p.sort_num ?? 0,
});

const stableTexts = (o) =>
  Object.fromEntries(
    Object.entries(cleanI18n(o)).sort(([a], [b]) => a.localeCompare(b))
  );

const fingerprint = (f) =>
  JSON.stringify({
    position_title: stableTexts(parseTitleInput(f.position_title)),
    description: stableTexts(f.description),
    status: Number(f.status),
    sort_num: Number(f.sort_num) || 0,
  });

export default function PositionsManager() {
  const {
    list: positions,
    loading,
    error,
    reload,
  } = useList(positionsService.list);

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

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => {
    setForm(emptyForm);
    setNotice(null);
    setModalHidden(false);
    setEditing("new");
  };

  const openEdit = (p) => {
    setForm(formFromPosition(p));
    setNotice(null);
    setModalHidden(false);
    setEditing(p);
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

    const parsedTitles = parseTitleInput(form.position_title);
    if (!parsedTitles.en || parsedTitles.en.length === 0) {
      return warn("At least one English position title is required.");
    }

    const isNew = editing === "new";
    const itemTitle = parsedTitles.en.join(", ");

    if (!isNew) {
      const textChanged =
        fingerprint(form) !== fingerprint(formFromPosition(editing));
      if (!textChanged) {
        close();
        return notify(
          "warning",
          "No changes",
          "There is nothing updated/changed."
        );
      }
    }

    setSaving(true);
    try {
      const payload = {
        position_title: parsedTitles,
        description: cleanI18n(form.description),
        status: Number(form.status) === 0 ? 0 : 1,
        sort_num: Number(form.sort_num) || 0,
      };

      if (isNew) await positionsService.create(payload);
      else await positionsService.update(editing.id, payload);

      close();
      await reload();
      notify(
        "success",
        isNew ? "Position added" : "Position updated",
        isNew
          ? `"${itemTitle}" was added successfully.`
          : `"${itemTitle}" was updated successfully.`
      );
    } catch (err) {
      console.error("Error saving position:", err);
      setModalHidden(true);
      notify(
        "error",
        isNew ? "Failed to add position" : "Failed to update position",
        err.message || "Something went wrong. Please try again.",
        { returnToForm: true }
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (p) => {
    const next = Number(p.status) === 1 ? 0 : 1;
    setTogglingId(p.id);
    try {
      const payload = {
        position_title: p.position_title,
        description: p.description,
        status: next,
        sort_num: p.sort_num ?? 0,
      };
      await positionsService.update(p.id, payload);
      await reload();
      notify(
        "success",
        "Position updated",
        next === 1
          ? `"${tr(p.position_title)}" is now active.`
          : `"${tr(p.position_title)}" is now hidden.`
      );
    } catch (err) {
      notify(
        "error",
        "Failed to update status",
        err.message || "Something went wrong. Please try again."
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
          "Positions refreshed",
          "The positions were reloaded from the database."
        );
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (p) => {
    const title = Array.isArray(p.position_title?.en)
      ? p.position_title.en.join(", ")
      : tr(p.position_title);
    if (!window.confirm(`Delete position "${title}"?`)) return;
    try {
      await positionsService.remove(p.id);
      await reload();
      notify(
        "success",
        "Position deleted",
        `"${title}" was deleted successfully.`
      );
    } catch (err) {
      notify(
        "error",
        "Failed to delete position",
        err.message || "Something went wrong. Please try again."
      );
    }
  };

  const activeFilters = statusFilter !== "all" ? 1 : 0;
  const clearFilters = () => setStatusFilter("all");
  const countBy = (fn) => positions.filter(fn).length;

  const shown = [...positions].sort(bySort).filter((p) => {
    if (statusFilter !== "all" && Number(p.status) !== statusFilter)
      return false;

    const fullStr = JSON.stringify(p.position_title || {}).toLowerCase();
    return fullStr.includes(query.toLowerCase());
  });

  const totalPages = Math.max(1, Math.ceil(shown.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedShown =
    pageSize === "all"
      ? shown
      : shown.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const statusOptions = [
    { value: 1, label: "Active" },
    { value: 0, label: "Hidden" },
  ];

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
          <h1 className="text-2xl font-extrabold">Positions Manager</h1>
          <p className="text-sm text-slate-500">
            Manage multilingual job titles and position roles.
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
            <Plus className="w-4 h-4" /> Add position
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search positions..."
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
                active={statusFilter === 1}
                onClick={() => setStatusFilter(1)}
              >
                Active ({countBy((p) => Number(p.status) === 1)})
              </Chip>
              <Chip
                active={statusFilter === 0}
                onClick={() => setStatusFilter(0)}
              >
                Hidden ({countBy((p) => Number(p.status) === 0)})
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
          title="Could not load positions"
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
              <th className="p-4">Position Titles</th>
              <th className="p-4">Description</th>
              <th className="p-4">Status</th>
              <th className="p-4">Created / Updated</th>
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
                  {positions.length === 0 ? "No positions yet." : "No positions match your filters."}
                </td>
              </tr>
            )}
            {!loading &&
              paginatedShown.map((p) => {
                const isActive = Number(p.status) === 1;
                const enTitles = Array.isArray(p.position_title?.en)
                  ? p.position_title.en.join(", ")
                  : tr(p.position_title);

                return (
                  <tr
                    key={p.id}
                    className="border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="p-4 font-mono text-xs text-slate-500">{p.sort_num ?? 0}</td>
                    <td className="p-4 font-semibold">{enTitles || "—"}</td>
                    <td className="p-4 text-slate-500 truncate max-w-xs">
                      {tr(p.description) || "—"}
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
                          {isActive ? "Active" : "Hidden"}
                        </span>
                        <Toggle
                          checked={isActive}
                          disabled={togglingId === p.id}
                          label={isActive ? "Hide position" : "Activate position"}
                          onChange={() => toggleStatus(p)}
                        />
                      </div>
                    </td>
                    <td className="p-4 text-xs text-slate-400">
                      <div>C: {fmtDate(p.created_at)}</div>
                      <div>U: {fmtDate(p.updated_at)}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setViewing(p)}
                          title="View"
                          aria-label="View details"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          title="Edit"
                          aria-label="Edit"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
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

      <Pagination
        page={currentPage}
        pageSize={pageSize}
        total={shown.length}
        onPage={setPage}
        onPageSize={setPageSize}
      />

      {/* ===== VIEW modal ===== */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeView}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Position details"
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-lg font-bold">Position details</h3>
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
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-xl font-extrabold">
                  {Array.isArray(viewing.position_title?.en)
                    ? viewing.position_title.en.join(", ")
                    : tr(viewing.position_title)}
                </h4>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                    Number(viewing.status) === 1
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {Number(viewing.status) === 1 ? "Active" : "Hidden"}
                </span>
              </div>

              <section className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Position Titles (by language)
                </h5>
                <ArrayByLang value={viewing.position_title} />
              </section>

              <section className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Description
                </h5>
                <TextByLang value={viewing.description} />
              </section>

              <section className="grid grid-cols-2 gap-4">
                <Field label="Sort Number">{viewing.sort_num ?? 0}</Field>
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
                  const p = viewing;
                  closeView();
                  openEdit(p);
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
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col relative"
          >
            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 z-10 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-lg font-bold">
                {editing === "new" ? "Add position" : "Edit position"}
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
                <div className="flex flex-col">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    Position Titles (separated by commas for multiple titles)
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    e.g. Shop Owner, Business Owner
                  </span>
                </div>
                <I18nInput
                  expanded
                  required
                  label="Position Titles"
                  value={form.position_title}
                  onChange={(v) => setField("position_title", v)}
                  placeholder="e.g. Shop Owner, Business Owner"
                />
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Description (all languages)
                </h4>
                <I18nInput
                  expanded
                  label="Description"
                  value={form.description}
                  onChange={(v) => setField("description", v)}
                  placeholder="Position details..."
                />
              </section>

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
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">
                    Status
                  </label>
                  <CustomSelect
                    value={form.status}
                    onChange={(val) => setField("status", val)}
                    options={statusOptions}
                  />
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
                {editing === "new" ? "Create position" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}