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
import { countryFlagsService, assetUrl } from "../../services/api";
import ImageUpload from "./ImageUpload";
import SvgUpload from "./SvgUpload.jsx";
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

const fmtDateTime = (value) => (value ? new Date(value).toLocaleString() : "—");

function TextByLang({ value }) {
  const entries = Object.entries(value || {})
    .filter(([, text]) => text)
    .sort(([a], [b]) =>
      a === "en" ? -1 : b === "en" ? 1 : a.localeCompare(b),
    );

  if (!entries.length) return <p className="text-slate-400">—</p>;

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
  native_name: "",
  description: {},
  icon: "",
  status: 1,
  sort_num: 0,
};

const NO_IMAGE_CHANGE = { file: null, remove: false };
const NO_SVG_CHANGE = { file: null, remove: false };

function formFromFlag(flag) {
  return {
    name: flag.name || {},
    native_name: flag.native_name || "",
    description: flag.description || {},
    icon: flag.icon || "",
    status: Number(flag.status) === 0 ? 0 : 1,
    sort_num: Number(flag.sort_num) || 0,
  };
}

const stableTexts = (value) =>
  Object.fromEntries(
    Object.entries(cleanI18n(value)).sort(([a], [b]) => a.localeCompare(b)),
  );

const fingerprint = (form) =>
  JSON.stringify({
    name: stableTexts(form.name),
    native_name: String(form.native_name || "").trim(),
    description: stableTexts(form.description),
    icon: String(form.icon || "").trim(),
    status: Number(form.status),
    sort_num: Number(form.sort_num) || 0,
  });

export default function CountryFlags() {
  const {
    list: flags,
    loading,
    error,
    reload,
  } = useList(countryFlagsService.list);

  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [imageChange, setImageChange] = useState(NO_IMAGE_CHANGE);
  const [svgChange, setSvgChange] = useState(NO_SVG_CHANGE);
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
  // const [svgInputKey, setSvgInputKey] = useState(0);
  const noticeRef = useRef(null);

  const notify = (type, title, message, { returnToForm = false } = {}) =>
    setNotice({ id: Date.now(), type, title, message, returnToForm });

  const dismissNotice = () => {
    if (notice?.returnToForm) setModalHidden(false);
    setNotice(null);
  };

  const closeView = () => {
    setLightboxOpen(false);
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
    const onKey = (event) => {
      if (event.key === "Escape") {
        setLightboxOpen(false);
        setViewing(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewing]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, pageSize]);

  const setField = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const openNew = () => {
    setForm(emptyForm);
    setImageChange(NO_IMAGE_CHANGE);
    setSvgChange(NO_SVG_CHANGE);
    // setSvgInputKey((key) => key + 1);
    setNotice(null);
    setModalHidden(false);
    setEditing("new");
  };

  const openEdit = (flag) => {
    setForm(formFromFlag(flag));
    setImageChange(NO_IMAGE_CHANGE);
    setSvgChange(NO_SVG_CHANGE);
    // setSvgInputKey((key) => key + 1);
    setNotice(null);
    setModalHidden(false);
    setEditing(flag);
  };

  const close = () => {
    setEditing(null);
    setModalHidden(false);
  };

  const save = async (event) => {
    event.preventDefault();

    const warn = (message) => {
      setModalHidden(true);
      notify("warning", "Please check the form", message, {
        returnToForm: true,
      });
    };

    if (!form.name.en?.trim()) return warn("The English name is required.");
    if (form.name.en.trim().length > 120)
      return warn("The English name must be 120 characters or fewer.");
    if (String(form.native_name || "").trim().length > 120)
      return warn("The native name must be 120 characters or fewer.");
    if (String(form.icon || "").trim().length > 100)
      return warn("The icon value must be 100 characters or fewer.");
    if (String(form.description?.en || "").length > 500)
      return warn("The English description must be 500 characters or fewer.");

    const isNew = editing === "new";
    const itemName = form.name.en.trim();

    if (!isNew) {
      const textChanged =
        fingerprint(form) !== fingerprint(formFromFlag(editing));
      const imageChanged = Boolean(imageChange.file || imageChange.remove);
      const svgChanged = Boolean(svgChange.file || svgChange.remove);
      if (!textChanged && !imageChanged && !svgChanged) {
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
      const fd = new FormData();
      fd.append("name", JSON.stringify(cleanI18n(form.name)));
      fd.append("native_name", String(form.native_name || "").trim());
      fd.append("description", JSON.stringify(cleanI18n(form.description)));
      fd.append("icon", String(form.icon || "").trim());
      fd.append("status", String(Number(form.status)));
      fd.append("sort_num", String(Number(form.sort_num) || 0));

      if (imageChange.file) fd.append("image", imageChange.file);
      else if (imageChange.remove) fd.append("removeImage", "1");

      if (svgChange.file) fd.append("svg", svgChange.file);
      else if (svgChange.remove) fd.append("removeSvg", "1");

      if (isNew) await countryFlagsService.create(fd);
      else await countryFlagsService.update(editing.id, fd);

      close();
      await reload();
      notify(
        "success",
        isNew ? "Country flag added" : "Country flag updated",
        isNew
          ? `"${itemName}" was added successfully.`
          : `"${itemName}" was updated successfully.`,
      );
    } catch (err) {
      console.error("Error saving country flag:", err);
      setModalHidden(true);
      notify(
        "error",
        isNew ? "Failed to add country flag" : "Failed to update country flag",
        err.message || "Something went wrong. Please try again.",
        { returnToForm: true },
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (flag) => {
    const next = Number(flag.status) === 1 ? 0 : 1;
    setTogglingId(flag.id);
    try {
      const fd = new FormData();
      fd.append("name", JSON.stringify(cleanI18n(flag.name)));
      fd.append("native_name", flag.native_name || "");
      fd.append("description", JSON.stringify(cleanI18n(flag.description)));
      fd.append("icon", flag.icon || "");
      fd.append("status", String(next));
      fd.append("sort_num", String(Number(flag.sort_num) || 0));
      await countryFlagsService.update(flag.id, fd);
      await reload();
      notify(
        "success",
        "Country flag updated",
        next === 1
          ? `"${tr(flag.name)}" is now active.`
          : `"${tr(flag.name)}" is now hidden.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to update country flag",
        err.message || "Something went wrong.",
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const ok = await reload();
      if (ok !== false) {
        notify(
          "success",
          "Country flags refreshed",
          "Country flags were reloaded from the database.",
        );
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (flag) => {
    if (!window.confirm(`Delete country flag "${tr(flag.name)}"?`)) return;
    try {
      await countryFlagsService.remove(flag.id);
      await reload();
      notify(
        "success",
        "Country flag deleted",
        `"${tr(flag.name)}" was deleted successfully.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to delete country flag",
        err.message || "Something went wrong.",
      );
    }
  };

  const activeFilters = statusFilter !== "all" ? 1 : 0;
  const clearFilters = () => setStatusFilter("all");
  const countBy = (fn) => flags.filter(fn).length;

  const shown = [...flags].sort(bySort).filter((flag) => {
    if (statusFilter !== "all" && Number(flag.status) !== statusFilter)
      return false;
    const searchable = [
      ...Object.values(flag.name || {}),
      ...Object.values(flag.description || {}),
      flag.native_name || "",
      flag.icon || "",
      flag.id,
    ]
      .join(" ")
      .toLowerCase();
    return searchable.includes(query.toLowerCase());
  });

  const totalPages = Math.max(1, Math.ceil(shown.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = shown.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const lightboxInfo = viewing ? (
    <div className="space-y-3 text-sm">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
          Name
        </span>
        <p className="mt-1 font-medium">{tr(viewing.name)}</p>
      </div>
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
          Native name
        </span>
        <p className="mt-1 text-slate-300 text-xs leading-relaxed">
          {viewing.native_name || "—"}
        </p>
      </div>
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
          Description
        </span>
        <p className="mt-1 text-slate-300 text-xs leading-relaxed">
          {tr(viewing.description) || "No description provided."}
        </p>
      </div>
      <div className="pt-2 border-t border-slate-800">
        <span className="text-[11px] text-slate-400">Status</span>
        <p className="font-semibold">
          {Number(viewing.status) === 1 ? "Active" : "Hidden"}
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
          <h1 className="text-2xl font-extrabold">Country Flags</h1>
          <p className="text-sm text-slate-500">
            Manage country names, native names, icons, and flag assets.
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
            <Plus className="w-4 h-4" /> Add country flag
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search country flags..."
          className={`${inputCls} sm:max-w-xs`}
        />
        <button
          type="button"
          onClick={() => setShowFilters((value) => !value)}
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
                All ({flags.length})
              </Chip>
              <Chip
                active={statusFilter === 1}
                onClick={() => setStatusFilter(1)}
              >
                Active ({countBy((flag) => Number(flag.status) === 1)})
              </Chip>
              <Chip
                active={statusFilter === 0}
                onClick={() => setStatusFilter(0)}
              >
                Hidden ({countBy((flag) => Number(flag.status) === 0)})
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
          title="Could not load country flags"
          action={
            <button
              type="button"
              onClick={reload}
              className="ml-2 font-semibold underline"
            >
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
              <th className="p-4">Country flag</th>
              <th className="p-4">Native name / Icon</th>
              <th className="p-4">Description</th>
              <th className="p-4">Status</th>
              <th className="p-4">Sort</th>
              <th className="p-4">Created / Updated</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="p-4 text-center text-slate-400" colSpan={7}>
                  Loading...
                </td>
              </tr>
            )}
            {!loading && shown.length === 0 && (
              <tr>
                <td className="p-4 text-center text-slate-400" colSpan={7}>
                  {flags.length === 0
                    ? "No country flags yet."
                    : "No country flags match your filters."}
                </td>
              </tr>
            )}
            {!loading &&
              pageItems.map((flag) => {
                const thumb = assetUrl(flag.thumbnail || flag.img || flag.svg);
                const isActive = Number(flag.status) === 1;
                return (
                  <tr
                    key={flag.id}
                    className="border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3 min-w-48">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="w-10 h-10 rounded-lg object-contain bg-slate-100 dark:bg-slate-800 p-1"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                            No img
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold break-words">
                            {tr(flag.name)}
                          </div>
                          <div className="text-xs text-slate-400">
                            ID: {flag.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>{flag.native_name || "—"}</div>
                      <div className="text-xs text-slate-400">
                        {flag.icon || "—"}
                      </div>
                    </td>
                    <td className="p-4 text-slate-500 max-w-xs">
                      <div className="truncate">
                        {tr(flag.description) || "—"}
                      </div>

                      {flag.svg && (
                        <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-sky-600">
                          <img
                            src={assetUrl(flag.svg)}
                            alt=""
                            className="h-5 w-5 rounded object-contain border border-sky-100 bg-white p-0.5"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                          <span>SVG attached</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
                        >
                          {isActive ? "Active" : "Hidden"}
                        </span>
                        <Toggle
                          checked={isActive}
                          disabled={togglingId === flag.id}
                          label={
                            isActive
                              ? "Hide this country flag"
                              : "Activate this country flag"
                          }
                          onChange={() => toggleStatus(flag)}
                        />
                      </div>
                    </td>
                    <td className="p-4 tabular-nums">
                      {Number(flag.sort_num) || 0}
                    </td>
                    <td className="p-4 text-xs text-slate-400 whitespace-nowrap">
                      <div>C: {fmtDate(flag.created_at)}</div>
                      <div>U: {fmtDate(flag.updated_at)}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setViewing(flag)}
                          title="View"
                          aria-label="View details"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(flag)}
                          title="Edit"
                          aria-label="Edit"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(flag)}
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

      {viewing && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closeView}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Country flag details"
              onClick={(event) => event.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-lg font-bold">Country flag details</h3>
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
                {viewing.img || viewing.svg ? (
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    aria-label="View image full screen"
                    className="relative group block w-full text-left cursor-zoom-in"
                  >
                    <img
                      src={assetUrl(viewing.img || viewing.svg)}
                      alt=""
                      className="w-full max-h-64 object-contain rounded-xl bg-slate-100 dark:bg-slate-800"
                    />
                    <span className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white font-medium text-sm">
                      Click to view full screen
                    </span>
                  </button>
                ) : (
                  <div className="w-full h-32 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm text-slate-400">
                    No image or SVG
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-xl font-extrabold">{tr(viewing.name)}</h4>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${Number(viewing.status) === 1 ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
                  >
                    {Number(viewing.status) === 1 ? "Active" : "Hidden"}
                  </span>
                </div>
                <section className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    Name
                  </h5>
                  <TextByLang value={viewing.name} />
                </section>
                <section className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    Native name
                  </h5>
                  <p>{viewing.native_name || "—"}</p>
                </section>
                <section className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    Description
                  </h5>
                  <TextByLang value={viewing.description} />
                </section>
                <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="Icon">{viewing.icon || "—"}</Field>
                  <Field label="Sort number">
                    {Number(viewing.sort_num) || 0}
                  </Field>

                  <Field label="SVG file">
                    {viewing.svg ? (
                      <div className="flex items-center gap-2 mt-1">
                        <img
                          src={assetUrl(viewing.svg)}
                          alt="Country flag SVG"
                          className="h-8 w-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white p-1 object-contain"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                        <span className="text-sm text-sky-600">Attached</span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </Field>

                  <Field label="Created">
                    {fmtDateTime(viewing.created_at)}
                  </Field>
                  <Field label="Updated">
                    {fmtDateTime(viewing.updated_at)}
                  </Field>
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
                    const item = viewing;
                    closeView();
                    openEdit(item);
                  }}
                  className="py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Pencil className="w-4 h-4" /> Edit
                </button>
              </div>
            </div>
          </div>
          {lightboxOpen && (viewing.img || viewing.svg) && (
            <ImageLightbox
              src={assetUrl(viewing.img || viewing.svg)}
              alt={tr(viewing.name)}
              title={tr(viewing.name)}
              info={lightboxInfo}
              infoTitle="Country flag details"
              onClose={() => setLightboxOpen(false)}
            />
          )}
        </>
      )}

      {editing && (
        <div
          className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm items-center justify-center p-4 ${modalHidden ? "hidden" : "flex"}`}
        >
          <form
            onSubmit={save}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col relative"
          >
            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 z-10 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-lg font-bold">
                {editing === "new" ? "Add country flag" : "Edit country flag"}
              </h3>
              <button
                type="button"
                onClick={close}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Raster image
                </h4>
                <ImageUpload
                  key={editing === "new" ? "new" : editing.id}
                  label="Flag image"
                  currentUrl={editing === "new" ? "" : assetUrl(editing.img)}
                  onChange={setImageChange}
                />
                <p className="text-xs text-slate-400">
                  Optional. JPG, PNG, WebP, or GIF, up to 5 MB.
                </p>
              </section>

              {/* SVG file */}
              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  SVG file
                </h4>

                <SvgUpload
                  key={editing === "new" ? "new-svg" : `svg-${editing.id}`}
                  label="SVG Flag"
                  currentUrl={editing === "new" ? "" : editing.svg || ""}
                  onChange={setSvgChange}
                />

                <p className="text-xs text-slate-400">
                  Optional. SVG vector file only, up to 512 KB.
                </p>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Name &amp; description (all languages)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <div className="w-full">
                    <I18nInput
                      expanded
                      required
                      label="Name"
                      value={form.name}
                      onChange={(value) => setField("name", value)}
                    />
                  </div>
                  <div className="w-full">
                    <I18nInput
                      expanded
                      label="Description"
                      value={form.description}
                      onChange={(value) => setField("description", value)}
                    />
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Native name
                  </label>
                  <input
                    value={form.native_name}
                    onChange={(event) =>
                      setField("native_name", event.target.value)
                    }
                    placeholder="e.g. ខ្មែរ"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Icon code / class
                  </label>
                  <input
                    value={form.icon}
                    onChange={(event) => setField("icon", event.target.value)}
                    placeholder="e.g. flag-icon-kh"
                    className={inputCls}
                  />
                </div>
              </section>

              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Sort number
                  </label>
                  <input
                    type="number"
                    value={form.sort_num}
                    onChange={(event) =>
                      setField("sort_num", event.target.value)
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Status
                  </label>

                  <CustomSelect
                    value={form.status}
                    onChange={(value) => setField("status", Number(value))}
                    options={[
                      { value: 1, label: "Active" },
                      { value: 0, label: "Hidden" },
                    ]}
                    placeholder="Choose status..."
                    className=""
                  />
                </div>
              </section>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
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
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors shadow-sm disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save country flag"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
