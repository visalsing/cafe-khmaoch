import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import {
  categoryService,
  drinksTypesService,
  productService,
  assetUrl,
} from "../../services/api";
import ImageUpload from "./ImageUpload";
import {
  inputCls,
  I18nInput,
  useList,
  asList,
  tr,
  cleanI18n,
  money,
  bySort,
  Pagination,
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

function CustomSelect({ value, onChange, options, placeholder = "Choose..." }) {
  const [open, setOpen] = useState(false);

  const selected = options.find(
    (option) => String(option.value) === String(value),
  );

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("click", close);

    return () => window.removeEventListener("click", close);
  }, []);

  return (
    <div className="relative mt-1 w-full" onClick={(e) => e.stopPropagation()}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`
          ${inputCls}
          w-full
          flex items-center justify-between
          text-left
          cursor-pointer
          bg-white dark:bg-slate-900
          border border-slate-300 dark:border-slate-700
          hover:border-amber-500
          focus:outline-none
          transition-all
          ${open ? "border-amber-600 ring-2 ring-amber-600/20" : ""}
        `}
      >
        <span
          className={
            selected ? "text-slate-800 dark:text-slate-100" : "text-slate-400"
          }
        >
          {selected?.label || placeholder}
        </span>

        <ChevronDown
          className={`
            w-4 h-4
            text-slate-400
            transition-transform duration-200
            ${open ? "rotate-180 text-amber-500" : ""}
          `}
        />
      </button>

      {/* Panel */}
      {open && (
        <div
          className="
            absolute z-50
            mt-1
            w-full
            overflow-hidden
            rounded-xl
            border border-slate-200 dark:border-slate-700
            bg-white dark:bg-slate-900
            shadow-lg
            p-1
          "
        >
          {options.map((option) => {
            const active = String(option.value) === String(value);

            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`
                  w-full
                  px-3 py-2
                  rounded-lg
                  text-sm
                  text-left
                  transition-colors
                  flex items-center justify-between
                  ${
                    active
                      ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-medium"
                      : "text-slate-700 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-amber-700 dark:hover:text-amber-400"
                  }
                `}
              >
                <span>{option.label}</span>

                {active && <span className="text-amber-600">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const emptyForm = {
  name: {},
  description: {},
  price: "",
  big_size_price: "",
  small_size_price: "",
  category_id: "",
  type_id: "",
  status: 1,
  sort_num: 0,
};
const NO_IMAGE_CHANGE = { file: null, remove: false };

// the form values for an existing product (used when opening Edit and for the "nothing changed" check)
const formFromProduct = (p) => ({
  name: p.name || {},
  description: p.description || {},
  price: p.price ?? "",
  big_size_price: p.big_size_price ?? "",
  small_size_price: p.small_size_price ?? "",
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
const numOrNull = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
const fingerprint = (f) =>
  JSON.stringify({
    name: stableTexts(f.name),
    description: stableTexts(f.description),
    price: numOrNull(f.price),
    big: numOrNull(f.big_size_price),
    small: numOrNull(f.small_size_price),
    category: numOrNull(f.category_id),
    type: numOrNull(f.type_id),
    status: Number(f.status),
    sort: Number(f.sort_num) || 0,
  });

export default function MenuManager() {
  const {
    list: products,
    loading,
    error,
    reload,
  } = useList(productService.list);
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [editing, setEditing] = useState(null); // null | "new" | product
  const [form, setForm] = useState(emptyForm);
  const [imageChange, setImageChange] = useState(NO_IMAGE_CHANGE);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [catFilter, setCatFilter] = useState("all"); // "all" | category id
  const [typeFilter, setTypeFilter] = useState("all"); // "all" | type id
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | 1 | 0
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // 10 | 20 | 30 | 40 | 50 | 100
  const [togglingId, setTogglingId] = useState(null); // product whose status switch is saving

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

  // green + yellow alerts disappear by themselves; red ones and "back to the form" ones stay
  useEffect(() => {
    if (!notice || notice.type === "error" || notice.returnToForm) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  // make sure the alert is visible (the page may be scrolled)
  useEffect(() => {
    if (notice)
      noticeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [notice]);

  // search / filters / page size changed -> start again from page 1
  useEffect(() => {
    setPage(1);
  }, [query, catFilter, typeFilter, statusFilter, pageSize]);

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

  const catName = useMemo(
    () => new Map(categories.map((c) => [c.id, tr(c.name)])),
    [categories],
  );
  const typeName = useMemo(
    () => new Map(types.map((t) => [t.id, tr(t.name)])),
    [types],
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
      notify("warning", "Please check the form", message, { returnToForm: true });
    };

    if (!form.name.en?.trim()) return warn("The English name is required.");
    if (!form.category_id) return warn("Choose a category.");

    const prices = [form.price, form.big_size_price, form.small_size_price];
    if (prices.every((v) => v === "" || v === null || v === undefined))
      return warn("Enter at least one price (Price, Big size or Small size).");
    if (prices.some((v) => v !== "" && Number(v) < 0))
      return warn("Prices must be 0 or more.");

    const isNew = editing === "new";
    const itemName = form.name.en.trim();

    // editing but nothing was touched (no field changed, no image chosen/removed)
    if (!isNew) {
      const textChanged = fingerprint(form) !== fingerprint(formFromProduct(editing));
      const imageChanged = Boolean(imageChange.file || imageChange.remove);
      if (!textChanged && !imageChanged) {
        close();
        return notify("warning", "No changes", "There is nothing updated/changed.");
      }
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", JSON.stringify(cleanI18n(form.name)));
      fd.append("description", JSON.stringify(cleanI18n(form.description)));
      fd.append("price", String(form.price));
      fd.append("big_size_price", String(form.big_size_price));
      fd.append("small_size_price", String(form.small_size_price));
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
          ? `"${tr(p.name)}" was updated successfully. It is now on the menu.`
          : `"${tr(p.name)}" was updated successfully. It is now hidden from the menu.`,
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
      if (ok)
        notify("success", "Menu refreshed", "The menu was reloaded from the database.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete "${tr(p.name)}"?`)) return;
    try {
      await productService.remove(p.id);
      await reload();
      notify("success", "Item deleted", `"${tr(p.name)}" was deleted successfully.`);
    } catch (err) {
      notify(
        "error",
        "Failed to delete the item",
        err.message || "Something went wrong. Please try again.",
      );
    }
  };

  const activeFilters =
    (catFilter !== "all") + (typeFilter !== "all") + (statusFilter !== "all");
  const clearFilters = () => {
    setCatFilter("all");
    setTypeFilter("all");
    setStatusFilter("all");
  };

  const countBy = (fn) => products.filter(fn).length;

  const shown = [...products].sort(bySort).filter((p) => {
    if (catFilter !== "all" && p.category_id !== catFilter) return false;
    if (typeFilter !== "all" && p.type_id !== typeFilter) return false;
    if (statusFilter !== "all" && Number(p.status) !== statusFilter)
      return false;
    return Object.values(p.name || {})
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase());
  });

  // pagination: `shown` is the full filtered list, `pageItems` is the current page
  const totalPages = Math.max(1, Math.ceil(shown.length / pageSize));
  const currentPage = Math.min(page, totalPages); // e.g. deleted the last item of the last page
  const pageItems = shown.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

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
        <div className="flex gap-2 self-start">
          <button
            onClick={openNew}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add item
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 hover:border-amber-500 disabled:opacity-60 transition-colors"
          >
            <RotateCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
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
                All
              </Chip>
              {categories.map((c) => (
                <Chip
                  key={c.id}
                  active={catFilter === c.id}
                  onClick={() => setCatFilter(c.id)}
                >
                  {tr(c.name)} ({countBy((p) => p.category_id === c.id)})
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
                All
              </Chip>
              {types.map((t) => (
                <Chip
                  key={t.id}
                  active={typeFilter === t.id}
                  onClick={() => setTypeFilter(t.id)}
                >
                  {tr(t.name)} ({countBy((p) => p.type_id === t.id)})
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
                All
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

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4">Item</th>
              <th className="p-4">Category</th>
              <th className="p-4">Type</th>
              <th className="p-4">Price</th>
              <th className="p-4">Big</th>
              <th className="p-4">Small</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="p-4 text-center text-slate-400" colSpan={8}>
                  Loading...
                </td>
              </tr>
            )}
            {!loading && shown.length === 0 && (
              <tr>
                <td className="p-4 text-center text-slate-400" colSpan={8}>
                  {products.length === 0
                    ? "No items yet."
                    : "No items match your filters."}
                </td>
              </tr>
            )}
            {!loading &&
              pageItems.map((p) => {
                const thumb = assetUrl(p.thumbnail || p.img);
                return (
                  <tr
                    key={p.id}
                    className="border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                  >
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
                        <span className="font-semibold">{tr(p.name)}</span>
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
                          onClick={() => openEdit(p)}
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
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

      {editing && (
        <div className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm items-center justify-center p-4 ${modalHidden ? "hidden" : "flex"}`}>
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
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
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
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
                          label: tr(c.name),
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
                          ...types.map((t) => ({
                            value: t.id,
                            label: tr(t.name),
                          })),
                        ]}
                      />
                    </div>
                  </label>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
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
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
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
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold transition-colors text-center shadow-sm"
                >
                  {saving ? "Saving..." : "Save item"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}