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
import { rolesService } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { useDateFormat } from "../../utils/useDateFormat.js";
import { useDigits } from "../../utils/digitFormatter";
import { formatDateTime } from "../../utils/dateFormatter";
import CustomSelect from "./CustomSelect";
import Pagination from "./Pagination";
import { inputCls, I18nInput, useList, cleanI18n, bySort } from "./Shared.jsx";

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

// true when at least one language has text
const hasAnyText = (o) =>
  Object.values(parseI18n(o)).some((v) => String(v ?? "").trim());

// first non-empty text of an i18n object (English first)
const firstText = (o) => {
  const obj = parseI18n(o);
  return (
    String(obj.en ?? "").trim() ||
    String(Object.values(obj).find((v) => String(v ?? "").trim()) ?? "").trim()
  );
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
   3. FORM HELPERS (empty form, "nothing changed" check, payload builder)
   ======================================================================== */
const emptyForm = { role_title: {}, description: {}, status: 1, sort_num: 0 };

// the form values for an existing role (used when opening Edit and for the "nothing changed" check)
const formFromRole = (r) => ({
  role_title: parseI18n(r.role_title),
  description: parseI18n(r.description),
  status: r.status,
  sort_num: r.sort_num ?? 0,
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
    role_title: stableTexts(f.role_title),
    description: stableTexts(f.description),
    status: Number(f.status),
    sort_num: Number(f.sort_num) || 0,
  });

// ONE payload builder for every "update" that must keep the other fields
// (status switch, drag order, chevron order). It always sends the full role,
// so a partial update can never clear the title or description.
const buildRolePayload = (item, { status, sortNum } = {}) => ({
  role_title: cleanI18n(parseI18n(item.role_title)),
  description: cleanI18n(parseI18n(item.description)),
  status: Number(status ?? item.status) === 0 ? 0 : 1,
  sort_num: Number(sortNum ?? item.sort_num) || 0,
});

/* ========================================================================
   4. MAIN COMPONENT
   ======================================================================== */
export default function RolesManager() {
  const { language, t } = useLanguage();
  const { date, dateTime } = useDateFormat();
  const formatNum = useDigits();
  const langKey = toLangKey(language);

  // ONE function for every localized text on this page
  const getLocalizedValue = (value) => pickText(value, langKey);

  /* ---------- 4.1 Data ---------- */
  const { list: roles, loading, error, reload } = useList(rolesService.list);

  /* ---------- 4.2 State ---------- */
  const [editing, setEditing] = useState(null); // null | "new" | role
  const [viewing, setViewing] = useState(null); // role shown in the view modal
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | 1 | 0
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // 10 | 20 | 30 | 40 | 50 | 100 | "all"
  const [togglingId, setTogglingId] = useState(null); // role whose status switch is saving

  // delete confirmation
  const [deleting, setDeleting] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  // chevron reordering: moves are kept on screen until "Save order" is pressed
  const [pendingOrder, setPendingOrder] = useState(null); // null | array of role ids (unsaved order)
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
  const closeView = () => setViewing(null);

  // Esc closes the view modal
  useEffect(() => {
    if (!viewing) return;
    const onKey = (e) => {
      if (e.key === "Escape") setViewing(null);
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
    // new role goes to the end of the list by default
    const nextSort =
      roles.reduce((max, r) => Math.max(max, Number(r.sort_num) || 0), 0) + 1;
    setForm({ ...emptyForm, sort_num: nextSort });
    setNotice(null);
    setModalHidden(false);
    setEditing("new");
  };

  const openEdit = (r) => {
    setForm(formFromRole(r));
    setNotice(null);
    setModalHidden(false);
    setEditing(r);
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

    // a title in at least one language is enough (English is not forced)
    if (!hasAnyText(form.role_title))
      return warn("Enter the role title in at least one language.");

    const isNew = editing === "new";
    const itemName = firstText(form.role_title);

    // editing but nothing was touched
    if (!isNew) {
      const changed = fingerprint(form) !== fingerprint(formFromRole(editing));
      if (!changed) {
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
      const payload = buildRolePayload(form);

      if (isNew) await rolesService.create(payload);
      else await rolesService.update(editing.id, payload);

      close();
      await reload();
      notify(
        "success",
        isNew ? "Role added" : "Role updated",
        isNew
          ? `"${itemName}" was added successfully.`
          : `"${itemName}" was updated successfully.`,
      );
    } catch (err) {
      console.error("Error saving role:", err);
      setModalHidden(true);
      notify(
        "error",
        isNew ? "Failed to add the role" : "Failed to update the role",
        err.message || "Something went wrong. Please try again.",
        { returnToForm: true },
      );
    } finally {
      setSaving(false);
    }
  };

  /* ---------- 4.7 Status switch ---------- */
  // sends the full role with the new status, so nothing else is changed
  const toggleStatus = async (r) => {
    const next = Number(r.status) === 1 ? 0 : 1;
    setTogglingId(r.id);
    try {
      await rolesService.update(r.id, buildRolePayload(r, { status: next }));
      await reload();
      notify(
        "success",
        "Role updated",
        next === 1
          ? `"${getLocalizedValue(r.role_title)}" was updated successfully. It is now active.`
          : `"${getLocalizedValue(r.role_title)}" was updated successfully. It is now hidden.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to update the role",
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
      if (ok !== false)
        notify(
          "success",
          "Roles refreshed",
          "The roles were reloaded from the database.",
        );
    } finally {
      setRefreshing(false);
    }
  };

  /* ---------- 4.9 Delete (with confirmation modal) ---------- */
  const handleDelete = (r) => {
    setDeleting(r);
  };

  const confirmDelete = async () => {
    if (!deleting || deletingLoading) return;

    const item = deleting;
    setDeletingLoading(true);

    try {
      await rolesService.remove(item.id);
      setDeleting(null);
      await reload();
      notify(
        "success",
        "Role deleted",
        `"${getLocalizedValue(item.role_title)}" was deleted successfully.`,
      );
    } catch (err) {
      setDeleting(null);
      notify(
        "error",
        "Failed to delete the role",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setDeletingLoading(false);
    }
  };

  /* ---------- 4.10 Filters ---------- */
  const activeFilters = statusFilter !== "all" ? 1 : 0;
  const clearFilters = () => setStatusFilter("all");
  const countBy = (fn) => roles.filter(fn).length;

  /* ---------- 4.11 Order state (saved order + unsaved chevron moves) ---------- */
  // saved order from the database, and the order including unsaved chevron moves
  const baseOrder = [...roles].sort(bySort);
  const baseIndex = new Map(baseOrder.map((x, i) => [String(x.id), i]));

  const orderIds = (() => {
    if (!pendingOrder) return baseOrder.map((x) => x.id);
    const existing = new Set(roles.map((x) => String(x.id)));
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
  const orderSignature = roles.map((r) => `${r.id}:${r.sort_num}`).join("|");
  useEffect(() => {
    setPendingOrder(null);
  }, [orderSignature]);

  /* ---------- 4.12 Sort, search, filter, paginate ---------- */
  const sortedRoles = [...roles].sort((a, b) => {
    switch (sortMode) {
      case "name_asc":
        return getLocalizedValue(a.role_title).localeCompare(
          getLocalizedValue(b.role_title),
          langKey,
          { sensitivity: "base", numeric: true },
        );

      case "name_desc":
        return getLocalizedValue(b.role_title).localeCompare(
          getLocalizedValue(a.role_title),
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

  // search + filters
  const shown = sortedRoles.filter((r) => {
    if (statusFilter !== "all" && Number(r.status) !== statusFilter)
      return false;
    return Object.values(parseI18n(r.role_title))
      .join(" ")
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

  /* ---------- 4.13 Order modal: drag & drop ---------- */
  const openOrderModal = () => {
    // Start with the current database order, not the filtered results.
    setOrderItems([...roles].sort(bySort));
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
      // Save each role's new position using the existing update API.
      for (let index = 0; index < orderItems.length; index++) {
        const item = orderItems[index];
        await rolesService.update(
          item.id,
          buildRolePayload(item, { sortNum: index + 1 }),
        );
      }

      setShowOrderModal(false);
      await reload();

      notify(
        "success",
        "Order saved",
        "The roles display order has been updated successfully.",
      );
    } catch (err) {
      console.error("Failed to save role order:", err);
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

  /* ---------- 4.14 Chevron Up & Down order ---------- */
  // direction: -1 = up, +1 = down. Only changes the screen, nothing is saved yet.
  const moveRole = (r, direction) => {
    if (reorderSaving || sortMode !== "default") return;

    const neighbor = shown[shown.indexOf(r) + direction];
    if (!neighbor) return;

    const next = [...orderIds];
    const a = next.findIndex((id) => String(id) === String(r.id));
    const b = next.findIndex((id) => String(id) === String(neighbor.id));
    if (a === -1 || b === -1) return;
    [next[a], next[b]] = [next[b], next[a]];

    setPendingOrder(next);
  };

  const cancelPendingOrder = () => setPendingOrder(null);

  // the "Save order" button: writes all moves at once (only roles whose number changed)
  const savePendingOrder = async () => {
    if (reorderSaving || !orderDirty) return;

    const byId = new Map(roles.map((x) => [String(x.id), x]));
    const changed = orderIds
      .map((id, i) => ({ item: byId.get(String(id)), sortNum: i + 1 }))
      .filter(({ item, sortNum }) => item && Number(item.sort_num) !== sortNum);

    setReorderSaving(true);
    try {
      for (const { item, sortNum } of changed) {
        await rolesService.update(
          item.id,
          buildRolePayload(item, { sortNum }),
        );
      }
      setPendingOrder(null);
      await reload();
      notify(
        "success",
        "Order saved",
        "The roles display order has been updated successfully.",
      );
    } catch (err) {
      console.error("Failed to save role order:", err);
      notify(
        "error",
        "Failed to save order",
        err.message || "Could not save the order. Please try again.",
      );
      await reload(); // some roles may already have been saved
    } finally {
      setReorderSaving(false);
    }
  };

  /* ---------- 4.15 Excel / CSV export ---------- */
  // readable English date for the files (same in every UI language)
  const exportDate = (v) => (v ? formatDateTime(v, { language: "en" }) : "");

  // Export the complete filtered result, not just the current page.
  const getExportData = () =>
    shown.map((r) => {
      const title = parseI18n(r.role_title);
      const description = parseI18n(r.description);
      return {
        ID: r.id,
        "Sort Order": r.sort_num ?? 0,
        "Role Title": title.en || "",
        "Role Title (Khmer)": title.km || "",
        "Role Title (Chinese)": title.zh || "",
        "Role Title (Lao)": title.lo || "",
        "Role Title (Japanese)": title.ja || "",
        "Role Title (Vietnamese)": title.vi || "",
        Description: description.en || "",
        "Description (Khmer)": description.km || "",
        "Description (Chinese)": description.zh || "",
        "Description (Lao)": description.lo || "",
        "Description (Japanese)": description.ja || "",
        "Description (Vietnamese)": description.vi || "",
        Status: Number(r.status) === 1 ? "Active" : "Hidden",
        "Created At": exportDate(r.created_at),
        "Updated At": exportDate(r.updated_at),
      };
    });

  const exportFileName = (ext) =>
    `roles-${new Date().toISOString().slice(0, 10)}.${ext}`;

  const exportToCSV = () => {
    if (shown.length === 0) {
      notify(
        "warning",
        "Nothing to export",
        "No roles match your current filters.",
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
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    notify(
      "success",
      "CSV exported",
      `${rows.length} role(s) exported successfully.`,
    );
  };

  const exportToExcel = () => {
    if (shown.length === 0) {
      notify(
        "warning",
        "Nothing to export",
        "No roles match your current filters.",
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Roles");
    XLSX.writeFile(workbook, exportFileName("xlsx"));

    notify(
      "success",
      "Excel exported",
      `${rows.length} role(s) exported successfully.`,
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
          <h1 className="text-2xl font-extrabold">Roles Manager</h1>
          <p className="text-sm text-slate-500">
            Manage system roles and permissions titles.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          <button
            type="button"
            onClick={exportToExcel}
            disabled={loading || shown.length === 0}
            title="Export filtered roles to Excel"
            className="px-3 py-2 text-sm rounded-xl border border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400 flex items-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-50 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={exportToCSV}
            disabled={loading || shown.length === 0}
            title="Export filtered roles to CSV"
            className="px-3 py-2 text-sm rounded-xl border border-sky-300 text-sky-700 dark:border-sky-800 dark:text-sky-400 flex items-center gap-2 hover:bg-sky-50 dark:hover:bg-sky-950/30 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>

          <button
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
            onClick={openNew}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-accent-600 hover:bg-accent-700 text-white flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add role
          </button>
        </div>
      </div>

      {/* ===== 5.2 TOOLBAR: search + filters + sort + order ===== */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search roles..."
          className={`${inputCls} sm:max-w-xs`}
        />
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
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
                {t("all")}
              </Chip>
              <Chip
                active={statusFilter === 1}
                onClick={() => setStatusFilter(1)}
              >
                {t("active")} (
                {formatNum(countBy((r) => Number(r.status) === 1))})
              </Chip>
              <Chip
                active={statusFilter === 0}
                onClick={() => setStatusFilter(0)}
              >
                {t("hidden")} (
                {formatNum(countBy((r) => Number(r.status) === 0))})
              </Chip>
            </div>
          </div>

          {activeFilters > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-accent-600 font-medium underline"
            >
              {t("clear_filters")}
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
          title="Could not load the roles"
          action={
            <button onClick={reload} className="ml-2 font-semibold underline">
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
            <b>{formatNum(movedCount)}</b> role(s) moved. The new order is not
            saved yet.
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
              <th className="p-4">Role</th>
              <th className="p-4">Status</th>
              <th className="p-4">Created / Updated</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="p-4 text-center text-slate-400" colSpan={5}>
                  Loading...
                </td>
              </tr>
            )}
            {!loading && shown.length === 0 && (
              <tr>
                <td className="p-4 text-center text-slate-400" colSpan={5}>
                  {roles.length === 0
                    ? "No roles yet."
                    : "No roles match your filters."}
                </td>
              </tr>
            )}
            {!loading &&
              paginatedShown.map((r) => {
                const isActive = Number(r.status) === 1;
                const pos = shown.indexOf(r);
                const reorderLocked = sortMode !== "default" || reorderSaving;
                const isMoved =
                  orderDirty &&
                  baseIndex.get(String(r.id)) !== orderIndex.get(String(r.id));

                return (
                  <tr
                    key={r.id}
                    className={`border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${
                      isMoved ? "bg-accent-50/70 dark:bg-accent-950/20" : ""
                    }`}
                  >
                    {/* sort number */}
                    <td className="p-4 font-medium">
                      {formatNum(Number(r.sort_num) || 0)}
                    </td>

                    {/* title + description */}
                    <td className="p-4">
                      <div className="min-w-0">
                        <div className="font-semibold">
                          {getLocalizedValue(r.role_title)}
                        </div>
                        {getLocalizedValue(r.description) && (
                          <div className="text-xs text-slate-500 truncate max-w-[20rem]">
                            {getLocalizedValue(r.description)}
                          </div>
                        )}
                      </div>
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
                          disabled={togglingId === r.id}
                          label={
                            isActive ? "Hide this role" : "Activate this role"
                          }
                          onChange={() => toggleStatus(r)}
                        />
                      </div>
                    </td>

                    {/* created / updated */}
                    <td className="p-4 text-xs text-slate-400">
                      <div>C: {date(r.created_at)}</div>
                      <div>U: {date(r.updated_at)}</div>
                    </td>

                    {/* actions: chevrons, view, edit, delete */}
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => moveRole(r, -1)}
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
                          onClick={() => moveRole(r, 1)}
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
                          onClick={() => setViewing(r)}
                          title="View"
                          aria-label="View details"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(r)}
                          title="Edit"
                          aria-label="Edit"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r)}
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

      {/* ===== 5.8 VIEW modal (read-only) ===== */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeView}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Role details"
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-lg font-bold">Role details</h3>
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
              {/* title + status */}
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-xl font-extrabold">
                  {getLocalizedValue(viewing.role_title)}
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

              {/* title in all languages */}
              <section className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-accent-600">
                  Role title
                </h5>
                <TextByLang value={viewing.role_title} />
              </section>

              {/* description in all languages */}
              <section className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-accent-600">
                  Description
                </h5>
                <TextByLang value={viewing.description} />
              </section>

              {/* sort order */}
              <section className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-accent-600">
                  Display
                </h5>
                <Field label="Sort order">
                  {formatNum(viewing.sort_num ?? 0)}
                </Field>
              </section>

              {/* dates */}
              <section className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-accent-600">
                  Date
                </h5>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Created">{dateTime(viewing.created_at)}</Field>
                  <Field label="Updated">{dateTime(viewing.updated_at)}</Field>
                </div>
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
                  const r = viewing;
                  closeView();
                  openEdit(r);
                }}
                className="py-2.5 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
            </div>
          </div>
        </div>
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
                {editing === "new" ? "Add role" : "Edit role"}
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
              {/* title + description */}
              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent-600">
                  Role title &amp; description (all languages)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <div className="w-full">
                    <I18nInput
                      expanded
                      required
                      label="Role title"
                      value={form.role_title}
                      onChange={(v) => setField("role_title", v)}
                      placeholder="e.g. Administrator"
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

              {/* status + sort order */}
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
                        onChange={(value) => setField("status", value)}
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
                      onChange={(e) => setField("sort_num", e.target.value)}
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
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white font-semibold transition-colors text-center shadow-sm"
                >
                  {saving ? "Saving..." : "Save role"}
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
                  Delete role?
                </h3>

                <p
                  id="delete-modal-description"
                  className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400"
                >
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-slate-900 dark:text-slate-200">
                    "{getLocalizedValue(deleting.role_title)}"
                  </span>
                  ? This action cannot be undone.
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

      {/* ===== 5.11 ROLE ORDER modal (drag & drop) ===== */}
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
            aria-labelledby="role-order-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
              <div>
                <h2
                  id="role-order-title"
                  className="text-xl font-bold text-slate-900 dark:text-white"
                >
                  Arrange Role Order
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Drag roles to change their display order.
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
                  No roles available to arrange.
                </div>
              ) : (
                orderItems.map((item, index) => {
                  const isDragging = String(draggedId) === String(item.id);

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
                        {formatNum(index + 1)}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {getLocalizedValue(item.role_title) ||
                            "Unnamed role"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Current sort number: {formatNum(item.sort_num ?? 0)}
                        </p>
                      </div>

                      <span className="shrink-0 text-xs font-medium text-slate-400">
                        #{formatNum(index + 1)}
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