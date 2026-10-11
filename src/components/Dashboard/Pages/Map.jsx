import React, { useEffect, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  X,
  SlidersHorizontal,
  RotateCcw,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { mapService, assetUrl } from "../../../services/api";
import ImageUpload from "../ImageUpload";
import ImageLightbox from "../ImageLightbox";
import CustomSelect from "../CustomSelect";
import Pagination from "../Pagination";
import {
  inputCls,
  I18nInput,
  useList,
  tr,
  cleanI18n,
  fmtDate,
} from "../Shared.jsx";

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

// on/off switch used in the Status column
function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 disabled:opacity-50 disabled:cursor-wait ${
        checked ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
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
  // the public API returns one plain string; show it as is (never split it into letters)
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

// always returns plain text, even if tr() gives back an object
function safeText(value) {
  // plain text stays as it is (tr() is meant for { en, km } objects)
  if (typeof value === "string" || typeof value === "number") return value;
  const result = tr(value);

  if (typeof result === "string" || typeof result === "number") {
    return result;
  }

  if (result && typeof result === "object") {
    return (
      result.en ||
      result.km ||
      Object.values(result).find((v) => typeof v === "string" && v.trim()) ||
      ""
    );
  }

  return "";
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

/* ---------- Google Maps embed ----------
   You can paste the whole <iframe ...> code from Google Maps (Share -> Embed a map)
   or just its src link. We keep only the src link and only accept real Google Maps embeds. */
const extractEmbedUrl = (input) => {
  let v = String(input ?? "").trim();
  if (!v) return "";
  const m = v.match(/<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i);
  if (m) v = m[1];
  v = v.replace(/&amp;/g, "&").trim();
  try {
    const u = new URL(v);
    const okHost = ["www.google.com", "google.com", "maps.google.com"].includes(
      u.hostname,
    );
    const isEmbed =
      u.pathname.startsWith("/maps/embed") ||
      u.searchParams.get("output") === "embed";
    return u.protocol === "https:" && okHost && isEmbed ? v : "";
  } catch {
    return "";
  }
};

function MapFrame({ url, className = "h-64" }) {
  return (
    <iframe
      src={url}
      title="Google Map"
      loading="lazy"
      allowFullScreen
      referrerPolicy="no-referrer-when-downgrade"
      className={`w-full rounded-xl border border-slate-200 dark:border-slate-700 ${className}`}
    />
  );
}

/* ---------- form helpers ---------- */
const emptyForm = {
  name: "",
  title: {},
  subtitle: {},
  slogan: {},
  description: {},
  map: "",
  location: "",
  link: "",
  status: 1,
};
const NO_IMAGE_CHANGE = { file: null, remove: false };

// the form values for an existing map (used when opening Edit and for the "nothing changed" check)
const formFromMap = (m) => ({
  name: m.name || "",
  title: m.title || {},
  subtitle: m.subtitle || {},
  slogan: m.slogan || {},
  description: m.description || {},
  map: m.map || "",
  location: m.location || "",
  link: m.link || "",
  status: m.status,
});

// comparable version of a form: same value -> same text (ignores key order and extra spaces)
const stableTexts = (o) =>
  Object.fromEntries(
    Object.entries(cleanI18n(o)).sort(([a], [b]) => a.localeCompare(b)),
  );
const fingerprint = (f) =>
  JSON.stringify({
    name: f.name.trim(),
    title: stableTexts(f.title),
    subtitle: stableTexts(f.subtitle),
    slogan: stableTexts(f.slogan),
    description: stableTexts(f.description),
    map: extractEmbedUrl(f.map) || f.map.trim(),
    location: f.location.trim(),
    link: f.link.trim(),
    status: Number(f.status),
  });

export default function MapManager() {
  const { list: rawMaps, loading, error, reload } = useList(mapService.list);

  // name/location may come back as {en, km}; turn them into plain text once
  const maps = (rawMaps || []).map((m) => ({
    ...m,
    name: safeText(m.name),
    location: safeText(m.location),
  }));

  const [editing, setEditing] = useState(null); // null | "new" | map
  const [viewing, setViewing] = useState(null); // map shown in the view modal
  const [lightboxOpen, setLightboxOpen] = useState(false); // full-screen logo of the viewed map
  const [form, setForm] = useState(emptyForm);
  const [imageChange, setImageChange] = useState(NO_IMAGE_CHANGE);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | 1 | 0
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // 10 | 20 | 30 | 40 | 50 | 100 | "all"
  const [togglingId, setTogglingId] = useState(null); // map whose status switch is saving

  // ALL alerts are shown on the page, between the search/filters and the table
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

  // closes the view modal (and its full-screen logo, if open)
  const closeView = () => {
    setLightboxOpen(false);
    setViewing(null);
  };

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

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // pasting the whole <iframe> code keeps just the clean src link in the box
  const onMapInput = (value) => {
    const clean = /<iframe/i.test(value) ? extractEmbedUrl(value) : "";
    setField("map", clean || value);
  };

  const openNew = () => {
    setForm(emptyForm);
    setImageChange(NO_IMAGE_CHANGE);
    setNotice(null);
    setModalHidden(false);
    setEditing("new");
  };

  const openEdit = (m) => {
    setForm(formFromMap(m));
    setImageChange(NO_IMAGE_CHANGE);
    setNotice(null);
    setModalHidden(false);
    setEditing(m);
  };

  const close = () => {
    setEditing(null);
    setModalHidden(false);
  };

  const embedUrl = extractEmbedUrl(form.map); // "" when empty or not a valid Google Maps embed
  const mapIsInvalid = form.map.trim() !== "" && !embedUrl;

  const save = async (e) => {
    e.preventDefault();

    const warn = (message) => {
      setModalHidden(true);
      notify("warning", "Please check the form", message, {
        returnToForm: true,
      });
    };

    if (!form.name.trim()) return warn("The name is required.");
    if (mapIsInvalid)
      return warn(
        "The map must be a Google Maps embed code or link (Google Maps → Share → Embed a map).",
      );
    if (form.link.trim() && !/^https?:\/\//i.test(form.link.trim()))
      return warn("The link must start with http:// or https://");

    const isNew = editing === "new";
    const itemName = form.name.trim();

    // editing but nothing was touched (no field changed, no logo chosen/removed)
    if (!isNew) {
      const textChanged =
        fingerprint(form) !== fingerprint(formFromMap(editing));
      const imageChanged = Boolean(imageChange.file || imageChange.remove);
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
      // multipart form: text fields + the logo file (server makes img + thumbnail from it)
      const fd = new FormData();
      fd.append("name", itemName);
      fd.append("title", JSON.stringify(cleanI18n(form.title)));
      fd.append("subtitle", JSON.stringify(cleanI18n(form.subtitle)));
      fd.append("slogan", JSON.stringify(cleanI18n(form.slogan)));
      fd.append("description", JSON.stringify(cleanI18n(form.description)));
      fd.append("map", embedUrl); // only the clean embed link is stored
      fd.append("location", form.location.trim());
      fd.append("link", form.link.trim());
      fd.append("status", String(Number(form.status)));
      if (imageChange.file)
        fd.append("image", imageChange.file); // field name must be "image"
      else if (imageChange.remove) fd.append("removeImage", "1");

      if (isNew) await mapService.create(fd);
      else await mapService.update(editing.id, fd);

      close();
      await reload();
      notify(
        "success",
        isNew ? "Map added" : "Map updated",
        isNew
          ? `"${itemName}" was added successfully.`
          : `"${itemName}" was updated successfully.`,
      );
    } catch (err) {
      console.error("Error saving map:", err);
      setModalHidden(true);
      notify(
        "error",
        isNew ? "Failed to add the map" : "Failed to update the map",
        err.message || "Something went wrong. Please try again.",
        { returnToForm: true },
      );
    } finally {
      setSaving(false);
    }
  };

  // the switch in the Status column: updates ONLY the status (same alerts as Update/Edit)
  const toggleStatus = async (m) => {
    const next = Number(m.status) === 1 ? 0 : 1;
    setTogglingId(m.id);
    try {
      await mapService.setStatus(m.id, next);
      await reload();
      notify(
        "success",
        "Map updated",
        next === 1
          ? `"${m.name}" was updated successfully. It is now active.`
          : `"${m.name}" was updated successfully. It is now hidden.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to update the map",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const ok = await reload();
      if (ok !== false)
        notify(
          "success",
          "Maps refreshed",
          "The maps were reloaded from the database.",
        );
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (m) => {
    if (!window.confirm(`Delete map "${m.name}"?`)) return;
    try {
      await mapService.remove(m.id);
      await reload();
      notify("success", "Map deleted", `"${m.name}" was deleted successfully.`);
    } catch (err) {
      notify(
        "error",
        "Failed to delete the map",
        err.message || "Something went wrong. Please try again.",
      );
    }
  };

  const activeFilters = statusFilter !== "all" ? 1 : 0;
  const clearFilters = () => setStatusFilter("all");
  const countBy = (fn) => maps.filter(fn).length;

  const shown = [...maps]
    .sort((a, b) => a.id - b.id)
    .filter((m) => {
      if (statusFilter !== "all" && Number(m.status) !== statusFilter)
        return false;
      const haystack = [
        m.name,
        m.location,
        ...Object.values(m.title || {}),
        ...Object.values(m.subtitle || {}),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query.toLowerCase());
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

  // content of the lightbox "Info" popup (dark style, because the lightbox is dark)
  const lightboxInfo = viewing ? (
    <div className="space-y-3 text-sm">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
          Name
        </span>
        <p className="mt-1 font-medium">{viewing.name}</p>
      </div>
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
          Slogan
        </span>
        <p className="mt-1 text-slate-300 text-xs leading-relaxed">
          {safeText(viewing.slogan) || "—"}
        </p>
      </div>
      <div className="pt-2 border-t border-slate-800">
        <span className="text-[11px] text-slate-400">Location</span>
        <p className="font-semibold">{viewing.location || "—"}</p>
      </div>
    </div>
  ) : null;

  const viewingEmbed = viewing ? extractEmbedUrl(viewing.map) : "";

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
          <h1 className="text-2xl font-extrabold">Map Manager</h1>
          <p className="text-sm text-slate-500">
            Your shop name, logo, address and Google Map for the storefront.
          </p>
        </div>
        <div className="flex gap-2 self-start">
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
            <Plus className="w-4 h-4" /> Add map
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search maps..."
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
        <a
          href="https://www.google.com/maps"
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 hover:border-amber-500 bg-white dark:bg-slate-900 transition-colors"
        >
          <MapPin className="w-4 h-4 text-amber-600" />
          <span>GoogleMap</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </a>
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
                Active ({countBy((m) => Number(m.status) === 1)})
              </Chip>
              <Chip
                active={statusFilter === 0}
                onClick={() => setStatusFilter(0)}
              >
                Hidden ({countBy((m) => Number(m.status) === 0)})
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

      {/* ===== ALERTS: between the search/filters and the table ===== */}
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
          title="Could not load the maps"
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
              <th className="p-4">Name</th>
              <th className="p-4">Location</th>
              <th className="p-4">Map</th>
              <th className="p-4">Status</th>
              <th className="p-4">Created / Updated</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="p-4 text-center text-slate-400" colSpan={6}>
                  Loading...
                </td>
              </tr>
            )}
            {!loading && shown.length === 0 && (
              <tr>
                <td className="p-4 text-center text-slate-400" colSpan={6}>
                  {maps.length === 0
                    ? "No maps yet."
                    : "No maps match your filters."}
                </td>
              </tr>
            )}
            {!loading &&
              pageItems.map((m) => {
                const thumb = assetUrl(m.thumbnail || m.img);
                const isActive = Number(m.status) === 1;
                const hasMap = Boolean(extractEmbedUrl(m.map));
                return (
                  <tr
                    key={m.id}
                    className="border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="w-10 h-10 rounded-lg object-contain bg-slate-50 dark:bg-slate-800"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                            Logo
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold">{m.name}</div>
                          {safeText(m.title) && (
                            <div className="text-xs text-slate-500 truncate max-w-[14rem]">
                              {safeText(m.title)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-500 max-w-xs">
                      <span className="line-clamp-2">{m.location || "—"}</span>
                    </td>
                    <td className="p-4">
                      {hasMap ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-sky-100 text-sky-700">
                          <MapPin className="w-3.5 h-3.5" /> Embedded
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {isActive ? "Active" : "Hidden"}
                        </span>
                        <Toggle
                          checked={isActive}
                          disabled={togglingId === m.id}
                          label={
                            isActive ? "Hide this map" : "Activate this map"
                          }
                          onChange={() => toggleStatus(m)}
                        />
                      </div>
                    </td>
                    <td className="p-4 text-xs text-slate-400">
                      <div>C: {fmtDate(m.created_at)}</div>
                      <div>U: {fmtDate(m.updated_at)}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setViewing(m)}
                          title="View"
                          aria-label="View details"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(m)}
                          title="Edit"
                          aria-label="Edit"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(m)}
                          title="Delete"
                          aria-label="Delete"
                          className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* pagination: below the table */}
      <Pagination
        page={currentPage}
        pageSize={pageSize}
        total={shown.length}
        onPage={setPage}
        onPageSize={setPageSize}
      />

      {/* ===== VIEW modal (read-only) + full-screen logo ===== */}
      {viewing && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closeView}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Map details"
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-lg font-bold">Map details</h3>
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
                <div className="flex items-start gap-4">
                  {viewing.img ? (
                    <button
                      type="button"
                      onClick={() => setLightboxOpen(true)}
                      aria-label="View logo full screen"
                      title="Click to view full screen"
                      className="shrink-0 cursor-zoom-in"
                    >
                      <img
                        src={assetUrl(viewing.img)}
                        alt=""
                        className="w-20 h-20 rounded-xl object-contain bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      />
                    </button>
                  ) : (
                    <div className="w-20 h-20 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                      No logo
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-xl font-extrabold break-words">
                        {viewing.name}
                      </h4>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                          Number(viewing.status) === 1
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {Number(viewing.status) === 1 ? "Active" : "Hidden"}
                      </span>
                    </div>
                    {viewing.location && (
                      <p className="mt-1 text-sm text-slate-500 flex items-start gap-1">
                        <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                        {viewing.location}
                      </p>
                    )}
                  </div>
                </div>

                {viewingEmbed ? (
                  <MapFrame url={viewingEmbed} className="h-72" />
                ) : (
                  <div className="w-full h-24 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm text-slate-400">
                    No map embedded
                  </div>
                )}

                {viewing.link && (
                  <a
                    href={viewing.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 hover:underline break-all"
                  >
                    <ExternalLink className="w-4 h-4 shrink-0" />
                    {viewing.link}
                  </a>
                )}

                {[
                  ["Title", viewing.title],
                  ["Subtitle", viewing.subtitle],
                  ["Slogan", viewing.slogan],
                  ["Description", viewing.description],
                ].map(([label, value]) => (
                  <section key={label} className="space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                      {label}
                    </h5>
                    <TextByLang value={value} />
                  </section>
                ))}

                <section className="grid grid-cols-2 gap-4">
                  <Field label="Created">
                    {fmtDateTime(viewing.created_at)}
                  </Field>
                  <Field label="Updated">
                    {fmtDateTime(viewing.updated_at)}
                  </Field>
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
                    const m = viewing;
                    closeView();
                    openEdit(m);
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
              alt={viewing.name}
              title={viewing.name}
              info={lightboxInfo}
              infoTitle="Map details"
              onClose={() => setLightboxOpen(false)}
            />
          )}
        </>
      )}

      {/* ===== ADD / EDIT modal ===== */}
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
                {editing === "new" ? "Add map" : "Edit map"}
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
              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Logo
                </h4>
                <ImageUpload
                  key={editing === "new" ? "new" : editing.id}
                  label="Logo"
                  currentUrl={editing === "new" ? "" : assetUrl(editing.img)}
                  onChange={setImageChange}
                />
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Shop
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block w-full">
                    Name *
                    <input
                      className={`${inputCls} mt-1`}
                      placeholder="e.g. Café Khmaoch - Siem Reap"
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block w-full">
                    Location (address)
                    <input
                      className={`${inputCls} mt-1`}
                      placeholder="e.g. Street 7, Siem Reap, Cambodia"
                      value={form.location}
                      onChange={(e) => setField("location", e.target.value)}
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Texts (all languages)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <I18nInput
                    expanded
                    required={false}
                    label="Title"
                    value={form.title}
                    onChange={(v) => setField("title", v)}
                    placeholder="e.g. Visit us"
                  />
                  <I18nInput
                    expanded
                    required={false}
                    label="Subtitle"
                    value={form.subtitle}
                    onChange={(v) => setField("subtitle", v)}
                  />
                  <I18nInput
                    expanded
                    required={false}
                    label="Slogan"
                    value={form.slogan}
                    onChange={(v) => setField("slogan", v)}
                  />
                  <I18nInput
                    expanded
                    multiline
                    label="Description"
                    value={form.description}
                    onChange={(v) => setField("description", v)}
                  />
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Google Map
                </h4>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block w-full">
                  Embed code or link
                  <textarea
                    className={`${inputCls} mt-1 resize-none font-mono text-xs ${
                      mapIsInvalid ? "border-red-400 focus:border-red-500" : ""
                    }`}
                    rows={3}
                    placeholder='Paste the code from Google Maps: Share → Embed a map → Copy HTML  (<iframe src="https://www.google.com/maps/embed?..."></iframe>)'
                    value={form.map}
                    onChange={(e) => onMapInput(e.target.value)}
                  />
                </label>
                {mapIsInvalid ? (
                  <p className="text-xs text-red-600">
                    That is not a Google Maps embed. Open Google Maps → Share →
                    <b> Embed a map</b> → Copy HTML. (Short links such as
                    maps.app.goo.gl can not be embedded.)
                  </p>
                ) : embedUrl ? (
                  <MapFrame url={embedUrl} className="h-56" />
                ) : (
                  <p className="text-xs text-slate-500">
                    Optional. A preview appears here once you paste the code.
                  </p>
                )}

                <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block w-full">
                  Google Maps link (for a “Get directions” button)
                  <input
                    className={`${inputCls} mt-1`}
                    placeholder="https://maps.app.goo.gl/..."
                    value={form.link}
                    onChange={(e) => setField("link", e.target.value)}
                  />
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
                        { value: 1, label: "Active" },
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
                  {saving ? "Saving..." : "Save map"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
