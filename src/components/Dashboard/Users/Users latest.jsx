
import React, { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Ban,
  CheckCircle2,
  Search,
  Camera,
  Users as UsersIcon,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Filter,
  AlertCircle,
  CheckCircle,
  Info,
  Eye,
  ZoomIn,
} from "lucide-react";

import { useAuth } from "../../../context/AuthContext";
import { useUsers } from "../../../hooks/useAdminData";
import {
  ROLES,
  ROLE_INFO,
  fullName,
  readAvatar,
} from "../../../utils/access";
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
  admin:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  staff:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  customer:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
};

const statusCls = {
  active:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  blocked:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function Alert({ type = "info", children, onClose, action }) {
  const styles = {
    success:
      "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
    error:
      "border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300",
    warning:
      "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
    info:
      "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300",
  };

  const Icon =
    type === "success"
      ? CheckCircle
      : type === "error" || type === "warning"
        ? AlertCircle
        : Info;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border-l-4 p-4 ${styles[type] || styles.info}`}
      role="alert"
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />

      <div className="min-w-0 flex-1 text-sm">
        <div>{children}</div>

        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-2 font-semibold underline underline-offset-2"
          >
            {action.label}
          </button>
        )}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function Chip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
        active
          ? "border-amber-600 bg-amber-600 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-amber-400 hover:text-amber-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

export default function Users() {
  const { currentUser } = useAuth();
  const { users, loading, addUser, updateUser, removeUser } = useUsers();

  const isAdmin = currentUser?.role === "admin";

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);

  // Separate modal for the enlarged profile picture.
  const [profilePhotoModal, setProfilePhotoModal] = useState(null);

  const [alert, setAlert] = useState(null);
  const [alertReturnToForm, setAlertReturnToForm] = useState(false);

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  // Admins can manage everyone. Other staff can manage customers only.
  const canManage = (user) =>
    isAdmin || user.role === "customer";

  const roleOptions = isAdmin ? ROLES : ["customer"];

  const setNotice = (type, message, options = {}) => {
    setAlert({ type, message });
    setAlertReturnToForm(Boolean(options.returnToForm));
  };

  const dismissAlert = () => {
    setAlert(null);
    setAlertReturnToForm(false);
  };

  const openNew = () => {
    dismissAlert();
    setForm({ ...emptyForm });
    setEditing("new");
  };

  const openEdit = (user) => {
    dismissAlert();
    setForm({ ...emptyForm, ...user, password: "" });
    setEditing(user);
  };

  const openView = (user) => {
    dismissAlert();
    setViewing(user);
  };

  const closeView = () => setViewing(null);

  const openProfilePhoto = (src, alt = "Profile photo") => {
    if (!src) return;
    setProfilePhotoModal({ src, alt });
  };

  const closeProfilePhoto = () => {
    setProfilePhotoModal(null);
  };

  const close = () => {
    setEditing(null);
    setForm({ ...emptyForm });
  };

  const onPickPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    try {
      setField("avatar", await readAvatar(file));
      dismissAlert();
    } catch (error) {
      setNotice(
        "error",
        error.message || "Unable to read this image.",
        { returnToForm: true },
      );
    }
  };

  const save = async (event) => {
    event.preventDefault();

    if (!form.firstName.trim()) {
      setNotice("error", "First name is required.", {
        returnToForm: true,
      });
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setNotice("error", "Please enter a valid email address.", {
        returnToForm: true,
      });
      return;
    }

    if (editing === "new" && form.password.length < 8) {
      setNotice("error", "Password must be at least 8 characters.", {
        returnToForm: true,
      });
      return;
    }

    if (
      editing !== "new" &&
      form.password &&
      form.password.length < 8
    ) {
      setNotice("error", "New password must be at least 8 characters.", {
        returnToForm: true,
      });
      return;
    }

    setSaving(true);
    dismissAlert();

    try {
      const data = {
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
      };

      // An empty password means keep the existing password.
      if (!data.password) {
        delete data.password;
      }

      if (editing === "new") {
        await addUser(data);
        setNotice("success", "User created successfully.");
      } else {
        await updateUser(editing.id, data);
        setNotice("success", "User updated successfully.");
      }

      close();
    } catch (error) {
      setNotice(
        "error",
        error.message || "Unable to save this user.",
        { returnToForm: true },
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleBlock = async (user) => {
    const blocking = user.status === "active";

    if (
      blocking &&
      !window.confirm(
        `Block ${fullName(user)}? They will be signed out and cannot sign in.`,
      )
    ) {
      return;
    }

    dismissAlert();

    try {
      await updateUser(user.id, {
        status: blocking ? "blocked" : "active",
      });

      setNotice(
        "success",
        blocking
          ? `${fullName(user)} has been blocked.`
          : `${fullName(user)} has been unblocked.`,
      );
    } catch (error) {
      setNotice(
        "error",
        error.message || "Unable to update user status.",
      );
    }
  };

  const handleDelete = async (user) => {
    if (
      !window.confirm(
        `Delete ${fullName(user)}? This action cannot be undone.`,
      )
    ) {
      return;
    }

    dismissAlert();

    try {
      await removeUser(user.id);
      setNotice("success", `${fullName(user)} has been deleted.`);
    } catch (error) {
      setNotice(
        "error",
        error.message || "Unable to delete this user.",
      );
    }
  };

  const counts = {
    all: users.length,
    admin: users.filter((user) => user.role === "admin").length,
    staff: users.filter((user) => user.role === "staff").length,
    customer: users.filter((user) => user.role === "customer").length,
  };

  const statusCounts = {
    all: users.length,
    active: users.filter((user) => user.status === "active").length,
    blocked: users.filter((user) => user.status === "blocked").length,
  };

  const normalizedQuery = query.trim().toLowerCase();

  const shown = users.filter((user) => {
    const matchesRole =
      roleFilter === "all" || user.role === roleFilter;

    const matchesStatus =
      statusFilter === "all" || user.status === statusFilter;

    const matchesQuery =
      fullName(user).toLowerCase().includes(normalizedQuery) ||
      (user.email || "").toLowerCase().includes(normalizedQuery) ||
      (user.phone || "").toLowerCase().includes(normalizedQuery);

    return matchesRole && matchesStatus && matchesQuery;
  });

  const activeFilterCount =
    (roleFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0);

  const clearFilters = () => {
    setRoleFilter("all");
    setStatusFilter("all");
    setQuery("");
  };

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

  const iconButtonCls =
    "rounded-lg p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <UsersIcon className="h-5 w-5" />
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Users
            </h1>
          </div>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Manage staff and customer accounts, permissions, and account status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              clearFilters();
              dismissAlert();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw className="h-4 w-4" />
            Reset filters
          </button>

          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700"
          >
            <Plus className="h-4 w-4" />
            Add user
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alert && !editing && (
        <Alert
          type={alert.type}
          onClose={dismissAlert}
          action={
            alertReturnToForm
              ? {
                  label: "Back to the form",
                  onClick: () => {
                    setAlert(null);
                    setAlertReturnToForm(false);
                  },
                }
              : undefined
          }
        >
          {alert.message}
        </Alert>
      )}

      {/* Search and filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, email, or phone..."
              className={`${inputCls} pl-10`}
            />
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-amber-400 dark:border-slate-700 dark:text-slate-200"
          >
            <Filter className="h-4 w-4" />
            {filtersOpen ? "Hide filters" : "Show filters"}

            {activeFilterCount > 0 && (
              <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs text-white">
                {activeFilterCount}
              </span>
            )}

            {filtersOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Role chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip
            active={roleFilter === "all"}
            onClick={() => setRoleFilter("all")}
          >
            All users ({counts.all})
          </Chip>

          {ROLES.map((role) => (
            <Chip
              key={role}
              active={roleFilter === role}
              onClick={() => setRoleFilter(role)}
            >
              {ROLE_INFO[role]?.label || role} ({counts[role] || 0})
            </Chip>
          ))}
        </div>

        {filtersOpen && (
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Account status
                </p>

                <div className="flex flex-wrap gap-2">
                  {["all", "active", "blocked"].map((status) => (
                    <Chip
                      key={status}
                      active={statusFilter === status}
                      onClick={() => setStatusFilter(status)}
                    >
                      {status === "all"
                        ? `All statuses (${statusCounts.all})`
                        : `${status[0].toUpperCase()}${status.slice(1)} (${statusCounts[status]})`}
                    </Chip>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={clearFilters}
                className="self-start text-sm font-semibold text-amber-700 hover:text-amber-800 dark:text-amber-400"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results summary */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Showing{" "}
          <span className="font-semibold text-slate-900 dark:text-white">
            {shown.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-900 dark:text-white">
            {users.length}
          </span>{" "}
          users
        </p>
      </div>

      {/* Users table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/50">
              <tr>
                <th className="p-4 font-semibold">User</th>
                <th className="p-4 font-semibold">Phone</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Last login</th>
                <th className="p-4 font-semibold">Joined</th>
                <th className="p-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                      <RefreshCw className="h-6 w-6 animate-spin text-amber-600" />
                      <span className="text-sm">Loading users...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && shown.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="rounded-full bg-slate-100 p-4 text-slate-400 dark:bg-slate-800">
                        <UsersIcon className="h-7 w-7" />
                      </div>

                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          No users found
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Try changing your search or filters.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-sm font-semibold text-amber-700 hover:underline dark:text-amber-400"
                      >
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                shown.map((user) => {
                  const isSelf = user.id === currentUser?.id;

                  return (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {/* Clicking the table avatar opens User Details. */}
                          <button
                            type="button"
                            onClick={() => openView(user)}
                            title="View user details"
                            className="shrink-0 rounded-full transition hover:ring-2 hover:ring-amber-500 hover:ring-offset-2 dark:hover:ring-offset-slate-900"
                          >
                            <Avatar user={user} size={42} />
                          </button>

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900 dark:text-white">
                              {fullName(user) || "Unnamed user"}

                              {isSelf && (
                                <span className="ml-2 text-xs font-semibold text-amber-600">
                                  (you)
                                </span>
                              )}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-slate-600 dark:text-slate-300">
                        {user.phone || "-"}
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            roleCls[user.role] || roleCls.customer
                          }`}
                        >
                          {ROLE_INFO[user.role]?.label || user.role}
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                            statusCls[user.status] || statusCls.active
                          }`}
                        >
                          {user.status || "active"}
                        </span>
                      </td>

                      <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleString()
                          : "Never"}
                      </td>

                      <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "-"}
                      </td>

                      <td className="p-4">
                        {canManage(user) ? (
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openView(user)}
                              title="View user"
                              aria-label={`View ${fullName(user)}`}
                              className={`${iconButtonCls} text-slate-600 dark:text-slate-300`}
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => openEdit(user)}
                              title="Edit user"
                              aria-label={`Edit ${fullName(user)}`}
                              className={`${iconButtonCls} text-slate-600 dark:text-slate-300`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            {!isSelf && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => toggleBlock(user)}
                                  title={
                                    user.status === "active"
                                      ? "Block user"
                                      : "Unblock user"
                                  }
                                  aria-label={
                                    user.status === "active"
                                      ? `Block ${fullName(user)}`
                                      : `Unblock ${fullName(user)}`
                                  }
                                  className={`${iconButtonCls} ${
                                    user.status === "active"
                                      ? "text-amber-600"
                                      : "text-emerald-600"
                                  }`}
                                >
                                  {user.status === "active" ? (
                                    <Ban className="h-4 w-4" />
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4" />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDelete(user)}
                                  title="Delete user"
                                  aria-label={`Delete ${fullName(user)}`}
                                  className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <p className="text-right text-xs text-slate-400">
                            Admin only
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit user modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-[2px] sm:p-6">
          <form
            onSubmit={save}
            className="my-auto flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editing === "new" ? "Add user" : "Edit user"}
                </h3>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {editing === "new"
                    ? "Create a new account."
                    : "Update this user's account information."}
                </p>
              </div>

              <button
                type="button"
                onClick={close}
                disabled={saving}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label="Close form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
              {alert && alertReturnToForm && (
                <Alert type={alert.type} onClose={dismissAlert}>
                  {alert.message}
                </Alert>
              )}

              {/* Avatar */}
              <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <Avatar user={form} size={72} />

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Profile photo
                  </p>

                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold transition hover:border-amber-500 hover:text-amber-700 dark:border-slate-700 dark:hover:text-amber-400">
                    <Camera className="h-4 w-4" />
                    Upload photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onPickPhoto}
                      className="hidden"
                    />
                  </label>

                  {form.avatar && (
                    <button
                      type="button"
                      onClick={() => setField("avatar", "")}
                      className="ml-2 text-xs font-semibold text-rose-500 hover:underline"
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              </div>

              {/* Personal information */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Personal information
                </h4>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      First name *
                    </label>
                    <input
                      className={inputCls}
                      placeholder="Enter first name"
                      value={form.firstName}
                      onChange={(event) =>
                        setField("firstName", event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Last name
                    </label>
                    <input
                      className={inputCls}
                      placeholder="Enter last name"
                      value={form.lastName}
                      onChange={(event) =>
                        setField("lastName", event.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800">
                  Full name:{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {fullName(form) || "-"}
                  </span>
                </div>
              </div>

              {/* Contact information */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Contact information
                </h4>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Email address *
                  </label>
                  <input
                    className={inputCls}
                    type="email"
                    placeholder="name@example.com"
                    value={form.email}
                    onChange={(event) =>
                      setField("email", event.target.value)
                    }
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Phone number
                  </label>
                  <input
                    className={inputCls}
                    type="tel"
                    placeholder="Enter phone number"
                    value={form.phone}
                    onChange={(event) =>
                      setField("phone", event.target.value)
                    }
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {editing === "new" ? "Password *" : "Change password"}
                </label>

                <input
                  className={inputCls}
                  type="password"
                  autoComplete="new-password"
                  placeholder={
                    editing === "new"
                      ? "At least 8 characters"
                      : "Leave blank to keep current password"
                  }
                  value={form.password}
                  onChange={(event) =>
                    setField("password", event.target.value)
                  }
                />

                <p className="text-xs text-slate-500">
                  {editing === "new"
                    ? "Use at least 8 characters."
                    : "Only enter a password if you want to change it."}
                </p>
              </div>

              {/* Role and status */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Account settings
                </h4>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Role
                    </label>

                    <select
                      className={inputCls}
                      value={form.role}
                      onChange={(event) =>
                        setField("role", event.target.value)
                      }
                      disabled={
                        !roleOptions.includes(form.role) &&
                        editing !== "new"
                      }
                    >
                      {(roleOptions.includes(form.role)
                        ? roleOptions
                        : [form.role, ...roleOptions]
                      ).map((role) => (
                        <option key={role} value={role}>
                          {ROLE_INFO[role]?.label || role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Status
                    </label>

                    <select
                      className={inputCls}
                      value={form.status}
                      onChange={(event) =>
                        setField("status", event.target.value)
                      }
                      disabled={
                        editing !== "new" &&
                        editing.id === currentUser?.id
                      }
                    >
                      <option value="active">Active</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={close}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                )}
                {saving
                  ? "Saving..."
                  : editing === "new"
                    ? "Create user"
                    : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View user modal */}
      {viewing && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeView();
          }}
        >
          <div className="my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  User details
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  View account information
                </p>
              </div>

              <button
                type="button"
                onClick={closeView}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close user details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile summary */}
            <div className="space-y-5 p-5 sm:p-6">
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    openProfilePhoto(
                      viewing.avatar,
                      `${fullName(viewing)} profile photo`,
                    )
                  }
                  disabled={!viewing.avatar}
                  title={
                    viewing.avatar
                      ? "Enlarge profile photo"
                      : "No profile photo"
                  }
                  className="group relative shrink-0 rounded-full disabled:cursor-default"
                >
                  <Avatar user={viewing} size={96} />

                  {viewing.avatar && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                      <ZoomIn className="h-6 w-6" />
                    </span>
                  )}
                </button>

                <div className="min-w-0">
                  <h4 className="truncate text-lg font-bold text-slate-900 dark:text-white">
                    {fullName(viewing) || "Unnamed user"}

                    {viewing.id === currentUser?.id && (
                      <span className="ml-2 text-xs font-semibold text-amber-600">
                        (you)
                      </span>
                    )}
                  </h4>

                  <p className="mt-1 break-all text-sm text-slate-500">
                    {viewing.email || "No email"}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        roleCls[viewing.role] || roleCls.customer
                      }`}
                    >
                      {ROLE_INFO[viewing.role]?.label || viewing.role}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                        statusCls[viewing.status] || statusCls.active
                      }`}
                    >
                      {viewing.status || "active"}
                    </span>
                  </div>

                  {viewing.avatar && (
                    <p className="mt-2 text-xs text-slate-400">
                      Click the photo to enlarge
                    </p>
                  )}
                </div>
              </div>

              {/* User details */}
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                {[
                  ["First name", viewing.firstName || "-"],
                  ["Last name", viewing.lastName || "-"],
                  ["Email", viewing.email || "-"],
                  ["Phone", viewing.phone || "-"],
                  [
                    "Role",
                    ROLE_INFO[viewing.role]?.label ||
                      viewing.role ||
                      "-",
                  ],
                  [
                    "Status",
                    viewing.status
                      ? viewing.status[0].toUpperCase() +
                        viewing.status.slice(1)
                      : "Active",
                  ],
                  [
                    "Last login",
                    viewing.lastLoginAt
                      ? new Date(viewing.lastLoginAt).toLocaleString()
                      : "Never",
                  ],
                  [
                    "Joined",
                    viewing.createdAt
                      ? new Date(viewing.createdAt).toLocaleString()
                      : "-",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-1 gap-1 border-b border-slate-100 px-4 py-3 last:border-b-0 dark:border-slate-800 sm:grid-cols-[130px_1fr] sm:gap-4"
                  >
                    <span className="text-xs font-semibold text-slate-500">
                      {label}
                    </span>
                    <span className="break-words text-sm text-slate-800 dark:text-slate-200">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:px-6">
              <button
                type="button"
                onClick={closeView}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Close
              </button>

              {canManage(viewing) && (
                <button
                  type="button"
                  onClick={() => {
                    const user = viewing;
                    closeView();
                    openEdit(user);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  <Pencil className="h-4 w-4" />
                  Edit user
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enlarged profile-picture modal */}
      {profilePhotoModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeProfilePhoto();
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged profile photo"
        >
          <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col items-center">
            <button
              type="button"
              onClick={closeProfilePhoto}
              aria-label="Close enlarged profile photo"
              className="absolute -right-1 -top-12 z-10 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 sm:right-0"
            >
              <X className="h-6 w-6" />
            </button>

            <img
              src={profilePhotoModal.src}
              alt={profilePhotoModal.alt}
              className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />

            <p className="mt-3 max-w-full truncate text-sm text-white/80">
              {profilePhotoModal.alt}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
