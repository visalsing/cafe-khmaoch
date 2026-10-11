import React, { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, SlidersHorizontal, Zap } from "lucide-react";
import {
  categoryService, drinksTypesService, productService, assetUrl,
} from "../../services/api";
import ImageUpload from "./ImageUpload";
import {
  inputCls, I18nInput, StatusPill, useList, asList, tr, cleanI18n, money, bySort,
} from "./Shared.jsx";

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

const emptyForm = {
  name: {},
  description: {},
  price: "",
  big_size_price: "",
  small_size_price: "",
  category_id: "",
  type_id: "",
  status: 1,
  sort_num: 0,
};
const NO_IMAGE_CHANGE = { file: null, remove: false };

export default function AddMenu() {
  const { list: products, loading, error, reload } = useList(productService.list);
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  
  // Set editing to "new" by default so the form is open immediately
  const [editing, setEditing] = useState("new"); // "new" | product
  const [form, setForm] = useState(emptyForm);
  const [imageChange, setImageChange] = useState(NO_IMAGE_CHANGE);
  const [formMode, setFormMode] = useState("full"); // "quick" (compact add) | "full" (every field)
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [catFilter, setCatFilter] = useState("all");      // "all" | category id
  const [typeFilter, setTypeFilter] = useState("all");    // "all" | type id
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | 1 | 0

  useEffect(() => {
    categoryService.list().then((d) => {
      const list = asList(d);
      setCategories(list);
      // Automatically assign the first category if form category is empty
      setForm((f) => ({ ...f, category_id: f.category_id || list[0]?.id || "" }));
    }).catch(() => {});
    
    drinksTypesService.list().then((d) => setTypes(asList(d))).catch(() => {});
  }, []);

  const catName = useMemo(() => new Map(categories.map((c) => [c.id, tr(c.name)])), [categories]);
  const typeName = useMemo(() => new Map(types.map((t) => [t.id, tr(t.name)])), [types]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = (mode = "full") => {
    setForm({ ...emptyForm, category_id: categories[0]?.id ?? "" });
    setImageChange(NO_IMAGE_CHANGE);
    setFormMode(mode);
    setEditing("new");
  };

  const openEdit = (p) => {
    setForm({
      name: p.name || {},
      description: p.description || {},
      price: p.price ?? "",
      big_size_price: p.big_size_price ?? "",
      small_size_price: p.small_size_price ?? "",
      category_id: p.category_id ?? "",
      type_id: p.type_id ?? "",
      status: p.status,
      sort_num: p.sort_num ?? 0,
    });
    setImageChange(NO_IMAGE_CHANGE);
    setFormMode("full");
    setEditing(p);
  };

  // When closing/canceling an edit, revert back to the default "new" creation form instead of hiding it completely
  const close = () => {
    openNew("full");
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.en?.trim()) return alert("The English name is required.");
    if (form.price === "" || Number(form.price) < 0) return alert("Enter a price of 0 or more.");
    if (!form.category_id) return alert("Choose a category.");

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", JSON.stringify(cleanI18n(form.name)));
      fd.append("description", JSON.stringify(cleanI18n(form.description)));
      fd.append("price", String(form.price));
      fd.append("big_size_price", String(form.big_size_price));
      fd.append("small_size_price", String(form.small_size_price));
      fd.append("category_id", String(form.category_id));
      fd.append("type_id", String(form.type_id));
      fd.append("status", String(Number(form.status)));
      fd.append("sort_num", String(Number(form.sort_num) || 0));
      if (imageChange.file) fd.append("image", imageChange.file);
      else if (imageChange.remove) fd.append("removeImage", "1");

      if (editing === "new") await productService.create(fd);
      else await productService.update(editing.id, fd);

      close(); // Resets back to a fresh "new" form
      await reload();
    } catch (err) {
      console.error("Error saving product:", err);
      alert(err.message || "Error saving product.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (p) => {
    try {
      await productService.setStatus(p.id, Number(p.status) === 1 ? 0 : 1);
      await reload();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete "${tr(p.name)}"?`)) return;
    try {
      await productService.remove(p.id);
      await reload();
    } catch (err) {
      alert(err.message);
    }
  };

  const activeFilters =
    (catFilter !== "all") + (typeFilter !== "all") + (statusFilter !== "all");
  const clearFilters = () => {
    setCatFilter("all");
    setTypeFilter("all");
    setStatusFilter("all");
  };

  const countBy = (fn) => products.filter(fn).length;

  const shown = [...products]
    .sort(bySort)
    .filter((p) => {
      if (catFilter !== "all" && p.category_id !== catFilter) return false;
      if (typeFilter !== "all" && p.type_id !== typeFilter) return false;
      if (statusFilter !== "all" && Number(p.status) !== statusFilter) return false;
      return Object.values(p.name || {}).join(" ").toLowerCase().includes(query.toLowerCase());
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Menu Manager</h1>
          <p className="text-sm text-slate-500">Products you sell. Changes appear on the storefront and POS.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search items..." className={`${inputCls} sm:max-w-xs`} />
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 hover:border-amber-500"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {showFilters ? "Hide Filters" : "Show Filters"}
          {activeFilters > 0 && (
            <span className="px-1.5 rounded-full bg-amber-600 text-white text-xs leading-5">{activeFilters}</span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500">Categories</div>
            <div className="flex flex-wrap gap-2">
              <Chip active={catFilter === "all"} onClick={() => setCatFilter("all")}>All</Chip>
              {categories.map((c) => (
                <Chip key={c.id} active={catFilter === c.id} onClick={() => setCatFilter(c.id)}>
                  {tr(c.name)} ({countBy((p) => p.category_id === c.id)})
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500">Drinks Types</div>
            <div className="flex flex-wrap gap-2">
              <Chip active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>All</Chip>
              {types.map((t) => (
                <Chip key={t.id} active={typeFilter === t.id} onClick={() => setTypeFilter(t.id)}>
                  {tr(t.name)} ({countBy((p) => p.type_id === t.id)})
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500">Status</div>
            <div className="flex flex-wrap gap-2">
              <Chip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>All</Chip>
              <Chip active={statusFilter === 1} onClick={() => setStatusFilter(1)}>
                Available ({countBy((p) => Number(p.status) === 1)})
              </Chip>
              <Chip active={statusFilter === 0} onClick={() => setStatusFilter(0)}>
                Hidden ({countBy((p) => Number(p.status) === 0)})
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

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-sm flex items-center justify-between">
          {error}
          <button onClick={reload} className="font-semibold underline">Retry</button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4">Item</th>
              <th className="p-4">Category</th>
              <th className="p-4">Type</th>
              <th className="p-4">Price</th>
              <th className="p-4">Big</th>
              <th className="p-4">Small</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="p-4 text-center text-slate-400" colSpan={8}>Loading...</td></tr>}
            {!loading && shown.length === 0 && (
              <tr><td className="p-4 text-center text-slate-400" colSpan={8}>{products.length === 0 ? "No items yet." : "No items match your filters."}</td></tr>
            )}
            {!loading && shown.map((p) => {
              const thumb = assetUrl(p.thumbnail || p.img);
              return (
                <tr key={p.id} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {thumb ? (
                        <img src={thumb} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400">Img</div>
                      )}
                      <span className="font-semibold">{tr(p.name)}</span>
                    </div>
                  </td>
                  <td className="p-4">{catName.get(p.category_id) || "—"}</td>
                  <td className="p-4">{typeName.get(p.type_id) || "—"}</td>
                  <td className="p-4 font-medium">{money(p.price)}</td>
                  <td className="p-4 font-medium">{money(p.big_size_price)}</td>
                  <td className="p-4 font-medium">{money(p.small_size_price)}</td>
                  <td className="p-4">
                    <StatusPill status={p.status} on="On menu" off="Hidden" onClick={() => toggleStatus(p)} />
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" title="Edit"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(p)} className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ALWAYS VISIBLE FULL ADD / EDIT FORM BELOW TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
        <form onSubmit={save} className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-lg font-bold">{editing === "new" ? "Add menu item" : `Edit item: ${tr(editing.name)}`}</h3>
            {editing !== "new" && (
              <button type="button" onClick={close} className="text-xs text-amber-600 font-semibold hover:underline">
                Cancel editing (Back to Add New)
              </button>
            )}
          </div>

          <section className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">Image</h4>
            <ImageUpload
              key={editing === "new" ? "new" : editing.id}
              label="Image"
              currentUrl={editing === "new" ? "" : assetUrl(editing.img)}
              onChange={setImageChange}
            />
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">Name &amp; description (all languages)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <I18nInput expanded required label="Name" value={form.name} onChange={(v) => setField("name", v)} placeholder="e.g. Iced Latte" />
              <I18nInput expanded multiline label="Description" value={form.description} onChange={(v) => setField("description", v)} />
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">Classification</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm text-slate-600 dark:text-slate-400">
                Category *
                <select className={`${inputCls} mt-1`} value={form.category_id} onChange={(e) => setField("category_id", e.target.value)}>
                  <option value="" disabled>Choose...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{tr(c.name)}</option>)}
                </select>
              </label>
              <label className="text-sm text-slate-600 dark:text-slate-400">
                Drinks type
                <select className={`${inputCls} mt-1`} value={form.type_id} onChange={(e) => setField("type_id", e.target.value)}>
                  <option value="">None</option>
                  {types.map((t) => <option key={t.id} value={t.id}>{tr(t.name)}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">Pricing</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="text-sm text-slate-600 dark:text-slate-400">
                Price *
                <input className={`${inputCls} mt-1`} type="number" step="0.01" min="0" value={form.price} onChange={(e) => setField("price", e.target.value)} />
              </label>
              <label className="text-sm text-slate-600 dark:text-slate-400">
                Big size price
                <input className={`${inputCls} mt-1`} type="number" step="0.01" min="0" placeholder="Not offered" value={form.big_size_price} onChange={(e) => setField("big_size_price", e.target.value)} />
              </label>
              <label className="text-sm text-slate-600 dark:text-slate-400">
                Small size price
                <input className={`${inputCls} mt-1`} type="number" step="0.01" min="0" placeholder="Not offered" value={form.small_size_price} onChange={(e) => setField("small_size_price", e.target.value)} />
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">Display</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm text-slate-600 dark:text-slate-400">
                Status
                <select className={`${inputCls} mt-1`} value={form.status} onChange={(e) => setField("status", e.target.value)}>
                  <option value={1}>On menu</option>
                  <option value={0}>Hidden</option>
                </select>
              </label>
              <label className="text-sm text-slate-600 dark:text-slate-400">
                Sort order
                <input className={`${inputCls} mt-1`} type="number" value={form.sort_num} onChange={(e) => setField("sort_num", e.target.value)} />
              </label>
            </div>
          </section>

          <div className="flex gap-3 pt-2">
            {editing !== "new" && (
              <button type="button" onClick={close} className="px-6 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold">
                Cancel
              </button>
            )}
            <button disabled={saving} className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold">
              {saving ? "Saving..." : editing === "new" ? "Save new item" : "Update item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}