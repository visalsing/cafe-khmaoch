import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import { categoryService } from "../../services/api";

const emptyForm = {
  name_en: "",
  name_km: "",
  name_zh: "",
  name_lo: "",
  name_ja: "",
  name_vi: "",
  desc_en: "",
  desc_km: "",
  desc_zh: "",
  desc_lo: "",
  desc_ja: "",
  desc_vi: "",
  img: "",
  thumbnail: "",
  status: "Active",
};

export default function CategoriesManager() {
  const [categoriesList, setCategoriesList] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  
  const [showNameLangs, setShowNameLangs] = useState(false);
  const [showDescLangs, setShowDescLangs] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await categoryService.list();
      setCategoriesList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  
  const openNew = () => { 
    setForm(emptyForm); 
    setShowNameLangs(false);
    setShowDescLangs(false);
    setEditing("new"); 
  };
  
  const openEdit = (cat) => {
    const n = typeof cat.name === 'object' && cat.name !== null ? cat.name : { en: cat.name || "" };
    const d = typeof cat.description === 'object' && cat.description !== null ? cat.description : { en: cat.description || "" };

    setForm({ 
      ...cat,
      name_en: n.en || "",
      name_km: n.km || "",
      name_zh: n.zh || "",
      name_lo: n.lo || "",
      name_ja: n.ja || "",
      name_vi: n.vi || "",
      desc_en: d.en || "",
      desc_km: d.km || "",
      desc_zh: d.zh || "",
      desc_lo: d.lo || "",
      desc_ja: d.ja || "",
      desc_vi: d.vi || "",
      status: cat.status === 1 || cat.status === "Active" ? "Active" : "Hidden"
    }); 
    setShowNameLangs(Boolean(n.km || n.zh || n.lo || n.ja || n.vi));
    setShowDescLangs(Boolean(d.km || d.zh || d.lo || d.ja || d.vi));
    setEditing(cat); 
  };
  
  const close = () => setEditing(null);

  const save = async (e) => {
    e.preventDefault();
    if (!form.name_en.trim()) {
      return alert("Category English name is required.");
    }
    setSaving(true);
    try {
      const timestamp = new Date().toISOString();
      
      const payload = {
        name: {
          en: form.name_en.trim(),
          km: form.name_km.trim(),
          zh: form.name_zh.trim(),
          lo: form.name_lo.trim(),
          ja: form.name_ja.trim(),
          vi: form.name_vi.trim(),
        },
        description: {
          en: form.desc_en.trim(),
          km: form.desc_km.trim(),
          zh: form.desc_zh.trim(),
          lo: form.desc_lo.trim(),
          ja: form.desc_ja.trim(),
          vi: form.desc_vi.trim(),
        },
        img: form.img,
        thumbnail: form.thumbnail,
        status: form.status === "Active" ? 1 : 0,
        updated_at: timestamp
      };

      if (editing === "new") {
        payload.created_at = timestamp;
        await categoryService.create(payload);
      } else {
        await categoryService.update(editing.id, payload);
      }

      await fetchCategories();
      close();
    } catch (err) {
      console.error("Error saving category:", err);
      alert("Error saving category.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    const displayName = typeof cat.name === 'object' ? (cat.name?.en || cat.name?.km) : cat.name;
    if (window.confirm(`Delete category "${displayName}"?`)) {
      try {
        await categoryService.remove(cat.id);
        await fetchCategories();
      } catch (err) {
        console.error("Error deleting category:", err);
        alert("Error deleting category.");
      }
    }
  };

  const handleReset = async () => {
    if (window.confirm("Refresh categories from database?")) {
      await fetchCategories();
    }
  };

  const getCategoryName = (cat) => {
    if (!cat.name) return "";
    if (typeof cat.name === 'object') return cat.name.en || cat.name.km || "";
    return cat.name;
  };

  const getCategoryDesc = (cat) => {
    if (!cat.description) return "—";
    if (typeof cat.description === 'object') return cat.description.en || cat.description.km || "—";
    return cat.description;
  };

  const shown = categoriesList.filter((c) => 
    getCategoryName(c).toLowerCase().includes(query.toLowerCase())
  );

  const inputCls =
    "w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-amber-500";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Categories Manager</h1>
          <p className="text-sm text-slate-500">Manage storefront and POS menu categories.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={openNew} className="px-4 py-2 text-sm font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add category
          </button>
        </div>
      </div>

      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search categories..." className={`${inputCls} sm:max-w-xs`} />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4">Category</th>
              <th className="p-4">Description</th>
              <th className="p-4">Thumbnail</th>
              <th className="p-4">Status</th>
              <th className="p-4">Created / Updated</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="p-4 text-center text-slate-400" colSpan={6}>Loading database records...</td></tr>}
            {!loading && shown.length === 0 && (
              <tr><td className="p-4 text-center text-slate-400" colSpan={6}>No categories found.</td></tr>
            )}
            {!loading && shown.map((cat) => {
              const nameStr = getCategoryName(cat);
              const descStr = getCategoryDesc(cat);
              const isActive = cat.status === 1 || cat.status === "Active";

              return (
                <tr key={cat.id} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {cat.img ? (
                        <img src={cat.img} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400">Img</div>
                      )}
                      <span className="font-semibold">{nameStr}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-500 truncate max-w-xs">{descStr}</td>
                  <td className="p-4">
                    {cat.thumbnail ? (
                      <img src={cat.thumbnail} alt="" className="w-8 h-8 rounded-md object-cover" />
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                    }`}>
                      {isActive ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-slate-400">
                    <div>C: {cat.created_at ? new Date(cat.created_at).toLocaleDateString() : "—"}</div>
                    <div>U: {cat.updated_at ? new Date(cat.updated_at).toLocaleDateString() : "—"}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(cat)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(cat)} className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={save} className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between sticky top-0 bg-white dark:py-2 dark:bg-slate-900 z-10 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold">{editing === "new" ? "Add Category" : "Edit Category"}</h3>
              <button type="button" onClick={close}><X className="w-5 h-5" /></button>
            </div>

            {/* Name Fields */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Name (English) *</label>
              <input className={inputCls} placeholder="e.g. Coffee" value={form.name_en} onChange={(e) => setField("name_en", e.target.value)} />
              
              <button 
                type="button" 
                onClick={() => setShowNameLangs(!showNameLangs)} 
                className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 pt-1"
              >
                {showNameLangs ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />} Other languages
              </button>

              {showNameLangs && (
                <div className="space-y-2 pl-3 border-l-2 border-amber-500/30 pt-1">
                  <div>
                    <span className="text-[11px] text-slate-400">ខ្មែរ</span>
                    <input className={inputCls} placeholder="កាហ្វេ" value={form.name_km} onChange={(e) => setField("name_km", e.target.value)} />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400">中文</span>
                    <input className={inputCls} placeholder="咖啡" value={form.name_zh} onChange={(e) => setField("name_zh", e.target.value)} />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400">ລາວ</span>
                    <input className={inputCls} value={form.name_lo} onChange={(e) => setField("name_lo", e.target.value)} />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400">日本語</span>
                    <input className={inputCls} value={form.name_ja} onChange={(e) => setField("name_ja", e.target.value)} />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400">Tiếng Việt</span>
                    <input className={inputCls} value={form.name_vi} onChange={(e) => setField("name_vi", e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            {/* Description Fields */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Description (English)</label>
              <textarea className={`${inputCls} resize-none`} rows="2" placeholder="Freshly roasted coffee..." value={form.desc_en} onChange={(e) => setField("desc_en", e.target.value)} />
              
              <button 
                type="button" 
                onClick={() => setShowDescLangs(!showDescLangs)} 
                className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 pt-1"
              >
                {showDescLangs ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />} Other languages
              </button>

              {showDescLangs && (
                <div className="space-y-2 pl-3 border-l-2 border-amber-500/30 pt-1">
                  <div>
                    <span className="text-[11px] text-slate-400">ខ្មែរ</span>
                    <textarea className={`${inputCls} resize-none`} rows="2" value={form.desc_km} onChange={(e) => setField("desc_km", e.target.value)} />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400">中文</span>
                    <textarea className={`${inputCls} resize-none`} rows="2" value={form.desc_zh} onChange={(e) => setField("desc_zh", e.target.value)} />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400">ລາວ</span>
                    <textarea className={`${inputCls} resize-none`} rows="2" value={form.desc_lo} onChange={(e) => setField("desc_lo", e.target.value)} />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400">日本語</span>
                    <textarea className={`${inputCls} resize-none`} rows="2" value={form.desc_ja} onChange={(e) => setField("desc_ja", e.target.value)} />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400">Tiếng Việt</span>
                    <textarea className={`${inputCls} resize-none`} rows="2" value={form.desc_vi} onChange={(e) => setField("desc_vi", e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Image URL (optional)</label>
              <input className={inputCls} placeholder="https://..." value={form.img} onChange={(e) => setField("img", e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Thumbnail URL (optional)</label>
              <input className={inputCls} placeholder="https://..." value={form.thumbnail} onChange={(e) => setField("thumbnail", e.target.value)} />
            </div>
            
            <div className="flex items-center gap-3 pt-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Status:</label>
              <select className={inputCls} value={form.status} onChange={(e) => setField("status", e.target.value)}>
                <option value="Active">Active</option>
                <option value="Hidden">Hidden</option>
              </select>
            </div>

            <button disabled={saving} className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold mt-4">
              {saving ? "Saving..." : "Save Category"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}