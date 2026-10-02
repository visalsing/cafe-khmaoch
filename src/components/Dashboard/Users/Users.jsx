import React, { useState } from "react";
import { Plus, Pencil, Trash2, X, Ban, CheckCircle2, Search, Camera } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useUsers } from "../../../hooks/useAdminData";
import { ROLES, ROLE_INFO, fullName, readAvatar } from "../../../utils/access";
import Avatar from "./Avatar";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "customer",
  status: "active",
  avatar: "",
  password: "",
};

const roleCls = {
  admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  staff: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  customer: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
};
const statusCls = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  blocked: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function Users() {
  const { currentUser } = useAuth();
  const { users, loading, addUser, updateUser, removeUser } = useUsers();
  const isAdmin = currentUser?.role === "admin";

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editing, setEditing] = useState(null); // null | "new" | user
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // admins manage everyone, other staff can only manage customers
  const canManage = (u) => isAdmin || u.role === "customer";
  const roleOptions = isAdmin ? ROLES : ["customer"];

  const openNew = () => {
    setForm({ ...emptyForm });
    setError("");
    setEditing("new");
  };
  const openEdit = (u) => {
    setForm({ ...emptyForm, ...u, password: "" });
    setError("");
    setEditing(u);
  };
  const close = () => setEditing(null);

  const onPickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setField("avatar", await readAvatar(file));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim()) return setError("First name is required.");
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError("Please enter a valid email.");
    if (editing === "new" && form.password.length < 8)
      return setError("Password must be at least 8 characters.");
    if (editing !== "new" && form.password && form.password.length < 8)
      return setError("New password must be at least 8 characters.");

    setSaving(true);
    try {
      const data = {
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
      };
      if (!data.password) delete data.password; // blank = keep the current password

      if (editing === "new") await addUser(data);
      else await updateUser(editing.id, data);
      close();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleBlock = async (u) => {
    const blocking = u.status === "active";
    if (blocking && !window.confirm(`Block ${fullName(u)}? They will be signed out and cannot sign in.`)) return;
    try {
      await updateUser(u.id, { status: blocking ? "blocked" : "active" });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete ${fullName(u)}? This cannot be undone.`)) return;
    try {
      await removeUser(u.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const counts = {
    all: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    staff: users.filter((u) => u.role === "staff").length,
    customer: users.filter((u) => u.role === "customer").length,
  };

  const q = query.toLowerCase();
  const shown = users.filter(
    (u) =>
      (roleFilter === "all" || u.role === roleFilter) &&
      (fullName(u).toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone || "").includes(q))
  );

  const inputCls =
    "w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-amber-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Users</h1>
          <p className="text-sm text-slate-500">Manage staff and customer accounts.</p>
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2 text-sm font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2 w-fit"
        >
          <Plus className="w-4 h-4" /> Add user
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {["all", ...ROLES].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl capitalize ${
                roleFilter === r
                  ? "bg-amber-600 text-white"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {r === "all" ? "All" : ROLE_INFO[r].label} ({counts[r]})
            </button>
          ))}
        </div>
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, phone..."
            className={`${inputCls} pl-9`}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4">User</th>
              <th className="p-4">Phone</th>
              <th className="p-4">Role</th>
              <th className="p-4">Status</th>
              <th className="p-4">Last login</th>
              <th className="p-4">Joined</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="p-6 text-slate-500">Loading...</td>
              </tr>
            )}
            {!loading && shown.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">No users found.</td>
              </tr>
            )}
            {shown.map((u) => {
              const isSelf = u.id === currentUser?.id;
              return (
                <tr key={u.id} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar user={u} size={40} />
                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {fullName(u)}{" "}
                          {isSelf && <span className="text-xs text-amber-600">(you)</span>}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">{u.phone || "-"}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleCls[u.role]}`}>
                      {ROLE_INFO[u.role].label}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusCls[u.status]}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never"}
                  </td>
                  <td className="p-4">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    {canManage(u) ? (
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          title="Edit"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {!isSelf && (
                          <>
                            <button
                              onClick={() => toggleBlock(u)}
                              title={u.status === "active" ? "Block" : "Unblock"}
                              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              {u.status === "active" ? (
                                <Ban className="w-4 h-4 text-amber-600" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(u)}
                              title="Delete"
                              className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="text-right text-xs text-slate-400">Admin only</p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={save}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 my-8"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{editing === "new" ? "Add user" : "Edit user"}</h3>
              <button type="button" onClick={close}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile picture */}
            <div className="flex items-center gap-4">
              <Avatar user={form} size={72} />
              <div className="space-y-1.5">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer hover:border-amber-500">
                  <Camera className="w-4 h-4" /> Upload photo
                  <input type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
                </label>
                {form.avatar && (
                  <button
                    type="button"
                    onClick={() => setField("avatar", "")}
                    className="block text-xs text-rose-500"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                className={inputCls}
                placeholder="First name *"
                value={form.firstName}
                onChange={(e) => setField("firstName", e.target.value)}
              />
              <input
                className={inputCls}
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) => setField("lastName", e.target.value)}
              />
            </div>
            <p className="text-xs text-slate-500">
              Full name: <b>{fullName(form) || "-"}</b>
            </p>

            <input
              className={inputCls}
              type="email"
              placeholder="Email *"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
            />
            <input
              className={inputCls}
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
            />
            <input
              className={inputCls}
              type="password"
              autoComplete="new-password"
              placeholder={
                editing === "new"
                  ? "Password * (min 8 characters)"
                  : "New password (leave blank to keep)"
              }
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Role</label>
                <select
                  className={inputCls}
                  value={form.role}
                  onChange={(e) => setField("role", e.target.value)}
                  disabled={!roleOptions.includes(form.role) && editing !== "new"}
                >
                  {(roleOptions.includes(form.role) ? roleOptions : [form.role, ...roleOptions]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_INFO[r].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Status</label>
                <select
                  className={inputCls}
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                  disabled={editing !== "new" && editing.id === currentUser?.id}
                >
                  <option value="active">Active</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-rose-500">{error}</p>}

            <button
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold"
            >
              {saving ? "Saving..." : "Save user"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}