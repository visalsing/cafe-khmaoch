import React, { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import {
  inputCls, I18nInput, StatusPill, useList, tr, cleanI18n, fmtDate, bySort } from "./shared";

const emptyForm = { name: {}, description: {}, img: "", thumbnail: "", status: 1, sort_num: 0 };

/**
 * Manager for tables that share the same shape:
 * categories and drinks_type (name/description JSONB, img, thumbnail, status, sort_num).
 */
export default function LookupManager({ service, title, subtitle, singular, namePlaceholder }) {
  const { list, loading, error, reload } = useList(service.list);
  const [editing, setEditing] = useState(null); // null | "new" | row
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const openNew = () => { setForm(emptyForm); setEditing("new"); };
  const openEdit = (row) => {
    setForm({
      name: row.name || {},
      description: row.description || {},
      img: row.img || "",
      thumbnail: row.thumbnail || "",
      status: row.status,
      sort_num: row.sort_num ?? 0,
    });
    setEditing(row);
  };
  const close = () => setEditing(null);

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.en?.trim()) return alert("English name is required.");
    setSaving(true);
    try {
      const payload = {
        name: cleanI18n(form.name),
        description: cleanI18n(form.description),
        img: form.img.trim(),
        thumbnail: form.thumbnail.trim(),
        status: Number(form.status),
        sort_num: Number(form.sort_num) || 0,
      };
      if (editing === "new") await service.create(payload);
      else await service.update(editing.id, payload);
      close();
      await reload();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (row) => {
    try {
      await service.update(row.id, { status: Number(row.status) === 1 ? 0 : 1 });
      await reload();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete ${singular.toLowerCase()} "${tr(row.name)}"?`)) return;
    try {
      await service.remove(row.id);
      await reload();
    } catch (err) {
      // e.g. a category that still has products (ON DELETE RESTRICT)
      alert(err.message);
    }
  };

  const shown = [...list]
    .sort(bySort)
    .filter((r) => tr(r.name).toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">{title}</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <button onClick={openNew} className="px-4 py-2 text-sm font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2 self-start">
          <Plus className="w-4 h-4" /> Add {singular.toLowerCase()}
        </button>
      </div>

      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${title.toLowerCase()}...`} className={`${inputCls} sm:max-w-xs`} />

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
              <th className="p-4">{singular}</th>
              <th className="p-4">Description</th>
              <th className="p-4">Thumbnail</th>
              <th className="p-4">Order</th>
              <th className="p-4">Status</th>
              <th className="p-4">Created / Updated</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="p-4" colSpan={7}>Loading...</td></tr>}
            {!loading && shown.length === 0 && (
              <tr><td className="p-4 text-center text-slate-400" colSpan={7}>Nothing here yet.</td></tr>
            )}
            {shown.map((row) => (
              <tr key={row.id} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {row.img ? (
                      <img src={row.img} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400">Img</div>
                    )}
                    <span className="font-semibold">{tr(row.name)}</span>
                  </div>
                </td>
                <td className="p-4 text-slate-500 truncate max-w-xs">{tr(row.description) || "—"}</td>
                <td className="p-4">
                  {row.thumbnail ? (
                    <img src={row.thumbnail} alt="" className="w-8 h-8 rounded-md object-cover" />
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="p-4">{row.sort_num}</td>
                <td className="p-4"><StatusPill status={row.status} onClick={() => toggleStatus(row)} /></td>
                <td className="p-4 text-xs text-slate-400">
                  <div>C: {fmtDate(row.created_at)}</div>
                  <div>U: {fmtDate(row.updated_at)}</div>
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(row)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(row)} className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={save} className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{editing === "new" ? `Add ${singular}` : `Edit ${singular}`}</h3>
              <button type="button" onClick={close}><X className="w-5 h-5" /></button>
            </div>

            <I18nInput label="Name" value={form.name} onChange={(v) => setField("name", v)} placeholder={namePlaceholder} />
            <I18nInput label="Description" multiline value={form.description} onChange={(v) => setField("description", v)} />
            <input className={inputCls} placeholder="Image URL (optional)" value={form.img} onChange={(e) => setField("img", e.target.value)} />
            <input className={inputCls} placeholder="Thumbnail URL (optional)" value={form.thumbnail} onChange={(e) => setField("thumbnail", e.target.value)} />

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-slate-600 dark:text-slate-400">
                Status
                <select className={`${inputCls} mt-1`} value={form.status} onChange={(e) => setField("status", e.target.value)}>
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </label>
              <label className="text-sm text-slate-600 dark:text-slate-400">
                Sort order
                <input className={`${inputCls} mt-1`} type="number" value={form.sort_num} onChange={(e) => setField("sort_num", e.target.value)} />
              </label>
            </div>

            <button disabled={saving} className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold">
              {saving ? "Saving..." : `Save ${singular.toLowerCase()}`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}