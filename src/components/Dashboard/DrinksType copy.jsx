import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import { drinksTypesService } from "../../services/api";

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

export default function DrinksType() {
  const [typesList, setTypesList] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [editing, setEditing] = useState(null); // null | "new" | type object
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  
  // Accordion toggles for other languages
  const [showNameLangs, setShowNameLangs] = useState(false);
  const [showDescLangs, setShowDescLangs] = useState(false);

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const data = await drinksTypesService.list(); 
      setTypesList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch product types:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  
  const openNew = () => { 
    setForm(emptyForm); 
    setShowNameLangs(false);
    setShowDescLangs(false);
    setEditing("new"); 
  };
  
  const openEdit = (typeItem) => {
    const n = typeof typeItem.name === 'object' && typeItem.name !== null ? typeItem.name : { en: typeItem.name || "" };
    const d = typeof typeItem.description === 'object' && typeItem.description !== null ? typeItem.description : { en: typeItem.description || "" };

    setForm({ 
      ...typeItem,
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
      status: typeItem.status === 1 || typeItem.status === "Active" ? "Active" : "Hidden"
    }); 
    setShowNameLangs(Boolean(n.km || n.zh || n.lo || n.ja || n.vi));
    setShowDescLangs(Boolean(d.km || d.zh || d.lo || d.ja || d.vi));
    setEditing(typeItem); 
  };
  
  const close = () => setEditing(null);

  const save = async (e) => {
    e.preventDefault();
    if (!form.name_en.trim()) {
      return alert("Product Type English name is required.");
    }
    setSaving(true);
    try {
      const timestamp = new Date().toISOString();
      
      const payload = {
        name: {
          en: form.name_en.trim(),
          km: form.name_km.trim() || null,
          zh: form.name_zh.trim() || null,
          lo: form.name_lo.trim() || null,
          ja: form.name_ja.trim() || null,
          vi: form.name_vi.trim() || null,
        },
        description: {
          en: form.desc_en.trim() || null,
          km: form.desc_km.trim() || null,
          zh: form.desc_zh.trim() || null,
          lo: form.desc_lo.trim() || null,
          ja: form.desc_ja.trim() || null,
          vi: form.desc_vi.trim() || null,
        },
        img: form.img.trim() || null,
        thumbnail: form.thumbnail.trim() || null,
        status: form.status === "Active" ? 1 : 0,
        updated_at: timestamp
      };

      if (editing === "new") {
        payload.created_at = timestamp;
        await drinksTypesService.create(payload);
      } else {
        await drinksTypesService.update(editing.id, payload);
      }

      await fetchTypes();
      close();
    } catch (err) {
      console.error("Error saving product type:", err);
      alert("Error saving product type. Check console for details.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (typeItem) => {
    const displayName = typeof typeItem.name === 'object' ? (typeItem.name?.en || typeItem.name?.km) : typeItem.name;
    if (window.confirm(`Delete product type "${displayName}"?`)) {
      try {
        await drinksTypesService.remove(typeItem.id);
        await fetchTypes();
      } catch (err) {
        console.error("Error deleting product type:", err);
        alert("Error deleting product type.");
      }
    }
  };

  const handleReset = async () => {
    if (window.confirm("Refresh product types from database?")) {
      await fetchTypes();
    }
  };

  const getTypeName = (item) => {
    if (!item.name) return "";
    if (typeof item.name === 'object') return item.name.en || item.name.km || "";
    return item.name;
  };

  const getTypeDesc = (item) => {
    if (!item.description) return "—";
    if (typeof item.description === 'object') return item.description.en || item.description.km || "—";
    return item.description;
  };

  const shown = typesList.filter((c) => 
    getTypeName(c).toLowerCase().includes(query.toLowerCase())
  );

  const inputCls =
    "w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-amber-500";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Product Types Manager</h1>
          <p className="text-sm text-slate-500">Manage preparation styles and options (e.g., Hot, Iced, Frappé).</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={openNew} className="px-4 py-2 text-sm font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add product type
          </button>
        </div>
      </div>

      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search product types (e.g. Hot, Iced)..." className={`${inputCls} sm:max-w-xs`} />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4">Product Type</th>
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
              <tr><td className="p-4 text-center text-slate-400" colSpan={6}>No product types found.</td></tr>
            )}
            {!loading && shown.map((typeItem) => {
              const nameStr = getTypeName(typeItem);
              const descStr = getTypeDesc(typeItem);
              const isActive = typeItem.status === 1 || typeItem.status === "Active";

              return (
                <tr key={typeItem.id} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {typeItem.img ? (
                        <img src={typeItem.img} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400">Img</div>
                      )}
                      <span className="font-semibold">{nameStr}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-500 truncate max-w-xs">{descStr}</td>
                  <td className="p-4">
                    {typeItem.thumbnail ? (
                      <img src={typeItem.thumbnail} alt="" className="w-8 h-8 rounded-md object-cover" />
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
                    <div>C: {typeItem.created_at ? new Date(typeItem.created_at).toLocaleDateString() : "—"}</div>
                    <div>U: {typeItem.updated_at ? new Date(typeItem.updated_at).toLocaleDateString() : "—"}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(typeItem)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(typeItem)} className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500"><Trash2 className="w-4 h-4" /></button>
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
              <h3 className="text-lg font-bold">{editing === "new" ? "Add Product Type" : "Edit Product Type"}</h3>
              <button type="button" onClick={close}><X className="w-5 h-5" /></button>
            </div>

            {/* Name Fields */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Name (English) *</label>
              <input className={inputCls} placeholder="e.g. Iced" value={form.name_en} onChange={(e) => setField("name_en", e.target.value)} />
              
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
                    <input className={inputCls} placeholder="ទឹកកក" value={form.name_km} onChange={(e) => setField("name_km", e.target.value)} />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400">中文</span>
                    <input className={inputCls} placeholder="冰" value={form.name_zh} onChange={(e) => setField("name_zh", e.target.value)} />
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
              <textarea className={`${inputCls} resize-none`} rows="2" placeholder="Cold drinks served with ice..." value={form.desc_en} onChange={(e) => setField("desc_en", e.target.value)} />
              
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
              {saving ? "Saving..." : "Save Product Type"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}