import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  FileText,
  Eye,
  EyeOff,
  X,
  SlidersHorizontal,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Images,
  List,
} from "lucide-react";
import { heroService, assetUrl } from "../../../services/api";
import ImageUpload from "../ImageUpload";
import ImageLightbox from "../ImageLightbox";
import CustomSelect from "../CustomSelect";
import Pagination from "../Pagination";
import { inputCls, I18nInput, asList, tr, cleanI18n } from "../Shared.jsx";

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

// all translations of one text, English first
function TextByLang({ value }) {
  if (typeof value === "string")
    return value ? (
      <p className="text-slate-800 dark:text-slate-100 break-words">{value}</p>
    ) : (
      <p className="text-slate-400">—</p>
    );
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
      <div className="text-sm text-slate-800 dark:text-slate-100 break-words">
        {children}
      </div>
    </div>
  );
}

/* ---------- form helpers ---------- */
const emptyForm = {
  tag: {},
  title: {},
  text: {},
  cta: {},
  link: "#shop",
  status: 1,
};
const NO_IMAGE_CHANGE = { file: null, remove: false };
const LINK_SUGGESTIONS = ["#shop", "#about", "#contact", "/shop", "/cart"];

// the form values for an existing slide (used when opening Edit and for the "nothing changed" check)
const formFromSlide = (s) => ({
  tag: s.tag || {},
  title: s.title || {},
  text: s.text || {},
  cta: s.cta || {},
  link: s.link || "",
  status: s.status,
});

// comparable version of a form: same value -> same text (ignores key order and extra spaces)
const stableTexts = (o) =>
  Object.fromEntries(
    Object.entries(cleanI18n(o)).sort(([a], [b]) => a.localeCompare(b)),
  );
const fingerprint = (f) =>
  JSON.stringify({
    tag: stableTexts(f.tag),
    title: stableTexts(f.title),
    text: stableTexts(f.text),
    cta: stableTexts(f.cta),
    link: String(f.link ?? "").trim(),
    status: Number(f.status),
  });

const valuesOf = (o) => (o && typeof o === "object" ? Object.values(o) : []);

// Text from a { en, km, ... } field in the chosen language, falling back to English (same as the homepage hero)
const getLangText = (field, lang = "en") => {
  if (!field) return "";
  if (typeof field === "string") return field;
  return (
    field[lang] ||
    (lang === "tw" ? field.zh : "") ||
    field.en ||
    Object.values(field)[0] ||
    ""
  );
};

/* ---------- Slide mode: the slides as a slider, like on the homepage ---------- */
function SlideShow({ slides, onEdit }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lang, setLang] = useState("en");
  const touchStartX = useRef(null);
  const count = slides.length;

  // languages that have at least one text in these slides (English first)
  const codes = new Set(["en"]);
  slides.forEach((s) =>
    [s.tag, s.title, s.text, s.cta].forEach((f) => {
      if (f && typeof f === "object")
        Object.entries(f).forEach(([k, v]) => v && codes.add(k));
    }),
  );
  const langs = [...codes].sort((a, b) =>
    a === "en" ? -1 : b === "en" ? 1 : a.localeCompare(b),
  );

  const next = () => setCurrent((c) => (c + 1) % count);
  const prev = () => setCurrent((c) => (c - 1 + count) % count);

  // slides can change: keep the index valid
  useEffect(() => {
    if (current >= count) setCurrent(0);
  }, [count, current]);

  // auto-play every 5 seconds (paused while the mouse is over the slider)
  useEffect(() => {
    if (paused || count < 2) return;
    const timer = setInterval(() => setCurrent((c) => (c + 1) % count), 5000);
    return () => clearInterval(timer);
  }, [paused, count]);

  if (count === 0)
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-400 shadow-sm">
        No visible slides to show. Show a slide with the eye button.
      </div>
    );

  const onTouchStart = (e) => (touchStartX.current = e.touches[0].clientX);
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
    touchStartX.current = null;
  };

  const index = Math.min(current, count - 1);
  const currentSlide = slides[index];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Showing the {count} visible slide{count === 1 ? "" : "s"}, as on the
          homepage.
        </p>
        <div className="flex flex-wrap gap-2">
          {langs.map((code) => (
            <Chip
              key={code}
              active={lang === code}
              onClick={() => setLang(code)}
            >
              {LANG_LABELS[code] || code.toUpperCase()}
            </Chip>
          ))}
        </div>
      </div>

      <section
        className="relative overflow-hidden rounded-3xl shadow-2xl h-[360px] sm:h-[480px] text-white"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex h-full transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((s) => {
            const tagText = getLangText(s.tag, lang);
            const titleText = getLangText(s.title, lang);
            const descText = getLangText(s.text, lang);
            const ctaText = getLangText(s.cta, lang);
            return (
              <div key={s.id} className="relative min-w-full h-full">
                <img
                  src={assetUrl(s.img)}
                  alt={titleText}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-stone-950/80 via-stone-900/50 to-transparent" />
                <div className="relative z-10 h-full flex items-center px-8 sm:px-16">
                  <div className="max-w-xl space-y-5">
                    {tagText && (
                      <span className="inline-block px-3.5 py-1 text-xs font-semibold uppercase tracking-wider bg-amber-500/90 rounded-full">
                        {tagText}
                      </span>
                    )}
                    <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                      {titleText}
                    </h1>
                    {descText && (
                      <p className="text-amber-50/90 text-base sm:text-lg leading-relaxed">
                        {descText}
                      </p>
                    )}
                    {ctaText && (
                      <div className="pt-2">
                        {/* preview only: the button does nothing here */}
                        <span
                          title={s.link ? `Links to ${s.link}` : undefined}
                          className="inline-block px-6 py-3 bg-amber-500 text-white font-semibold rounded-xl shadow-lg"
                        >
                          {ctaText}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous slide"
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next slide"
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all cursor-pointer"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center space-x-2">
              {slides.map((s, i) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setCurrent(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                    i === index
                      ? "w-8 bg-amber-400"
                      : "w-2.5 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 py-3 shadow-sm">
        <p className="text-sm text-slate-500 min-w-0 truncate">
          Slide <b>{index + 1}</b> of {count} ·{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {getLangText(currentSlide.title, lang) || "Untitled"}
          </span>
        </p>
        <button
          type="button"
          onClick={() => onEdit(currentSlide)}
          className="px-4 py-2 text-sm font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2 transition-colors shadow-sm shrink-0"
        >
          <Pencil className="w-4 h-4" /> Edit this slide
        </button>
      </div>
    </div>
  );
}

export default function HeroManager() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(null); // null | "new" | slide
  const [viewing, setViewing] = useState(null); // slide shown in the view modal
  const [lightboxOpen, setLightboxOpen] = useState(false); // full-screen image of the viewed slide
  const [form, setForm] = useState(emptyForm);
  const [imageChange, setImageChange] = useState(NO_IMAGE_CHANGE);
  const [localPreview, setLocalPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [slideMode, setSlideMode] = useState(false); // false = list of cards, true = slider like the homepage
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | 1 | 0
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // 10 | 20 | 30 | 40 | 50 | 100 | "all"
  const [togglingId, setTogglingId] = useState(null); // slide whose show/hide is saving

  // ALL alerts are shown on the page, between the search/filters and the list
  const [notice, setNotice] = useState(null); // { id, type, title, message, returnToForm }
  const [modalHidden, setModalHidden] = useState(false); // form is hidden (not lost) while its alert is shown
  const noticeRef = useRef(null);

  const notify = (type, title, message, { returnToForm = false } = {}) =>
    setNotice({ id: Date.now(), type, title, message, returnToForm });

  // closing an alert that came from the form brings the form back
  const dismissNotice = () => {
    if (notice?.returnToForm) setModalHidden(false);
    setNotice(null);
  };

  // closes the view modal (and its full-screen image, if open)
  const closeView = () => {
    setLightboxOpen(false);
    setViewing(null);
  };

  // returns true when the slides were loaded; silent = no "Loading..." flash
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      setSlides(asList(await heroService.list()));
      return true;
    } catch (err) {
      console.error("Failed to load hero slides:", err);
      setError(err.message || "Failed to load slides.");
      return false;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // green + yellow alerts disappear by themselves; red ones and "back to the form" ones stay
  useEffect(() => {
    if (!notice || notice.type === "error" || notice.returnToForm) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  // make sure the alert is visible (the page may be scrolled)
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
      setLightboxOpen(false);
      setViewing(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewing]);

  // search / filters / page size changed -> start again from page 1
  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, pageSize]);

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
    setNotice(null);
    setModalHidden(false);
    setEditing("new");
  };

  const openEdit = (s) => {
    setForm(formFromSlide(s));
    setImageChange(NO_IMAGE_CHANGE);
    setNotice(null);
    setModalHidden(false);
    setEditing(s);
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

    const isNew = editing === "new";

    if (!form.title.en?.trim()) return warn("The English title is required.");
    if (isNew && !imageChange.file) return warn("Please choose an image.");
    if (!isNew && imageChange.remove && !imageChange.file)
      return warn(
        "A slide needs an image. Choose a new one instead of removing it.",
      );

    const itemName = form.title.en.trim();

    // editing but nothing was touched (no field changed, no image chosen)
    if (!isNew) {
      const textChanged =
        fingerprint(form) !== fingerprint(formFromSlide(editing));
      const imageChanged = Boolean(imageChange.file);
      if (!textChanged && !imageChanged) {
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
      // multipart form: text fields + the image file (server makes img + thumbnail from it)
      const fd = new FormData();
      fd.append("tag", JSON.stringify(cleanI18n(form.tag)));
      fd.append("title", JSON.stringify(cleanI18n(form.title)));
      fd.append("text", JSON.stringify(cleanI18n(form.text)));
      fd.append("cta", JSON.stringify(cleanI18n(form.cta)));
      fd.append("link", form.link.trim());
      fd.append("status", String(Number(form.status)));
      if (imageChange.file) fd.append("image", imageChange.file); // field name must be "image"

      if (isNew) await heroService.create(fd);
      else await heroService.update(editing.id, fd);

      close();
      await load({ silent: true });
      notify(
        "success",
        isNew ? "Slide added" : "Slide updated",
        isNew
          ? `"${itemName}" was added successfully.`
          : `"${itemName}" was updated successfully.`,
      );
    } catch (err) {
      console.error("Error saving slide:", err);
      setModalHidden(true);
      notify(
        "error",
        isNew ? "Failed to add the slide" : "Failed to update the slide",
        err.message || "Something went wrong. Please try again.",
        { returnToForm: true },
      );
    } finally {
      setSaving(false);
    }
  };

  // the eye button: shows / hides the slide on the homepage (updates ONLY the status)
  const toggleStatus = async (s) => {
    const next = Number(s.status) === 1 ? 0 : 1;
    setTogglingId(s.id);
    try {
      const updated = await heroService.setStatus(s.id, next);
      setSlides((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
      notify(
        "success",
        "Slide updated",
        next === 1
          ? `"${tr(s.title)}" was updated successfully. It is now visible on the homepage.`
          : `"${tr(s.title)}" was updated successfully. It is now hidden from the homepage.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to update the slide",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setTogglingId(null);
    }
  };

  // moves a slide up (-1) or down (+1) in the FULL list, then saves the new order
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
      notify(
        "error",
        "Failed to reorder the slides",
        err.message || "Something went wrong. Please try again.",
      );
      load({ silent: true }); // put the real order back
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const ok = await load({ silent: true });
      if (ok)
        notify(
          "success",
          "Slides refreshed",
          "The slides were reloaded from the database.",
        );
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete slide "${tr(s.title)}"?`)) return;
    try {
      await heroService.remove(s.id);
      setSlides((prev) => prev.filter((x) => x.id !== s.id));
      notify(
        "success",
        "Slide deleted",
        `"${tr(s.title)}" was deleted successfully.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to delete the slide",
        err.message || "Something went wrong. Please try again.",
      );
    }
  };

  const handleReset = async () => {
    if (
      !window.confirm(
        "Reset the hero slides to the defaults? ALL your slides will be replaced.",
      )
    )
      return;
    try {
      setSlides(asList(await heroService.reset()));
      notify(
        "success",
        "Slides reset",
        "The hero slides were reset to the defaults.",
      );
    } catch (err) {
      notify(
        "error",
        "Failed to reset the slides",
        err.message || "Something went wrong. Please try again.",
      );
    }
  };

  const isShown = (s) => Number(s.status) === 1;
  const visibleCount = slides.filter(isShown).length;
  const hiddenCount = slides.length - visibleCount;

  const activeFilters = statusFilter !== "all" ? 1 : 0;
  const clearFilters = () => setStatusFilter("all");

  // the order can only be changed on the full list (no search / filter)
  const canReorder = !query.trim() && statusFilter === "all";

  const shown = slides.filter((s) => {
    if (statusFilter !== "all" && Number(s.status) !== statusFilter)
      return false;
    const haystack = [
      ...valuesOf(s.tag),
      ...valuesOf(s.title),
      ...valuesOf(s.text),
      ...valuesOf(s.cta),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  // pagination: `shown` is the full filtered list, `pageItems` is the current page
  const showAll = pageSize === "all";
  const totalPages = showAll
    ? 1
    : Math.max(1, Math.ceil(shown.length / pageSize));
  const currentPage = Math.min(page, totalPages); // e.g. deleted the last item of the last page
  const pageItems = showAll
    ? shown
    : shown.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // image for the live preview inside the modal
  const previewImg =
    localPreview ||
    (editing && editing !== "new" && !imageChange.remove
      ? assetUrl(editing.img)
      : "");

  // content of the lightbox "Info" popup (dark style, because the lightbox is dark)
  const lightboxInfo = viewing ? (
    <div className="space-y-3 text-sm">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
          Title
        </span>
        <p className="mt-1 font-medium">{tr(viewing.title) || "—"}</p>
      </div>
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
          Description
        </span>
        <p className="mt-1 text-slate-300 text-xs leading-relaxed">
          {tr(viewing.text) || "No description provided."}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
        <div>
          <span className="text-[11px] text-slate-400">Badge</span>
          <p className="font-semibold">{tr(viewing.tag) || "—"}</p>
        </div>
        <div>
          <span className="text-[11px] text-slate-400">Button</span>
          <p className="font-semibold">
            {tr(viewing.cta) || "—"}
            {viewing.link ? ` → ${viewing.link}` : ""}
          </p>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      <style>{`
        /* Thin & Rounded Custom Scrollbar styling */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(203, 213, 225, 0.6);
          border-radius: 9999px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.8);
        }
      `}</style>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Hero Slider</h1>
          <p className="text-sm text-slate-500">
            {visibleCount} of {slides.length} slides visible · changes appear on
            the homepage.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 hover:border-amber-500 transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> Preview
          </a>
          <button
            onClick={handleReset}
            className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 hover:border-amber-500 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button
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
            onClick={openNew}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add slide
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search slides..."
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
        <button
          type="button"
          onClick={() => setSlideMode((v) => !v)}
          aria-pressed={slideMode}
          className={`px-4 py-2 text-sm font-medium rounded-xl border flex items-center gap-2 transition-colors ${
            slideMode
              ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300"
              : "border-slate-300 dark:border-slate-700 hover:border-amber-500"
          }`}
        >
          {slideMode ? (
            <List className="w-4 h-4" />
          ) : (
            <Images className="w-4 h-4" />
          )}
          {slideMode ? "List view" : "Slide view"}
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
                All
              </Chip>
              <Chip
                active={statusFilter === 1}
                onClick={() => setStatusFilter(1)}
              >
                Visible ({visibleCount})
              </Chip>
              <Chip
                active={statusFilter === 0}
                onClick={() => setStatusFilter(0)}
              >
                Hidden ({hiddenCount})
              </Chip>
            </div>
          </div>

          {activeFilters > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-amber-600 font-medium underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* ===== ALERTS: between the search/filters and the list ===== */}
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
          title="Could not load the slides"
          action={
            <button
              onClick={() => load()}
              className="ml-2 font-semibold underline"
            >
              Retry
            </button>
          }
        >
          {error}
        </Alert>
      )}

      {!loading && !error && slides.length > 0 && visibleCount === 0 && (
        <Alert type="warning" title="All slides are hidden">
          The hero section is not shown on the homepage.
        </Alert>
      )}

      {/* ===== SLIDE MODE (slider) or SLIDE LIST ===== */}
      {slideMode && !loading && !error ? (
        <SlideShow
          slides={slides.filter(isShown)}
          onEdit={openEdit}
        />
      ) : (
      <>
      <div className="space-y-3">
        {loading && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-center text-slate-400 shadow-sm">
            Loading...
          </div>
        )}
        {!loading && !error && shown.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-center text-slate-400 shadow-sm">
            {slides.length === 0
              ? "No slides yet. Add one, or press Reset to load the defaults."
              : "No slides match your filters."}
          </div>
        )}
        {!loading &&
          pageItems.map((s) => {
            const pos = slides.findIndex((x) => x.id === s.id);
            const shownNow = isShown(s);
            const reorderHint = canReorder
              ? ""
              : "Clear the search and filters to change the order";
            return (
              <div
                key={s.id}
                className={`flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${
                  !shownNow ? "opacity-60" : ""
                }`}
              >
                <img
                  src={assetUrl(s.img)}
                  alt=""
                  className="w-full sm:w-48 h-28 object-cover rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">
                      #{pos + 1}
                    </span>
                    {tr(s.tag) && (
                      <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                        {tr(s.tag)}
                      </span>
                    )}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        shownNow
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {shownNow ? "Visible" : "Hidden"}
                    </span>
                  </div>
                  <h3 className="font-bold truncate">{tr(s.title)}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {tr(s.text)}
                  </p>
                  {tr(s.cta) && (
                    <p className="text-xs text-slate-500">
                      Button: <b>{tr(s.cta)}</b> → {s.link || "-"}
                    </p>
                  )}
                </div>
                <div className="flex sm:flex-col items-center justify-end gap-1">
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveSlide(s.id, -1)}
                      disabled={!canReorder || pos === 0}
                      title={reorderHint || "Move up"}
                      aria-label="Move up"
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveSlide(s.id, 1)}
                      disabled={!canReorder || pos === slides.length - 1}
                      title={reorderHint || "Move down"}
                      aria-label="Move down"
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-1">
                    {/* View details: its own icon, so it is not mixed up with the show/hide eye */}
                    <button
                      onClick={() => setViewing(s)}
                      title="View details"
                      aria-label="View details"
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    {/* Show / hide on the homepage */}
                    <button
                      onClick={() => toggleStatus(s)}
                      disabled={togglingId === s.id}
                      title={shownNow ? "Hide from the homepage" : "Show on the homepage"}
                      aria-label={shownNow ? "Hide from the homepage" : "Show on the homepage"}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-wait transition-colors"
                    >
                      {shownNow ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => openEdit(s)}
                      title="Edit"
                      aria-label="Edit"
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      title="Delete"
                      aria-label="Delete"
                      className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* pagination: below the list */}
      <Pagination
        page={currentPage}
        pageSize={pageSize}
        total={shown.length}
        onPage={setPage}
        onPageSize={setPageSize}
      />
      </>
      )}

      {/* ===== VIEW modal (read-only) + full-screen image ===== */}
      {viewing && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closeView}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Slide details"
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-lg font-bold">Slide details</h3>
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
                  <div className="w-full h-32 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm text-slate-400">
                    No image
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-xl font-extrabold break-words">
                    {tr(viewing.title)}
                  </h4>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                      isShown(viewing)
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {isShown(viewing) ? "Visible" : "Hidden"}
                  </span>
                </div>

                {[
                  ["Title", viewing.title],
                  ["Badge", viewing.tag],
                  ["Description", viewing.text],
                  ["Button label", viewing.cta],
                ].map(([label, value]) => (
                  <section key={label} className="space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                      {label}
                    </h5>
                    <TextByLang value={value} />
                  </section>
                ))}

                <section className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Field label="Position">
                    #{slides.findIndex((x) => x.id === viewing.id) + 1} of{" "}
                    {slides.length}
                  </Field>
                  <Field label="Button link">{viewing.link || "—"}</Field>
                  <Field label="Created">{fmtDateTime(viewing.created_at)}</Field>
                  <Field label="Updated">{fmtDateTime(viewing.updated_at)}</Field>
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
                    const s = viewing;
                    closeView();
                    openEdit(s);
                  }}
                  className="py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Pencil className="w-4 h-4" /> Edit
                </button>
              </div>
            </div>
          </div>

          {/* sibling of the modal on purpose: its clicks must not reach the modal's backdrop handler */}
          {lightboxOpen && viewing.img && (
            <ImageLightbox
              src={assetUrl(viewing.img)}
              alt={tr(viewing.title)}
              title={tr(viewing.title)}
              info={lightboxInfo}
              infoTitle="Slide details"
              onClose={() => setLightboxOpen(false)}
            />
          )}
        </>
      )}

      {/* ===== ADD / EDIT modal (with live preview) ===== */}
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
            {/* Sticky Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 z-10 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-lg font-bold">
                {editing === "new" ? "Add slide" : "Edit slide"}
              </h3>
              <button
                type="button"
                onClick={close}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Container */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* live preview (English text) */}
              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Preview
                </h4>
                <div className="relative h-44 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 text-white">
                  {previewImg && (
                    <img
                      src={previewImg}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-stone-950/80 via-stone-900/50 to-transparent" />
                  <div className="relative z-10 h-full flex items-center px-6">
                    <div className="space-y-1.5 max-w-xs">
                      {form.tag.en && (
                        <span className="inline-block px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-amber-500/90 rounded-full">
                          {form.tag.en}
                        </span>
                      )}
                      <p className="text-xl font-extrabold leading-tight">
                        {form.title.en || "Slide title"}
                      </p>
                      {form.text.en && (
                        <p className="text-xs text-amber-50/90 line-clamp-2">
                          {form.text.en}
                        </p>
                      )}
                      {form.cta.en && (
                        <span className="inline-block px-3 py-1 text-xs font-semibold bg-amber-500 rounded-lg">
                          {form.cta.en}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Image
                </h4>
                <ImageUpload
                  key={editing === "new" ? "new" : editing.id}
                  label="Image * (wide photo, 1600px works well)"
                  currentUrl={editing === "new" ? "" : assetUrl(editing.img)}
                  onChange={setImageChange}
                />
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Texts (all languages)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <I18nInput
                    expanded
                    required
                    label="Title"
                    value={form.title}
                    onChange={(v) => setField("title", v)}
                    placeholder="e.g. Baked Every Morning"
                  />
                  <I18nInput
                    expanded
                    label="Badge"
                    value={form.tag}
                    onChange={(v) => setField("tag", v)}
                    placeholder="e.g. Fresh Bakery"
                  />
                  <I18nInput
                    expanded
                    multiline
                    label="Description"
                    value={form.text}
                    onChange={(v) => setField("text", v)}
                  />
                  <I18nInput
                    expanded
                    label="Button label"
                    value={form.cta}
                    onChange={(v) => setField("cta", v)}
                    placeholder="Leave empty for no button"
                  />
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Button link
                </h4>
                <label className="text-sm text-slate-600 dark:text-slate-400 block w-full">
                  Link
                  <input
                    className={`${inputCls} mt-1`}
                    list="hero-links"
                    placeholder="#shop or /shop"
                    value={form.link}
                    onChange={(e) => setField("link", e.target.value)}
                  />
                  <datalist id="hero-links">
                    {LINK_SUGGESTIONS.map((l) => (
                      <option key={l} value={l} />
                    ))}
                  </datalist>
                </label>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Display
                </h4>
                <label className="text-sm text-slate-600 dark:text-slate-400 block w-full sm:max-w-xs">
                  Status
                  <div className="relative mt-1 w-full">
                    <CustomSelect
                      value={form.status}
                      onChange={(value) => setField("status", value)}
                      options={[
                        { value: 1, label: "Show on homepage" },
                        { value: 0, label: "Hidden" },
                      ]}
                    />
                  </div>
                </label>
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
                  {saving ? "Saving..." : "Save slide"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}