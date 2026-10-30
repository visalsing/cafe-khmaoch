import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Lock,
  RotateCcw,
  Save,
  Undo2,
  ShieldCheck,
  X,
  SlidersHorizontal,
  Download,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { accessService } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { inputCls } from "./Shared.jsx";

/* ========================================================================
   1. SMALL UI PIECES (Alert, Chip, Switch)
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

// on/off switch used in every permission cell
function Switch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 disabled:opacity-40 disabled:cursor-not-allowed ${
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

/* ========================================================================
   2. TRANSLATION + COMPARE HELPERS
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
  if (Array.isArray(value)) return value.join(", ");
  const obj = parseI18n(value);
  return (
    obj[langKey] || obj.en || obj.km || Object.values(obj).find(Boolean) || ""
  );
};

// compare two permission lists (same slugs, any order)
const sorted = (list = []) => [...list].sort();
const same = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));

/* ========================================================================
   3. MAIN COMPONENT
   ======================================================================== */
export default function RolePermissions() {
  const { language, t } = useLanguage();
  const langKey = toLangKey(language);

  // ONE function for every localized text on this page
  const labelOf = (value) => pickText(value, langKey);

  /* ---------- 3.1 Data + state ---------- */
  const [data, setData] = useState(null); // the answer of GET /api/access
  const [draft, setDraft] = useState({}); // { [roleId]: ["pos", "orders", ...] } what is on screen (not saved yet)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // search + filters
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [moduleFilter, setModuleFilter] = useState("all"); // "all" | module name

  // confirmation modal: { title, message, confirmLabel, onConfirm }
  const [confirm, setConfirm] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // ALL alerts are shown on the page, between the toolbar and the table
  const [notice, setNotice] = useState(null); // { id, type, title, message }
  const noticeRef = useRef(null);

  /* ---------- 3.2 Alerts (notice) ---------- */
  const notify = (type, title, message) =>
    setNotice({ id: Date.now(), type, title, message });

  // green + yellow alerts disappear by themselves; red ones stay
  useEffect(() => {
    if (!notice || notice.type === "error") return;
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

  /* ---------- 3.3 Load ---------- */
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const d = await accessService.get();
      // safety: without byRole every switch would look OFF and a save would wipe the permissions
      if (!d?.byRole)
        throw new Error(
          "The server is out of date: add byRole to accessMatrix() in server/src/access.js.",
        );
      setData(d);
      setDraft(
        Object.fromEntries(
          (d.rolesList || []).map((r) => [r.id, [...(d.byRole[r.id] || [])]]),
        ),
      );
      setError("");
      return true;
    } catch (err) {
      setError(err.message || "Could not load the roles and permissions.");
      return false;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------- 3.4 Roles, permissions, unsaved changes ---------- */
  const roles = data?.rolesList || [];

  // active permissions, grouped by module
  const groups = useMemo(() => {
    const map = new Map();
    for (const p of (data?.permissionsList || []).filter(
      (x) => x.status === 1,
    )) {
      const key = p.module || "general";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }
    return [...map];
  }, [data]);
  const assignable = groups
    .flatMap(([, items]) => items)
    .filter((p) => !p.adminOnly);

  // roles whose draft is different from what is saved
  const changedIds = data
    ? roles
        .filter((r) => r.editable && !same(draft[r.id], data.byRole[r.id]))
        .map((r) => r.id)
    : [];

  // the browser warns before closing the tab with unsaved changes
  useEffect(() => {
    if (!changedIds.length) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changedIds.length]);

  /* ---------- 3.5 Search + module filter ---------- */
  const activeFilters = moduleFilter !== "all" ? 1 : 0;
  const clearFilters = () => setModuleFilter("all");

  // groups after the module filter and the search
  const shownGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .filter(([module]) => moduleFilter === "all" || module === moduleFilter)
      .map(([module, items]) => [
        module,
        items.filter((p) => {
          if (!q) return true;
          const searchable = [
            module,
            p.slug,
            ...Object.values(parseI18n(p.name)),
            ...Object.values(parseI18n(p.description)),
          ]
            .join(" ")
            .toLowerCase();
          return searchable.includes(q);
        }),
      ])
      .filter(([, items]) => items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, moduleFilter, query]);

  const shownCount = shownGroups.reduce((sum, [, items]) => sum + items.length, 0);

  /* ---------- 3.6 Edit the draft ---------- */
  const toggle = (role, slug) =>
    setDraft((d) => {
      const list = d[role.id] || [];
      return {
        ...d,
        [role.id]: list.includes(slug)
          ? list.filter((s) => s !== slug)
          : [...list, slug],
      };
    });

  // "All" / "None" for one role (all permissions that can be given to it)
  const setAll = (role, on) =>
    setDraft((d) => ({
      ...d,
      [role.id]: on ? assignable.map((p) => p.slug) : [],
    }));

  const discard = () => {
    if (!data) return;
    setDraft(
      Object.fromEntries(
        roles.map((r) => [r.id, [...(data.byRole[r.id] || [])]]),
      ),
    );
  };

  /* ---------- 3.7 Save ---------- */
  const save = async () => {
    setSaving(true);
    try {
      for (const id of changedIds)
        await accessService.saveRole(id, draft[id]);
      await load({ silent: true });
      notify(
        "success",
        "Permissions saved",
        `${changedIds.length} role${changedIds.length > 1 ? "s were" : " was"} updated successfully. People who are signed in get the change on their next page load.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to save",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ---------- 3.8 Confirmation modal (reset staff, refresh with unsaved changes) ---------- */
  const askConfirm = (options) => setConfirm(options);

  const runConfirm = async () => {
    if (!confirm || confirmLoading) return;
    setConfirmLoading(true);
    try {
      await confirm.onConfirm();
    } finally {
      setConfirmLoading(false);
      setConfirm(null);
    }
  };

  const doResetStaff = async () => {
    try {
      await accessService.reset();
      await load({ silent: true });
      notify(
        "success",
        "Staff reset",
        "The Staff role is back to the default permissions.",
      );
    } catch (err) {
      notify(
        "error",
        "Failed to reset",
        err.message || "Something went wrong. Please try again.",
      );
    }
  };

  const resetStaff = () =>
    askConfirm({
      title: "Reset the Staff role?",
      message: changedIds.length
        ? "The Staff role will go back to the default permissions. Your unsaved changes will be lost."
        : "The Staff role will go back to the default permissions (Dashboard, POS, Orders).",
      confirmLabel: "Yes, reset",
      onConfirm: doResetStaff,
    });

  /* ---------- 3.9 Refresh ---------- */
  const doRefresh = async () => {
    setRefreshing(true);
    try {
      const ok = await load({ silent: true });
      if (ok)
        notify(
          "success",
          "Refreshed",
          "Roles and permissions were reloaded from the database.",
        );
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    if (changedIds.length)
      return askConfirm({
        title: "Reload from the database?",
        message: "Your unsaved changes will be lost.",
        confirmLabel: "Yes, reload",
        onConfirm: doRefresh,
      });
    doRefresh();
  };

  /* ---------- 3.10 Excel / CSV export ---------- */
  // Exports the SAVED permissions of the permissions that match the search / filter
  // (unsaved switch changes are not included).
  const getExportData = () => {
    const rows = [];
    for (const [module, items] of shownGroups) {
      for (const p of items) {
        const row = {
          Module: module,
          Permission: pickText(p.name, "en") || p.slug,
          Slug: p.slug,
          Description: pickText(p.description, "en"),
          "Admin only": p.adminOnly ? "Yes" : "No",
        };
        for (const r of roles) {
          const roleName = pickText(r.title, "en") || r.code || `Role #${r.id}`;
          let has;
          if (r.code === "admin") has = true;
          else if (r.code === "customer" || p.adminOnly) has = false;
          else has = (data?.byRole?.[r.id] || []).includes(p.slug);
          row[roleName] = has ? "Yes" : "No";
        }
        rows.push(row);
      }
    }
    return rows;
  };

  const exportFileName = (ext) =>
    `roles-permissions-${new Date().toISOString().slice(0, 10)}.${ext}`;

  const exportToCSV = () => {
    if (shownCount === 0) {
      notify(
        "warning",
        "Nothing to export",
        "No permissions match your current search or filter.",
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
      `${rows.length} permission(s) exported successfully.`,
    );
  };

  const exportToExcel = () => {
    if (shownCount === 0) {
      notify(
        "warning",
        "Nothing to export",
        "No permissions match your current search or filter.",
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Roles & Permissions");
    XLSX.writeFile(workbook, exportFileName("xlsx"));

    notify(
      "success",
      "Excel exported",
      `${rows.length} permission(s) exported successfully.`,
    );
  };

  /* ---------- 3.11 One cell of the matrix ---------- */
  const cell = (role, p) => {
    if (role.code === "admin")
      return <Switch checked disabled label="Admins always have every permission" />;
    if (role.code === "customer")
      return (
        <Switch
          checked={false}
          disabled
          label="Customers never get dashboard access"
        />
      );
    if (p.adminOnly)
      return (
        <Switch
          checked={false}
          disabled
          label="Only admins can have this permission"
        />
      );
    const on = (draft[role.id] || []).includes(p.slug);
    return (
      <Switch
        checked={on}
        onChange={() => toggle(role, p.slug)}
        label={`${on ? "Remove" : "Give"} "${labelOf(p.name) || p.slug}" ${
          on ? "from" : "to"
        } ${labelOf(role.title) || role.code}`}
      />
    );
  };

  /* ========================================================================
     4. RENDER
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

      {/* ===== 4.1 PAGE HEADER: title + Reset / Excel / CSV / Refresh ===== */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-600" /> Roles &amp;
            Permissions
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Choose what each role can open in the dashboard. Admin always has
            everything and Customer never has access. Switches change a draft:
            nothing is saved until you press Save changes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          <button
            type="button"
            onClick={exportToExcel}
            disabled={loading || shownCount === 0}
            title="Export the saved permissions to Excel (unsaved changes are not included)"
            className="px-3 py-2 text-sm rounded-xl border border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400 flex items-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-50 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={exportToCSV}
            disabled={loading || shownCount === 0}
            title="Export the saved permissions to CSV (unsaved changes are not included)"
            className="px-3 py-2 text-sm rounded-xl border border-sky-300 text-sky-700 dark:border-sky-800 dark:text-sky-400 flex items-center gap-2 hover:bg-sky-50 dark:hover:bg-sky-950/30 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={resetStaff}
            disabled={!roles.some((r) => r.code === "staff")}
            className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 hover:border-amber-500 disabled:opacity-50 transition-colors"
          >
            Reset staff to defaults
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
        </div>
      </div>

      {/* ===== 4.2 TOOLBAR: search + module filter ===== */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search permissions..."
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

      {/* ===== 4.3 FILTER PANEL ===== */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-sm">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500">Module</div>
            <div className="flex flex-wrap gap-2">
              <Chip
                active={moduleFilter === "all"}
                onClick={() => setModuleFilter("all")}
              >
                {t("all")}
              </Chip>
              {groups.map(([module, items]) => (
                <Chip
                  key={module}
                  active={moduleFilter === module}
                  onClick={() => setModuleFilter(module)}
                >
                  {module} ({items.length})
                </Chip>
              ))}
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

      {/* ===== 4.4 ALERTS: between the toolbar and the table ===== */}
      {notice && (
        <div ref={noticeRef}>
          <Alert
            key={notice.id}
            type={notice.type}
            title={notice.title}
            onClose={() => setNotice(null)}
          >
            {notice.message}
          </Alert>
        </div>
      )}

      {error && (
        <Alert
          type="error"
          title="Could not load roles and permissions"
          action={
            <button
              type="button"
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

      {/* ===== 4.5 SAVE BAR: appears after changing a switch ===== */}
      {changedIds.length > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 px-4 py-3 shadow-sm">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            <b>{changedIds.length}</b> role{changedIds.length > 1 ? "s" : ""}{" "}
            changed. The new permissions are not saved yet.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={discard}
              disabled={saving}
              className="px-4 py-1.5 text-sm rounded-xl border border-amber-400 font-semibold flex items-center gap-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/40 disabled:opacity-50 transition-colors"
            >
              <Undo2 className="w-4 h-4" /> Discard
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-4 py-1.5 text-sm rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5 disabled:opacity-60 transition-colors"
            >
              {saving ? (
                <RotateCcw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      )}

      {/* ===== 4.6 MATRIX TABLE: permissions (rows) x roles (columns) ===== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="text-left border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4 text-xs uppercase tracking-wider text-slate-500 min-w-64">
                Permission
              </th>
              {roles.map((r) => (
                <th key={r.id} className="p-4 text-center align-top min-w-36">
                  <div className="font-bold">
                    {labelOf(r.title) || r.code || `Role #${r.id}`}
                  </div>
                  {r.status === 0 && (
                    <div className="text-[11px] font-normal text-slate-400">
                      Hidden role
                    </div>
                  )}
                  {r.code === "admin" && (
                    <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                      <Lock className="w-3 h-3" /> Always everything
                    </div>
                  )}
                  {r.code === "customer" && (
                    <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                      <Lock className="w-3 h-3" /> No dashboard
                    </div>
                  )}
                  {r.editable && (
                    <div className="mt-1 text-[11px] font-normal text-slate-500">
                      {(draft[r.id] || []).length} of {assignable.length} on
                      <span className="mx-1">·</span>
                      <button
                        type="button"
                        onClick={() => setAll(r, true)}
                        className="text-amber-600 hover:underline"
                      >
                        All
                      </button>
                      <span className="mx-1">/</span>
                      <button
                        type="button"
                        onClick={() => setAll(r, false)}
                        className="text-amber-600 hover:underline"
                      >
                        None
                      </button>
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  className="p-4 text-center text-slate-400"
                  colSpan={roles.length + 1 || 2}
                >
                  Loading...
                </td>
              </tr>
            )}
            {!loading && !error && groups.length === 0 && (
              <tr>
                <td
                  className="p-4 text-center text-slate-400"
                  colSpan={roles.length + 1 || 2}
                >
                  No permissions yet. Run npm run db:setup or add them in
                  Permissions.
                </td>
              </tr>
            )}
            {!loading && !error && groups.length > 0 && shownCount === 0 && (
              <tr>
                <td
                  className="p-4 text-center text-slate-400"
                  colSpan={roles.length + 1 || 2}
                >
                  No permissions match your filters.
                </td>
              </tr>
            )}
            {!loading &&
              shownGroups.map(([module, items]) => (
                <React.Fragment key={module}>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <td
                      colSpan={roles.length + 1}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-600"
                    >
                      {module}
                    </td>
                  </tr>
                  {items.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-4">
                        <div className="font-semibold">
                          {labelOf(p.name) || p.slug}
                          {p.adminOnly && (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 align-middle">
                              Admin only
                            </span>
                          )}
                        </div>
                        {labelOf(p.description) && (
                          <div className="text-xs text-slate-500">
                            {labelOf(p.description)}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-400 font-mono">
                          {p.slug}
                        </div>
                      </td>
                      {roles.map((r) => (
                        <td key={r.id} className="p-4 text-center">
                          <div className="inline-flex">{cell(r, p)}</div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        A user can also get <b>one extra permission</b> on top of the role (Users
        → Edit → Extra permission). Hidden permissions (status 0) are ignored
        everywhere.
      </p>

      {/* ===== 4.7 CONFIRMATION modal (reset staff / reload with unsaved changes) ===== */}
      {confirm && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => {
            if (!confirmLoading) setConfirm(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            aria-describedby="confirm-modal-description"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            {/* Icon + Heading */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <AlertTriangle className="h-6 w-6" />
              </div>

              <div className="min-w-0 flex-1">
                <h3
                  id="confirm-modal-title"
                  className="text-lg font-bold text-slate-900 dark:text-white"
                >
                  {confirm.title}
                </h3>

                <p
                  id="confirm-modal-description"
                  className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400"
                >
                  {confirm.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setConfirm(null)}
                disabled={confirmLoading}
                aria-label="Close confirmation"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Actions */}
            <div className="mt-7 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                disabled={confirmLoading}
                className="rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={runConfirm}
                disabled={confirmLoading}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {confirmLoading && <RotateCcw className="h-4 w-4 animate-spin" />}
                {confirmLoading ? "Working..." : confirm.confirmLabel || "Yes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}