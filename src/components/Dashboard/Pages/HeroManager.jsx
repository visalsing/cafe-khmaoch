import React, { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Eye, EyeOff, ChevronUp, ChevronDown, RotateCcw, ExternalLink } from "lucide-react";
import { heroService, assetUrl } from "../../../services/api";
import ImageUpload from "../ImageUpload";
import { inputCls, I18nInput, asList, tr, cleanI18n } from "../Shared.jsx";

const emptyForm = { tag: {}, title: {}, text: {}, cta: {}, link: "#shop", status: 1 };
const NO_IMAGE_CHANGE = { file: null, remove: false };
const LINK_SUGGESTIONS = ["#shop", "#about", "#contact", "/shop", "/cart"];

export default function HeroManager() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(null); // null | "new" | slide
  const [form, setForm] = useState(emptyForm);
  const [imageChange, setImageChange] = useState(NO_IMAGE_CHANGE);
  const [localPreview, setLocalPreview] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSlides(asList(await heroService.list()));
    } catch (err) {
      console.error("Failed to load hero slides:", err);
      setError(err.message || "Failed to load slides.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // preview of a newly chosen image file
  useEffect(() => {
    if (!imageChange.file) {
      setLocalPreview("");
      return;
    }
    const url = URL.createObjectURL(imageChange.file);
    setLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageChange.file]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => {
    setForm(emptyForm);
    setImageChange(NO_IMAGE_CHANGE);
    setEditing("new");
  };

  const openEdit = (s) => {
    setForm({
      tag: s.tag || {},
      title: s.title || {},
      text: s.text || {},
      cta: s.cta || {},
      link: s.link || "",
      status: s.status,
    });
    setImageChange(NO_IMAGE_CHANGE);
    setEditing(s);
  };

  const close = () => setEditing(null);

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.en?.trim()) return alert("The English title is required.");
    if (editing === "new" && !imageChange.file) return alert("Please choose an image.");
    if (editing !== "new" && imageChange.remove && !imageChange.file)
      return alert("A slide needs an image. Choose a new one instead of removing it.");

    setSaving(true);
    try {
      // multipart form: text fields + the image file (server makes img + thumbnail from it)
      const fd = new FormData();
      fd.append("tag", JSON.stringify(cleanI18n(form.tag)));
      fd.append("title", JSON.stringify(cleanI18n(form.title)));
      fd.append("text", JSON.stringify(cleanI18n(form.text)));
      fd.append("cta", JSON.stringify(cleanI18n(form.cta)));
      fd.append("link", form.link.trim());
      fd.append("status", String(Number(form.status)));
      if (imageChange.file) fd.append("image", imageChange.file); // field name must be "image"

      if (editing === "new") await heroService.create(fd);
      else await heroService.update(editing.id, fd);

      close();
      await load();
    } catch (err) {
      console.error("Error saving slide:", err);
      alert(err.message || "Error saving slide.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (s) => {
    try {
      const updated = await heroService.setStatus(s.id, Number(s.status) === 1 ? 0 : 1);
      setSlides((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
    } catch (err) {
      alert(err.message);
    }
  };

  const moveSlide = async (id, dir) => {
    const idx = slides.findIndex((s) => s.id === id);
    const to = idx + dir;
    if (idx === -1 || to < 0 || to >= slides.length) return;
    const next = [...slides];
    [next[idx], next[to]] = [next[to], next[idx]];
    setSlides(next); // instant UI, then save
    try {
      await heroService.reorder(next.map((s) => s.id));
    } catch (err) {
      alert(err.message);
      load(); // put the real order back
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete slide "${tr(s.title)}"?`)) return;
    try {
      await heroService.remove(s.id);
      setSlides((prev) => prev.filter((x) => x.id !== s.id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Reset the hero slides to the defaults? ALL your slides will be replaced.")) return;
    try {
      setSlides(asList(await heroService.reset()));
    } catch (err) {
      alert(err.message);
    }
  };

  const isShown = (s) => Number(s.status) === 1;
  const visibleCount = slides.filter(isShown).length;

  // image for the live preview inside the modal
  const previewImg =
    localPreview ||
    (editing && editing !== "new" && !imageChange.remove ? assetUrl(editing.img) : "");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Hero Slider</h1>
          <p className="text-sm text-slate-500">
            {visibleCount} of {slides.length} slides visible · changes appear on the homepage.
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

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-sm flex items-center justify-between">
          {error}
          <button onClick={load} className="font-semibold underline">Retry</button>
        </div>
      )}

      {!loading && !error && slides.length > 0 && visibleCount === 0 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
          All slides are hidden, so the hero section is not shown on the homepage.
        </div>
      )}

      <div className="space-y-3">
        {loading && <p className="text-slate-500">Loading...</p>}
        {!loading && !error && slides.length === 0 && (
          <p className="text-slate-400 text-center py-8">No slides yet. Add one, or press Reset to load the defaults.</p>
        )}
        {slides.map((s, i) => (
          <div
            key={s.id}
            className={`flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 ${
              !isShown(s) ? "opacity-60" : ""
            }`}
          >
            <img src={assetUrl(s.img)} alt="" className="w-full sm:w-48 h-28 object-cover rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0" />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">#{i + 1}</span>
                {tr(s.tag) && <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">{tr(s.tag)}</span>}
                {!isShown(s) && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700">Hidden</span>}
              </div>
              <h3 className="font-bold truncate">{tr(s.title)}</h3>
              <p className="text-sm text-slate-500 line-clamp-2">{tr(s.text)}</p>
              {tr(s.cta) && <p className="text-xs text-slate-500">Button: <b>{tr(s.cta)}</b> → {s.link || "-"}</p>}
            </div>
            <div className="flex sm:flex-col items-center justify-end gap-1">
              <div className="flex gap-1">
                <button onClick={() => moveSlide(s.id, -1)} disabled={i === 0} title="Move up" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                <button onClick={() => moveSlide(s.id, 1)} disabled={i === slides.length - 1} title="Move down" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
              </div>
              <div className="flex gap-1">
                <button onClick={() => toggleStatus(s)} title={isShown(s) ? "Hide" : "Show"} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                  {isShown(s) ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
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
          <form onSubmit={save} className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold">{editing === "new" ? "Add slide" : "Edit slide"}</h3>
              <button type="button" onClick={close}><X className="w-5 h-5" /></button>
            </div>

            {/* live preview (English text) */}
            <div className="relative h-44 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 text-white">
              {previewImg && <img src={previewImg} alt="" className="absolute inset-0 w-full h-full object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-r from-stone-950/80 via-stone-900/50 to-transparent" />
              <div className="relative z-10 h-full flex items-center px-6">
                <div className="space-y-1.5 max-w-xs">
                  {form.tag.en && <span className="inline-block px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-amber-500/90 rounded-full">{form.tag.en}</span>}
                  <p className="text-xl font-extrabold leading-tight">{form.title.en || "Slide title"}</p>
                  {form.text.en && <p className="text-xs text-amber-50/90 line-clamp-2">{form.text.en}</p>}
                  {form.cta.en && <span className="inline-block px-3 py-1 text-xs font-semibold bg-amber-500 rounded-lg">{form.cta.en}</span>}
                </div>
              </div>
            </div>

            <ImageUpload
              key={editing === "new" ? "new" : editing.id}
              label="Image * (wide photo, 1600px works well)"
              currentUrl={editing === "new" ? "" : assetUrl(editing.img)}
              onChange={setImageChange}
            />

            <I18nInput label="Title" required value={form.title} onChange={(v) => setField("title", v)} placeholder="e.g. Baked Every Morning" />
            <I18nInput label="Badge" value={form.tag} onChange={(v) => setField("tag", v)} placeholder="e.g. Fresh Bakery" />
            <I18nInput label="Description" multiline value={form.text} onChange={(v) => setField("text", v)} />
            <I18nInput label="Button label" value={form.cta} onChange={(v) => setField("cta", v)} placeholder="Leave empty for no button" />

            <label className="text-sm text-slate-600 dark:text-slate-400 block">
              Button link
              <input className={`${inputCls} mt-1`} list="hero-links" placeholder="#shop or /shop" value={form.link} onChange={(e) => setField("link", e.target.value)} />
              <datalist id="hero-links">{LINK_SUGGESTIONS.map((l) => <option key={l} value={l} />)}</datalist>
            </label>

            <label className="text-sm text-slate-600 dark:text-slate-400 block">
              Status
              <select className={`${inputCls} mt-1`} value={form.status} onChange={(e) => setField("status", e.target.value)}>
                <option value={1}>Show on homepage</option>
                <option value={0}>Hidden</option>
              </select>
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