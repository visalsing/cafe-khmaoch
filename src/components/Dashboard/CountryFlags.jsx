import React, { useEffect, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  X,
  SlidersHorizontal,
  RotateCcw,
  GripVertical,
  ArrowUpDown,
  ArrowDownAZ,
  ChevronUp,
  ChevronDown,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";
import { countryFlagsService, assetUrl } from "../../services/api";
import ImageUpload from "./ImageUpload";
import SvgUpload from "./SvgUpload.jsx";
import ImageLightbox from "./ImageLightbox";
import CustomSelect from "./CustomSelect";
import Pagination from "./Pagination";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { useDateFormat } from "../../utils/useDateFormat.js";
import { useDigits } from "../../utils/digitFormatter";
import {
  inputCls,
  I18nInput,
  useList,
  cleanI18n,
  bySort,
  fmtDate,
} from "./Shared.jsx";

/* ========================================================================
   1. SMALL UI PIECES (Alert, Chip, Toggle, View-modal helpers)
   ======================================================================== */

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
          ? "bg-accent-600 border-accent-600 text-white"
          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-accent-500"
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
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 disabled:opacity-50 disabled:cursor-wait ${
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

// all translations of one text, English first
function TextByLang({ value }) {
  const entries = Object.entries(parseI18n(value))
    .filter(([, text]) => text)
    .sort(([a], [b]) =>
      a === "en" ? -1 : b === "en" ? 1 : a.localeCompare(b),
    );

  if (!entries.length) return <p className="text-slate-400">—</p>;

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
      <div className="text-sm text-slate-800 dark:text-slate-100">
        {children}
      </div>
    </div>
  );
}

/* ========================================================================
   2. TRANSLATION HELPERS
   ======================================================================== */

// Turns whatever the database returned into a {en, km, ...} object.
// Handles real objects, JSON strings like '{"en":"","km":""}', and plain strings.
const parseI18n = (v) => {
  if (!v) return {};
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return p && typeof p === "object" ? p : { en: v };
    } catch {
      return { en: v };
    }
  }
  return typeof v === "object" ? v : { en: String(v) };
};

// "km-KH" / "KM" / "kh" -> "km", "en-US" -> "en" (so it always matches the data keys)
const toLangKey = (language) => {
  const l = String(language || "en")
    .toLowerCase()
    .split(/[-_]/)[0];
  return l === "kh" ? "km" : l;
};

// the string for one language: uses the requested language first, then falls back
const pickText = (value, langKey) => {
  const obj = parseI18n(value);
  return (
    obj[langKey] || obj.en || obj.km || Object.values(obj).find(Boolean) || ""
  );
};

/* ========================================================================
   3. FORM HELPERS (empty form, "nothing changed" check, FormData builder)
   ======================================================================== */
const emptyForm = {
  name: {},
  native_name: "",
  description: {},
  icon: "",
  status: 1,
  sort_num: 0,
};

const NO_IMAGE_CHANGE = { file: null, remove: false };
const NO_SVG_CHANGE = { file: null, remove: false };

// the form values for an existing country flag (used when opening Edit and for the "nothing changed" check)
function formFromFlag(flag) {
  return {
    name: parseI18n(flag.name),
    native_name: flag.native_name || "",
    description: parseI18n(flag.description),
    icon: flag.icon || "",
    status: Number(flag.status) === 0 ? 0 : 1,
    sort_num: Number(flag.sort_num) || 0,
  };
}

// comparable version of a form: same value -> same text (ignores key order and extra spaces)
const stableTexts = (value) =>
  Object.fromEntries(
    Object.entries(cleanI18n(parseI18n(value))).sort(([a], [b]) =>
      a.localeCompare(b),
    ),
  );

const fingerprint = (form) =>
  JSON.stringify({
    name: stableTexts(form.name),
    native_name: String(form.native_name || "").trim(),
    description: stableTexts(form.description),
    icon: String(form.icon || "").trim(),
    status: Number(form.status),
    sort_num: Number(form.sort_num) || 0,
  });

// ONE FormData builder for every "update without touching the image / SVG" case
// (status switch, drag order, chevron order). It always sends sort_num, and
// sends no files, so the current image and SVG are kept.
const buildFlagFormData = (flag, { status, sortNum } = {}) => {
  const fd = new FormData();
  fd.append("name", JSON.stringify(cleanI18n(parseI18n(flag.name))));
  fd.append("native_name", String(flag.native_name || "").trim());
  fd.append(
    "description",
    JSON.stringify(cleanI18n(parseI18n(flag.description))),
  );
  fd.append("icon", String(flag.icon || "").trim());
  fd.append("status", String(Number(status ?? flag.status)));
  fd.append("sort_num", String(Number(sortNum ?? flag.sort_num) || 0));
  return fd;
};

/* ========================================================================
   4. MAIN COMPONENT
   ======================================================================== */
export default function CountryFlags() {
  const { language, t } = useLanguage();
  const { dateTime } = useDateFormat();
  const formatNum = useDigits();
  const langKey = toLangKey(language);

  // ONE function for every localized text on this page
  const getLocalizedValue = (value) => pickText(value, langKey);

  /* ---------- 4.1 Data ---------- */
  const {
    list: flags,
    loading,
    error,
    reload,
  } = useList(countryFlagsService.list);

  /* ---------- 4.2 State ---------- */
  const [editing, setEditing] = useState(null); // null | "new" | country flag
  const [viewing, setViewing] = useState(null); // country flag shown in the view modal
  const [lightboxOpen, setLightboxOpen] = useState(false); // full-screen image of the viewed flag
  const [form, setForm] = useState(emptyForm);
  const [imageChange, setImageChange] = useState(NO_IMAGE_CHANGE);
  const [svgChange, setSvgChange] = useState(NO_SVG_CHANGE);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | 1 | 0
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // 10 | 20 | 30 | 40 | 50 | 100
  const [togglingId, setTogglingId] = useState(null); // flag whose status switch is saving

  // delete confirmation
  const [deleting, setDeleting] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  // chevron reordering: moves are kept on screen until "Save order" is pressed
  const [pendingOrder, setPendingOrder] = useState(null); // null | array of flag ids (unsaved order)
  const [reorderSaving, setReorderSaving] = useState(false);

  // drag & drop "Order" modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderItems, setOrderItems] = useState([]);
  const [draggedId, setDraggedId] = useState(null);
  const [orderSaving, setOrderSaving] = useState(false);

  // sort menu
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortMode, setSortMode] = useState("default");

  // ALL alerts are shown on the page, between the search/filters and the table
  const [notice, setNotice] = useState(null); // { id, type, title, message, returnToForm }
  const [modalHidden, setModalHidden] = useState(false); // form is hidden (not lost) while its alert is shown
  const noticeRef = useRef(null);

  /* ---------- 4.3 Alerts (notice) ---------- */
  const notify = (type, title, message, { returnToForm = false } = {}) =>
    setNotice({ id: Date.now(), type, title, message, returnToForm });

  // closing an alert that came from the form brings the form back
  const dismissNotice = () => {
    if (notice?.returnToForm) setModalHidden(false);
    setNotice(null);
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

  /* ---------- 4.4 View modal helpers ---------- */
  // closes the view modal (and its full-screen image, if open)
  const closeView = () => {
    setLightboxOpen(false);
    setViewing(null);
  };

  // Esc closes the view modal (the lightbox handles its own Esc first and stops it from reaching here)
  useEffect(() => {
    if (!viewing) return;
    const onKey = (event) => {
      if (event.key === "Escape") {
        setLightboxOpen(false);
        setViewing(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewing]);

  /* ---------- 4.5 Pagination reset ---------- */
  // search / filters / page size / sort changed -> start again from page 1
  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, pageSize, sortMode]);

  /* ---------- 4.6 Add / Edit form ---------- */
  const setField = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const openNew = () => {
    // new country flag goes to the end of the list by default
    const nextSort =
      flags.reduce((max, f) => Math.max(max, Number(f.sort_num) || 0), 0) + 1;
    setForm({ ...emptyForm, sort_num: nextSort });
    setImageChange(NO_IMAGE_CHANGE);
    setSvgChange(NO_SVG_CHANGE);
    setNotice(null);
    setModalHidden(false);
    setEditing("new");
  };

  const openEdit = (flag) => {
    setForm(formFromFlag(flag));
    setImageChange(NO_IMAGE_CHANGE);
    setSvgChange(NO_SVG_CHANGE);
    setNotice(null);
    setModalHidden(false);
    setEditing(flag);
  };

  const close = () => {
    setEditing(null);
    setModalHidden(false);
  };

  const save = async (event) => {
    event.preventDefault();

    const warn = (message) => {
      setModalHidden(true);
      notify("warning", "Please check the form", message, {
        returnToForm: true,
      });
    };

    const nameEn = String(parseI18n(form.name).en ?? "").trim();
    if (!nameEn) return warn("The English name is required.");
    if (nameEn.length > 120)
      return warn("The English name must be 120 characters or fewer.");
    if (String(form.native_name || "").trim().length > 120)
      return warn("The native name must be 120 characters or fewer.");
    if (String(form.icon || "").trim().length > 100)
      return warn("The icon value must be 100 characters or fewer.");
    if (String(parseI18n(form.description).en || "").length > 500)
      return warn("The English description must be 500 characters or fewer.");

    const isNew = editing === "new";
    const itemName = nameEn;

    // editing but nothing was touched (no field changed, no image/SVG chosen or removed)
    if (!isNew) {
      const textChanged =
        fingerprint(form) !== fingerprint(formFromFlag(editing));
      const imageChanged = Boolean(imageChange.file || imageChange.remove);
      const svgChanged = Boolean(svgChange.file || svgChange.remove);
      if (!textChanged && !imageChanged && !svgChanged) {
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
      // multipart form: text fields + the image / SVG files
      const fd = new FormData();
      fd.append("name", JSON.stringify(cleanI18n(parseI18n(form.name))));
      fd.append("native_name", String(form.native_name || "").trim());
      fd.append(
        "description",
        JSON.stringify(cleanI18n(parseI18n(form.description))),
      );
      fd.append("icon", String(form.icon || "").trim());
      fd.append("status", String(Number(form.status)));
      fd.append("sort_num", String(Number(form.sort_num) || 0));

      if (imageChange.file) fd.append("image", imageChange.file);
      else if (imageChange.remove) fd.append("removeImage", "1");

      if (svgChange.file) fd.append("svg", svgChange.file);
      else if (svgChange.remove) fd.append("removeSvg", "1");

      if (isNew) await countryFlagsService.create(fd);
      else await countryFlagsService.update(editing.id, fd);

      close();
      await reload();
      notify(
        "success",
        isNew ? "Country flag added" : "Country flag updated",
        isNew
          ? `"${itemName}" was added successfully.`
          : `"${itemName}" was updated successfully.`,
      );
    } catch (err) {
      console.error("Error saving country flag:", err);
      setModalHidden(true);
      notify(
        "error",
        isNew ? "Failed to add country flag" : "Failed to update country flag",
        err.message || "Something went wrong. Please try again.",
        { returnToForm: true },
      );
    } finally {
      setSaving(false);
    }
  };

  /* ---------- 4.7 Status switch ---------- */
  // updates ONLY the status (sort_num is sent again, no files are sent, so the order, image and SVG are kept)
  const toggleStatus = async (flag) => {
    const next = Number(flag.status) === 1 ? 0 : 1;
    setTogglingId(flag.id);
    try {
      await countryFlagsService.update(
        flag.id,
        buildFlagFormData(flag, { status: next }),
      );
      await reload();
      notify(
        "success",
        "Country flag updated",
        next === 1
          ? `"${getLocalizedValue(flag.name)}" was updated successfully. It is now active.`
          : `"${getLocalizedValue(flag.name)}" was updated successfully. It is now hidden.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to update country flag",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setTogglingId(null);
    }
  };

  /* ---------- 4.8 Refresh ---------- */
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const ok = await reload();
      if (ok !== false) {
        notify(
          "success",
          "Country flags refreshed",
          "The country flags were reloaded from the database.",
        );
      }
    } finally {
      setRefreshing(false);
    }
  };

  /* ---------- 4.9 Delete (with confirmation modal) ---------- */
  const handleDelete = (flag) => {
    setDeleting(flag);
  };

  const confirmDelete = async () => {
    if (!deleting || deletingLoading) return;

    const item = deleting;
    setDeletingLoading(true);

    try {
      await countryFlagsService.remove(item.id);
      setDeleting(null);
      await reload();
      notify(
        "success",
        "Country flag deleted",
        `"${getLocalizedValue(item.name)}" was deleted successfully.`,
      );
    } catch (err) {
      setDeleting(null);
      notify(
        "error",
        "Failed to delete country flag",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setDeletingLoading(false);
    }
  };

  /* ---------- 4.10 Filters ---------- */
  const activeFilters = statusFilter !== "all" ? 1 : 0;
  const clearFilters = () => setStatusFilter("all");
  const countBy = (fn) => flags.filter(fn).length;

  /* ---------- 4.11 Order state (saved order + unsaved chevron moves) ---------- */
  // saved order from the database, and the order including unsaved chevron moves
  const baseOrder = [...flags].sort(bySort);
  const baseIndex = new Map(baseOrder.map((x, i) => [String(x.id), i]));

  const orderIds = (() => {
    if (!pendingOrder) return baseOrder.map((x) => x.id);
    const existing = new Set(flags.map((x) => String(x.id)));
    const kept = pendingOrder.filter((id) => existing.has(String(id)));
    const keptSet = new Set(kept.map(String));
    const extra = baseOrder
      .filter((x) => !keptSet.has(String(x.id)))
      .map((x) => x.id);
    return [...kept, ...extra];
  })();
  const orderIndex = new Map(orderIds.map((id, i) => [String(id), i]));
  const movedCount = orderIds.filter(
    (id, i) => String(id) !== String(baseOrder[i]?.id),
  ).length;
  const orderDirty = movedCount > 0;

  // the saved order changed (saved here, saved in the Order modal, item added or deleted)
  // -> forget the unsaved chevron moves
  const orderSignature = flags.map((f) => `${f.id}:${f.sort_num}`).join("|");
  useEffect(() => {
    setPendingOrder(null);
  }, [orderSignature]);

  /* ---------- 4.12 Sort, search, filter, paginate ---------- */
  const sortedFlags = [...flags].sort((a, b) => {
    switch (sortMode) {
      case "name_asc":
        return getLocalizedValue(a.name).localeCompare(
          getLocalizedValue(b.name),
          langKey,
          { sensitivity: "base", numeric: true },
        );

      case "name_desc":
        return getLocalizedValue(b.name).localeCompare(
          getLocalizedValue(a.name),
          langKey,
          { sensitivity: "base", numeric: true },
        );

      case "date_newest":
        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );

      case "date_oldest":
        return (
          new Date(a.created_at || 0).getTime() -
          new Date(b.created_at || 0).getTime()
        );

      // default = saved sort_num order + any unsaved chevron moves
      default:
        return (
          (orderIndex.get(String(a.id)) ?? 0) -
          (orderIndex.get(String(b.id)) ?? 0)
        );
    }
  });

  // search (names, descriptions, native name, icon, id) + filter
  const shown = sortedFlags.filter((flag) => {
    if (statusFilter !== "all" && Number(flag.status) !== statusFilter)
      return false;
    const searchable = [
      ...Object.values(parseI18n(flag.name)),
      ...Object.values(parseI18n(flag.description)),
      flag.native_name || "",
      flag.icon || "",
      flag.id,
    ]
      .join(" ")
      .toLowerCase();
    return searchable.includes(query.toLowerCase());
  });

  // one row of the sort menu
  const sortOption = ([value, label]) => (
    <button
      key={value}
      type="button"
      onClick={() => {
        setSortMode(value);
        setShowSortMenu(false);
        setPage(1);
      }}
      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        sortMode === value
          ? "bg-accent-50 font-semibold text-accent-700 dark:bg-accent-950/30 dark:text-accent-400"
          : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      }`}
    >
      {label}
      {sortMode === value && <span className="float-right">✓</span>}
    </button>
  );

  // pagination: `shown` is the full filtered list, `paginatedShown` is the current page
  const effectivePageSize =
    pageSize === "all" ? Math.max(shown.length, 1) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(shown.length / effectivePageSize));
  const currentPage = Math.min(page, totalPages); // e.g. deleted the last item of the last page
  const paginatedShown = shown.slice(
    (currentPage - 1) * effectivePageSize,
    currentPage * effectivePageSize,
  );

  /* ---------- 4.13 Lightbox info popup ---------- */
  // content of the lightbox "Info" popup (dark style, because the lightbox is dark)
  const lightboxInfo = viewing ? (
    <div className="space-y-3 text-sm">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-accent-500">
          Name
        </span>
        <p className="mt-1 font-medium">{getLocalizedValue(viewing.name)}</p>
      </div>
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-accent-500">
          Native name
        </span>
        <p className="mt-1 text-slate-300 text-xs leading-relaxed">
          {viewing.native_name || "—"}
        </p>
      </div>
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-accent-500">
          Description
        </span>
        <p className="mt-1 text-slate-300 text-xs leading-relaxed">
          {getLocalizedValue(viewing.description) || "No description provided."}
        </p>
      </div>
      <div className="pt-2 border-t border-slate-800">
        <span className="text-[11px] text-slate-400">Status</span>
        <p className="font-semibold">
          {Number(viewing.status) === 1 ? "Active" : "Hidden"}
        </p>
      </div>
    </div>
  ) : null;

  /* ---------- 4.14 Order modal: drag & drop ---------- */
  const openOrderModal = () => {
    // Start with the current database order, not the filtered results.
    setOrderItems([...flags].sort(bySort));
    setDraggedId(null);
    setShowOrderModal(true);
  };

  const handleOrderDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(id));
  };

  const handleOrderDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleOrderDrop = (e, targetId) => {
    e.preventDefault();

    const sourceId = draggedId ?? e.dataTransfer.getData("text/plain");

    if (
      sourceId === "" ||
      sourceId === null ||
      String(sourceId) === String(targetId)
    ) {
      setDraggedId(null);
      return;
    }

    setOrderItems((current) => {
      const updated = [...current];
      const fromIndex = updated.findIndex(
        (item) => String(item.id) === String(sourceId),
      );
      const toIndex = updated.findIndex(
        (item) => String(item.id) === String(targetId),
      );
      if (fromIndex === -1 || toIndex === -1) return current;

      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });

    setDraggedId(null);
  };

  // "Save Order" button of the Order modal
  const saveOrder = async () => {
    if (orderSaving) return;
    setOrderSaving(true);

    try {
      // Save each country flag's new position using the existing update API.
      for (let index = 0; index < orderItems.length; index++) {
        const item = orderItems[index];
        await countryFlagsService.update(
          item.id,
          buildFlagFormData(item, { sortNum: index + 1 }),
        );
      }

      setShowOrderModal(false);
      await reload();

      notify(
        "success",
        "Order saved",
        "The country flags display order has been updated successfully.",
      );
    } catch (err) {
      console.error("Failed to save country flag order:", err);
      notify(
        "error",
        "Failed to save order",
        err.message || "Could not save the order. Please try again.",
      );
      // Reload because some items might already have been updated.
      await reload();
    } finally {
      setOrderSaving(false);
    }
  };

  /* ---------- 4.15 Chevron Up & Down order ---------- */
  // direction: -1 = up, +1 = down. Only changes the screen, nothing is saved yet.
  const moveFlag = (flag, direction) => {
    if (reorderSaving || sortMode !== "default") return;

    const neighbor = shown[shown.indexOf(flag) + direction];
    if (!neighbor) return;

    const next = [...orderIds];
    const a = next.findIndex((id) => String(id) === String(flag.id));
    const b = next.findIndex((id) => String(id) === String(neighbor.id));
    if (a === -1 || b === -1) return;
    [next[a], next[b]] = [next[b], next[a]];

    setPendingOrder(next);
  };

  const cancelPendingOrder = () => setPendingOrder(null);

  // the "Save order" button: writes all moves at once (only flags whose number changed)
  const savePendingOrder = async () => {
    if (reorderSaving || !orderDirty) return;

    const byId = new Map(flags.map((x) => [String(x.id), x]));
    const changed = orderIds
      .map((id, i) => ({ item: byId.get(String(id)), sortNum: i + 1 }))
      .filter(({ item, sortNum }) => item && Number(item.sort_num) !== sortNum);

    setReorderSaving(true);
    try {
      for (const { item, sortNum } of changed) {
        await countryFlagsService.update(
          item.id,
          buildFlagFormData(item, { sortNum }),
        );
      }
      setPendingOrder(null);
      await reload();
      notify(
        "success",
        "Order saved",
        "The country flags display order has been updated successfully.",
      );
    } catch (err) {
      console.error("Failed to save country flag order:", err);
      notify(
        "error",
        "Failed to save order",
        err.message || "Could not save the order. Please try again.",
      );
      await reload(); // some country flags may already have been saved
    } finally {
      setReorderSaving(false);
    }
  };

  /* ---------- 4.16 Excel / CSV export ---------- */
  // Export the complete filtered result, not just the current page.
  const getExportData = () =>
    shown.map((flag) => {
      const name = parseI18n(flag.name);
      const description = parseI18n(flag.description);
      return {
        ID: flag.id,
        "Sort Order": flag.sort_num ?? 0,
        Name: name.en || "",
        "Name (Khmer)": name.km || "",
        "Name (Chinese)": name.zh || "",
        "Name (Lao)": name.lo || "",
        "Name (Japanese)": name.ja || "",
        "Name (Vietnamese)": name.vi || "",
        "Native Name": flag.native_name || "",
        Icon: flag.icon || "",
        Description: description.en || "",
        "Description (Khmer)": description.km || "",
        "Description (Chinese)": description.zh || "",
        "Description (Lao)": description.lo || "",
        "Description (Japanese)": description.ja || "",
        "Description (Vietnamese)": description.vi || "",
        "Has Image": flag.img ? "Yes" : "No",
        "Has SVG": flag.svg ? "Yes" : "No",
        "SVG Path": flag.svg || "",
        Status: Number(flag.status) === 1 ? "Active" : "Hidden",
        "Created At": flag.created_at ?? "",
        "Updated At": flag.updated_at ?? "",
      };
    });

  const exportFileName = (ext) =>
    `country-flags-${new Date().toISOString().slice(0, 10)}.${ext}`;

  const exportToCSV = () => {
    if (shown.length === 0) {
      notify(
        "warning",
        "Nothing to export",
        "No country flags match your current filters.",
      );
      return;
    }

    const rows = getExportData();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    // UTF-8 BOM helps Excel display Khmer, Lao, Thai, and other scripts.
    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = exportFileName("csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    notify(
      "success",
      "CSV exported",
      `${rows.length} country flag(s) exported successfully.`,
    );
  };

  const exportToExcel = () => {
    if (shown.length === 0) {
      notify(
        "warning",
        "Nothing to export",
        "No country flags match your current filters.",
      );
      return;
    }

    const rows = getExportData();
    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet["!cols"] = Object.keys(rows[0]).map((key) => ({
      wch: Math.min(
        Math.max(
          key.length + 2,
          ...rows.map((row) => String(row[key] ?? "").length + 2),
        ),
        35,
      ),
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Country Flags");
    XLSX.writeFile(workbook, exportFileName("xlsx"));

    notify(
      "success",
      "Excel exported",
      `${rows.length} country flag(s) exported successfully.`,
    );
  };

  /* ========================================================================
     5. RENDER
     ======================================================================== */
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

      {/* ===== 5.1 PAGE HEADER: title + Excel / CSV / Refresh / Add ===== */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Country Flags</h1>
          <p className="text-sm text-slate-500">
            Manage country names, native names, icons, and flag assets.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          <button
            type="button"
            onClick={exportToExcel}
            disabled={loading || shown.length === 0}
            title="Export filtered country flags to Excel"
            className="px-3 py-2 text-sm rounded-xl border border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400 flex items-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-50 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={exportToCSV}
            disabled={loading || shown.length === 0}
            title="Export filtered country flags to CSV"
            className="px-3 py-2 text-sm rounded-xl border border-sky-300 text-sky-700 dark:border-sky-800 dark:text-sky-400 flex items-center gap-2 hover:bg-sky-50 dark:hover:bg-sky-950/30 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 hover:border-accent-500 disabled:opacity-60 transition-colors"
          >
            <RotateCcw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            type="button"
            onClick={openNew}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-accent-600 hover:bg-accent-700 text-white flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add country flag
          </button>
        </div>
      </div>

      {/* ===== 5.2 TOOLBAR: search + filters + sort + order ===== */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search country flags..."
          className={`${inputCls} sm:max-w-xs`}
        />
        <button
          type="button"
          onClick={() => setShowFilters((value) => !value)}
          aria-expanded={showFilters}
          className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 hover:border-accent-500 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {showFilters ? "Hide Filters" : "Show Filters"}
          {activeFilters > 0 && (
            <span className="px-1.5 rounded-full bg-accent-600 text-white text-xs leading-5">
              {activeFilters}
            </span>
          )}
        </button>

        {/* Sort */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSortMenu((v) => !v)}
            aria-expanded={showSortMenu}
            className={`px-4 py-2 text-sm font-medium rounded-xl border flex items-center gap-2 transition-colors ${
              sortMode !== "default"
                ? "border-accent-500 text-accent-600"
                : "border-slate-300 dark:border-slate-700 hover:border-accent-500"
            }`}
          >
            <ArrowDownAZ className="h-4 w-4" />
            Sort
          </button>

          {showSortMenu && (
            <>
              <button
                type="button"
                aria-label="Close sort menu"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setShowSortMenu(false)}
              />

              <div className="absolute left-0 top-full z-20 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Sort by Name
                </p>
                {[
                  ["name_asc", "Name: A–Z"],
                  ["name_desc", "Name: Z–A"],
                ].map(sortOption)}

                <div className="my-2 border-t border-slate-200 dark:border-slate-700" />

                <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Sort by Date Created
                </p>
                {[
                  ["date_newest", "Newest first"],
                  ["date_oldest", "Oldest first"],
                ].map(sortOption)}

                <div className="my-2 border-t border-slate-200 dark:border-slate-700" />

                <button
                  type="button"
                  onClick={() => {
                    setSortMode("default");
                    setShowSortMenu(false);
                    setPage(1);
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Reset to default order
                </button>
              </div>
            </>
          )}
        </div>

        {/* Drag & drop order modal */}
        <button
          type="button"
          onClick={openOrderModal}
          className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 hover:border-accent-500 hover:text-accent-600 transition-colors"
        >
          <ArrowUpDown className="w-4 h-4" />
          Order
        </button>
      </div>

      {/* ===== 5.3 FILTER PANEL ===== */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-sm">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500">Status</div>
            <div className="flex flex-wrap gap-2">
              <Chip
                active={statusFilter === "all"}
                onClick={() => setStatusFilter("all")}
              >
                {t("all")} ({flags.length})
              </Chip>
              <Chip
                active={statusFilter === 1}
                onClick={() => setStatusFilter(1)}
              >
                Active ({countBy((flag) => Number(flag.status) === 1)})
              </Chip>
              <Chip
                active={statusFilter === 0}
                onClick={() => setStatusFilter(0)}
              >
                Hidden ({countBy((flag) => Number(flag.status) === 0)})
              </Chip>
            </div>
          </div>
          {activeFilters > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-accent-600 font-medium underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* ===== 5.4 ALERTS: between the search/filters and the table ===== */}
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
          title="Could not load country flags"
          action={
            <button
              type="button"
              onClick={reload}
              className="ml-2 font-semibold underline"
            >
              Retry
            </button>
          }
        >
          {error}
        </Alert>
      )}

      {/* ===== 5.5 SAVE BAR: appears after moving rows with the chevrons ===== */}
      {orderDirty && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-300 bg-accent-50 px-4 py-3 text-sm text-accent-800 dark:border-accent-700 dark:bg-accent-950/30 dark:text-accent-300">
          <span>
            <b>{formatNum(movedCount)}</b> country flag(s) moved. The new order
            is not saved yet.
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancelPendingOrder}
              disabled={reorderSaving}
              className="px-4 py-1.5 rounded-xl border border-accent-400 font-semibold hover:bg-accent-100 dark:hover:bg-accent-950/50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={savePendingOrder}
              disabled={reorderSaving}
              className="px-4 py-1.5 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-semibold disabled:opacity-60 flex items-center gap-2 transition-colors"
            >
              {reorderSaving && <RotateCcw className="w-4 h-4 animate-spin" />}
              {reorderSaving ? "Saving..." : "Save order"}
            </button>
          </div>
        </div>
      )}

      {/* ===== 5.6 TABLE ===== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4">#</th>
              <th className="p-4">Country flag</th>
              <th className="p-4">Native name / Icon</th>
              <th className="p-4">Description</th>
              <th className="p-4">Status</th>
              <th className="p-4">Created / Updated</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="p-4 text-center text-slate-400" colSpan={7}>
                  Loading...
                </td>
              </tr>
            )}
            {!loading && shown.length === 0 && (
              <tr>
                <td className="p-4 text-center text-slate-400" colSpan={7}>
                  {flags.length === 0
                    ? "No country flags yet."
                    : "No country flags match your filters."}
                </td>
              </tr>
            )}
            {!loading &&
              paginatedShown.map((flag) => {
                const thumb = assetUrl(flag.thumbnail || flag.img || flag.svg);
                const isActive = Number(flag.status) === 1;
                const pos = shown.indexOf(flag);
                const reorderLocked = sortMode !== "default" || reorderSaving;
                const isMoved =
                  orderDirty &&
                  baseIndex.get(String(flag.id)) !==
                    orderIndex.get(String(flag.id));

                return (
                  <tr
                    key={flag.id}
                    className={`border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${
                      isMoved ? "bg-accent-50/70 dark:bg-accent-950/20" : ""
                    }`}
                  >
                    {/* sort number */}
                    <td className="p-4 font-medium tabular-nums">
                      {Number(flag.sort_num) || 0}
                    </td>

                    {/* image + name */}
                    <td className="p-4">
                      <div className="flex items-center gap-3 min-w-48">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="w-10 h-10 rounded-lg object-contain bg-slate-100 dark:bg-slate-800 p-1"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                            No img
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold break-words">
                            {getLocalizedValue(flag.name)}
                          </div>
                          <div className="text-xs text-slate-400">
                            ID: {flag.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* native name + icon */}
                    <td className="p-4">
                      <div>{flag.native_name || "—"}</div>
                      <div className="text-xs text-slate-400">
                        {flag.icon || "—"}
                      </div>
                    </td>

                    {/* description + SVG badge */}
                    <td className="p-4 text-slate-500 max-w-xs">
                      <div className="truncate">
                        {getLocalizedValue(flag.description) || "—"}
                      </div>

                      {flag.svg && (
                        <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-sky-600">
                          <img
                            src={assetUrl(flag.svg)}
                            alt=""
                            className="h-5 w-5 rounded object-contain border border-sky-100 bg-white p-0.5"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                          <span>SVG attached</span>
                        </div>
                      )}
                    </td>

                    {/* status badge + switch */}
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
                          disabled={togglingId === flag.id}
                          label={
                            isActive
                              ? "Hide this country flag"
                              : "Activate this country flag"
                          }
                          onChange={() => toggleStatus(flag)}
                        />
                      </div>
                    </td>

                    {/* created / updated */}
                    <td className="p-4 text-xs text-slate-400 whitespace-nowrap">
                      <div>C: {fmtDate(flag.created_at)}</div>
                      <div>U: {fmtDate(flag.updated_at)}</div>
                    </td>

                    {/* actions: chevrons, view, edit, delete */}
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => moveFlag(flag, -1)}
                          disabled={reorderLocked || pos === 0}
                          title={
                            sortMode !== "default"
                              ? "Reset sort to default to reorder"
                              : "Move up"
                          }
                          aria-label="Move up"
                          className="p-2 rounded-lg text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveFlag(flag, 1)}
                          disabled={reorderLocked || pos === shown.length - 1}
                          title={
                            sortMode !== "default"
                              ? "Reset sort to default to reorder"
                              : "Move down"
                          }
                          aria-label="Move down"
                          className="p-2 rounded-lg text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewing(flag)}
                          title="View"
                          aria-label="View details"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(flag)}
                          title="Edit"
                          aria-label="Edit"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(flag)}
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

      {/* ===== 5.7 PAGINATION: below the table ===== */}
      <Pagination
        page={currentPage}
        pageSize={pageSize}
        total={shown.length}
        onPage={setPage}
        onPageSize={setPageSize}
      />

      {/* ===== 5.8 VIEW modal (read-only) + full-screen image ===== */}
      {viewing && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closeView}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Country flag details"
              onClick={(event) => event.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-lg font-bold">Country flag details</h3>
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
                {/* image / SVG (click = full screen) */}
                {viewing.img || viewing.svg ? (
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    aria-label="View image full screen"
                    className="relative group block w-full text-left cursor-zoom-in"
                  >
                    <img
                      src={assetUrl(viewing.img || viewing.svg)}
                      alt=""
                      className="w-full max-h-64 object-contain rounded-xl bg-slate-100 dark:bg-slate-800"
                    />
                    <span className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white font-medium text-sm">
                      Click to view full screen
                    </span>
                  </button>
                ) : (
                  <div className="w-full h-32 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm text-slate-400">
                    No image or SVG
                  </div>
                )}

                {/* title + status */}
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-xl font-extrabold">
                    {getLocalizedValue(viewing.name)}
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

                {/* name in all languages */}
                <section className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-accent-600">
                    Name
                  </h5>
                  <TextByLang value={viewing.name} />
                </section>

                {/* native name */}
                <section className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-accent-600">
                    Native name
                  </h5>
                  <p>{viewing.native_name || "—"}</p>
                </section>

                {/* description in all languages */}
                <section className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-accent-600">
                    Description
                  </h5>
                  <TextByLang value={viewing.description} />
                </section>

                {/* icon, sort order, SVG, dates */}
                <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="Icon">{viewing.icon || "—"}</Field>
                  <Field label="Sort number">
                    {formatNum(Number(viewing.sort_num) || 0)}
                  </Field>

                  <Field label="SVG file">
                    {viewing.svg ? (
                      <div className="flex items-center gap-2 mt-1">
                        <img
                          src={assetUrl(viewing.svg)}
                          alt="Country flag SVG"
                          className="h-8 w-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white p-1 object-contain"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                        <span className="text-sm text-sky-600">Attached</span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </Field>

                  <Field label="Created">{dateTime(viewing.created_at)}</Field>
                  <Field label="Updated">{dateTime(viewing.updated_at)}</Field>
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
                    const item = viewing;
                    closeView();
                    openEdit(item);
                  }}
                  className="py-2.5 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Pencil className="w-4 h-4" /> Edit
                </button>
              </div>
            </div>
          </div>

          {/* sibling of the modal on purpose: its clicks must not reach the modal's backdrop handler */}
          {lightboxOpen && (viewing.img || viewing.svg) && (
            <ImageLightbox
              src={assetUrl(viewing.img || viewing.svg)}
              alt={getLocalizedValue(viewing.name)}
              title={getLocalizedValue(viewing.name)}
              info={lightboxInfo}
              infoTitle="Country flag details"
              onClose={() => setLightboxOpen(false)}
            />
          )}
        </>
      )}

      {/* ===== 5.9 ADD / EDIT modal ===== */}
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
                {editing === "new" ? "Add country flag" : "Edit country flag"}
              </h3>
              <button
                type="button"
                onClick={close}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Container */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* raster image */}
              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent-600">
                  Raster image
                </h4>
                <ImageUpload
                  key={editing === "new" ? "new" : editing.id}
                  label="Flag image"
                  currentUrl={editing === "new" ? "" : assetUrl(editing.img)}
                  onChange={setImageChange}
                />
                <p className="text-xs text-slate-400">
                  Optional. JPG, PNG, WebP, or GIF, up to 5 MB.
                </p>
              </section>

              {/* SVG file */}
              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent-600">
                  SVG file
                </h4>
                <SvgUpload
                  key={editing === "new" ? "new-svg" : `svg-${editing.id}`}
                  label="SVG Flag"
                  currentUrl={editing === "new" ? "" : editing.svg || ""}
                  onChange={setSvgChange}
                />
                <p className="text-xs text-slate-400">
                  Optional. SVG vector file only, up to 512 KB.
                </p>
              </section>

              {/* name + description */}
              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent-600">
                  Name &amp; description (all languages)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <div className="w-full">
                    <I18nInput
                      expanded
                      required
                      label="Name"
                      value={form.name}
                      onChange={(value) => setField("name", value)}
                      placeholder="e.g. Cambodia"
                    />
                  </div>
                  <div className="w-full">
                    <I18nInput
                      expanded
                      multiline
                      label="Description"
                      value={form.description}
                      onChange={(value) => setField("description", value)}
                    />
                  </div>
                </div>
              </section>

              {/* native name + icon */}
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Native name
                  </label>
                  <input
                    value={form.native_name}
                    onChange={(event) =>
                      setField("native_name", event.target.value)
                    }
                    placeholder="e.g. ខ្មែរ"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Icon code / class
                  </label>
                  <input
                    value={form.icon}
                    onChange={(event) => setField("icon", event.target.value)}
                    placeholder="e.g. flag-icon-kh"
                    className={inputCls}
                  />
                </div>
              </section>

              {/* sort order + status */}
              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent-600">
                  Display
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-sm text-slate-600 dark:text-slate-400 block w-full">
                    Status
                    <div className="relative mt-1 w-full">
                      <CustomSelect
                        value={form.status}
                        onChange={(value) => setField("status", Number(value))}
                        options={[
                          { value: 1, label: "Active" },
                          { value: 0, label: "Hidden" },
                        ]}
                      />
                    </div>
                  </label>
                  <label className="text-sm text-slate-600 dark:text-slate-400 block w-full">
                    Sort order
                    <input
                      className={`${inputCls} mt-1 w-full`}
                      type="number"
                      value={form.sort_num}
                      onChange={(event) =>
                        setField("sort_num", event.target.value)
                      }
                    />
                  </label>
                </div>
              </section>

              {/* buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={close}
                  className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white font-semibold transition-colors text-center shadow-sm"
                >
                  {saving ? "Saving..." : "Save country flag"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ===== 5.10 DELETE CONFIRMATION modal ===== */}
      {deleting && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => {
            if (!deletingLoading) setDeleting(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            aria-describedby="delete-modal-description"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            {/* Icon + Heading */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                <Trash2 className="h-6 w-6" />
              </div>

              <div className="min-w-0 flex-1">
                <h3
                  id="delete-modal-title"
                  className="text-lg font-bold text-slate-900 dark:text-white"
                >
                  Delete country flag?
                </h3>

                <p
                  id="delete-modal-description"
                  className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400"
                >
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-slate-900 dark:text-slate-200">
                    "{getLocalizedValue(deleting.name)}"
                  </span>
                  ? Its image and SVG files will be removed too. This action
                  cannot be undone.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDeleting(null)}
                disabled={deletingLoading}
                aria-label="Close delete confirmation"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Actions */}
            <div className="mt-7 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                disabled={deletingLoading}
                className="rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={deletingLoading}
                className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {deletingLoading ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 5.11 COUNTRY FLAG ORDER modal (drag & drop) ===== */}
      {showOrderModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => {
            if (!orderSaving) setShowOrderModal(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="flag-order-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
              <div>
                <h2
                  id="flag-order-title"
                  className="text-xl font-bold text-slate-900 dark:text-white"
                >
                  Arrange Country Flag Order
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Drag country flags to change their display order.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                disabled={orderSaving}
                aria-label="Close order modal"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Instructions */}
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/40">
              <span className="font-semibold">Top = first displayed.</span> Drag
              a row using its handle. Save your changes when finished.
            </div>

            {/* Draggable list */}
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {orderItems.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  No country flags available to arrange.
                </div>
              ) : (
                orderItems.map((item, index) => {
                  const isDragging = String(draggedId) === String(item.id);
                  const thumb = assetUrl(item.thumbnail || item.img || item.svg);

                  return (
                    <div
                      key={item.id}
                      draggable={!orderSaving}
                      onDragStart={(e) => handleOrderDragStart(e, item.id)}
                      onDragOver={handleOrderDragOver}
                      onDrop={(e) => handleOrderDrop(e, item.id)}
                      onDragEnd={() => setDraggedId(null)}
                      className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                        isDragging
                          ? "border-accent-500 bg-accent-50 opacity-50 dark:bg-accent-950/20"
                          : "border-slate-200 bg-white hover:border-accent-300 dark:border-slate-700 dark:bg-slate-900"
                      } ${
                        orderSaving
                          ? "cursor-wait"
                          : "cursor-grab active:cursor-grabbing"
                      }`}
                    >
                      <GripVertical className="h-5 w-5 shrink-0 text-slate-400" />

                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {index + 1}
                      </span>

                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          draggable={false}
                          className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 bg-slate-100 object-contain p-1 dark:border-slate-700 dark:bg-slate-800"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400 dark:bg-slate-800">
                          No img
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {getLocalizedValue(item.name) ||
                            "Unnamed country flag"}
                          {item.native_name && (
                            <span className="ml-2 text-xs font-normal text-slate-400">
                              {item.native_name}
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Current sort number: {item.sort_num ?? 0}
                        </p>
                      </div>

                      <span className="shrink-0 text-xs font-medium text-slate-400">
                        #{index + 1}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 sm:flex-row sm:justify-end dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                disabled={orderSaving}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveOrder}
                disabled={orderSaving || orderItems.length === 0}
                className="flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {orderSaving ? (
                  <>
                    <RotateCcw className="h-4 w-4 animate-spin" />
                    Saving Order...
                  </>
                ) : (
                  <>
                    <ArrowUpDown className="h-4 w-4" />
                    Save Order
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}