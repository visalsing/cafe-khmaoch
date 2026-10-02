import React, { useState } from "react";
import { Plus, Pencil, Trash2, X, Eye, EyeOff, ChevronUp, ChevronDown, RotateCcw, ExternalLink } from "lucide-react";
import { useHero } from "../../../context/HeroContext";

const emptyForm = { tag: "", title: "", text: "", img: "", cta: "", link: "#shop", visible: true };
const LINK_SUGGESTIONS = ["#shop", "#about", "#contact", "/shop", "/cart"];

export default function HeroManager() {
  const { slides, loading, addSlide, updateSlide, removeSlide, moveSlide, resetSlides } = useHero();
  const [editing, setEditing] = useState(null); // null | "new" | slide
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const openNew = () => { setForm(emptyForm); setEditing("new"); };
  const openEdit = (s) => { setForm({ ...emptyForm, ...s }); setEditing(s); };
  const close = () => setEditing(null);

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.img.trim()) return alert("A title and an image URL are required.");
    setSaving(true);
    try {
      const data = { ...form, title: form.title.trim(), img: form.img.trim() };
      if (editing === "new") await addSlide(data);
      else await updateSlide(editing.id, data);
      close();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s) => {
    if (window.confirm(`Delete slide "${s.title}"?`)) await removeSlide(s.id);
  };
  const handleReset = async () => {
    if (window.confirm("Reset the hero slides to the defaults? Your changes will be lost.")) await resetSlides();
  };

  const visibleCount = slides.filter((s) => s.visible !== false).length;
  const inputCls =
    "w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-amber-500";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Hero Slider</h1>
          <p className="text-sm text-slate-500">
            {visibleCount} of {slides.length} slides visible · changes appear on the homepage instantly.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/" target="_blank" rel="noopener noreferrer" className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2">
            <ExternalLink className="w-4 h-4" /> Preview
          </a>
          <button onClick={handleReset} className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button onClick={openNew} className="px-4 py-2 text-sm font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add slide
          </button>
        </div>
      </div>

      {!loading && visibleCount === 0 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
          All slides are hidden, so the hero section is not shown on the homepage.
        </div>
      )}

      <div className="space-y-3">
        {loading && <p className="text-slate-500">Loading...</p>}
        {slides.map((s, i) => (
          <div
            key={s.id}
            className={`flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 ${
              s.visible === false ? "opacity-60" : ""
            }`}
          >
            <img src={s.img} alt="" className="w-full sm:w-48 h-28 object-cover rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0" />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">#{i + 1}</span>
                {s.tag && <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">{s.tag}</span>}
                {s.visible === false && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700">Hidden</span>}
              </div>
              <h3 className="font-bold truncate">{s.title}</h3>
              <p className="text-sm text-slate-500 line-clamp-2">{s.text}</p>
              {s.cta && <p className="text-xs text-slate-500">Button: <b>{s.cta}</b> → {s.link || "-"}</p>}
            </div>
            <div className="flex sm:flex-col items-center justify-end gap-1">
              <div className="flex gap-1">
                <button onClick={() => moveSlide(s.id, -1)} disabled={i === 0} title="Move up" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                <button onClick={() => moveSlide(s.id, 1)} disabled={i === slides.length - 1} title="Move down" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
              </div>
              <div className="flex gap-1">
                <button onClick={() => updateSlide(s.id, { visible: s.visible === false })} title={s.visible === false ? "Show" : "Hide"} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                  {s.visible === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => openEdit(s)} title="Edit" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(s)} title="Delete" className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ADD / EDIT MODAL with live preview */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={save} className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{editing === "new" ? "Add slide" : "Edit slide"}</h3>
              <button type="button" onClick={close}><X className="w-5 h-5" /></button>
            </div>

            {/* live preview */}
            <div className="relative h-44 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 text-white">
              {form.img && <img src={form.img} alt="" className="absolute inset-0 w-full h-full object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-r from-stone-950/80 via-stone-900/50 to-transparent" />
              <div className="relative z-10 h-full flex items-center px-6">
                <div className="space-y-1.5 max-w-xs">
                  {form.tag && <span className="inline-block px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-amber-500/90 rounded-full">{form.tag}</span>}
                  <p className="text-xl font-extrabold leading-tight">{form.title || "Slide title"}</p>
                  {form.text && <p className="text-xs text-amber-50/90 line-clamp-2">{form.text}</p>}
                  {form.cta && <span className="inline-block px-3 py-1 text-xs font-semibold bg-amber-500 rounded-lg">{form.cta}</span>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className={inputCls} placeholder="Badge (e.g. Fresh Bakery)" value={form.tag} onChange={(e) => setField("tag", e.target.value)} />
              <input className={inputCls} placeholder="Title *" value={form.title} onChange={(e) => setField("title", e.target.value)} />
            </div>
            <textarea className={inputCls} rows={2} placeholder="Description" value={form.text} onChange={(e) => setField("text", e.target.value)} />
            <input className={inputCls} placeholder="Image URL * (wide photo, 1600px works well)" value={form.img} onChange={(e) => setField("img", e.target.value)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className={inputCls} placeholder="Button label (leave empty for no button)" value={form.cta} onChange={(e) => setField("cta", e.target.value)} />
              <input className={inputCls} list="hero-links" placeholder="Button link (#shop or /shop)" value={form.link} onChange={(e) => setField("link", e.target.value)} />
              <datalist id="hero-links">{LINK_SUGGESTIONS.map((l) => <option key={l} value={l} />)}</datalist>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.visible !== false} onChange={(e) => setField("visible", e.target.checked)} />
              Show on homepage
            </label>

            <button disabled={saving} className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold">
              {saving ? "Saving..." : "Save slide"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}