import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Lock, RotateCcw, Save, Undo2, ShieldCheck, X } from "lucide-react";
import { accessService } from "../../services/api";
import { tr } from "./Shared.jsx";

/* ---------- small pieces ---------- */
const ALERT_STYLES = {
  success: "bg-green-50 border-green-500 text-green-800 dark:bg-green-950/30 dark:text-green-300",
  error: "bg-red-50 border-red-500 text-red-800 dark:bg-red-950/30 dark:text-red-300",
  warning: "bg-yellow-50 border-yellow-500 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300",
};

function Alert({ type = "success", title, children, onClose, action }) {
  return (
    <div role="alert" className={`relative border-l-4 rounded-r-lg px-4 py-3 ${onClose ? "pr-12" : ""} ${ALERT_STYLES[type]}`}>
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

const sorted = (list = []) => [...list].sort();
const same = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
const labelOf = (value) => {
  const t = tr(value);
  return Array.isArray(t) ? t.join(", ") : t || "";
};

export default function RolePermissions() {
  const [data, setData] = useState(null); // the answer of GET /api/access
  const [draft, setDraft] = useState({}); // { [roleId]: ["pos", "orders", ...] } what is on screen (not saved yet)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState(null);
  const noticeRef = useRef(null);

  const notify = (type, title, message) => setNotice({ id: Date.now(), type, title, message });

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const d = await accessService.get();
      // safety: without byRole every switch would look OFF and a save would wipe the permissions
      if (!d?.byRole) throw new Error("The server is out of date: add byRole to accessMatrix() in server/src/access.js.");
      setData(d);
      setDraft(Object.fromEntries((d.rolesList || []).map((r) => [r.id, [...(d.byRole[r.id] || [])]])));
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

  useEffect(() => {
    if (!notice || notice.type === "error") return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (notice) noticeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [notice]);

  const roles = data?.rolesList || [];

  // active permissions, grouped by module
  const groups = useMemo(() => {
    const map = new Map();
    for (const p of (data?.permissionsList || []).filter((x) => x.status === 1)) {
      const key = p.module || "general";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }
    return [...map];
  }, [data]);
  const assignable = groups.flatMap(([, items]) => items).filter((p) => !p.adminOnly);

  const changedIds = data
    ? roles.filter((r) => r.editable && !same(draft[r.id], data.byRole[r.id])).map((r) => r.id)
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

  const toggle = (role, slug) =>
    setDraft((d) => {
      const list = d[role.id] || [];
      return { ...d, [role.id]: list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug] };
    });

  const setAll = (role, on) =>
    setDraft((d) => ({ ...d, [role.id]: on ? assignable.map((p) => p.slug) : [] }));

  const discard = () => {
    if (!data) return;
    setDraft(Object.fromEntries(roles.map((r) => [r.id, [...(data.byRole[r.id] || [])]])));
  };

  const save = async () => {
    setSaving(true);
    try {
      for (const id of changedIds) await accessService.saveRole(id, draft[id]);
      await load({ silent: true });
      notify(
        "success",
        "Permissions saved",
        `${changedIds.length} role${changedIds.length > 1 ? "s were" : " was"} updated successfully. People who are signed in get the change on their next page load.`,
      );
    } catch (err) {
      notify("error", "Failed to save", err.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const resetStaff = async () => {
    const msg = changedIds.length
      ? "Reset the Staff role to the default permissions? Your unsaved changes will be lost."
      : "Reset the Staff role to the default permissions (Dashboard, POS, Orders)?";
    if (!window.confirm(msg)) return;
    try {
      await accessService.reset();
      await load({ silent: true });
      notify("success", "Staff reset", "The Staff role is back to the default permissions.");
    } catch (err) {
      notify("error", "Failed to reset", err.message || "Something went wrong. Please try again.");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (changedIds.length && !window.confirm("Reload from the database? Your unsaved changes will be lost.")) return;
      const ok = await load({ silent: true });
      if (ok) notify("success", "Refreshed", "Roles and permissions were reloaded from the database.");
    } finally {
      setRefreshing(false);
    }
  };

  const cell = (role, p) => {
    if (role.code === "admin") return <Switch checked disabled label="Admins always have every permission" />;
    if (role.code === "customer") return <Switch checked={false} disabled label="Customers never get dashboard access" />;
    if (p.adminOnly) return <Switch checked={false} disabled label="Only admins can have this permission" />;
    const on = (draft[role.id] || []).includes(p.slug);
    return (
      <Switch
        checked={on}
        onChange={() => toggle(role, p.slug)}
        label={`${on ? "Remove" : "Give"} "${labelOf(p.name) || p.slug}" ${on ? "from" : "to"} ${labelOf(role.title) || role.code}`}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-600" /> Roles &amp; Permissions
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Choose what each role can open in the dashboard. Admin always has everything and Customer never has access.
            Switches change a draft: nothing is saved until you press Save changes.
          </p>
        </div>
        <div className="flex gap-2 self-start">
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
            <RotateCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* unsaved changes bar */}
      {changedIds.length > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 px-4 py-3 shadow-sm">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Unsaved changes in {changedIds.length} role{changedIds.length > 1 ? "s" : ""}.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={discard}
              disabled={saving}
              className="px-3 py-1.5 text-sm rounded-lg border border-amber-300 dark:border-amber-700 flex items-center gap-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/40 disabled:opacity-50"
            >
              <Undo2 className="w-4 h-4" /> Discard
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div ref={noticeRef}>
          <Alert key={notice.id} type={notice.type} title={notice.title} onClose={() => setNotice(null)}>
            {notice.message}
          </Alert>
        </div>
      )}

      {error && (
        <Alert
          type="error"
          title="Could not load roles and permissions"
          action={
            <button type="button" onClick={() => load()} className="ml-2 font-semibold underline">
              Retry
            </button>
          }
        >
          {error}
        </Alert>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="text-left border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4 text-xs uppercase tracking-wider text-slate-500 min-w-64">Permission</th>
              {roles.map((r) => (
                <th key={r.id} className="p-4 text-center align-top min-w-36">
                  <div className="font-bold">{labelOf(r.title) || r.code || `Role #${r.id}`}</div>
                  {r.status === 0 && <div className="text-[11px] font-normal text-slate-400">Hidden role</div>}
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
                      <button type="button" onClick={() => setAll(r, true)} className="text-amber-600 hover:underline">
                        All
                      </button>
                      <span className="mx-1">/</span>
                      <button type="button" onClick={() => setAll(r, false)} className="text-amber-600 hover:underline">
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
                <td className="p-4 text-center text-slate-400" colSpan={roles.length + 1 || 2}>
                  Loading...
                </td>
              </tr>
            )}
            {!loading && !error && groups.length === 0 && (
              <tr>
                <td className="p-4 text-center text-slate-400" colSpan={roles.length + 1 || 2}>
                  No permissions yet. Run npm run db:setup or add them in Permissions.
                </td>
              </tr>
            )}
            {!loading &&
              groups.map(([module, items]) => (
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
                        {labelOf(p.description) && <div className="text-xs text-slate-500">{labelOf(p.description)}</div>}
                        <div className="text-[11px] text-slate-400 font-mono">{p.slug}</div>
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
        A user can also get <b>one extra permission</b> on top of the role (Users → Edit → Extra permission).
        Hidden permissions (status 0) are ignored everywhere.
      </p>
    </div>
  );
}