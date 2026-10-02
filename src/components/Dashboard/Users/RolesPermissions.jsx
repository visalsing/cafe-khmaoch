import React from "react";
import { Lock, RotateCcw } from "lucide-react";
// import { useAuth } from "../../../context/AuthContext";
import { useUsers, useAccessMatrix } from "../../../hooks/useAdminData";
import { PERMISSIONS, ROLES, ROLE_INFO } from "../../../utils/access";

const Switch = ({ checked, disabled, onChange }) => (
  <button
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-amber-600" : "bg-slate-300 dark:bg-slate-700"} ${
      disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
    }`}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
  </button>
);

// export default function RolesPermissions() {
//   const { users, permissionsFor, setRolePermission, resetAccess } = useAuth();

//   const handleReset = async () => {
//     if (window.confirm("Reset staff permissions to the defaults?")) await resetAccess();
//   };
export default function RolesPermissions() {
  const { users } = useUsers();
  const { matrix, setRolePermission, resetStaff } = useAccessMatrix();
  const permissionsFor = (role) => matrix[role] || [];

  const handleReset = async () => {
    if (window.confirm("Reset staff permissions to the defaults?")) await resetStaff();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Roles & Permissions</h1>
          <p className="text-sm text-slate-500">Choose which dashboard menus each role can open. Changes apply immediately.</p>
        </div>
        <button onClick={handleReset} className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 w-fit">
          <RotateCcw className="w-4 h-4" /> Reset staff
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ROLES.map((role) => (
          <div key={role} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{ROLE_INFO[role].label}</h3>
              <span className="text-xs font-semibold text-slate-500">{users.filter((u) => u.role === role).length} users</span>
            </div>
            <p className="text-sm text-slate-500">{ROLE_INFO[role].desc}</p>
            <p className="text-xs font-semibold text-amber-600">
              {role === "customer" ? "No dashboard menus" : `${permissionsFor(role).length} of ${PERMISSIONS.length} menus`}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4">Dashboard menu</th>
              {ROLES.map((r) => <th key={r} className="p-4 text-center">{ROLE_INFO[r].label}</th>)}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((p) => (
              <tr key={p.key} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                <td className="p-4">
                  <p className="font-semibold">{p.label}</p>
                  <p className="text-xs text-slate-500">{p.desc}</p>
                </td>
                {ROLES.map((role) => {
                  const checked = permissionsFor(role).includes(p.key);
                  const locked = role !== "staff" || p.adminOnly; // admin = always on, customer = always off
                  return (
                    <td key={role} className="p-4">
                      <div className="flex flex-col items-center gap-1">
                        <Switch checked={checked} disabled={locked} onChange={(v) => setRolePermission(role, p.key, v)} />
                        {role === "staff" && p.adminOnly && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Lock className="w-3 h-3" /> Admin only</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Admin always has full access so you can never lock yourself out. Customers have no dashboard access. “Roles & Permissions” is admin-only, because anyone who could edit it could give themselves everything.
      </p>
    </div>
  );
}