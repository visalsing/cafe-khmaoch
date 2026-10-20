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
import {
  sugarLevelService,
  levelsOptionsService,
  assetUrl,
} from "../../services/api";
import ImageUpload from "./ImageUpload";
import ImageLightbox from "./ImageLightbox";
import CustomSelect from "./CustomSelect";
import Pagination from "./Pagination";
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

/* ---------- Alert: left accent border + close (X) button ---------- */
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

// Pill button used by the filter panel
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

// on/off switch used in the Status column
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

/* ---------- Pieces used by the "View" modal ---------- */
const LANG_LABELS = {
  en: "English",
  km: "ខ្មែរ",
  zh: "中文",
  lo: "ລາວ",
  ja: "日本語",
  vi: "Tiếng Việt",
};
const fmtDateTime = (v) => (v ? new Date(v).toLocaleString() : "—");

// all translations of one text, English first
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

// the levels option (group) a sugar level belongs to, as a small tag.
// An id that no longer exists (the option was deleted) shows as "#5?" in red.
function LevelTag({ id, names }) {
  if (id === null || id === undefined || id === "")
    return <span className="text-slate-400">—</span>;
  const n = Number(id);
  return names.has(n) ? (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
      {names.get(n)}
    </span>
  ) : (
    <span
      title="This levels option no longer exists"
      className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-rose-100 text-rose-700"
    >
      #{n}?
    </span>
  );
}

/* ---------- form helpers ---------- */
const emptyForm = {
  name: {},
  description: {},
  levels_options_id: "", // empty = not linked to any levels option
  status: 1,
  sort_num: 0,
};
const NO_IMAGE_CHANGE = { file: null, remove: false };

// the form values for an existing sugar level (used when opening Edit and for the "nothing changed" check)
const formFromLevel = (l) => ({
  name: l.name || {},
  description: l.description || {},
  levels_options_id: l.levels_options_id ?? "",
  status: l.status,
  sort_num: l.sort_num ?? 0,
});

// comparable version of a form: same value -> same text (ignores key order and extra spaces)
const stableTexts = (o) =>
  Object.fromEntries(
    Object.entries(cleanI18n(o)).sort(([a], [b]) => a.localeCompare(b)),
  );
const numOrNull = (v) =>
  v === "" || v === null || v === undefined ? null : Number(v);
const fingerprint = (f) =>
  JSON.stringify({
    name: stableTexts(f.name),
    description: stableTexts(f.description),
    option: numOrNull(f.levels_options_id),
    status: Number(f.status),
    sort: Number(f.sort_num) || 0,
  });

export default function SugarLevelManager() {
  const {
    list: levels,
    loading,
    error,
    reload,
  } = useList(sugarLevelService.list);
  const [levelOptions, setLevelOptions] = useState([]); // levels_options groups (Sugar level, Ice level...)

  const [editing, setEditing] = useState(null); // null | "new" | sugar level
  const [viewing, setViewing] = useState(null); // sugar level shown in the view modal
  const [lightboxOpen, setLightboxOpen] = useState(false); // full-screen image of the viewed sugar level
  const [form, setForm] = useState(emptyForm);
  const [imageChange, setImageChange] = useState(NO_IMAGE_CHANGE);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | 1 | 0
  const [optionFilter, setOptionFilter] = useState("all"); // "all" | levels option id
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // 10 | 20 | 30 | 40 | 50 | 100 | "all"
  const [togglingId, setTogglingId] = useState(null); // sugar level whose status switch is saving

  // ALL alerts are shown on the page, between the search/filters and the table
  const [notice, setNotice] = useState(null); // { id, type, title, message, returnToForm }
  const [modalHidden, setModalHidden] = useState(false); // form is hidden (not lost) while its alert is shown
  const noticeRef = useRef(null);

  const notify = (type, title, message, { returnToForm = false } = {}) =>
    setNotice({ id: Date.now(), type, title, message, returnToForm });

  // closing an alert that came from the form brings the form back
  const dismissNotice = () => {
    if (notice?.returnToForm) setModalHidden(false);
    setNotice(null);
  };

  // closes the view modal (and its full-screen image, if open)
  const closeView = () => {
    setLightboxOpen(false);
    setViewing(null);
  };

  // green + yellow alerts disappear by themselves; red ones and "back to the form" ones stay
  useEffect(() => {
    if (!notice || notice.type === "error" || notice.returnToForm) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  // make sure the alert is visible (the page may be scrolled)
  useEffect(() => {
    if (notice)
      noticeRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
  }, [notice]);

  // Esc closes the view modal (the lightbox handles its own Esc first and stops it from reaching here)
  useEffect(() => {
    if (!viewing) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setLightboxOpen(false);
      setViewing(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewing]);

  // search / filters / page size changed -> start again from page 1
  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, optionFilter, pageSize]);

  const loadLookups = () =>
    levelsOptionsService
      .list()
      .then((d) => setLevelOptions(asList(d)))
      .catch(() => {});

  useEffect(() => {
    loadLookups();
  }, []);

  const optionName = useMemo(
    () => new Map(levelOptions.map((o) => [o.id, tr(o.name)])),
    [levelOptions],
  );

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => {
    setForm(emptyForm);
    setImageChange(NO_IMAGE_CHANGE);
    setNotice(null);
    setModalHidden(false);
    setEditing("new");
  };

  const openEdit = (l) => {
    setForm(formFromLevel(l));
    setImageChange(NO_IMAGE_CHANGE);
    setNotice(null);
    setModalHidden(false);
    setEditing(l);
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

    // editing but nothing was touched (no field changed, no image chosen/removed)
    if (!isNew) {
      const textChanged =
        fingerprint(form) !== fingerprint(formFromLevel(editing));
      const imageChanged = Boolean(imageChange.file || imageChange.remove);
      if (!textChanged && !imageChanged) {
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
      // multipart form: text fields + the image file (server makes img + thumbnail from it)
      const fd = new FormData();
      fd.append("name", JSON.stringify(cleanI18n(form.name)));
      fd.append("description", JSON.stringify(cleanI18n(form.description)));
      fd.append("levels_options_id", String(form.levels_options_id)); // "" = not linked
      fd.append("status", String(Number(form.status)));
      fd.append("sort_num", String(Number(form.sort_num) || 0));
      if (imageChange.file)
        fd.append("image", imageChange.file); // field name must be "image"
      else if (imageChange.remove) fd.append("removeImage", "1");

      if (isNew) await sugarLevelService.create(fd);
      else await sugarLevelService.update(editing.id, fd);

      close();
      await reload();
      notify(
        "success",
        isNew ? "Sugar level added" : "Sugar level updated",
        isNew
          ? `"${itemName}" was added successfully.`
          : `"${itemName}" was updated successfully.`,
      );
    } catch (err) {
      console.error("Error saving sugar level:", err);
      setModalHidden(true);
      notify(
        "error",
        isNew
          ? "Failed to add the sugar level"
          : "Failed to update the sugar level",
        err.message || "Something went wrong. Please try again.",
        { returnToForm: true },
      );
    } finally {
      setSaving(false);
    }
  };

  // the switch in the Status column: updates ONLY the status (same alerts as Update/Edit)
  const toggleStatus = async (l) => {
    const next = Number(l.status) === 1 ? 0 : 1;
    setTogglingId(l.id);
    try {
      await sugarLevelService.setStatus(l.id, next);
      await reload();
      notify(
        "success",
        "Sugar level updated",
        next === 1
          ? `"${tr(l.name)}" was updated successfully. It is now active.`
          : `"${tr(l.name)}" was updated successfully. It is now hidden.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to update the sugar level",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [ok] = await Promise.all([reload(), loadLookups()]);
      if (ok !== false)
        notify(
          "success",
          "Sugar levels refreshed",
          "The sugar levels were reloaded from the database.",
        );
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (l) => {
    if (!window.confirm(`Delete sugar level "${tr(l.name)}"?`)) return;
    try {
      await sugarLevelService.remove(l.id);
      await reload();
      notify(
        "success",
        "Sugar level deleted",
        `"${tr(l.name)}" was deleted successfully.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to delete the sugar level",
        err.message || "Something went wrong. Please try again.",
      );
    }
  };

  const activeFilters =
    (statusFilter !== "all") + (optionFilter !== "all");
  const clearFilters = () => {
    setStatusFilter("all");
    setOptionFilter("all");
  };
  const countBy = (fn) => levels.filter(fn).length;

  const shown = [...levels].sort(bySort).filter((l) => {
    if (statusFilter !== "all" && Number(l.status) !== statusFilter)
      return false;
    if (
      optionFilter !== "all" &&
      Number(l.levels_options_id) !== optionFilter
    )
      return false;
    return Object.values(l.name || {})
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase());
  });

  // pagination: `shown` is the full filtered list, `pageItems` is the current page
  const showAll = pageSize === "all";
  const totalPages = showAll
    ? 1
    : Math.max(1, Math.ceil(shown.length / pageSize));
  const currentPage = Math.min(page, totalPages); // e.g. deleted the last item of the last page
  const pageItems = showAll
    ? shown
    : shown.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // choices of the "Levels option" dropdown (+ the chosen id if that option was deleted)
  const chosenOptionId =
    form.levels_options_id === "" ? null : Number(form.levels_options_id);
  const optionChoices = [
    { value: "", label: "None" },
    ...[...levelOptions].sort(bySort).map((o) => ({
      value: o.id,
      label: tr(o.name) + (Number(o.status) === 1 ? "" : " (hidden)"),
    })),
    ...(chosenOptionId !== null && !optionName.has(chosenOptionId)
      ? [{ value: chosenOptionId, label: `#${chosenOptionId} (deleted)` }]
      : []),
  ];

  // content of the lightbox "Info" popup (dark style, because the lightbox is dark)
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
          Description
        </span>
        <p className="mt-1 text-slate-300 text-xs leading-relaxed">
          {tr(viewing.description) || "No description provided."}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
        <div>
          <span className="text-[11px] text-slate-400">Levels option</span>
          <p className="font-semibold">
            {optionName.get(Number(viewing.levels_options_id)) || "—"}
          </p>
        </div>
        <div>
          <span className="text-[11px] text-slate-400">Status</span>
          <p className="font-semibold">
            {Number(viewing.status) === 1 ? "Active" : "Hidden"}
          </p>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      <style>{`
        /* Thin & Rounded Custom Scrollbar styling */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(203, 213, 225, 0.6);
          border-radius: 9999px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.8);
        }
      `}</style>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Sugar Level Manager</h1>
          <p className="text-sm text-slate-500">
            The choices customers can pick for a drink (for example 0%, 50%,
            100% sugar).
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
            <Plus className="w-4 h-4" /> Add sugar level
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sugar levels..."
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
            <div className="text-xs font-semibold text-slate-500">
              Levels options
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip
                active={optionFilter === "all"}
                onClick={() => setOptionFilter("all")}
              >
                All
              </Chip>
              {levelOptions.map((o) => (
                <Chip
                  key={o.id}
                  active={optionFilter === o.id}
                  onClick={() => setOptionFilter(o.id)}
                >
                  {tr(o.name)} (
                  {countBy((l) => Number(l.levels_options_id) === o.id)})
                </Chip>
              ))}
            </div>
          </div>

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
                Active ({countBy((l) => Number(l.status) === 1)})
              </Chip>
              <Chip
                active={statusFilter === 0}
                onClick={() => setStatusFilter(0)}
              >
                Hidden ({countBy((l) => Number(l.status) === 0)})
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

      {/* ===== ALERTS: between the search/filters and the table ===== */}
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
          title="Could not load the sugar levels"
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
              <th className="p-4">Sugar level</th>
              <th className="p-4">Description</th>
              <th className="p-4">Levels option</th>
              <th className="p-4">Order</th>
              <th className="p-4">Status</th>
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
                  {levels.length === 0
                    ? "No sugar levels yet."
                    : "No sugar levels match your filters."}
                </td>
              </tr>
            )}
            {!loading &&
              pageItems.map((l) => {
                const thumb = assetUrl(l.thumbnail || l.img);
                const isActive = Number(l.status) === 1;
                return (
                  <tr
                    key={l.id}
                    className="border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                            Img
                          </div>
                        )}
                        <span className="font-semibold">{tr(l.name)}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-500 truncate max-w-xs">
                      {tr(l.description) || "—"}
                    </td>
                    <td className="p-4">
                      <LevelTag id={l.levels_options_id} names={optionName} />
                    </td>
                    <td className="p-4">{l.sort_num ?? 0}</td>
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
                          disabled={togglingId === l.id}
                          label={
                            isActive
                              ? "Hide this sugar level"
                              : "Activate this sugar level"
                          }
                          onChange={() => toggleStatus(l)}
                        />
                      </div>
                    </td>
                    <td className="p-4 text-xs text-slate-400">
                      <div>C: {fmtDate(l.created_at)}</div>
                      <div>U: {fmtDate(l.updated_at)}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setViewing(l)}
                          title="View"
                          aria-label="View details"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(l)}
                          title="Edit"
                          aria-label="Edit"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(l)}
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

      {/* pagination: below the table */}
      <Pagination
        page={currentPage}
        pageSize={pageSize}
        total={shown.length}
        onPage={setPage}
        onPageSize={setPageSize}
      />

      {/* ===== VIEW modal (read-only) + full-screen image ===== */}
      {viewing && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closeView}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Sugar level details"
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-lg font-bold">Sugar level details</h3>
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
                {viewing.img ? (
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    aria-label="View image full screen"
                    className="relative group block w-full text-left cursor-zoom-in"
                  >
                    <img
                      src={assetUrl(viewing.img)}
                      alt=""
                      className="w-full max-h-64 object-cover rounded-xl transition-transform group-hover:scale-[1.01]"
                    />
                    <span className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white font-medium text-sm">
                      Click to view full screen
                    </span>
                  </button>
                ) : (
                  <div className="w-full h-32 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm text-slate-400">
                    No image
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-xl font-extrabold">{tr(viewing.name)}</h4>
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
                    Name
                  </h5>
                  <TextByLang value={viewing.name} />
                </section>

                <section className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    Description
                  </h5>
                  <TextByLang value={viewing.description} />
                </section>

                <section className="grid grid-cols-2 gap-4">
                  <Field label="Levels option">
                    <LevelTag
                      id={viewing.levels_options_id}
                      names={optionName}
                    />
                  </Field>
                  <Field label="Sort order">{viewing.sort_num ?? 0}</Field>
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
                    const l = viewing;
                    closeView();
                    openEdit(l);
                  }}
                  className="py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Pencil className="w-4 h-4" /> Edit
                </button>
              </div>
            </div>
          </div>

          {/* sibling of the modal on purpose: its clicks must not reach the modal's backdrop handler */}
          {lightboxOpen && viewing.img && (
            <ImageLightbox
              src={assetUrl(viewing.img)}
              alt={tr(viewing.name)}
              title={tr(viewing.name)}
              info={lightboxInfo}
              infoTitle="Sugar level details"
              onClose={() => setLightboxOpen(false)}
            />
          )}
        </>
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
            {/* Sticky Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 z-10 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-lg font-bold">
                {editing === "new" ? "Add sugar level" : "Edit sugar level"}
              </h3>
              <button
                type="button"
                onClick={close}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Container */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Image
                </h4>
                <ImageUpload
                  key={editing === "new" ? "new" : editing.id}
                  label="Image"
                  currentUrl={editing === "new" ? "" : assetUrl(editing.img)}
                  onChange={setImageChange}
                />
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
                      onChange={(v) => setField("name", v)}
                      placeholder="e.g. 50% sugar"
                    />
                  </div>
                  <div className="w-full">
                    <I18nInput
                      expanded
                      multiline
                      label="Description"
                      value={form.description}
                      onChange={(v) => setField("description", v)}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Display
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-sm text-slate-600 dark:text-slate-400 block w-full">
                    Status
                    <div className="relative mt-1 w-full">
                      <CustomSelect
                        value={form.status}
                        onChange={(value) => setField("status", value)}
                        options={[
                          { value: 1, label: "Active" },
                          { value: 0, label: "Hidden" },
                        ]}
                      />
                    </div>
                  </label>
                  <label className="text-sm text-slate-600 dark:text-slate-400 block w-full">
                    Sort order
                    <input
                      className={`${inputCls} mt-1 w-full`}
                      type="number"
                      value={form.sort_num}
                      onChange={(e) => setField("sort_num", e.target.value)}
                    />
                  </label>
                  <label className="text-sm text-slate-600 dark:text-slate-400 block w-full sm:col-span-2">
                    Levels option
                    <div className="relative mt-1 w-full">
                      <CustomSelect
                        value={form.levels_options_id}
                        onChange={(value) =>
                          setField("levels_options_id", value)
                        }
                        placeholder="None"
                        options={optionChoices}
                      />
                    </div>
                  </label>
                </div>
              </section>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={close}
                  className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-center"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold transition-colors text-center shadow-sm"
                >
                  {saving ? "Saving..." : "Save sugar level"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}