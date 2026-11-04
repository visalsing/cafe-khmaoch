import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  ImagePlus,
  Images,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import { aboutService } from "../../../services/api";
import { ABOUT_ICONS, ABOUT_ICON_KEYS } from "../../../utils/aboutIcons";
import { uploadUrl } from "../../../utils/aboutContent";
import { clearAboutCache } from "../../../hooks/useAboutPage";
import RichTextEditor from "../../RichText/RichTextEditor";
import ImageLightbox from "../ImageLightbox";
import { Alert } from "../UiBits";
import { inputCls } from "../Shared.jsx";
import PatternModal from "./PatternModal";

const LANGS = [
  { code: "km", label: "ខ្មែរ" },
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "lo", label: "ລາວ" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "fr", label: "Français" },
  { code: "my", label: "မြန်မာဘာသာ" },
  //   { code: "vi", label: "Tiếng Việt" },
];
const FIELDS = [
  "title",
  "subtitle",
  "storyLabel",
  "storyHeading",
  "storyBody",
  "statValue",
  "statCaption",
];
const MAX_IMAGES = 12;
const MAX_HIGHLIGHTS = 6;
const MAX_FILE = 8 * 1024 * 1024;

/* ---------- the draft <-> the server ---------- */
let counter = 0;
const uid = () => `h${++counter}`;

const toDraft = (p) => ({
  status: Number(p.status) === 0 ? 0 : 1,
  title: p.title || {},
  subtitle: p.subtitle || {},
  storyLabel: p.storyLabel || {},
  storyHeading: p.storyHeading || {},
  storyBody: p.storyBody || {},
  statValue: p.statValue || {},
  statCaption: p.statCaption || {},
  gallery: (p.images || []).map((g) => ({
    key: g.key,
    img: g.img,
    thumbnail: g.thumbnail,
    alt: g.alt || {},
  })),
  highlights: (p.highlights || []).map((h) => ({
    id: uid(),
    icon: h.icon,
    title: h.title || {},
    text: h.text || {},
  })),
});

const toPayload = (d) => ({
  status: d.status,
  title: d.title,
  subtitle: d.subtitle,
  storyLabel: d.storyLabel,
  storyHeading: d.storyHeading,
  storyBody: d.storyBody,
  statValue: d.statValue,
  statCaption: d.statCaption,
  gallery: d.gallery.map(({ key, alt }) => ({ key, alt })),
  highlights: d.highlights.map(({ icon, title, text }) => ({
    icon,
    title,
    text,
  })),
});
const same = (a, b) =>
  JSON.stringify(toPayload(a)) === JSON.stringify(toPayload(b));

/* ---------- small pieces ---------- */
function Card({ title, description, right, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
        {right}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

// one text, in the language of the selected tab
function LangText({
  label,
  hint,
  value = {},
  lang,
  onChange,
  max = 200,
  rows = 0,
}) {
  const current = value[lang] || "";
  const english = lang !== "en" && !current ? value.en || "" : "";
  const Tag = rows > 0 ? "textarea" : "input";
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </span>
        <span className="text-xs text-slate-400">
          {current.length}/{max}
        </span>
      </span>
      <Tag
        value={current}
        onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
        maxLength={max}
        rows={rows || undefined}
        placeholder={english ? `English: ${english}` : ""}
        className={inputCls}
      />
      {hint && (
        <span className="mt-1 block text-xs text-slate-400">{hint}</span>
      )}
    </label>
  );
}

const pick = (obj = {}, lang) => obj[lang] || obj.en || "";

function AboutPreview({ draft, lang }) {
  const [slide, setSlide] = useState(0);
  const images = draft.gallery;
  const current = images.length ? Math.min(slide, images.length - 1) : 0;
  const story = pick(draft.storyBody, lang);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-10 dark:border-slate-800 dark:bg-slate-900">
      {/* title */}
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-extrabold text-accent-600 md:text-4xl">
          {pick(draft.title, lang) || "—"}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          {pick(draft.subtitle, lang)}
        </p>
      </div>

      {/* story + slideshow */}
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold text-accent-600">
            {pick(draft.storyLabel, lang)}
          </p>
          <h3 className="mt-2 text-2xl font-extrabold text-slate-800 dark:text-white">
            {pick(draft.storyHeading, lang)}
          </h3>
          <div
            className="prose prose-sm mt-4 max-w-none text-slate-600 dark:prose-invert dark:text-slate-300"
            dangerouslySetInnerHTML={{ __html: story }}
          />
          {(draft.statValue[lang] || draft.statValue.en) && (
            <div className="mt-6 border-l-4 border-accent-600 pl-4">
              <div className="text-xl font-bold text-slate-800 dark:text-white">
                {pick(draft.statValue, lang)}
              </div>
              <div className="text-sm text-slate-400">
                {pick(draft.statCaption, lang)}
              </div>
            </div>
          )}
        </div>

        <div className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
          {images.length > 0 ? (
            <>
              <img
                src={uploadUrl(images[current].img)}
                alt={pick(images[current].alt, lang)}
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {images.map((g, i) => (
                  <button
                    key={g.key}
                    type="button"
                    aria-label={`Show picture ${i + 1}`}
                    onClick={() => setSlide(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === current ? "w-6 bg-white" : "w-2 bg-white/60"
                    }`}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              No pictures yet
            </div>
          )}
        </div>
      </div>

      {/* value cards */}
      {draft.highlights.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-6 border-t border-slate-100 pt-8 md:grid-cols-3 dark:border-slate-800">
          {draft.highlights.map((h) => {
            const Icon = ABOUT_ICONS[h.icon];
            return (
              <div key={h.id} className="flex gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-500/15">
                  {Icon && <Icon className="h-5 w-5" />}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                    {pick(h.title, lang)}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {pick(h.text, lang)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AboutManager() {
  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState(null);
  const [lang, setLang] = useState("en");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [version, setVersion] = useState(0); // a new number rebuilds the editor after a save or a discard
  const [notice, setNotice] = useState(null);
  const fileRef = useRef(null);
  const [patternOpen, setPatternOpen] = useState(false); // PaternModal.jsx

  // Prevent the browser window from scrolling separately on the About page.
  // The Dashboard's main content container remains the only vertical scroller.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, []);

  const notify = (type, title, message) =>
    setNotice({ id: Date.now(), type, title, message });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = toDraft(await aboutService.get());
      setSaved(d);
      setDraft(d);
    } catch (err) {
      setNotice({
        id: Date.now(),
        type: "error",
        title: "Could not load the About page",
        message: err.message || "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice || notice.type === "error") return undefined;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const dirty = Boolean(draft && saved && !same(draft, saved));

  // leaving the page with unsaved work
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (loading && !draft)
    return <p className="py-16 text-center text-slate-500">Loading...</p>;
  if (!draft) {
    return (
      <div className="space-y-4">
        {notice && (
          <Alert type={notice.type} title={notice.title}>
            {notice.message}
          </Alert>
        )}
        <button
          onClick={load}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700"
        >
          Try again
        </button>
      </div>
    );
  }

  const patch = (field, value) => setDraft((d) => ({ ...d, [field]: value }));
  const setLangValue = (field, code, value) =>
    setDraft((d) => ({ ...d, [field]: { ...d[field], [code]: value } }));
  const filled = (code) =>
    FIELDS.filter((f) => String(draft[f]?.[code] || "").trim()).length;

  /* ----- save / discard ----- */
  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const d = toDraft(await aboutService.save(toPayload(draft)));
      clearAboutCache(); // the website shows the new content at once
      setSaved(d);
      setDraft(d);
      setVersion((v) => v + 1);
      notify("success", "Saved", "The About page was updated.");
    } catch (err) {
      notify(
        "error",
        "Could not save",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  const discard = () => {
    setDraft(saved);
    setVersion((v) => v + 1);
  };

  /* ----- pictures ----- */
  // the server's list wins for WHICH pictures exist; your unsaved order and alt texts are kept
  const mergeGallery = (serverImages) => {
    const fresh = serverImages.map((g) => ({
      key: g.key,
      img: g.img,
      thumbnail: g.thumbnail,
      alt: g.alt || {},
    }));
    setSaved((s) => ({ ...s, gallery: fresh }));
    setDraft((d) => {
      const byKey = new Map(fresh.map((g) => [g.key, g]));
      const next = [];
      d.gallery.forEach((g) => {
        const s = byKey.get(g.key);
        if (s) {
          next.push({ ...s, alt: g.alt });
          byKey.delete(g.key);
        }
      });
      byKey.forEach((s) => next.push(s));
      return { ...d, gallery: next };
    });
  };

  const upload = async (list) => {
    const files = Array.from(list || []);
    if (!files.length) return;
    const room = MAX_IMAGES - draft.gallery.length;
    if (room <= 0)
      return notify(
        "error",
        "The gallery is full",
        `You can have ${MAX_IMAGES} pictures at most. Delete one first.`,
      );
    const take = files.slice(0, room);
    const big = take.find((f) => f.size > MAX_FILE);
    if (big)
      return notify(
        "error",
        "A picture is too big",
        `“${big.name}” is over 8 MB.`,
      );

    setUploading(true);
    try {
      const page = await aboutService.uploadImages(take);
      clearAboutCache();
      mergeGallery(page.images);
      notify(
        "success",
        take.length === 1 ? "Picture added" : "Pictures added",
        take.length < files.length
          ? `${take.length} of ${files.length} were added: the gallery holds ${MAX_IMAGES}.`
          : "Remember to write the alt text, then Save changes.",
      );
    } catch (err) {
      notify("error", "Upload failed", err.message || "Please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeImage = async (g) => {
    if (
      !window.confirm(
        "Delete this picture? It disappears from the website at once.",
      )
    )
      return;
    setBusyKey(g.key);
    try {
      const page = await aboutService.removeImage(g.key);
      clearAboutCache();
      mergeGallery(page.images);
    } catch (err) {
      notify(
        "error",
        "Could not delete the picture",
        err.message || "Please try again.",
      );
    } finally {
      setBusyKey(null);
    }
  };

  const moveImage = (i, dir) =>
    setDraft((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.gallery.length) return d;
      const next = [...d.gallery];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...d, gallery: next };
    });
  const setAlt = (i, text) =>
    setDraft((d) => ({
      ...d,
      gallery: d.gallery.map((g, n) =>
        n === i ? { ...g, alt: { ...g.alt, [lang]: text } } : g,
      ),
    }));

  /* ----- value cards ----- */
  const addHighlight = () =>
    setDraft((d) => ({
      ...d,
      highlights: [
        ...d.highlights,
        { id: uid(), icon: "coffee", title: {}, text: {} },
      ],
    }));
  const updateHighlight = (id, changes) =>
    setDraft((d) => ({
      ...d,
      highlights: d.highlights.map((h) =>
        h.id === id ? { ...h, ...changes } : h,
      ),
    }));
  const removeHighlight = (id) =>
    setDraft((d) => ({
      ...d,
      highlights: d.highlights.filter((h) => h.id !== id),
    }));
  const moveHighlight = (i, dir) =>
    setDraft((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.highlights.length) return d;
      const next = [...d.highlights];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...d, highlights: next };
    });

  const on = draft.status === 1;

  return (
    // <div className="space-y-6 pb-24">
    <div className="space-y-6 pb-6">
      {/* header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white">
            About page
          </h1>
          <p className="text-sm text-slate-500">
            The “About us” section of the home page.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <button
              type="button"
              role="switch"
              aria-checked={on}
              onClick={() => patch("status", on ? 0 : 1)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${on ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${on ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </button>
            {on ? "Using this content" : "Using the built-in text"}
          </label>
          <a
            href="/#about"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:border-accent-500 dark:border-slate-700"
          >
            <ExternalLink className="h-4 w-4" /> View on the website
          </a>
          {/* <button
            type="button"
            onClick={() => setShowPattern(true)}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:border-accent-500 dark:border-slate-700"
          >
            <Images className="h-4 w-4" /> Pattern
          </button> */}
          <button
            type="button"
            onClick={() => setPatternOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Images size={16} />
            Pattern
          </button>
        </div>
      </div>

      {notice && (
        <Alert
          key={notice.id}
          type={notice.type}
          title={notice.title}
          onClose={() => setNotice(null)}
        >
          {notice.message}
        </Alert>
      )}

      {/* language tabs */}
      <div
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900"
        role="tablist"
        aria-label="Language"
      >
        {LANGS.map(({ code, label }) => {
          const n = filled(code);
          return (
            <button
              key={code}
              type="button"
              role="tab"
              aria-selected={lang === code}
              onClick={() => setLang(code)}
              title={`${n} of ${FIELDS.length} texts written`}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                lang === code
                  ? "bg-accent-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${n === FIELDS.length ? "bg-emerald-400" : n === 0 ? "bg-slate-300" : "bg-amber-400"}`}
              />
              {label}
            </button>
          );
        })}
        <p className="ml-auto hidden px-2 text-xs text-slate-400 md:block">
          A language with no text shows the English text. If that is empty too,
          the built-in text.
        </p>
      </div>

      {/* texts */}
      <Card
        title="Title"
        description="The big title at the top of the section."
      >
        <LangText
          label="Title"
          value={draft.title}
          lang={lang}
          onChange={(v) => patch("title", v)}
          max={120}
        />
        <LangText
          label="Subtitle"
          value={draft.subtitle}
          lang={lang}
          onChange={(v) => patch("subtitle", v)}
          max={300}
          rows={2}
        />
      </Card>

      <Card title="Our story" description="The text next to the pictures.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <LangText
            label="Small label"
            value={draft.storyLabel}
            lang={lang}
            onChange={(v) => patch("storyLabel", v)}
            max={60}
          />
          <LangText
            label="Heading"
            value={draft.storyHeading}
            lang={lang}
            onChange={(v) => patch("storyHeading", v)}
            max={200}
          />
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Story
          </span>
          <RichTextEditor
            key={`${lang}-${version}`}
            value={draft.storyBody[lang] || ""}
            onChange={(html) => setLangValue("storyBody", lang, html)}
          />
          {lang !== "en" && !draft.storyBody[lang] && draft.storyBody.en && (
            <p className="mt-1 text-xs text-slate-400">
              Visitors in this language currently see the English story.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <LangText
            label="Highlight (for example “7 AM”)"
            value={draft.statValue}
            lang={lang}
            onChange={(v) => patch("statValue", v)}
            max={40}
          />
          <LangText
            label="Highlight caption"
            value={draft.statCaption}
            lang={lang}
            onChange={(v) => patch("statCaption", v)}
            max={160}
          />
        </div>
      </Card>

      {/* pictures */}
      <Card
        title="Pictures"
        description="Shown as a slideshow. Uploading and deleting act at once; the order and the alt text are saved with “Save changes”."
        right={
          <span className="text-sm font-semibold text-slate-500">
            {draft.gallery.length} / {MAX_IMAGES}
          </span>
        }
      >
        {draft.gallery.length > 0 && (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {draft.gallery.map((g, i) => (
              <li
                key={g.key}
                className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
              >
                <button
                  type="button"
                  onClick={() => setPreview(g)}
                  aria-label={`Open picture ${i + 1}`}
                  className="relative block aspect-[3/2] w-full cursor-zoom-in bg-slate-100 dark:bg-slate-800"
                >
                  <img
                    src={uploadUrl(g.thumbnail || g.img)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                </button>

                <div className="space-y-2 p-3">
                  <input
                    value={g.alt[lang] || ""}
                    onChange={(e) => setAlt(i, e.target.value)}
                    maxLength={160}
                    aria-label={`Alt text of picture ${i + 1}`}
                    placeholder={
                      lang !== "en" && g.alt.en
                        ? `English: ${g.alt.en}`
                        : "Describe the picture (alt text)"
                    }
                    className={`${inputCls} !py-1.5 text-xs`}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveImage(i, -1)}
                        disabled={i === 0}
                        aria-label="Move earlier"
                        className="rounded-lg border border-slate-200 p-1.5 hover:border-accent-500 disabled:opacity-40 dark:border-slate-700"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(i, 1)}
                        disabled={i === draft.gallery.length - 1}
                        aria-label="Move later"
                        className="rounded-lg border border-slate-200 p-1.5 hover:border-accent-500 disabled:opacity-40 dark:border-slate-700"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(g)}
                      disabled={busyKey === g.key}
                      aria-label="Delete the picture"
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-950/30"
                    >
                      {busyKey === g.key ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {draft.gallery.length < MAX_IMAGES && (
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              upload(e.dataTransfer.files);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
              dragging
                ? "border-accent-500 bg-accent-50 dark:bg-accent-500/10"
                : "border-slate-300 hover:border-accent-500 dark:border-slate-700"
            }`}
          >
            {uploading ? (
              <LoaderCircle className="h-7 w-7 animate-spin text-accent-600" />
            ) : (
              <ImagePlus className="h-7 w-7 text-slate-400" />
            )}
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {uploading ? "Uploading..." : "Click or drop pictures here"}
            </span>
            <span className="text-xs text-slate-400">
              JPG, PNG, WebP, AVIF or GIF · up to 8 MB each · a small copy
              (thumbnail) is made for you
            </span>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              disabled={uploading}
              onChange={(e) => upload(e.target.files)}
              className="sr-only"
            />
          </label>
        )}
      </Card>

      {/* value cards */}
      <Card
        title="Value cards"
        description="The small cards under the story (for example Ethical Sourcing)."
        right={
          draft.highlights.length < MAX_HIGHLIGHTS && (
            <button
              type="button"
              onClick={addHighlight}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:border-accent-500 dark:border-slate-700"
            >
              <Plus className="h-4 w-4" /> Add a card
            </button>
          )
        }
      >
        {draft.highlights.length === 0 && (
          <p className="text-sm text-slate-400">
            No cards: the section is hidden on the website.
          </p>
        )}
        {draft.highlights.map((h, i) => (
          <div
            key={h.id}
            className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
          >
            <div className="flex items-start justify-between gap-3">
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label="Icon"
              >
                {ABOUT_ICON_KEYS.map((k) => {
                  const Icon = ABOUT_ICONS[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      title={k}
                      aria-label={k}
                      aria-pressed={h.icon === k}
                      onClick={() => updateHighlight(h.id, { icon: k })}
                      className={`rounded-lg border p-2 transition-colors ${
                        h.icon === k
                          ? "border-accent-600 bg-accent-50 text-accent-700 dark:bg-accent-500/15"
                          : "border-slate-200 text-slate-500 hover:border-accent-500 dark:border-slate-700"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => moveHighlight(i, -1)}
                  disabled={i === 0}
                  aria-label="Move up"
                  className="rounded-lg border border-slate-200 p-1.5 hover:border-accent-500 disabled:opacity-40 dark:border-slate-700"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveHighlight(i, 1)}
                  disabled={i === draft.highlights.length - 1}
                  aria-label="Move down"
                  className="rounded-lg border border-slate-200 p-1.5 hover:border-accent-500 disabled:opacity-40 dark:border-slate-700"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeHighlight(h.id)}
                  aria-label="Remove the card"
                  className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <LangText
              label="Title"
              value={h.title}
              lang={lang}
              onChange={(v) => updateHighlight(h.id, { title: v })}
              max={80}
            />
            <LangText
              label="Text"
              value={h.text}
              lang={lang}
              onChange={(v) => updateHighlight(h.id, { text: v })}
              max={240}
              rows={2}
            />
          </div>
        ))}
      </Card>

      <Card
        title="Live preview"
        description={
          on
            ? "How the About section will look in the selected language."
            : "This content is switched off: the website shows the built-in text."
        }
      >
        <div className={on ? "" : "opacity-50"}>
          <AboutPreview draft={draft} lang={lang} />
        </div>
      </Card>

      {/* save bar */}
      <div className="sticky bottom-4 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <p
          className={`text-sm font-medium ${dirty ? "text-amber-600" : "text-slate-500"}`}
        >
          {dirty ? "You have unsaved changes." : "No changes."}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={discard}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:border-accent-500 disabled:opacity-40 dark:border-slate-700"
          >
            <Undo2 className="h-4 w-4" /> Discard
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-5 py-2 text-sm font-semibold text-white hover:bg-accent-700 disabled:opacity-40"
          >
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>

      {preview && (
        <ImageLightbox
          src={uploadUrl(preview.img)}
          alt={preview.alt[lang] || preview.alt.en || "Picture"}
          title="About picture"
          downloadName="about-picture"
          onClose={() => setPreview(null)}
        />
      )}

      <PatternModal
        isOpen={patternOpen}
        onClose={() => setPatternOpen(false)}
      />
    </div>
  );
}
