import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Eye, X, SlidersHorizontal, RotateCcw } from "lucide-react";
import {
  categoryService,
  drinksTypesService,
  levelsOptionsService,
  assetUrl,
} from "../../services/api";
import ImageUpload from "../ImageUpload.jsx";
import ImageLightbox from "../ImageLightbox";
import CustomSelect from "../CustomSelect";
import { Alert, Chip, Toggle, TextByLang, Field, fmtDate } from "../UiBits";
import { inputCls, I18nInput, useList, asList, tr, cleanI18n, bySort } from "../Shared.jsx";

const NO_IMAGE_CHANGE = { file: null, remove: false };
const emptyForm = { name: {}, description: {}, status: 1, sort_num: 0, array_categories: [], array_drinkstypes: [] };

const idList = (v) => (Array.isArray(v) ? v.map(Number).filter((n) => Number.isInteger(n)) : []);
const sortedIds = (v) => [...idList(v)].sort((a, b) => a - b);

const formFromGroup = (g) => ({
  name: g.name || {},
  description: g.description || {},
  status: g.status,
  sort_num: g.sort_num ?? 0,
  array_categories: sortedIds(g.array_categories),
  array_drinkstypes: sortedIds(g.array_drinkstypes),
});

// comparable version of a form, for the "nothing changed" check
const stableTexts = (o) =>
  Object.fromEntries(Object.entries(cleanI18n(o)).sort(([a], [b]) => a.localeCompare(b)));
const fingerprint = (f) =>
  JSON.stringify({
    name: stableTexts(f.name),
    description: stableTexts(f.description),
    status: Number(f.status),
    sort: Number(f.sort_num) || 0,
    cats: sortedIds(f.array_categories),
    types: sortedIds(f.array_drinkstypes),
  });

// does a group apply to this category / type id? (empty list = applies to all)
const appliesTo = (list, id) => {
  const ids = idList(list);
  return ids.length === 0 || ids.includes(id);
};

// "All" or the names (up to `max`, then "+n")
function AppliesBadges({ ids, names, max = 3 }) {
  const list = idList(ids);
  if (list.length === 0)
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        All
      </span>
    );
  const labels = list.map((id) => names.get(id)).filter(Boolean);
  if (labels.length === 0) return <span className="text-slate-400">{list.length} selected</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {labels.slice(0, max).map((l, i) => (
        <span key={i} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 whitespace-nowrap">
          {l}
        </span>
      ))}
      {labels.length > max && <span className="text-xs text-slate-500">+{labels.length - max}</span>}
    </div>
  );
}

// multi-select chips: nothing selected = "All"
function MultiChips({ options, value, onChange, allLabel }) {
  const toggle = (id) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id].sort((a, b) => a - b));
  return (
    <div className="flex flex-wrap gap-2">
      <Chip active={value.length === 0} onClick={() => onChange([])}>
        {allLabel}
      </Chip>
      {options.map((o) => (
        <Chip key={o.id} active={value.includes(o.id)} onClick={() => toggle(o.id)}>
          {o.label}
        </Chip>
      ))}
    </div>
  );
}

export default function LevelsOptions() {
  const { list: groups, loading, error, reload } = useList(levelsOptionsService.list);
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [editing, setEditing] = useState(null); // null | group (there is no "new": the 3 groups are fixed)
  const [viewing, setViewing] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [imageChange, setImageChange] = useState(NO_IMAGE_CHANGE);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [catFilter, setCatFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
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
    setLightboxOpen(false);
    setViewing(null);
  };

  useEffect(() => {
    if (!notice || notice.type === "error" || notice.returnToForm) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (notice) noticeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [notice]);

  // Esc closes the view modal (the lightbox handles its own Esc first)
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

  const loadLookups = () =>
    Promise.all([
      categoryService.list().then((d) => setCategories(asList(d))).catch(() => {}),
      drinksTypesService.list().then((d) => setTypes(asList(d))).catch(() => {}),
    ]);

  useEffect(() => {
    loadLookups();
  }, []);

  const catName = useMemo(() => new Map(categories.map((c) => [c.id, tr(c.name)])), [categories]);
  const typeName = useMemo(() => new Map(types.map((t) => [t.id, tr(t.name)])), [types]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openEdit = (g) => {
    setForm(formFromGroup(g));
    setImageChange(NO_IMAGE_CHANGE);
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
      notify("warning", "Please check the form", message, { returnToForm: true });
    };
    if (!form.name.en?.trim()) return warn("The English name is required.");

    const groupName = form.name.en.trim();

    // nothing was touched (no field changed, no image chosen/removed)
    const textChanged = fingerprint(form) !== fingerprint(formFromGroup(editing));
    const imageChanged = Boolean(imageChange.file || imageChange.remove);
    if (!textChanged && !imageChanged) {
      close();
      return notify("warning", "No changes", "There is nothing updated/changed.");
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", JSON.stringify(cleanI18n(form.name)));
      fd.append("description", JSON.stringify(cleanI18n(form.description)));
      fd.append("status", String(Number(form.status)));
      fd.append("sort_num", String(Number(form.sort_num) || 0));
      fd.append("array_categories", JSON.stringify(sortedIds(form.array_categories))); // [] = all
      fd.append("array_drinkstypes", JSON.stringify(sortedIds(form.array_drinkstypes))); // [] = all
      if (imageChange.file) fd.append("image", imageChange.file);
      else if (imageChange.remove) fd.append("removeImage", "1");

      await levelsOptionsService.update(editing.id, fd);

      close();
      await reload();
      notify("success", "Level group updated", `"${groupName}" was updated successfully.`);
    } catch (err) {
      console.error("Error saving level group:", err);
      setModalHidden(true);
      notify("error", "Failed to update the group", err.message || "Something went wrong. Please try again.", {
        returnToForm: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (g) => {
    const next = Number(g.status) === 1 ? 0 : 1;
    setTogglingId(g.id);
    try {
      await levelsOptionsService.setStatus(g.id, next);
      await reload();
      notify(
        "success",
        "Level group updated",
        next === 1
          ? `"${tr(g.name)}" was updated successfully. It is now active.`
          : `"${tr(g.name)}" was updated successfully. It is now hidden.`,
      );
    } catch (err) {
      notify("error", "Failed to update the group", err.message || "Something went wrong. Please try again.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [ok] = await Promise.all([reload(), loadLookups()]);
      if (ok !== false) notify("success", "Refreshed", "The level groups were reloaded from the database.");
    } finally {
      setRefreshing(false);
    }
  };

  const activeFilters = (catFilter !== "all") + (typeFilter !== "all") + (statusFilter !== "all");
  const clearFilters = () => {
    setCatFilter("all");
    setTypeFilter("all");
    setStatusFilter("all");
  };
  const countBy = (fn) => groups.filter(fn).length;

  const shown = [...groups].sort(bySort).filter((g) => {
    if (catFilter !== "all" && !appliesTo(g.array_categories, catFilter)) return false;
    if (typeFilter !== "all" && !appliesTo(g.array_drinkstypes, typeFilter)) return false;
    if (statusFilter !== "all" && Number(g.status) !== statusFilter) return false;
    return Object.values(g.name || {}).join(" ").toLowerCase().includes(query.toLowerCase());
  });

  const lightboxInfo = viewing ? (
    <div className="space-y-3 text-sm">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Name</span>
        <p className="mt-1 font-medium">{tr(viewing.name)}</p>
      </div>
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Description</span>
        <p className="mt-1 text-slate-300 text-xs leading-relaxed">
          {tr(viewing.description) || "No description provided."}
        </p>
      </div>
    </div>
  ) : null;

  const categoryOptions = categories.map((c) => ({ id: c.id, label: tr(c.name) }));
  const typeOptions = types.map((t) => ({ id: t.id, label: tr(t.name) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Levels Options</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            The three option groups customers can customize a drink with. A group appears on a drink only when the
            drink's category and drinks type match it (nothing selected = all).
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 hover:border-amber-500 disabled:opacity-60 transition-colors self-start"
        >
          <RotateCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search groups..."
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
            <span className="px-1.5 rounded-full bg-amber-600 text-white text-xs leading-5">{activeFilters}</span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-sm">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500">Applies to category</div>
            <div className="flex flex-wrap gap-2">
              <Chip active={catFilter === "all"} onClick={() => setCatFilter("all")}>All</Chip>
              {categories.map((c) => (
                <Chip key={c.id} active={catFilter === c.id} onClick={() => setCatFilter(c.id)}>
                  {tr(c.name)} ({countBy((g) => appliesTo(g.array_categories, c.id))})
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500">Applies to drinks type</div>
            <div className="flex flex-wrap gap-2">
              <Chip active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>All</Chip>
              {types.map((t) => (
                <Chip key={t.id} active={typeFilter === t.id} onClick={() => setTypeFilter(t.id)}>
                  {tr(t.name)} ({countBy((g) => appliesTo(g.array_drinkstypes, t.id))})
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500">Status</div>
            <div className="flex flex-wrap gap-2">
              <Chip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>All</Chip>
              <Chip active={statusFilter === 1} onClick={() => setStatusFilter(1)}>
                Active ({countBy((g) => Number(g.status) === 1)})
              </Chip>
              <Chip active={statusFilter === 0} onClick={() => setStatusFilter(0)}>
                Hidden ({countBy((g) => Number(g.status) === 0)})
              </Chip>
            </div>
          </div>

          {activeFilters > 0 && (
            <button type="button" onClick={clearFilters} className="text-sm text-amber-600 font-medium underline">
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
                <button type="button" onClick={dismissNotice} className="ml-2 font-semibold underline">
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
          title="Could not load the level groups"
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
              <th className="p-4">Group</th>
              <th className="p-4">Description</th>
              <th className="p-4">Categories</th>
              <th className="p-4">Drinks types</th>
              <th className="p-4">Sort</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="p-4 text-center text-slate-400" colSpan={7}>Loading...</td></tr>
            )}
            {!loading && shown.length === 0 && (
              <tr>
                <td className="p-4 text-center text-slate-400" colSpan={7}>
                  {groups.length === 0 ? "No groups yet. Run npm run db:setup to create them." : "No groups match your filters."}
                </td>
              </tr>
            )}
            {!loading &&
              shown.map((g) => {
                const thumb = assetUrl(g.thumbnail || g.img);
                return (
                  <tr
                    key={g.id}
                    className="border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {thumb ? (
                          <img src={thumb} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                            Img
                          </div>
                        )}
                        <div>
                          <div className="font-semibold">{tr(g.name)}</div>
                          <div className="text-xs text-slate-400 font-mono">{g.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-500 max-w-xs truncate">{tr(g.description) || "—"}</td>
                    <td className="p-4"><AppliesBadges ids={g.array_categories} names={catName} /></td>
                    <td className="p-4"><AppliesBadges ids={g.array_drinkstypes} names={typeName} /></td>
                    <td className="p-4">{g.sort_num ?? 0}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            Number(g.status) === 1 ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {Number(g.status) === 1 ? "Active" : "Hidden"}
                        </span>
                        <Toggle
                          checked={Number(g.status) === 1}
                          disabled={togglingId === g.id}
                          label={Number(g.status) === 1 ? "Hide this group" : "Show this group"}
                          onChange={() => toggleStatus(g)}
                        />
                      </div>
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
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

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
              aria-label="Level group details"
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-lg font-bold">Level group details</h3>
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
                  <div className="w-full h-24 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm text-slate-400">
                    No image
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xl font-extrabold">{tr(viewing.name)}</h4>
                    <div className="text-xs text-slate-400 font-mono">{viewing.code}</div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                      Number(viewing.status) === 1 ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {Number(viewing.status) === 1 ? "Active" : "Hidden"}
                  </span>
                </div>

                <section className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-amber-600">Name</h5>
                  <TextByLang value={viewing.name} />
                </section>

                <section className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-amber-600">Description</h5>
                  <TextByLang value={viewing.description} />
                </section>

                <section className="space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-amber-600">Applies to</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Categories">
                      <AppliesBadges ids={viewing.array_categories} names={catName} max={50} />
                    </Field>
                    <Field label="Drinks types">
                      <AppliesBadges ids={viewing.array_drinkstypes} names={typeName} max={50} />
                    </Field>
                  </div>
                </section>

                <section className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Field label="Sort order">{viewing.sort_num ?? 0}</Field>
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

          {lightboxOpen && viewing.img && (
            <ImageLightbox
              src={assetUrl(viewing.img)}
              alt={tr(viewing.name)}
              title={tr(viewing.name)}
              info={lightboxInfo}
              infoTitle="Group details"
              onClose={() => setLightboxOpen(false)}
            />
          )}
        </>
      )}

      {/* ===== EDIT modal ===== */}
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
              <div>
                <h3 className="text-lg font-bold">Edit level group</h3>
                <div className="text-xs text-slate-400 font-mono">{editing.code}</div>
              </div>
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">Image</h4>
                <ImageUpload
                  key={editing.id}
                  label="Image"
                  currentUrl={assetUrl(editing.img)}
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
                      placeholder="e.g. Sugar level"
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

              <section className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">Applies to</h4>
                <p className="text-xs text-slate-500">
                  Choose where this group is offered. Select nothing (<b>All</b>) to offer it on every drink. When you
                  choose both lists, a drink must match <b>both</b>.
                </p>
                <div className="space-y-2">
                  <div className="text-sm text-slate-600 dark:text-slate-400">Categories</div>
                  <MultiChips
                    allLabel="All categories"
                    options={categoryOptions}
                    value={form.array_categories}
                    onChange={(v) => setField("array_categories", v)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-slate-600 dark:text-slate-400">Drinks types</div>
                  <MultiChips
                    allLabel="All types"
                    options={typeOptions}
                    value={form.array_drinkstypes}
                    onChange={(v) => setField("array_drinkstypes", v)}
                  />
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">Display</h4>
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
                  {saving ? "Saving..." : "Save group"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}