import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { useLanguage } from "../../context/LanguageContext.jsx";
import { useDateFormat } from "../../utils/useDateFormat.js";
import { useDigits } from "../../utils/digitFormatter";
import {
  categoryService,
  drinksTypesService,
  productService,
  assetUrl,
} from "../../services/api";
import ImageUpload from "./ImageUpload";
import ImageLightbox from "./ImageLightbox";
import CustomSelect from "./CustomSelect";
import Pagination from "./Pagination";
import {
  inputCls,
  I18nInput,
  useList,
  asList,
  cleanI18n,
  money,
  bySort,
} from "./Shared.jsx";

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
      <div className="text-sm text-slate-800 dark:text-slate-100">
        {children}
      </div>
    </div>
  );
}

const emptyForm = {
  name: {},
  description: {},
  badge: {},
  price: "",
  big_size_price: "",
  small_size_price: "",
  discount_percent: "", // empty = no discount
  tax_percent: "", // empty = store default
  category_id: "",
  type_id: "",
  status: 1,
  sort_num: 0,
};
const NO_IMAGE_CHANGE = { file: null, remove: false };

// "10" -> "10%", empty/null -> "—"
const pctText = (v) =>
  v === null || v === undefined || v === "" ? "—" : `${Number(v)}%`;
// price after a percentage discount, calculated in cents so there are no floating-point surprises
const afterDiscount = (price, pct) =>
  Math.round(
    (Math.round(Number(price) * 100) * (100 - Number(pct || 0))) / 100,
  ) / 100;

// The store's default tax, used when a product has no tax of its own.
// 8% matches the POS today; change it if your default is different.
const STORE_DEFAULT_TAX_PERCENT = 0;

// price with tax added (calculated in cents, so no rounding surprises)
const withTax = (price, pct) =>
  Math.round(
    (Math.round(Number(price) * 100) * (100 + Number(pct || 0))) / 100,
  ) / 100;

// everything the View modal needs about a product's prices
const priceBreakdown = (p) => {
  const discount = Number(p.discount_percent || 0);
  const taxIsDefault =
    p.tax_percent === null ||
    p.tax_percent === undefined ||
    p.tax_percent === "";
  const taxPct = taxIsDefault
    ? STORE_DEFAULT_TAX_PERCENT
    : Number(p.tax_percent);
  const rows = [
    ["Regular", p.price],
    ["Big", p.big_size_price],
    ["Small", p.small_size_price],
  ]
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([label, v]) => {
      const net = afterDiscount(v, discount); // price after discount
      return { label, price: Number(v), net, gross: withTax(net, taxPct) };
    });
  return { discount, taxIsDefault, taxPct, rows };
};

// number input with a "%" at the end
function PercentInput({ value, onChange, placeholder }) {
  return (
    <div className="relative mt-1 w-full">
      <input
        className={`${inputCls} w-full pr-8`}
        type="number"
        min="0"
        max="100"
        step="0.01"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">
        %
      </span>
    </div>
  );
}

// the form values for an existing product (used when opening Edit and for the "nothing changed" check)
const formFromProduct = (p) => ({
  name: p.name || {},
  description: p.description || {},
  badge: p.badge || {},
  price: p.price ?? "",
  big_size_price: p.big_size_price ?? "",
  small_size_price: p.small_size_price ?? "",
  discount_percent:
    Number(p.discount_percent) > 0 ? Number(p.discount_percent) : "",
  tax_percent:
    p.tax_percent === null || p.tax_percent === undefined
      ? ""
      : Number(p.tax_percent),
  category_id: p.category_id ?? "",
  type_id: p.type_id ?? "",
  status: p.status,
  sort_num: p.sort_num ?? 0,
});

// comparable version of a form: same value -> same text (ignores "3" vs "3.00", key order, extra spaces)
const stableTexts = (o) =>
  Object.fromEntries(
    Object.entries(cleanI18n(o)).sort(([a], [b]) => a.localeCompare(b)),
  );
const numOrNull = (v) =>
  v === "" || v === null || v === undefined ? null : Number(v);
const fingerprint = (f) =>
  JSON.stringify({
    name: stableTexts(f.name),
    description: stableTexts(f.description),
    badge: stableTexts(f.badge || {}),
    price: numOrNull(f.price),
    big: numOrNull(f.big_size_price),
    small: numOrNull(f.small_size_price),
    discount: Number(f.discount_percent) || 0,
    tax: numOrNull(f.tax_percent),
    category: numOrNull(f.category_id),
    type: numOrNull(f.type_id),
    status: Number(f.status),
    sort: Number(f.sort_num) || 0,
  });

// price status of a product
const hasDiscount = (p) => Number(p.discount_percent) > 0;
const hasTax = (p) =>
  p.tax_percent !== null &&
  p.tax_percent !== undefined &&
  p.tax_percent !== "" &&
  Number(p.tax_percent) > 0;

const matchesPriceStatus = (p, status) => {
  switch (status) {
    case "normal":
      return !hasDiscount(p) && !hasTax(p);
    case "discount":
      return hasDiscount(p);
    case "tax":
      return hasTax(p);
    default:
      return true; // "all"
  }
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
  if (!value) return "";

  // value may be a JSON string, e.g. '{"en":"Latte","km":"ឡាតេ"}'
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return value;
    }
  }

  if (value && typeof value === "object") {
    return (
      value[langKey] ||
      value.en ||
      value.km ||
      Object.values(value).find(Boolean) ||
      ""
    );
  }

  return String(value ?? "");
};

export default function MenuManager() {
  const { language, t } = useLanguage();
  const { date, dateTime } = useDateFormat();
  const formatNum = useDigits();

  const langKey = toLangKey(language);

  // ONE function for every localized text on this page (replaces tr())
  const getLocalizedValue = (value) => pickText(value, langKey);

  const {
    list: products,
    loading,
    error,
    reload,
  } = useList(productService.list);
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [editing, setEditing] = useState(null); // null | "new" | product
  const [viewing, setViewing] = useState(null); // product shown in the view modal
  const [lightboxOpen, setLightboxOpen] = useState(false); // full-screen image of the viewed product
  const [form, setForm] = useState(emptyForm);
  const [imageChange, setImageChange] = useState(NO_IMAGE_CHANGE);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [catFilter, setCatFilter] = useState("all"); // "all" | category id
  const [typeFilter, setTypeFilter] = useState("all"); // "all" | type id
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | 1 | 0
  const [priceFilter, setPriceFilter] = useState("all"); // "all" | "normal" | "discount" | "tax"
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // 10 | 20 | 30 | 40 | 50 | 100
  const [togglingId, setTogglingId] = useState(null); // product whose status switch is saving

  // chevron reordering: moves are kept on screen until "Save order" is pressed
  const [pendingOrder, setPendingOrder] = useState(null); // null | array of product ids (unsaved order)
  const [reorderSaving, setReorderSaving] = useState(false);

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderItems, setOrderItems] = useState([]);
  const [draggedProductId, setDraggedProductId] = useState(null);
  const [orderSaving, setOrderSaving] = useState(false);

  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortMode, setSortMode] = useState("default");

  // ALL alerts are shown on the page, between the search/filters and the table
  const [notice, setNotice] = useState(null); // { id, type, title, message, returnToForm }
  const [modalHidden, setModalHidden] = useState(false); // form is hidden (not lost) while its alert is shown
  const noticeRef = useRef(null);

  const [deleting, setDeleting] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

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
  }, [query, catFilter, typeFilter, statusFilter, priceFilter, pageSize]);

  const loadLookups = () =>
    Promise.all([
      categoryService
        .list()
        .then((d) => setCategories(asList(d)))
        .catch(() => {}),
      drinksTypesService
        .list()
        .then((d) => setTypes(asList(d)))
        .catch(() => {}),
    ]);

  useEffect(() => {
    loadLookups();
  }, []);

  // the saved order changed (saved here, saved in the Order modal, item added or deleted)
  // -> forget the unsaved chevron moves
  const orderSignature = products.map((p) => `${p.id}:${p.sort_num}`).join("|");
  useEffect(() => {
    setPendingOrder(null);
  }, [orderSignature]);

  // rebuilt whenever the language changes, so the names always follow it
  const catName = useMemo(
    () => new Map(categories.map((c) => [c.id, pickText(c.name, langKey)])),
    [categories, langKey],
  );
  const typeName = useMemo(
    () => new Map(types.map((ty) => [ty.id, pickText(ty.name, langKey)])),
    [types, langKey],
  );

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => {
    setForm({ ...emptyForm, category_id: categories[0]?.id ?? "" });
    setImageChange(NO_IMAGE_CHANGE);
    setNotice(null);
    setModalHidden(false);
    setEditing("new");
  };

  const openEdit = (p) => {
    setForm(formFromProduct(p));
    setImageChange(NO_IMAGE_CHANGE);
    setNotice(null);
    setModalHidden(false);
    setEditing(p);
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

    const prices = [form.price, form.big_size_price, form.small_size_price];
    if (prices.every((v) => v === "" || v === null || v === undefined))
      return warn("Enter at least one price (Price, Big size or Small size).");
    if (prices.some((v) => v !== "" && Number(v) < 0))
      return warn("Prices must be 0 or more.");

    const discount =
      form.discount_percent === "" ? 0 : Number(form.discount_percent);
    if (!(discount >= 0 && discount <= 100))
      return warn("Discount must be a percentage from 0 to 100.");
    if (
      form.tax_percent !== "" &&
      !(Number(form.tax_percent) >= 0 && Number(form.tax_percent) <= 100)
    )
      return warn(
        "Tax must be a percentage from 0 to 100, or empty to use the store default.",
      );

    const isNew = editing === "new";
    if (!form.name.en?.trim()) return warn("The English name is required.");
    if (!form.category_id) return warn("Choose a category.");
    const hasAnyName = Object.values(form.name || {}).some((v) =>
      String(v ?? "").trim(),
    );
    if (!hasAnyName) return warn("Enter the name in at least one language.");

    const itemName =
      form.name.en?.trim() ||
      Object.values(form.name)
        .find((v) => String(v ?? "").trim())
        ?.trim();

    // editing but nothing was touched (no field changed, no image chosen/removed)
    if (!isNew) {
      const textChanged =
        fingerprint(form) !== fingerprint(formFromProduct(editing));
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
      const fd = new FormData();
      fd.append("name", JSON.stringify(cleanI18n(form.name)));
      fd.append("description", JSON.stringify(cleanI18n(form.description)));
      fd.append("badge", JSON.stringify(cleanI18n(form.badge)));
      fd.append("price", String(form.price));
      fd.append("big_size_price", String(form.big_size_price));
      fd.append("small_size_price", String(form.small_size_price));
      fd.append("discount_percent", String(form.discount_percent)); // "" = no discount
      fd.append("tax_percent", String(form.tax_percent)); // "" = store default
      fd.append("category_id", String(form.category_id));
      fd.append("type_id", String(form.type_id));
      fd.append("status", String(Number(form.status)));
      fd.append("sort_num", String(Number(form.sort_num) || 0));
      if (imageChange.file) fd.append("image", imageChange.file);
      else if (imageChange.remove) fd.append("removeImage", "1");

      if (isNew) await productService.create(fd);
      else await productService.update(editing.id, fd);

      close();
      await reload();
      notify(
        "success",
        isNew ? "Item added" : "Item updated",
        isNew
          ? `"${itemName}" was added to the menu successfully.`
          : `"${itemName}" was updated successfully.`,
      );
    } catch (err) {
      console.error("Error saving product:", err);
      setModalHidden(true);
      notify(
        "error",
        isNew ? "Failed to add the item" : "Failed to update the item",
        err.message || "Something went wrong. Please try again.",
        { returnToForm: true },
      );
    } finally {
      setSaving(false);
    }
  };

  // the switch in the Status column: updates ONLY the status (same alerts as Update/Edit)
  const toggleStatus = async (p) => {
    const next = Number(p.status) === 1 ? 0 : 1;
    setTogglingId(p.id);
    try {
      await productService.setStatus(p.id, next);
      await reload();
      notify(
        "success",
        "Item updated",
        next === 1
          ? `"${getLocalizedValue(p.name)}" was updated successfully. It is now on the menu.`
          : `"${getLocalizedValue(p.name)}" was updated successfully. It is now hidden from the menu.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to update the item",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [ok] = await Promise.all([reload(), loadLookups()]);
      if (ok !== false)
        notify(
          "success",
          "Menu refreshed",
          "The menu was reloaded from the database.",
        );
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = (product) => {
    setDeleting(product);
  };

  const confirmDelete = async () => {
    if (!deleting || deletingLoading) return;

    const product = deleting;

    setDeletingLoading(true);

    try {
      await productService.remove(product.id);
      setDeleting(null);

      await reload();

      notify(
        "success",
        "Item deleted",
        `"${getLocalizedValue(product.name)}" was deleted successfully.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to delete the item",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setDeletingLoading(false);
    }
  };

  const activeFilters =
    (catFilter !== "all") +
    (typeFilter !== "all") +
    (statusFilter !== "all") +
    (priceFilter !== "all");

  const clearFilters = () => {
    setCatFilter("all");
    setTypeFilter("all");
    setStatusFilter("all");
    setPriceFilter("all");
  };

  const countBy = (fn) => products.filter(fn).length;

  // saved order from the database, and the order including unsaved chevron moves
  const baseOrder = [...products].sort(bySort);
  const baseIndex = new Map(baseOrder.map((x, i) => [String(x.id), i]));

  const orderIds = (() => {
    if (!pendingOrder) return baseOrder.map((x) => x.id);
    const existing = new Set(products.map((x) => String(x.id)));
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

  const sortedProducts = [...products].sort((a, b) => {
    switch (sortMode) {
      case "name_asc":
        return getLocalizedValue(a.name).localeCompare(
          getLocalizedValue(b.name),
          langKey,
          {
            sensitivity: "base",
            numeric: true,
          },
        );

      case "name_desc":
        return getLocalizedValue(b.name).localeCompare(
          getLocalizedValue(a.name),
          langKey,
          {
            sensitivity: "base",
            numeric: true,
          },
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

      default:
        return (
          (orderIndex.get(String(a.id)) ?? 0) -
          (orderIndex.get(String(b.id)) ?? 0)
        );
    }
  });

  const shown = sortedProducts.filter((p) => {
    if (catFilter !== "all" && p.category_id !== catFilter) return false;
    if (typeFilter !== "all" && p.type_id !== typeFilter) return false;
    if (statusFilter !== "all" && Number(p.status) !== statusFilter)
      return false;
    if (!matchesPriceStatus(p, priceFilter)) return false;
    return Object.values(p.name || {})
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase());
  });

  // pagination: `shown` is the full filtered list
  const totalPages = Math.max(1, Math.ceil(shown.length / pageSize));
  const currentPage = Math.min(page, totalPages); // e.g. deleted the last item of the last page
  const paginatedShown =
    pageSize === "all"
      ? shown
      : shown.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // prices of the product shown in the View modal (new price after discount, price with tax)
  const pb = viewing ? priceBreakdown(viewing) : null;

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
          Description
        </span>
        <p className="mt-1 text-slate-300 text-xs leading-relaxed">
          {getLocalizedValue(viewing.description) || "No description provided."}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
        <div>
          <span className="text-[11px] text-slate-400">Category</span>
          <p className="font-semibold">
            {catName.get(viewing.category_id) || "—"}
          </p>
        </div>
        <div>
          <span className="text-[11px] text-slate-400">Drinks type</span>
          <p className="font-semibold">
            {typeName.get(viewing.type_id) || "—"}
          </p>
        </div>
        <div>
          <span className="text-[11px] text-slate-400">Price</span>
          <p className="font-semibold">{money(viewing.price)}</p>
        </div>
        <div>
          <span className="text-[11px] text-slate-400">Big / Small</span>
          <p className="font-semibold">
            {money(viewing.big_size_price)} / {money(viewing.small_size_price)}
          </p>
        </div>
      </div>
    </div>
  ) : null;

  // ==========================================================================
  const openOrderModal = () => {
    // Start with the current database order, not the filtered results.
    const sortedByOrder = [...products].sort(bySort);

    setOrderItems(sortedByOrder);
    setDraggedProductId(null);
    setShowOrderModal(true);
  };

  const handleOrderDragStart = (e, productId) => {
    setDraggedProductId(productId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(productId));
  };

  const handleOrderDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleOrderDrop = (e, targetProductId) => {
    e.preventDefault();

    const sourceId = draggedProductId ?? e.dataTransfer.getData("text/plain");

    if (
      sourceId === "" ||
      sourceId === null ||
      String(sourceId) === String(targetProductId)
    ) {
      setDraggedProductId(null);
      return;
    }

    setOrderItems((currentItems) => {
      const updated = [...currentItems];

      const fromIndex = updated.findIndex(
        (item) => String(item.id) === String(sourceId),
      );

      const toIndex = updated.findIndex(
        (item) => String(item.id) === String(targetProductId),
      );

      if (fromIndex === -1 || toIndex === -1) return currentItems;

      const [movedItem] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, movedItem);

      return updated;
    });

    setDraggedProductId(null);
  };

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
    return v;
  };

  const saveProductOrder = async () => {
    if (orderSaving) return;

    setOrderSaving(true);

    try {
      // Save each product's new position using the existing update API.
      for (let index = 0; index < orderItems.length; index++) {
        const product = orderItems[index];
        const fd = new FormData();

        // Keep the existing product data while changing its sort_num.
        fd.append("name", JSON.stringify(cleanI18n(parseI18n(product.name))));
        fd.append(
          "description",
          JSON.stringify(cleanI18n(parseI18n(product.description))),
        );
        fd.append("badge", JSON.stringify(cleanI18n(parseI18n(product.badge))));
        fd.append("price", String(product.price ?? ""));
        fd.append("big_size_price", String(product.big_size_price ?? ""));
        fd.append("small_size_price", String(product.small_size_price ?? ""));
        fd.append("discount_percent", String(product.discount_percent ?? ""));
        fd.append("tax_percent", String(product.tax_percent ?? ""));
        fd.append("category_id", String(product.category_id ?? ""));
        fd.append("type_id", String(product.type_id ?? ""));
        fd.append("status", String(Number(product.status)));
        fd.append("sort_num", String(index + 1));

        await productService.update(product.id, fd);
      }

      setShowOrderModal(false);
      await reload();

      notify(
        "success",
        "Order saved",
        "The product display order has been updated successfully.",
      );
    } catch (err) {
      console.error("Failed to save product order:", err);

      notify(
        "error",
        "Failed to save order",
        err.message || "Could not save the product order. Please try again.",
      );

      // Reload because some products might already have been updated.
      await reload();
    } finally {
      setOrderSaving(false);
    }
  };

  // builds the same FormData as the Order modal, with a new sort_num
  const buildSortFormData = (product, sortNum) => {
    const fd = new FormData();
    fd.append("name", JSON.stringify(cleanI18n(parseI18n(product.name))));
    fd.append(
      "description",
      JSON.stringify(cleanI18n(parseI18n(product.description))),
    );
    fd.append("badge", JSON.stringify(cleanI18n(parseI18n(product.badge))));
    fd.append("price", String(product.price ?? ""));
    fd.append("big_size_price", String(product.big_size_price ?? ""));
    fd.append("small_size_price", String(product.small_size_price ?? ""));
    fd.append("discount_percent", String(product.discount_percent ?? ""));
    fd.append("tax_percent", String(product.tax_percent ?? ""));
    fd.append("category_id", String(product.category_id ?? ""));
    fd.append("type_id", String(product.type_id ?? ""));
    fd.append("status", String(Number(product.status)));
    fd.append("sort_num", String(sortNum));
    return fd;
  };

  // ======================= Chivron Up & Down with Order Sort ========================
  // direction: -1 = up, +1 = down. Only changes the screen, nothing is saved yet.
  const moveProduct = (p, direction) => {
    if (reorderSaving || sortMode !== "default") return;

    const neighbor = shown[shown.indexOf(p) + direction];
    if (!neighbor) return;

    const next = [...orderIds];
    const a = next.findIndex((id) => String(id) === String(p.id));
    const b = next.findIndex((id) => String(id) === String(neighbor.id));
    if (a === -1 || b === -1) return;
    [next[a], next[b]] = [next[b], next[a]];

    setPendingOrder(next);
  };

  const cancelPendingOrder = () => setPendingOrder(null);

  // the "Save order" button: writes all moves at once (only products whose number changed)
  const savePendingOrder = async () => {
    if (reorderSaving || !orderDirty) return;

    const byId = new Map(products.map((x) => [String(x.id), x]));
    const changed = orderIds
      .map((id, i) => ({ item: byId.get(String(id)), sortNum: i + 1 }))
      .filter(({ item, sortNum }) => item && Number(item.sort_num) !== sortNum);

    setReorderSaving(true);
    try {
      for (const { item, sortNum } of changed) {
        await productService.update(item.id, buildSortFormData(item, sortNum));
      }
      setPendingOrder(null);
      await reload();
      notify(
        "success",
        "Order saved",
        "The product display order has been updated successfully.",
      );
    } catch (err) {
      console.error("Failed to save product order:", err);
      notify(
        "error",
        "Failed to save order",
        err.message || "Could not save the product order. Please try again.",
      );
      await reload(); // some products may already have been saved
    } finally {
      setReorderSaving(false);
    }
  };

  // ============================ Excecl CSV Export ==========================
  // Export the complete filtered result, not just the current page.
  const getExportData = () =>
    shown.map((p) => ({
      ID: p.id,
      "Sort Order": p.sort_num ?? 0,
      Name: parseI18n(p.name).en || "",
      "Name (Khmer)": parseI18n(p.name).km || "",
      "Name (Chinese)": parseI18n(p.name).zh || "",
      "Name (Lao)": parseI18n(p.name).lo || "",
      "Name (Japanese)": parseI18n(p.name).ja || "",
      "Name (Vietnamese)": parseI18n(p.name).vi || "",
      Description: parseI18n(p.description).en || "",
      "Description (Khmer)": parseI18n(p.description).km || "",
      "Description (Chinese)": parseI18n(p.description).zh || "",
      "Description (Lao)": parseI18n(p.description).lo || "",
      "Description (Japanese)": parseI18n(p.description).ja || "",
      "Description (Vietnamese)": parseI18n(p.description).vi || "",
      Badge: parseI18n(p.badge).en || "",
      "Badge (Khmer)": parseI18n(p.badge).km || "",
      "Regular Price": p.price ?? "",
      "Big Size Price": p.big_size_price ?? "",
      "Small Size Price": p.small_size_price ?? "",
      "Discount (%)": p.discount_percent ?? "",
      "Tax (%)": p.tax_percent ?? "",
      Category: catName.get(p.category_id) || "",
      "Category ID": p.category_id ?? "",
      "Drinks Type": typeName.get(p.type_id) || "",
      "Type ID": p.type_id ?? "",
      Status: Number(p.status) === 1 ? "On menu" : "Hidden",
      "Created At": p.created_at ?? "",
      "Updated At": p.updated_at ?? "",
    }));

  const exportToCSV = () => {
    if (shown.length === 0) {
      notify(
        "warning",
        "Nothing to export",
        "No products match your current filters.",
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
    link.download = `menu-products-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    notify(
      "success",
      "CSV exported",
      `${rows.length} product(s) exported successfully.`,
    );
  };

  const exportToExcel = () => {
    if (shown.length === 0) {
      notify(
        "warning",
        "Nothing to export",
        "No products match your current filters.",
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Menu Products");

    XLSX.writeFile(
      workbook,
      `menu-products-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );

    notify(
      "success",
      "Excel exported",
      `${rows.length} product(s) exported successfully.`,
    );
  };

  const exportToGoogleSheets = async () => {
    if (shown.length === 0) {
      notify(
        "warning",
        "Nothing to export",
        "No products match your current filters.",
      );
      return;
    }

    const rows = getExportData();
    if (rows.length === 0) return;

    try {
      // 1. Convert json rows to 2D array [headers, ...data]
      const headers = Object.keys(rows[0]);
      const values = [
        headers,
        ...rows.map((row) => headers.map((key) => row[key] ?? "")),
      ];

      // 2. Request Access Token (OAuth2)
      const tokenResponse = await new Promise((resolve, reject) => {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
          scope: "https://www.googleapis.com/auth/spreadsheets",
          callback: resolve,
          error_callback: reject,
        });
        client.requestAccessToken();
      });

      if (!tokenResponse.access_token) {
        throw new Error("Failed to acquire access token");
      }

      // 3. Create a new Spreadsheet via API
      const createRes = await fetch(
        "https://sheets.googleapis.com/v4/spreadsheets",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            properties: {
              title: `menu-products-${new Date().toISOString().slice(0, 10)}`,
            },
            sheets: [
              {
                properties: { title: "Menu Products" },
                data: [
                  {
                    startRow: 0,
                    startColumn: 0,
                    rowData: values.map((row) => ({
                      values: row.map((val) => ({
                        userEnteredValue:
                          typeof val === "number"
                            ? { numberValue: val }
                            : { stringValue: String(val) },
                      })),
                    })),
                  },
                ],
              },
            ],
          }),
        },
      );

      const spreadsheetData = await createRes.json();

      // 4. Open the created Google Sheet in a new tab
      window.open(spreadsheetData.spreadsheetUrl, "_blank");

      notify(
        "success",
        "Google Sheets exported",
        `${rows.length} product(s) exported to Google Sheets.`,
      );
    } catch (err) {
      console.error(err);
      notify("error", "Export failed", "Could not export to Google Sheets.");
    }
  };

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
          <h1 className="text-2xl font-extrabold">Menu Manager</h1>
          <p className="text-sm text-slate-500">
            Products you sell. Changes appear on the storefront and POS.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          <button
            type="button"
            onClick={exportToExcel}
            disabled={loading || shown.length === 0}
            title="Export filtered products to Excel"
            className="px-3 py-2 text-sm rounded-xl border border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400 flex items-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-50 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={exportToCSV}
            disabled={loading || shown.length === 0}
            title="Export filtered products to CSV"
            className="px-3 py-2 text-sm rounded-xl border border-sky-300 text-sky-700 dark:border-sky-800 dark:text-sky-400 flex items-center gap-2 hover:bg-sky-50 dark:hover:bg-sky-950/30 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={exportToGoogleSheets}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
          >
            <FileSpreadsheet size={16} />
            Google Sheets
          </button>

          {/* <CustomSelect
            value=""
            onChange={(value) => {
              if (value === "excel") exportToExcel();
              if (value === "csv") exportToCSV();
              if (value === "google-sheets") exportToGoogleSheets();
            }}
            options={[
              { value: "excel", label: "Excel (.xlsx)" },
              { value: "csv", label: "CSV (.csv)" },
              { value: "google-sheets", label: "Google Sheets" },
            ]}
            placeholder="Export"
          /> */}

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
            <Plus className="w-4 h-4" /> Add item
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items..."
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
                ].map(([value, label]) => (
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
                    {sortMode === value && (
                      <span className="float-right">✓</span>
                    )}
                  </button>
                ))}

                <div className="my-2 border-t border-slate-200 dark:border-slate-700" />

                <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Sort by Date Created
                </p>

                {[
                  ["date_newest", "Newest first"],
                  ["date_oldest", "Oldest first"],
                ].map(([value, label]) => (
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
                    {sortMode === value && (
                      <span className="float-right">✓</span>
                    )}
                  </button>
                ))}

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

        <button
          type="button"
          onClick={openOrderModal}
          className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 hover:border-accent-500 hover:text-accent-600 transition-colors"
        >
          <ArrowUpDown className="w-4 h-4" />
          Order
        </button>
      </div>

      {showFilters && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-sm">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500">
              Categories
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip
                active={catFilter === "all"}
                onClick={() => setCatFilter("all")}
              >
                {t("all")}
              </Chip>
              {categories.map((c) => (
                <Chip
                  key={c.id}
                  active={catFilter === c.id}
                  onClick={() => setCatFilter(c.id)}
                >
                  {getLocalizedValue(c.name)} (
                  {countBy((p) => p.category_id === c.id)})
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500">
              Drinks Types
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip
                active={typeFilter === "all"}
                onClick={() => setTypeFilter("all")}
              >
                {t("all")}
              </Chip>
              {types.map((ty) => (
                <Chip
                  key={ty.id}
                  active={typeFilter === ty.id}
                  onClick={() => setTypeFilter(ty.id)}
                >
                  {getLocalizedValue(ty.name)} (
                  {countBy((p) => p.type_id === ty.id)})
                </Chip>
              ))}
            </div>
          </div>

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
                Available ({countBy((p) => Number(p.status) === 1)})
              </Chip>
              <Chip
                active={statusFilter === 0}
                onClick={() => setStatusFilter(0)}
              >
                Hidden ({countBy((p) => Number(p.status) === 0)})
              </Chip>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500">
              Price Status
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip
                active={priceFilter === "all"}
                onClick={() => setPriceFilter("all")}
              >
                {t("all")}
              </Chip>
              <Chip
                active={priceFilter === "normal"}
                onClick={() => setPriceFilter("normal")}
              >
                Normal ({countBy((p) => matchesPriceStatus(p, "normal"))})
              </Chip>
              <Chip
                active={priceFilter === "discount"}
                onClick={() => setPriceFilter("discount")}
              >
                Discount ({countBy(hasDiscount)})
              </Chip>
              <Chip
                active={priceFilter === "tax"}
                onClick={() => setPriceFilter("tax")}
              >
                Tax ({countBy(hasTax)})
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
          title="Could not load the menu"
          action={
            <button onClick={reload} className="ml-2 font-semibold underline">
              Retry
            </button>
          }
        >
          {error}
        </Alert>
      )}

      {/* ===== SAVE BAR: appears after moving rows with the chevrons ===== */}
      {orderDirty && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-300 bg-accent-50 px-4 py-3 text-sm text-accent-800 dark:border-accent-700 dark:bg-accent-950/30 dark:text-accent-300">
          <span>
            <b>{formatNum(movedCount)}</b> item(s) moved. The new order is not
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

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4">#</th>
              <th className="p-4">Item</th>
              <th className="p-4">Category</th>
              <th className="p-4">Type</th>
              <th className="p-4">Price</th>
              <th className="p-4">Big</th>
              <th className="p-4">Small</th>
              <th className="p-4">Discount</th>
              <th className="p-4">Tax</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="p-4 text-center text-slate-400" colSpan={10}>
                  Loading...
                </td>
              </tr>
            )}
            {!loading && shown.length === 0 && (
              <tr>
                <td className="p-4 text-center text-slate-400" colSpan={10}>
                  {products.length === 0
                    ? "No items yet."
                    : "No items match your filters."}
                </td>
              </tr>
            )}
            {!loading &&
              paginatedShown.map((p) => {
                const thumb = assetUrl(p.thumbnail || p.img);
                const pos = shown.indexOf(p);
                const reorderLocked = sortMode !== "default" || reorderSaving;
                const isMoved =
                  orderDirty &&
                  baseIndex.get(String(p.id)) !== orderIndex.get(String(p.id));
                return (
                  <tr
                    key={p.id}
                    className={`border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${
                      isMoved ? "bg-accent-50/70 dark:bg-accent-950/20" : ""
                    }`}
                  >
                    <td className="p-4 font-medium">{Number(p.sort_num)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                            Img
                          </div>
                        )}
                        <span className="font-semibold">
                          {getLocalizedValue(p.name)}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">{catName.get(p.category_id) || "—"}</td>
                    <td className="p-4">{typeName.get(p.type_id) || "—"}</td>
                    <td className="p-4 font-medium">{money(p.price)}</td>
                    <td className="p-4 font-medium">
                      {money(p.big_size_price)}
                    </td>
                    <td className="p-4 font-medium">
                      {money(p.small_size_price)}
                    </td>
                    <td className="p-4">
                      {Number(p.discount_percent) > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 whitespace-nowrap">
                          -{Number(p.discount_percent)}%
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      {p.tax_percent === null || p.tax_percent === undefined ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        pctText(p.tax_percent)
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            Number(p.status) === 1
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {Number(p.status) === 1 ? "On menu" : "Hidden"}
                        </span>
                        <Toggle
                          checked={Number(p.status) === 1}
                          disabled={togglingId === p.id}
                          label={
                            Number(p.status) === 1
                              ? "Hide from the menu"
                              : "Show on the menu"
                          }
                          onChange={() => toggleStatus(p)}
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => moveProduct(p, -1)}
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
                          onClick={() => moveProduct(p, 1)}
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
                          onClick={() => setViewing(p)}
                          title="View"
                          aria-label="View details"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          title="Edit"
                          aria-label="Edit"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
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
              aria-label="Item details"
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-lg font-bold">Item details</h3>
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
                    {Number(viewing.status) === 1 ? "On menu" : "Hidden"}
                  </span>
                </div>

                <section className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-accent-600">
                    Name
                  </h5>
                  <TextByLang value={viewing.name} />
                </section>

                <section className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-accent-600">
                    Description
                  </h5>
                  <TextByLang value={viewing.description} />
                </section>

                {Object.keys(viewing.badge || {}).length > 0 && (
                  <section className="space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-accent-600">
                      Badge
                    </h5>
                    <TextByLang value={viewing.badge} />
                  </section>
                )}

                {/* Details */}
                <section className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Field label="Category">
                    {catName.get(viewing.category_id) || "—"}
                  </Field>
                  <Field label="Drinks type">
                    {typeName.get(viewing.type_id) || "—"}
                  </Field>
                  <Field label="Sort order">
                    {formatNum(viewing.sort_num ?? 0)}
                  </Field>
                </section>

                {/* Price: price, big, small, discount, tax, new price (after discount), with tax */}
                <section className="space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-accent-600">
                    Price
                  </h5>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Discount">
                      {pb.discount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
                          -{pb.discount}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </Field>
                    <Field label="Tax">
                      {pb.taxIsDefault
                        ? `Store default: 0 (${pb.taxPct}%)`
                        : `${pb.taxPct}%`}
                    </Field>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/60">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Size</th>
                          <th className="px-3 py-2 font-semibold">Price</th>
                          <th className="px-3 py-2 font-semibold">
                            New price{" "}
                            <span className="font-normal">
                              (after discount)
                            </span>
                          </th>
                          <th className="px-3 py-2 font-semibold">With tax</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pb.rows.map((r) => (
                          <tr
                            key={r.label}
                            className="border-t border-slate-100 dark:border-slate-800"
                          >
                            <td className="px-3 py-2 font-medium">{r.label}</td>
                            <td className="px-3 py-2">{money(r.price)}</td>
                            <td className="px-3 py-2 font-semibold text-emerald-600">
                              {money(r.net)}
                            </td>
                            <td className="px-3 py-2 font-semibold">
                              {money(r.gross)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Date */}
                <section className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-accent-600">
                    Date
                  </h5>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Created">
                      {dateTime(viewing.created_at)}
                    </Field>
                    <Field label="Updated">
                      {dateTime(viewing.updated_at)}
                    </Field>
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
                    const p = viewing;
                    closeView();
                    openEdit(p);
                  }}
                  className="py-2.5 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-semibold transition-colors flex items-center justify-center gap-2"
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
              infoTitle="Item details"
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
                {editing === "new" ? "Add menu item" : "Edit menu item"}
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent-600">
                  Image
                </h4>
                <ImageUpload
                  key={editing === "new" ? "new" : editing.id}
                  label="Image"
                  currentUrl={editing === "new" ? "" : assetUrl(editing.img)}
                  onChange={setImageChange}
                />
              </section>

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
                      onChange={(v) => setField("name", v)}
                      placeholder="e.g. Iced Latte"
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
                  <div className="w-full">
                    <I18nInput
                      expanded
                      label="Badge"
                      value={form.badge}
                      onChange={(v) => setField("badge", v)}
                      placeholder="e.g. Best Sale"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent-600">
                  Classification
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-sm text-slate-600 dark:text-slate-400 block w-full">
                    Category *
                    <div className="relative mt-1 w-full">
                      <CustomSelect
                        value={form.category_id}
                        onChange={(value) => setField("category_id", value)}
                        placeholder="Choose..."
                        options={categories.map((c) => ({
                          value: c.id,
                          label: getLocalizedValue(c.name),
                        }))}
                      />
                    </div>
                  </label>
                  <label className="text-sm text-slate-600 dark:text-slate-400 block w-full">
                    Drinks type
                    <div className="relative mt-1 w-full">
                      <CustomSelect
                        value={form.type_id}
                        onChange={(value) => setField("type_id", value)}
                        placeholder="None"
                        options={[
                          { value: "", label: "None" },
                          ...types.map((ty) => ({
                            value: ty.id,
                            label: getLocalizedValue(ty.name),
                          })),
                        ]}
                      />
                    </div>
                  </label>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent-600">
                  Pricing
                </h4>
                <p className="text-xs text-slate-500">
                  Fill at least one price. Leave the others empty if not
                  offered.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="text-sm text-slate-600 dark:text-slate-400 block w-full">
                    Price
                    <input
                      className={`${inputCls} mt-1 w-full`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price}
                      onChange={(e) => setField("price", e.target.value)}
                    />
                  </label>
                  <label className="text-sm text-slate-600 dark:text-slate-400 block w-full">
                    Big size price
                    <input
                      className={`${inputCls} mt-1 w-full`}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Not offered"
                      value={form.big_size_price}
                      onChange={(e) =>
                        setField("big_size_price", e.target.value)
                      }
                    />
                  </label>
                  <label className="text-sm text-slate-600 dark:text-slate-400 block w-full">
                    Small size price
                    <input
                      className={`${inputCls} mt-1 w-full`}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Not offered"
                      value={form.small_size_price}
                      onChange={(e) =>
                        setField("small_size_price", e.target.value)
                      }
                    />
                  </label>
                </div>

                {/* Discount and Tax */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-sm text-slate-600 dark:text-slate-400 block w-full">
                    Discount
                    <PercentInput
                      value={form.discount_percent}
                      onChange={(v) => setField("discount_percent", v)}
                      placeholder="0"
                    />
                  </label>
                  <label className="text-sm text-slate-600 dark:text-slate-400 block w-full">
                    Tax
                    <PercentInput
                      value={form.tax_percent}
                      onChange={(v) => setField("tax_percent", v)}
                      placeholder="Store default"
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-500">
                  Type a percentage: <b>10</b> means 10%. The discount applies
                  to every size. Leave Tax empty to use the store's default tax;{" "}
                  <b>0</b> means tax-free.
                </p>
                {Number(form.discount_percent) > 0 && (
                  <p className="text-xs text-emerald-600">
                    After {Number(form.discount_percent)}% discount:{" "}
                    {[
                      ["Price", form.price],
                      ["Big", form.big_size_price],
                      ["Small", form.small_size_price],
                    ]
                      .filter(([, v]) => v !== "" && v !== null)
                      .map(
                        ([label, v]) =>
                          `${label} ${money(afterDiscount(v, form.discount_percent))}`,
                      )
                      .join(" · ")}
                  </p>
                )}
              </section>

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
                          { value: 1, label: "On menu" },
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
                  {saving ? "Saving..." : "Save item"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
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
                  Delete item?
                </h3>

                <p
                  id="delete-modal-description"
                  className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400"
                >
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-slate-900 dark:text-slate-200">
                    "{getLocalizedValue(deleting.name)}"
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

      {/* ===== PRODUCT ORDER MODAL ===== */}
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
            aria-labelledby="product-order-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
              <div>
                <h2
                  id="product-order-title"
                  className="text-xl font-bold text-slate-900 dark:text-white"
                >
                  Arrange Product Order
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Drag products to change their display order.
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

            {/* Draggable product list */}
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {orderItems.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  No products available to arrange.
                </div>
              ) : (
                orderItems.map((product, index) => {
                  const isDragging =
                    String(draggedProductId) === String(product.id);

                  return (
                    <div
                      key={product.id}
                      draggable={!orderSaving}
                      onDragStart={(e) => handleOrderDragStart(e, product.id)}
                      onDragOver={handleOrderDragOver}
                      onDrop={(e) => handleOrderDrop(e, product.id)}
                      onDragEnd={() => setDraggedProductId(null)}
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

                      {product.img ? (
                        <img
                          src={assetUrl(product.img)}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400 dark:bg-slate-800">
                          No img
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {getLocalizedValue(product.name) || "Unnamed product"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Current sort number: {product.sort_num ?? 0}
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
                onClick={saveProductOrder}
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
