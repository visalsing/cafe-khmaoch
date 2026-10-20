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
import { gendersService } from "../../services/api";
import {
  inputCls,
  I18nInput,
  useList,
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

/* ---------- form helpers ---------- */
const emptyForm = { gender: {}, sc_gender: {}, sort_num: 0 };

const formFromGender = (g) => ({
  gender: g.gender || {},
  sc_gender: g.sc_gender || {},
  sort_num: g.sort_num ?? 0,
});

const stableTexts = (o) =>
  Object.fromEntries(
    Object.entries(cleanI18n(o)).sort(([a], [b]) => a.localeCompare(b)),
  );

const fingerprint = (f) =>
  JSON.stringify({
    gender: stableTexts(f.gender),
    sc_gender: stableTexts(f.sc_gender || {}),
    sort_num: Number(f.sort_num) || 0,
  });

export default function GendersManager() {
  const {
    list: genders,
    loading,
    error,
    reload,
  } = useList(gendersService.list);

  const [editing, setEditing] = useState(null); // null | "new" | gender object
  const [viewing, setViewing] = useState(null); // gender shown in the view modal
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [notice, setNotice] = useState(null);
  const [modalHidden, setModalHidden] = useState(false);
  const noticeRef = useRef(null);

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
  }, [query, pageSize]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => {
    setForm(emptyForm);
    setNotice(null);
    setModalHidden(false);
    setEditing("new");
  };

  const openEdit = (g) => {
    setForm(formFromGender(g));
    setNotice(null);
    setModalHidden(false);
    setEditing(g);
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

    if (!form.gender.en?.trim()) return warn("The English gender name is required.");

    const isNew = editing === "new";
    const itemName = form.gender.en.trim();

    if (!isNew) {
      const textChanged =
        fingerprint(form) !== fingerprint(formFromGender(editing));
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
        gender: cleanI18n(form.gender),
        sc_gender: cleanI18n(form.sc_gender),
        sort_num: Number(form.sort_num) || 0,
      };

      if (isNew) await gendersService.create(payload);
      else await gendersService.update(editing.id, payload);

      close();
      await reload();
      notify(
        "success",
        isNew ? "Gender added" : "Gender updated",
        isNew
          ? `"${itemName}" was added successfully.`
          : `"${itemName}" was updated successfully.`,
      );
    } catch (err) {
      console.error("Error saving gender:", err);
      setModalHidden(true);
      notify(
        "error",
        isNew ? "Failed to add the gender" : "Failed to update the gender",
        err.message || "Something went wrong. Please try again.",
        { returnToForm: true },
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const ok = await reload();
      if (ok !== false)
        notify(
          "success",
          "Genders refreshed",
          "The genders were reloaded from the database.",
        );
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (g) => {
    if (!window.confirm(`Delete gender "${tr(g.gender)}"?`)) return;
    try {
      await gendersService.remove(g.id);
      await reload();
      notify(
        "success",
        "Gender deleted",
        `"${tr(g.gender)}" was deleted successfully.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to delete the gender",
        err.message || "Something went wrong. Please try again.",
      );
    }
  };

  const shown = [...genders].sort(bySort).filter((g) =>
    Object.values(g.gender || {})
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

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
          Gender Name
        </span>
        <p className="mt-1 font-medium">{tr(viewing.gender)}</p>
      </div>
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
          Short Code / Abbreviation
        </span>
        <p className="mt-1 text-slate-300 text-xs leading-relaxed">
          {tr(viewing.sc_gender) || "—"}
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
          <h1 className="text-2xl font-extrabold">Genders Manager</h1>
          <p className="text-sm text-slate-500">
            Manage multilingual gender options for user profiles and records.
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
            <Plus className="w-4 h-4" /> Add gender
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search genders..."
          className={`${inputCls} sm:max-w-xs`}
        />
      </div>

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
          title="Could not load genders"
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
              <th className="p-4">Gender Name</th>
              <th className="p-4">Short Code</th>
              <th className="p-4">Created / Updated</th>
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
            {!loading && shown.length === 0 && (
              <tr>
                <td className="p-4 text-center text-slate-400" colSpan={5}>
                  {genders.length === 0 ? "No genders yet." : "No genders match your search."}
                </td>
              </tr>
            )}
            {!loading &&
              paginatedShown.map((g) => (
                <tr
                  key={g.id}
                  className="border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="p-4 font-mono text-xs text-slate-500">{g.sort_num ?? 0}</td>
                  <td className="p-4 font-semibold">{tr(g.gender)}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">
                    {tr(g.sc_gender) || <span className="text-slate-400">—</span>}
                  </td>
                  <td className="p-4 text-xs text-slate-400">
                    <div>C: {fmtDate(g.created_at)}</div>
                    <div>U: {fmtDate(g.updated_at)}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setViewing(g)}
                        title="View"
                        aria-label="View details"
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(g)}
                        title="Edit"
                        aria-label="Edit"
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(g)}
                        title="Delete"
                        aria-label="Delete"
                        className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ===== VIEW modal (read-only) ===== */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeView}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Gender details"
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-lg font-bold">Gender details</h3>
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
                  Gender Name
                </h5>
                <TextByLang value={viewing.gender} />
              </section>

              <section className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Short Code / Abbreviation
                </h5>
                <TextByLang value={viewing.sc_gender} />
              </section>

              <section className="grid grid-cols-2 gap-4">
                <Field label="Sort Number">{viewing.sort_num ?? 0}</Field>
                <Field label="Created">{fmtDateTime(viewing.created_at)}</Field>
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
                  const g = viewing;
                  closeView();
                  openEdit(g);
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
                {editing === "new" ? "Add gender" : "Edit gender"}
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
                  Gender Name (all languages)
                </h4>
                <I18nInput
                  expanded
                  required
                  label="Gender"
                  value={form.gender}
                  onChange={(v) => setField("gender", v)}
                  placeholder="e.g. Male"
                />
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Short Code / Abbreviation (all languages)
                </h4>
                <I18nInput
                  expanded
                  label="Short Code"
                  value={form.sc_gender}
                  onChange={(v) => setField("sc_gender", v)}
                  placeholder="e.g. M"
                />
              </section>

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
                {editing === "new" ? "Create gender" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}