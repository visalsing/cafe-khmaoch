import React, { useEffect, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  X,
  Check,
  ExternalLink,
  SlidersHorizontal,
  RotateCcw,
  ArrowDownAZ,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";
import { qrService, assetUrl } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { useDateFormat } from "../../utils/useDateFormat.js";
import ImageUpload from "./ImageUpload";
import ImageLightbox from "./ImageLightbox";
import CustomSelect from "./CustomSelect";
import Pagination from "./Pagination";
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
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed ${
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
const emptyForm = { name: {}, description: {}, url: "", status: 1 };
const NO_IMAGE_CHANGE = { file: null, remove: false };

// same rule as the server: empty is fine, otherwise it must be an http(s) link
const isValidUrl = (value) => {
  const s = String(value || "").trim();
  if (!s) return true;
  try {
    return /^https?:$/.test(new URL(s).protocol);
  } catch {
    return false;
  }
};

// the form values for an existing QR (used when opening Edit and for the "nothing changed" check)
const formFromQr = (q) => ({
  name: parseI18n(q.name),
  description: parseI18n(q.description),
  url: q.url || "",
  status: q.status,
});

// comparable version of a form: same value -> same text (ignores key order and extra spaces)
const stableTexts = (o) =>
  Object.fromEntries(
    Object.entries(cleanI18n(parseI18n(o))).sort(([a], [b]) =>
      a.localeCompare(b),
    ),
  );
const fingerprint = (f) =>
  JSON.stringify({
    name: stableTexts(f.name),
    description: stableTexts(f.description),
    url: String(f.url || "").trim(),
    status: Number(f.status),
  });

// ONE FormData builder for every "update without touching the image" case
// (status switch). The URL MUST be sent too, otherwise the server would clear it.
const buildQrFormData = (qr, { status } = {}) => {
  const fd = new FormData();
  fd.append("name", JSON.stringify(cleanI18n(parseI18n(qr.name))));
  fd.append(
    "description",
    JSON.stringify(cleanI18n(parseI18n(qr.description))),
  );
  fd.append("url", String(qr.url || "").trim());
  fd.append("status", String(Number(status ?? qr.status)));
  return fd;
};

/* ========================================================================
   4. MAIN COMPONENT
   ======================================================================== */
export default function QrManagement() {
  const { language, t } = useLanguage();
  const { dateTime } = useDateFormat();
  const langKey = toLangKey(language);

  // ONE function for every localized text on this page
  const getLocalizedValue = (value) => pickText(value, langKey);

  /* ---------- 4.1 Data ---------- */
  const { list: qrs, loading, error, reload } = useList(qrService.list);

  /* ---------- 4.2 State ---------- */
  const [editing, setEditing] = useState(null); // null | "new" | qr
  const [viewing, setViewing] = useState(null); // qr shown in the view modal
  const [lightboxOpen, setLightboxOpen] = useState(false); // full-screen image of the viewed QR
  const [form, setForm] = useState(emptyForm);
  const [imageChange, setImageChange] = useState(NO_IMAGE_CHANGE);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | 1 | 0
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // 10 | 20 | 30 | 40 | 50 | 100
  const [togglingId, setTogglingId] = useState(null); // QR whose status switch is saving
  const [selectingId, setSelectingId] = useState(null); // QR whose "Use this QR" is saving

  // delete confirmation
  const [deleting, setDeleting] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

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
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setLightboxOpen(false);
      setViewing(null);
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
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => {
    setForm(emptyForm);
    setImageChange(NO_IMAGE_CHANGE);
    setNotice(null);
    setModalHidden(false);
    setEditing("new");
  };

  const openEdit = (q) => {
    setForm(formFromQr(q));
    setImageChange(NO_IMAGE_CHANGE);
    setNotice(null);
    setModalHidden(false);
    setEditing(q);
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

    const nameEn = String(parseI18n(form.name).en ?? "").trim();
    if (!nameEn) return warn("The English name is required.");
    if (!isValidUrl(form.url))
      return warn("The URL must start with http:// or https://.");

    const isNew = editing === "new";
    const itemName = nameEn;

    // editing but nothing was touched (no field changed, no image chosen/removed)
    if (!isNew) {
      const textChanged =
        fingerprint(form) !== fingerprint(formFromQr(editing));
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
      // multipart form: text fields + the image file (server makes img + thumbnail from it)
      const fd = new FormData();
      fd.append("name", JSON.stringify(cleanI18n(parseI18n(form.name))));
      fd.append(
        "description",
        JSON.stringify(cleanI18n(parseI18n(form.description))),
      );
      fd.append("url", String(form.url || "").trim());
      fd.append("status", String(Number(form.status)));
      if (imageChange.file)
        fd.append("image", imageChange.file); // field name must be "image"
      else if (imageChange.remove) fd.append("removeImage", "1");

      if (isNew) await qrService.create(fd);
      else await qrService.update(editing.id, fd);

      close();
      await reload();
      notify(
        "success",
        isNew ? "QR code added" : "QR code updated",
        isNew
          ? `"${itemName}" was added successfully.`
          : `"${itemName}" was updated successfully.`,
      );
    } catch (err) {
      console.error("Error saving QR code:", err);
      setModalHidden(true);
      notify(
        "error",
        isNew ? "Failed to add the QR code" : "Failed to update the QR code",
        err.message || "Something went wrong. Please try again.",
        { returnToForm: true },
      );
    } finally {
      setSaving(false);
    }
  };

  /* ---------- 4.7 Status switch ---------- */
  // updates ONLY the status (no image is sent, so the current image is kept; the URL is sent again so it is not cleared)
  const toggleStatus = async (q) => {
    const next = Number(q.status) === 1 ? 0 : 1;
    setTogglingId(q.id);
    try {
      await qrService.update(q.id, buildQrFormData(q, { status: next }));
      await reload();
      notify(
        "success",
        "QR code updated",
        next === 1
          ? `"${getLocalizedValue(q.name)}" was updated successfully. It is now active.`
          : `"${getLocalizedValue(q.name)}" was updated successfully. It is now hidden.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to update the QR code",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setTogglingId(null);
    }
  };

  /* ---------- 4.8 "Use this QR" (shown on the website) ---------- */
  // this one is shown on the website, every other QR is unselected
  const selectQr = async (q) => {
    if (Number(q.status) !== 1 || !q.img)
      return notify(
        "warning",
        "This QR cannot be selected",
        "Only an active QR code with an image can be shown on the website.",
      );
    setSelectingId(q.id);
    try {
      await qrService.select(q.id);
      await reload();
      notify(
        "success",
        "QR code selected",
        `"${getLocalizedValue(q.name)}" is now shown on the website.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to select the QR code",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setSelectingId(null);
    }
  };

  /* ---------- 4.9 Refresh ---------- */
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const ok = await reload();
      if (ok !== false)
        notify(
          "success",
          "QR codes refreshed",
          "The QR codes were reloaded from the database.",
        );
    } finally {
      setRefreshing(false);
    }
  };

  /* ---------- 4.10 Delete (with confirmation modal) ---------- */
  const handleDelete = (q) => {
    // the QR shown on the website cannot be deleted
    if (Number(q.is_selected) === 1)
      return notify(
        "error",
        "Failed to delete the QR code",
        "This QR is shown on the website. Select another QR first.",
      );
    setDeleting(q);
  };

  const confirmDelete = async () => {
    if (!deleting || deletingLoading) return;

    const item = deleting;
    setDeletingLoading(true);

    try {
      await qrService.remove(item.id);
      setDeleting(null);
      await reload();
      notify(
        "success",
        "QR code deleted",
        `"${getLocalizedValue(item.name)}" was deleted successfully.`,
      );
    } catch (err) {
      setDeleting(null);
      notify(
        "error",
        "Failed to delete the QR code",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setDeletingLoading(false);
    }
  };

  /* ---------- 4.11 Filters ---------- */
  const activeFilters = statusFilter !== "all" ? 1 : 0;
  const clearFilters = () => setStatusFilter("all");
  const countBy = (fn) => qrs.filter(fn).length;

  /* ---------- 4.12 Sort, search, filter, paginate ---------- */
  const sortedQrs = [...qrs].sort((a, b) => {
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

      // default = the standard order (QR codes have no sort number)
      default:
        return bySort(a, b);
    }
  });

  // search (name in every language + URL) + filter
  const shown = sortedQrs.filter((q) => {
    if (statusFilter !== "all" && Number(q.status) !== statusFilter)
      return false;
    return `${Object.values(parseI18n(q.name)).join(" ")} ${q.url || ""}`
      .toLowerCase()
      .includes(query.toLowerCase());
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
          ? "bg-amber-50 font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
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
        <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
          Name
        </span>
        <p className="mt-1 font-medium">{getLocalizedValue(viewing.name)}</p>
      </div>
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
          Description
        </span>
        <p className="mt-1 text-slate-300 text-xs leading-relaxed">
          {getLocalizedValue(viewing.description) || "No description provided."}
        </p>
      </div>
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
          URL
        </span>
        <p className="mt-1 text-slate-300 text-xs break-all">
          {viewing.url || "—"}
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

  /* ---------- 4.14 Excel / CSV export ---------- */
  // Export the complete filtered result, not just the current page.
  const getExportData = () =>
    shown.map((q) => {
      const name = parseI18n(q.name);
      const description = parseI18n(q.description);
      return {
        ID: q.id,
        Name: name.en || "",
        "Name (Khmer)": name.km || "",
        "Name (Chinese)": name.zh || "",
        "Name (Lao)": name.lo || "",
        "Name (Japanese)": name.ja || "",
        "Name (Vietnamese)": name.vi || "",
        Description: description.en || "",
        "Description (Khmer)": description.km || "",
        "Description (Chinese)": description.zh || "",
        "Description (Lao)": description.lo || "",
        "Description (Japanese)": description.ja || "",
        "Description (Vietnamese)": description.vi || "",
        URL: q.url || "",
        "Has Image": q.img ? "Yes" : "No",
        Status: Number(q.status) === 1 ? "Active" : "Hidden",
        "Shown On Website": Number(q.is_selected) === 1 ? "Yes" : "No",
        "Created At": q.created_at ?? "",
        "Updated At": q.updated_at ?? "",
      };
    });

  const exportFileName = (ext) =>
    `qr-codes-${new Date().toISOString().slice(0, 10)}.${ext}`;

  const exportToCSV = () => {
    if (shown.length === 0) {
      notify(
        "warning",
        "Nothing to export",
        "No QR codes match your current filters.",
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
      `${rows.length} QR code(s) exported successfully.`,
    );
  };

  const exportToExcel = () => {
    if (shown.length === 0) {
      notify(
        "warning",
        "Nothing to export",
        "No QR codes match your current filters.",
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "QR Codes");
    XLSX.writeFile(workbook, exportFileName("xlsx"));

    notify(
      "success",
      "Excel exported",
      `${rows.length} QR code(s) exported successfully.`,
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
          <h1 className="text-2xl font-extrabold">QR Management</h1>
          <p className="text-sm text-slate-500">
            Upload QR codes and choose the one shown on the website.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          <button
            type="button"
            onClick={exportToExcel}
            disabled={loading || shown.length === 0}
            title="Export filtered QR codes to Excel"
            className="px-3 py-2 text-sm rounded-xl border border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400 flex items-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-50 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={exportToCSV}
            disabled={loading || shown.length === 0}
            title="Export filtered QR codes to CSV"
            className="px-3 py-2 text-sm rounded-xl border border-sky-300 text-sky-700 dark:border-sky-800 dark:text-sky-400 flex items-center gap-2 hover:bg-sky-50 dark:hover:bg-sky-950/30 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>

          <button
            type="button"
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
            type="button"
            onClick={openNew}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add QR code
          </button>
        </div>
      </div>

      {/* ===== 5.2 TOOLBAR: search + filters + sort ===== */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or URL..."
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

        {/* Sort */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSortMenu((v) => !v)}
            aria-expanded={showSortMenu}
            className={`px-4 py-2 text-sm font-medium rounded-xl border flex items-center gap-2 transition-colors ${
              sortMode !== "default"
                ? "border-amber-500 text-amber-600"
                : "border-slate-300 dark:border-slate-700 hover:border-amber-500"
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
                {t("all")}
              </Chip>
              <Chip
                active={statusFilter === 1}
                onClick={() => setStatusFilter(1)}
              >
                Active ({countBy((q) => Number(q.status) === 1)})
              </Chip>
              <Chip
                active={statusFilter === 0}
                onClick={() => setStatusFilter(0)}
              >
                Hidden ({countBy((q) => Number(q.status) === 0)})
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
          title="Could not load the QR codes"
          action={
            <button onClick={reload} className="ml-2 font-semibold underline">
              Retry
            </button>
          }
        >
          {error}
        </Alert>
      )}

      {/* ===== 5.5 TABLE ===== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4">QR code</th>
              <th className="p-4">URL</th>
              <th className="p-4">Status</th>
              <th className="p-4">On website</th>
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
                  {qrs.length === 0
                    ? "No QR codes yet. Click Add QR code to upload one."
                    : "No QR codes match your filters."}
                </td>
              </tr>
            )}
            {!loading &&
              paginatedShown.map((q) => {
                const thumb = assetUrl(q.thumbnail || q.img);
                const isActive = Number(q.status) === 1;
                const isSelected = Number(q.is_selected) === 1;
                const canSelect = isActive && Boolean(q.img);
                return (
                  <tr
                    key={q.id}
                    className={`border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${
                      isSelected ? "bg-amber-50/60 dark:bg-amber-950/10" : ""
                    }`}
                  >
                    {/* image + name */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="w-12 h-12 rounded-lg object-contain bg-white border border-slate-200 dark:border-slate-700"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                            No img
                          </div>
                        )}
                        <span className="font-semibold">
                          {getLocalizedValue(q.name)}
                        </span>
                      </div>
                    </td>

                    {/* URL */}
                    <td className="p-4 text-slate-500 max-w-xs">
                      {q.url ? (
                        <a
                          href={q.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-amber-600 truncate max-w-full"
                          title={q.url}
                        >
                          <span className="truncate">{q.url}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        "—"
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
                          disabled={togglingId === q.id || isSelected}
                          label={
                            isSelected
                              ? "Select another QR before hiding this one"
                              : isActive
                                ? "Hide this QR code"
                                : "Activate this QR code"
                          }
                          onChange={() => toggleStatus(q)}
                        />
                      </div>
                    </td>

                    {/* shown on the website / "Use this QR" */}
                    <td className="p-4">
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 whitespace-nowrap">
                          <Check className="w-3.5 h-3.5" /> Selected
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => selectQr(q)}
                          disabled={!canSelect || selectingId === q.id}
                          title={
                            canSelect
                              ? "Show this QR code on the website"
                              : "Only an active QR code with an image can be selected"
                          }
                          className="px-3 py-1.5 rounded-lg border border-amber-500 text-amber-700 dark:text-amber-400 text-xs font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                        >
                          {selectingId === q.id ? "Saving..." : "Use this QR"}
                        </button>
                      )}
                    </td>

                    {/* created / updated */}
                    <td className="p-4 text-xs text-slate-400">
                      <div>C: {fmtDate(q.created_at)}</div>
                      <div>U: {fmtDate(q.updated_at)}</div>
                    </td>

                    {/* actions: view, edit, delete */}
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setViewing(q)}
                          title="View"
                          aria-label="View details"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(q)}
                          title="Edit"
                          aria-label="Edit"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(q)}
                          title={
                            isSelected
                              ? "Select another QR before deleting this one"
                              : "Delete"
                          }
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

      {/* ===== 5.6 PAGINATION: below the table ===== */}
      <Pagination
        page={currentPage}
        pageSize={pageSize}
        total={shown.length}
        onPage={setPage}
        onPageSize={setPageSize}
      />

      {/* ===== 5.7 VIEW modal (read-only) + full-screen image ===== */}
      {viewing && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closeView}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="QR code details"
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-lg font-bold">QR code details</h3>
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
                {/* image (click = full screen) */}
                {viewing.img ? (
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    aria-label="View image full screen"
                    className="relative group block w-full text-left cursor-zoom-in"
                  >
                    {/* object-contain + white background: a QR must never be cropped */}
                    <img
                      src={assetUrl(viewing.img)}
                      alt=""
                      className="w-full max-h-72 object-contain bg-white rounded-xl border border-slate-200 dark:border-slate-700 transition-transform group-hover:scale-[1.01]"
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

                {/* title + badges */}
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-xl font-extrabold">
                    {getLocalizedValue(viewing.name)}
                  </h4>
                  <div className="flex flex-wrap justify-end gap-2">
                    {Number(viewing.is_selected) === 1 && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 whitespace-nowrap">
                        <Check className="w-3.5 h-3.5" /> Selected
                      </span>
                    )}
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
                </div>

                {/* name in all languages */}
                <section className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    Name
                  </h5>
                  <TextByLang value={viewing.name} />
                </section>

                {/* description in all languages */}
                <section className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    Description
                  </h5>
                  <TextByLang value={viewing.description} />
                </section>

                {/* URL */}
                <section className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    URL
                  </h5>
                  {viewing.url ? (
                    <a
                      href={viewing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-sky-600 hover:underline break-all"
                    >
                      {viewing.url}
                    </a>
                  ) : (
                    <p className="text-slate-400">—</p>
                  )}
                </section>

                {/* dates */}
                <section className="grid grid-cols-2 gap-4">
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
                    const q = viewing;
                    closeView();
                    openEdit(q);
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
              alt={getLocalizedValue(viewing.name)}
              title={getLocalizedValue(viewing.name)}
              info={lightboxInfo}
              infoTitle="QR code details"
              onClose={() => setLightboxOpen(false)}
            />
          )}
        </>
      )}

      {/* ===== 5.8 ADD / EDIT modal ===== */}
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
                {editing === "new" ? "Add QR code" : "Edit QR code"}
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
              {/* QR image */}
              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  QR image
                </h4>
                <ImageUpload
                  key={editing === "new" ? "new" : editing.id}
                  label="QR image"
                  currentUrl={editing === "new" ? "" : assetUrl(editing.img)}
                  onChange={setImageChange}
                />
                <p className="text-xs text-slate-500">
                  Upload the finished QR code as a PNG. Scan it with a phone
                  before you select it for the website.
                </p>
              </section>

              {/* name + description */}
              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Name &amp; description (all languages)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <div className="w-full">
                    <I18nInput
                      expanded
                      required
                      label="Name"
                      value={form.name}
                      onChange={(v) => setField("name", v)}
                      placeholder="e.g. Website QR"
                    />
                  </div>
                  <div className="w-full">
                    <I18nInput
                      expanded
                      multiline
                      label="Description"
                      value={form.description}
                      onChange={(v) => setField("description", v)}
                    />
                  </div>
                </div>
              </section>

              {/* URL + status */}
              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Link &amp; display
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <label className="text-sm text-slate-600 dark:text-slate-400 block w-full">
                    URL (where the QR code points to)
                    <input
                      type="url"
                      value={form.url}
                      onChange={(e) => setField("url", e.target.value)}
                      placeholder="https://cafe-khmaoch.vercel.app/shop"
                      maxLength={500}
                      className={`${inputCls} mt-1`}
                    />
                    <span className="block mt-1 text-xs text-slate-400">
                      Shown next to the QR on the website, with a Copy button.
                    </span>
                  </label>

                  <label className="text-sm text-slate-600 dark:text-slate-400 block w-full">
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
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold transition-colors text-center shadow-sm"
                >
                  {saving ? "Saving..." : "Save QR code"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ===== 5.9 DELETE CONFIRMATION modal ===== */}
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
                  Delete QR code?
                </h3>

                <p
                  id="delete-modal-description"
                  className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400"
                >
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-slate-900 dark:text-slate-200">
                    "{getLocalizedValue(deleting.name)}"
                  </span>
                  ? Its image will be removed too. This action cannot be undone.
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
    </div>
  );
}