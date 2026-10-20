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
import SvgUpload from "./SvgUpload";
import ImageLightbox from "./ImageLightbox";
import CustomSelect from "./CustomSelect";
import Pagination from "./Pagination";
import { Alert, Chip, Toggle, TextByLang, Field, fmtDate } from "./UiBits";
import {
  inputCls,
  I18nInput,
  useList,
  tr,
  cleanI18n,
  bySort,
} from "./Shared.jsx";

const fmtDay = (v) => (v ? new Date(v).toLocaleDateString() : "—");

const emptyForm = {
  name: {},
  native_name: "",
  description: {},
  icon: "",
  status: 1,
  sort_num: 0,
};
const NO_FILE_CHANGE = { file: null, remove: false };
const NO_SVG_CHANGE = { file: null, remove: false };

const formFromFlag = (flag) => ({
  name: flag.name || {},
  native_name: flag.native_name || "",
  description: flag.description || {},
  icon: flag.icon || "",
  status: Number(flag.status) === 0 ? 0 : 1,
  sort_num: Number(flag.sort_num) || 0,
});

// comparable version of a form, for the "nothing changed" check
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

  const [editing, setEditing] = useState(null); // null | "new" | flag
  const [viewing, setViewing] = useState(null);
  const [zoomSrc, setZoomSrc] = useState(""); // full-screen image URL ("" = closed)
  const [form, setForm] = useState(emptyForm);
  const [imageChange, setImageChange] = useState(NO_FILE_CHANGE);
  const [svgChange, setSvgChange] = useState(NO_FILE_CHANGE);
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

  const closeView = () => {
    setZoomSrc("");
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

  // Esc closes the view modal (the lightbox handles its own Esc first and stops it from reaching here)
  useEffect(() => {
    if (!viewing) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setZoomSrc("");
      setViewing(null);
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
    setImageChange(NO_FILE_CHANGE);
    setSvgChange(NO_FILE_CHANGE);
    setNotice(null);
    setModalHidden(false);
    setEditing("new");
  };

  const openEdit = (flag) => {
    setForm(formFromFlag(flag));
    setImageChange(NO_FILE_CHANGE);
    setSvgChange(NO_FILE_CHANGE);
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

    // editing but nothing was touched (no field changed, no file chosen/removed)
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

      // raster image: one upload becomes img + thumbnail on the server
      if (imageChange.file) fd.append("image", imageChange.file);
      else if (imageChange.remove) fd.append("removeImage", "1");

      // SVG: a separate, independent upload
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
      await countryFlagsService.setStatus(flag.id, next);
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
      if (ok !== false)
        notify(
          "success",
          "Country flags refreshed",
          "Country flags were reloaded from the database.",
        );
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

  // previews shown in the view modal (the raster image and the SVG are separate files)
  const viewTiles = viewing
    ? [
        ["Image", viewing.img],
        ["SVG", viewing.svg],
      ].filter(([, src]) => src)
    : [];

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
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Country Flags</h1>
          <p className="text-sm text-slate-500">
            Manage country names, native names, icons, and flag files.
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
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search country flags..."
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
                All ({flags.length})
              </Chip>
              <Chip
                active={statusFilter === 1}
                onClick={() => setStatusFilter(1)}
              >
                Active ({countBy((f) => Number(f.status) === 1)})
              </Chip>
              <Chip
                active={statusFilter === 0}
                onClick={() => setStatusFilter(0)}
              >
                Hidden ({countBy((f) => Number(f.status) === 0)})
              </Chip>
            </div>
          </div>
          {activeFilters > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
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
                        <div className="text-xs text-sky-600 mt-1">
                          SVG attached
                        </div>
                      )}
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
                      <div>C: {fmtDay(flag.created_at)}</div>
                      <div>U: {fmtDay(flag.updated_at)}</div>
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

      {/* ===== VIEW modal + full-screen image ===== */}
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
              onClick={(e) => e.stopPropagation()}
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
                {viewTiles.length > 0 ? (
                  <div
                    className={`grid gap-3 ${viewTiles.length > 1 ? "sm:grid-cols-2" : ""}`}
                  >
                    {viewTiles.map(([label, src]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setZoomSrc(assetUrl(src))}
                        aria-label={`View ${label} full screen`}
                        className="relative group block text-left cursor-zoom-in"
                      >
                        <img
                          src={assetUrl(src)}
                          alt=""
                          className="w-full h-40 object-contain rounded-xl bg-slate-100 dark:bg-slate-800 p-2"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-black/60 text-white">
                          {label}
                        </span>
                        <span className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white font-medium text-sm">
                          Click to view full screen
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="w-full h-32 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm text-slate-400">
                    No image or SVG
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
                  <Field label="Files">
                    {[viewing.img && "Image", viewing.svg && "SVG"]
                      .filter(Boolean)
                      .join(" + ") || "—"}
                  </Field>
                  <Field label="Created">{fmtDate(viewing.created_at)}</Field>
                  <Field label="Updated">{fmtDate(viewing.updated_at)}</Field>
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

          {/* sibling of the modal on purpose: its clicks must not reach the modal's backdrop handler */}
          {zoomSrc && (
            <ImageLightbox
              src={zoomSrc}
              alt={tr(viewing.name)}
              title={tr(viewing.name)}
              info={lightboxInfo}
              infoTitle="Country flag details"
              onClose={() => setZoomSrc("")}
            />
          )}
        </>
      )}

      {/* ===== ADD / EDIT modal ===== */}
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
                  Image (JPG, PNG, WebP, GIF)
                </h4>
                <ImageUpload
                  key={editing === "new" ? "new-img" : `img-${editing.id}`}
                  label="Flag image"
                  currentUrl={editing === "new" ? "" : assetUrl(editing.img)}
                  onChange={setImageChange}
                />
                <p className="text-xs text-slate-400">
                  Optional. One upload; the small thumbnail is created
                  automatically.
                </p>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  SVG (separate file)
                </h4>
                <SvgUpload
                  key={editing === "new" ? "new-svg" : `svg-${editing.id}`}
                  label="Flag SVG"
                  currentUrl={editing === "new" ? "" : editing.svg}
                  onChange={setSvgChange}
                />
                <p className="text-xs text-slate-400">
                  Optional. Independent from the image above.
                </p>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Names &amp; description
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <div className="w-full">
                    <I18nInput
                      expanded
                      required
                      label="Name"
                      value={form.name}
                      onChange={(v) => setField("name", v)}
                      placeholder="e.g. Cambodia"
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
                <label className="block text-sm text-slate-600 dark:text-slate-400">
                  Native name
                  <input
                    value={form.native_name}
                    onChange={(e) => setField("native_name", e.target.value)}
                    maxLength={120}
                    placeholder="e.g. កម្ពុជា"
                    className={`${inputCls} mt-1 w-full`}
                  />
                </label>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Display
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="text-sm text-slate-600 dark:text-slate-400">
                    Icon / emoji
                    <input
                      value={form.icon}
                      onChange={(e) => setField("icon", e.target.value)}
                      maxLength={100}
                      placeholder="e.g. 🇰🇭"
                      className={`${inputCls} mt-1 w-full`}
                    />
                  </label>
                  <label className="text-sm text-slate-600 dark:text-slate-400">
                    Sort number
                    <input
                      type="number"
                      value={form.sort_num}
                      onChange={(e) => setField("sort_num", e.target.value)}
                      className={`${inputCls} mt-1 w-full`}
                    />
                  </label>
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
                </div>
              </section>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={close}
                  className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold transition-colors shadow-sm"
                >
                  {saving ? "Saving..." : "Save country flag"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
