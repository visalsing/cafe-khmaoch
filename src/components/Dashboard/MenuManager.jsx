import React, { useState } from "react";
import { Plus, Pencil, Trash2, X, RotateCcw } from "lucide-react";
import { useMenu } from "../../context/MenuContext";

const emptyForm = { title: "", category: "Coffee", price: "", badge: "", img: "", available: true };
const money = (n) => `$${Number(n).toFixed(2)}`;

export default function MenuManager() {
  const { items, categories, loading, addItem, updateItem, removeItem, resetMenu } = useMenu();
  const [editing, setEditing] = useState(null); // null | "new" | item
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const openNew = () => { setForm(emptyForm); setEditing("new"); };
  const openEdit = (item) => { setForm({ ...item }); setEditing(item); };
  const close = () => setEditing(null);

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || Number(form.price) <= 0) {
      return alert("Name and a price above 0 are required.");
    }
    setSaving(true);
    try {
      const data = { ...form, title: form.title.trim(), category: form.category.trim(), price: Number(form.price) };
      if (editing === "new") await addItem(data);
      else await updateItem(editing.id, data);
      close();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Delete "${item.title}"?`)) await removeItem(item.id);
  };

  const handleReset = async () => {
    if (window.confirm("Reset the menu to the sample data? Your changes will be lost.")) await resetMenu();
  };

  const shown = items.filter((i) => i.title.toLowerCase().includes(query.toLowerCase()));
  const inputCls =
    "w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-amber-500";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Menu Manager</h1>
          <p className="text-sm text-slate-500">Changes appear on the storefront and POS instantly.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button onClick={openNew} className="px-4 py-2 text-sm font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add item
          </button>
        </div>
      </div>

      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search items..." className={`${inputCls} sm:max-w-xs`} />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4">Item</th>
              <th className="p-4">Category</th>
              <th className="p-4">Price</th>
              <th className="p-4">Available</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="p-4" colSpan={5}>Loading...</td></tr>}
            {shown.map((item) => (
              <tr key={item.id} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <img src={item.img} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    <span className="font-semibold">{item.title}</span>
                  </div>
                </td>
                <td className="p-4">{item.category}</td>
                <td className="p-4 font-medium">{money(item.price)}</td>
                <td className="p-4">
                  <button
                    onClick={() => updateItem(item.id, { available: !item.available })}
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      item.available !== false ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {item.available !== false ? "On menu" : "Hidden"}
                  </button>
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(item)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(item)} className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={save} className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{editing === "new" ? "Add menu item" : "Edit menu item"}</h3>
              <button type="button" onClick={close}><X className="w-5 h-5" /></button>
            </div>

            <input className={inputCls} placeholder="Name" value={form.title} onChange={(e) => setField("title", e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <input className={inputCls} list="cat-list" placeholder="Category" value={form.category} onChange={(e) => setField("category", e.target.value)} />
              <datalist id="cat-list">
                {categories.filter((c) => c !== "All").map((c) => <option key={c} value={c} />)}
              </datalist>
              <input className={inputCls} type="number" step="0.01" min="0" placeholder="Price" value={form.price} onChange={(e) => setField("price", e.target.value)} />
            </div>
            <input className={inputCls} placeholder="Badge (e.g. Best Seller)" value={form.badge} onChange={(e) => setField("badge", e.target.value)} />
            <input className={inputCls} placeholder="Image URL (optional)" value={form.img} onChange={(e) => setField("img", e.target.value)} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.available !== false} onChange={(e) => setField("available", e.target.checked)} />
              Show on menu
            </label>

            <button disabled={saving} className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold">
              {saving ? "Saving..." : "Save"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}