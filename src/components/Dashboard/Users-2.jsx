import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  X,
  SlidersHorizontal,
  RotateCcw,
  Ban,
  CheckCircle,
  Archive,
  ArchiveRestore,
  Users as UsersIcon,
  Mail,
  MailCheck,
  MailWarning,
  UserRoundCog,
  ArrowLeftRight,
} from "lucide-react";
import {
  userService,
  gendersService,
  nationalitiesService,
  rolesService,
  positionsService,
  permissionsService,
  assetUrl,
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ImageUpload from "./ImageUpload";
import ImageLightbox from "./ImageLightbox";
import CustomSelect from "./CustomSelect";
import Pagination from "./Pagination";
import { inputCls, asList, tr, fmtDate } from "./Shared.jsx";

// same base as services/api.js: empty = the same domain (Vite proxy locally, vercel.json rewrite online)
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

// how messages are shown: "modal" = a pop-up with an OK button, "banner" = the bar above the table
const SHOW_NOTICE_AS = "modal";

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

// Several choices from a list: the selected ones show as chips, the list below has checkboxes.
// value = array of ids, onChange receives the new array of ids.
function MultiSelect({ value, onChange, options, placeholder = "None" }) {
  const selected = (value || []).map(Number);

  const toggle = (v) => {
    const n = Number(v);
    onChange(
      selected.includes(n) ? selected.filter((x) => x !== n) : [...selected, n],
    );
  };

  return (
    <div className="mt-1 w-full space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {selected.length === 0 && (
          <span className="text-sm text-slate-400">{placeholder}</span>
        )}
        {selected.map((id) => {
          const opt = options.find((o) => Number(o.value) === id);
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-100 text-accent-800 dark:bg-accent-950/40 dark:text-accent-300 text-xs font-semibold"
            >
              {opt?.label || `#${id}`}
              <button
                type="button"
                onClick={() => toggle(id)}
                aria-label="Remove"
                className="hover:text-rose-600"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
      </div>

      <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
        {options.length === 0 && (
          <p className="p-3 text-sm text-slate-400">No positions available.</p>
        )}
        {options.map((o) => (
          <label
            key={o.value}
            className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <input
              type="checkbox"
              checked={selected.includes(Number(o.value))}
              onChange={() => toggle(o.value)}
              className="accent-accent-600"
            />
            {o.label}
          </label>
        ))}
      </div>
    </div>
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

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-500 mb-0.5">{label}</div>
      <div className="text-sm text-slate-800 dark:text-slate-100 break-words">
        {children}
      </div>
    </div>
  );
}

// "Verified" / "Unverified" pill shown under the email
function VerifiedBadge({ verified }) {
  return (
    <span
      className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${
        verified
          ? "bg-emerald-100 text-emerald-700"
          : "bg-yellow-100 text-yellow-800"
      }`}
    >
      {verified ? (
        <MailCheck className="w-3 h-3" />
      ) : (
        <MailWarning className="w-3 h-3" />
      )}
      {verified ? "Verified" : "Unverified"}
    </span>
  );
}

// pop-up version of a message (used when SHOW_NOTICE_AS is "modal")
function NoticeModal({ notice, onClose, onBackToForm }) {
  if (!notice) return null;

  const styles = {
    success: {
      icon: CheckCircle,
      color: "text-emerald-600 bg-emerald-100",
      heading: "Completed successfully",
    },
    error: {
      icon: Ban,
      color: "text-rose-600 bg-rose-100",
      heading: "Something went wrong",
    },
    warning: {
      icon: MailWarning,
      color: "text-accent-600 bg-accent-100",
      heading: "Please review",
    },
  };

  const style = styles[notice.type] || styles.success;
  const Icon = style.icon;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="notice-title"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <h3 id="notice-title" className="text-lg font-bold">
            {notice.title || "Notification"}
          </h3>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close notification"
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-start gap-4 p-6">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${style.color}`}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-semibold">{style.heading}</p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600 dark:text-slate-300">
              {notice.message}
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800 sm:flex-row sm:justify-end">
          {notice.returnToForm && (
            <button
              type="button"
              onClick={onBackToForm}
              className="rounded-xl border border-slate-300 px-5 py-2.5 font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Back to the form
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-accent-600 px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-accent-700"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

const fmtDateTime = (v) => (v ? new Date(v).toLocaleString() : "—");
const EMAIL_RE = /^\S+@\S+\.\S+$/;

/* ---------- the API row -> one clean shape ----------
   Accepts camelCase (firstName) or snake_case (first_name) keys, so the page keeps
   working whichever one publicUser() returns. */
const pick = (o, ...keys) => {
  for (const k of keys)
    if (o?.[k] !== undefined && o?.[k] !== null) return o[k];
  return undefined;
};
const toBit = (v, fallback) => {
  if (v === true || v === 1 || v === "1" || v === "true" || v === "active")
    return 1;
  if (
    v === false ||
    v === 0 ||
    v === "0" ||
    v === "false" ||
    v === "inactive" ||
    v === "blocked"
  )
    return 0;
  return fallback;
};
// the positions of a user: always an array of numbers (also reads a single old positionId)
const toIdList = (u) => {
  const raw = pick(u, "positionIds", "position_ids");
  if (Array.isArray(raw)) return raw.map(Number).filter(Number.isFinite);
  const single = pick(u, "positionId", "position_id");
  return single !== undefined && single !== "" ? [Number(single)] : [];
};
const normalizeUser = (u) => ({
  id: u.id,
  firstName: pick(u, "firstName", "first_name") ?? "",
  lastName: pick(u, "lastName", "last_name") ?? "",
  firstNameNative: pick(u, "firstNameNative", "first_name_native") ?? "",
  lastNameNative: pick(u, "lastNameNative", "last_name_native") ?? "",
  email: pick(u, "email") ?? "",
  phone: pick(u, "phone") ?? "",
  role: pick(u, "role", "roleCode", "role_code") ?? "",
  roleId: pick(u, "roleId", "role_id") ?? "",
  genderId: pick(u, "genderId", "gender_id") ?? "",
  nationalityId: pick(u, "nationalityId", "nationality_id") ?? "",
  positionIds: toIdList(u),
  permissionId: pick(u, "permissionId", "permission_id") ?? "",
  address: pick(u, "address") ?? "",
  region: pick(u, "region") ?? "",
  country: pick(u, "country") ?? "",
  description: pick(u, "description") ?? "",
  status: toBit(pick(u, "status"), 1),
  isFullname: toBit(pick(u, "isFullname", "is_fullname"), 1),
  isNfullname: toBit(pick(u, "isNfullname", "is_nfullname"), 1),
  isBlocked: toBit(pick(u, "isBlocked", "is_blocked"), 0),
  isRemoved: toBit(pick(u, "isRemoved", "is_removed"), 0),
  isVerifiedEmail: toBit(pick(u, "isVerifiedEmail", "is_verified_email"), 0),
  emailVerifiedAt: pick(u, "emailVerifiedAt", "email_verified_at"),
  avatar: pick(u, "avatar") ?? "",
  avatarThumbnail: pick(u, "avatarThumbnail", "avatar_thumbnail") ?? "",
  createdAt: pick(u, "createdAt", "created_at"),
  updatedAt: pick(u, "updatedAt", "updated_at"),
  lastLoginAt: pick(u, "lastLoginAt", "last_login_at"),
  removedAt: pick(u, "removedAt", "removed_at"),
});

/* ---------- name order (display only, saved in this browser) ---------- */
const joinName = (first, last, order) =>
  (order === 1 ? `${first} ${last}` : `${last} ${first}`)
    .replace(/\s+/g, " ")
    .trim();

// Each user has their own saved name order.
const fullName = (u) =>
  joinName(u.firstName, u.lastName, toBit(u.isFullname, 1));

const nativeName = (u) =>
  joinName(u.firstNameNative, u.lastNameNative, toBit(u.isNfullname, 1));

// text of a translated field; position titles are lists ({"en": ["Owner", "Manager"]})
const labelOf = (value) => {
  const t = tr(value);
  return Array.isArray(t) ? t.join(", ") : t || "";
};

const ROLE_BADGE = {
  admin: "bg-accent-100 text-accent-800",
  staff: "bg-sky-100 text-sky-700",
  customer: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};
const FALLBACK_ROLES = [
  { code: "customer", label: "Customer" },
  { code: "staff", label: "Staff" },
  { code: "admin", label: "Admin" },
];

/* ---------- form helpers ---------- */
const emptyForm = {
  firstName: "",
  lastName: "",
  firstNameNative: "",
  lastNameNative: "",
  email: "",
  phone: "",
  password: "",
  roleId: "",
  genderId: "",
  nationalityId: "",
  positionIds: [],
  permissionId: "",
  address: "",
  region: "",
  country: "",
  description: "",
  status: 1,
  isBlocked: 0,
  isFullname: 1,
  isNfullname: 1,
};
const NO_IMAGE_CHANGE = { file: null, remove: false };

// the form values for an existing user (used when opening Edit and for the "nothing changed" check)
const formFromUser = (u) => ({
  firstName: u.firstName,
  lastName: u.lastName,
  firstNameNative: u.firstNameNative,
  lastNameNative: u.lastNameNative,
  email: u.email,
  phone: u.phone,
  password: "", // left empty unless the password is changed
  roleId: u.roleId,
  genderId: u.genderId,
  nationalityId: u.nationalityId,
  positionIds: [...u.positionIds],
  permissionId: u.permissionId,
  address: u.address,
  region: u.region,
  country: u.country,
  description: u.description,
  status: u.status,
  isBlocked: u.isBlocked,
  isFullname: u.isFullname,
  isNfullname: u.isNfullname,
});

const idOrNull = (v) =>
  v === "" || v === null || v === undefined ? null : Number(v);
const fingerprint = (f) =>
  JSON.stringify({
    firstName: f.firstName.trim(),
    lastName: f.lastName.trim(),
    firstNameNative: f.firstNameNative.trim(),
    lastNameNative: f.lastNameNative.trim(),
    email: f.email.trim().toLowerCase(),
    phone: f.phone.trim(),
    password: f.password,
    roleId: String(f.roleId ?? ""),
    gender: idOrNull(f.genderId),
    nationality: idOrNull(f.nationalityId),
    // the order the positions were ticked in is not a change
    positions: [...f.positionIds].map(Number).sort((a, b) => a - b),
    permission: idOrNull(f.permissionId),
    address: f.address.trim(),
    region: f.region.trim(),
    country: f.country.trim(),
    description: f.description.trim(),
    status: Number(f.status),
    isBlocked: Number(f.isBlocked),
    isFullname: Number(f.isFullname),
    isNfullname: Number(f.isNfullname),
  });

// loads one lookup list; a missing service or a failed request just leaves the list empty
const loadLookup = (service, setter) =>
  Promise.resolve(service?.list?.())
    .then((d) => setter(asList(d)))
    .catch(() => {});

export default function UsersManager() {
  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id;
  // only an administrator may switch into another account
  const canImpersonate =
    String(currentUser?.role || "").toLowerCase() === "admin";
  const [impersonationTarget, setImpersonationTarget] = useState(null);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRemoved, setShowRemoved] = useState(false); // false = active users, true = removed users

  // lookups for the select boxes
  const [genders, setGenders] = useState([]);
  const [nationalities, setNationalities] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [positions, setPositions] = useState([]);
  const [permissions, setPermissions] = useState([]);

  const [editing, setEditing] = useState(null); // null | "new" | user
  const [viewing, setViewing] = useState(null); // user shown in the view modal
  const [lightboxOpen, setLightboxOpen] = useState(false); // full-screen avatar of the viewed user
  const [form, setForm] = useState(emptyForm);
  const [imageChange, setImageChange] = useState(NO_IMAGE_CHANGE);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all"); // "all" | role code
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | 1 | 0
  const [accessFilter, setAccessFilter] = useState("all"); // "all" | 0 (allowed) | 1 (blocked)
  const [verifyFilter, setVerifyFilter] = useState("all"); // "all" | 1 (verified) | 0 (unverified)
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // 10 | 20 | 30 | 40 | 50 | 100 | "all"
  const [busyId, setBusyId] = useState(null); // user whose switch / button is saving

  // ALL messages go through here (shown as a pop-up or as a bar, see SHOW_NOTICE_AS)
  const [notice, setNotice] = useState(null); // { id, type, title, message, returnToForm }
  const [modalHidden, setModalHidden] = useState(false); // form is hidden (not lost) while its message is shown
  const noticeRef = useRef(null);

  const notify = (type, title, message, { returnToForm = false } = {}) =>
    setNotice({ id: Date.now(), type, title, message, returnToForm });

  // closing a message that came from the form brings the form back
  const dismissNotice = () => {
    if (notice?.returnToForm) setModalHidden(false);
    setNotice(null);
  };

  const handleBackToForm = () => {
    setModalHidden(false);
    setNotice(null);
  };

  // closes the view modal (and its full-screen avatar, if open)
  const closeView = () => {
    setLightboxOpen(false);
    setViewing(null);
  };

  // returns true when the users were loaded; silent = no "Loading..." flash
  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setError("");
      try {
        const rows = asList(await userService.list(showRemoved));
        setUsers(
          rows.map((r) => {
            const u = normalizeUser(r);
            return showRemoved ? { ...u, isRemoved: 1 } : u;
          }),
        );
        return true;
      } catch (err) {
        console.error("Failed to load users:", err);
        setError(err.message || "Failed to load users."); // shown in the red bar with a Retry link
        return false;
      } finally {
        // IMPORTANT: always switch "Loading..." off, otherwise the table never shows the users
        if (!silent) setLoading(false);
      }
    },
    [showRemoved],
  );

  useEffect(() => {
    load();
  }, [load]);

  const loadLookups = () =>
    Promise.all([
      loadLookup(gendersService, setGenders),
      loadLookup(nationalitiesService, setNationalities),
      loadLookup(rolesService, setRolesList),
      loadLookup(positionsService, setPositions),
      loadLookup(permissionsService, setPermissions),
    ]);

  useEffect(() => {
    loadLookups();
  }, []);

  // green + yellow messages disappear by themselves; red ones and "back to the form" ones stay
  useEffect(() => {
    if (!notice || notice.type === "error" || notice.returnToForm) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  // bar mode: make sure the message is visible (the page may be scrolled)
  useEffect(() => {
    if (notice && SHOW_NOTICE_AS === "banner")
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

  // search / filters / page size / list changed -> start again from page 1
  useEffect(() => {
    setPage(1);
  }, [
    query,
    roleFilter,
    statusFilter,
    accessFilter,
    verifyFilter,
    pageSize,
    showRemoved,
  ]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // role choices: the roles table when it loaded, otherwise the three standard roles (by code)
  const roleChoices = rolesList.length
    ? rolesList.map((r) => ({
        value: r.id,
        code: r.code,
        label: labelOf(r.role_title) || r.code,
      }))
    : FALLBACK_ROLES.map((r) => ({
        value: r.code,
        code: r.code,
        label: r.label,
      }));
  const roleLabel = (code) =>
    roleChoices.find((r) => r.code === code)?.label ||
    (code ? code.toUpperCase() : "—");

  const nameIn = (list, id, key) => {
    if (id === "" || id === null || id === undefined) return "—";
    const item = list.find((x) => x.id === Number(id));
    return item ? labelOf(item[key]) || "—" : `#${id}?`;
  };

  // "Owner, Manager · Barista" for a user with several positions
  const positionsLabel = (ids) =>
    ids && ids.length
      ? ids
          .map((id) => {
            const item = positions.find((x) => x.id === Number(id));
            return item ? labelOf(item.position_title) || `#${id}` : `#${id}?`;
          })
          .join(" · ")
      : "—";

  const openNew = () => {
    const customer = roleChoices.find((r) => r.code === "customer");
    setForm({ ...emptyForm, roleId: customer?.value ?? "" });
    setImageChange(NO_IMAGE_CHANGE);
    setNotice(null);
    setModalHidden(false);
    setEditing("new");
  };

  const openEdit = (u) => {
    setForm(formFromUser(u));
    setImageChange(NO_IMAGE_CHANGE);
    setNotice(null);
    setModalHidden(false);
    setEditing(u);
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

    const isNew = editing === "new";

    if (!form.firstName.trim()) return warn("First name is required.");
    if (!EMAIL_RE.test(form.email.trim()))
      return warn("Please enter a valid email.");
    if (isNew && form.password.length < 8)
      return warn("Password must be at least 8 characters.");
    if (!isNew && form.password && form.password.length < 8)
      return warn("The new password must be at least 8 characters.");

    const itemName = fullName({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
    });

    // editing but nothing was touched (no field changed, no avatar chosen/removed)
    if (!isNew) {
      const textChanged =
        fingerprint(form) !== fingerprint(formFromUser(editing));
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
      // multipart form: text fields + the avatar file (server makes avatar + thumbnail from it)
      const fd = new FormData();
      fd.append("firstName", form.firstName.trim());
      fd.append("lastName", form.lastName.trim());
      fd.append("firstNameNative", form.firstNameNative.trim());
      fd.append("lastNameNative", form.lastNameNative.trim());
      fd.append("email", form.email.trim());
      fd.append("phone", form.phone.trim());
      if (form.password) fd.append("password", form.password);
      if (form.roleId !== "" && form.roleId !== null)
        fd.append(rolesList.length ? "roleId" : "role", String(form.roleId));
      fd.append("genderId", String(form.genderId ?? ""));
      fd.append("nationalityId", String(form.nationalityId ?? ""));
      // several positions: sent as a JSON array, e.g. "[1,3]" ("[]" = no position)
      fd.append("positionIds", JSON.stringify(form.positionIds.map(Number)));
      fd.append("permissionId", String(form.permissionId ?? ""));
      fd.append("address", form.address.trim());
      fd.append("region", form.region.trim());
      fd.append("country", form.country.trim());
      fd.append("description", form.description.trim());
      fd.append("status", String(Number(form.status)));
      fd.append("isBlocked", String(Number(form.isBlocked)));
      fd.append("isFullname", String(Number(form.isFullname)));
      fd.append("isNfullname", String(Number(form.isNfullname)));
      if (imageChange.file)
        fd.append("image", imageChange.file); // field name must be "image"
      else if (imageChange.remove) fd.append("removeAvatar", "1");

      // the server tells us whether it emailed a verification code
      const saved = isNew
        ? await userService.create(fd)
        : await userService.update(editing.id, fd);

      close();
      await load({ silent: true });
      notify(
        "success",
        isNew ? "User added" : "User updated",
        (isNew
          ? `"${itemName}" was added successfully.`
          : `"${itemName}" was updated successfully.`) +
          (saved?.verificationSent
            ? " A verification code was sent to the email address."
            : ""),
      );
    } catch (err) {
      console.error("Error saving user:", err);
      setModalHidden(true);
      notify(
        "error",
        isNew ? "Failed to add the user" : "Failed to update the user",
        err.message || "Something went wrong. Please try again.",
        { returnToForm: true },
      );
    } finally {
      setSaving(false);
    }
  };

  // the switch in the Status column: updates ONLY the status (active / inactive)
  const toggleStatus = async (u) => {
    const next = u.status === 1 ? 0 : 1;
    setBusyId(u.id);
    try {
      await userService.setStatus(u.id, next);
      await load({ silent: true });
      notify(
        "success",
        "User updated",
        next === 1
          ? `"${fullName(u)}" was updated successfully. The account is now active.`
          : `"${fullName(u)}" was updated successfully. The account is now inactive.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to update the user",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  };

  // the Access button: blocks / unblocks the user (updates ONLY the blocked flag)
  const toggleBlocked = async (u) => {
    const next = u.isBlocked === 1 ? 0 : 1;
    setBusyId(u.id);
    try {
      await userService.setBlocked(u.id, next);
      await load({ silent: true });
      notify(
        "success",
        "User updated",
        next === 1
          ? `"${fullName(u)}" was updated successfully. The user is now blocked.`
          : `"${fullName(u)}" was updated successfully. The user is no longer blocked.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to update the user",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  };

  // email a verification code to the user (the OWNER types it after signing in)
  const handleSendCode = async (u) => {
    setBusyId(u.id);
    try {
      await userService.sendVerification(u.id);
      await load({ silent: true });
      notify(
        "success",
        "Code sent",
        `A verification code was sent to ${u.email}. The user enters it after signing in.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to send the code",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  };

  // admin override, e.g. you confirmed the person yourself (logged on the server)
  const handleMarkVerified = async (u) => {
    if (
      !window.confirm(
        `Mark ${u.email} as verified without a code?\n\nOnly do this if you confirmed the person yourself. This action is logged.`,
      )
    )
      return;
    setBusyId(u.id);
    try {
      await userService.markVerified(u.id);
      await load({ silent: true });
      notify(
        "success",
        "Email verified",
        `"${fullName(u)}" is now marked as verified.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to verify the email",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [ok] = await Promise.all([load({ silent: true }), loadLookups()]);
      if (ok !== false)
        notify(
          "success",
          "Users refreshed",
          "The users were reloaded from the database.",
        );
    } finally {
      setRefreshing(false);
    }
  };

  // REMOVE: the account stays, "Removed-" is added to the email and phone, it can be restored
  const handleRemove = async (u) => {
    if (
      !window.confirm(
        `Remove "${fullName(u)}"?\n\nThe email and phone get "Removed-" in front and the user can no longer sign in. You can restore the account later from Removed users.`,
      )
    )
      return;
    setBusyId(u.id);
    try {
      await userService.remove(u.id);
      await load({ silent: true });
      notify(
        "success",
        "User removed",
        `"${fullName(u)}" was moved to Removed users. You can restore the account later.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to remove the user",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleRestore = async (u) => {
    setBusyId(u.id);
    try {
      await userService.restore(u.id);
      await load({ silent: true });
      notify(
        "success",
        "User restored",
        `"${fullName(u)}" is back in the users list.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to restore the user",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  };

  // DELETE: the account and its photo are erased
  const handleDelete = async (u) => {
    if (
      !window.confirm(
        `Delete "${fullName(u)}" permanently?\n\nThe account and its photo are erased. This cannot be undone. (To keep the account, use Remove instead.)`,
      )
    )
      return;
    setBusyId(u.id);
    try {
      await userService.delete(u.id);
      await load({ silent: true });
      notify(
        "success",
        "User deleted",
        `"${fullName(u)}" was deleted permanently.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to delete the user",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  };

  // IMPERSONATE: step 1 = ask for confirmation, step 2 = ask the server to switch the session
  const handleImpersonate = (u) => setImpersonationTarget(u);

  const confirmImpersonate = async () => {
    if (!impersonationTarget) return;

    const u = impersonationTarget;

    setBusyId(u.id);
    setImpersonationTarget(null);

    try {
      const response = await fetch(
        `${API_BASE}/api/impersonation/start/${encodeURIComponent(u.id)}`,
        {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Failed to start impersonation.",
        );
      }

      // Reload so AuthContext can read the new session.
      window.location.assign("/");
    } catch (err) {
      console.error("Impersonation error:", err);

      notify(
        "error",
        "Impersonation failed",
        err.message || "Something went wrong. Please try again.",
      );

      setBusyId(null);
    }
  };

  const activeFilters =
    (roleFilter !== "all") +
    (statusFilter !== "all") +
    (accessFilter !== "all") +
    (verifyFilter !== "all");
  const clearFilters = () => {
    setRoleFilter("all");
    setStatusFilter("all");
    setAccessFilter("all");
    setVerifyFilter("all");
  };
  const countBy = (fn) => users.filter(fn).length;

  const shown = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (statusFilter !== "all" && u.status !== statusFilter) return false;
    if (accessFilter !== "all" && u.isBlocked !== accessFilter) return false;
    if (verifyFilter !== "all" && u.isVerifiedEmail !== verifyFilter)
      return false;
    const haystack = [
      u.firstName,
      u.lastName,
      u.firstNameNative,
      u.lastNameNative,
      u.email,
      u.phone,
      u.id,
    ]
      // const haystack = [
      //   `${u.firstName} ${u.lastName}`,
      //   `${u.lastName} ${u.firstName}`,
      //   `${u.firstNameNative} ${u.lastNameNative}`,
      //   `${u.lastNameNative} ${u.firstNameNative}`,
      //   u.email,
      //   u.phone,
      //   u.id,
      // ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  // pagination: `shown` is the full filtered list, `pageItems` is the current page
  const showAll = pageSize === "all";
  const totalPages = showAll
    ? 1
    : Math.max(1, Math.ceil(shown.length / pageSize));
  const currentPage = Math.min(page, totalPages); // e.g. removed the last user of the last page
  const pageItems = showAll
    ? shown
    : shown.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // content of the lightbox "Info" popup (dark style, because the lightbox is dark)
  const lightboxInfo = viewing ? (
    <div className="space-y-3 text-sm">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-accent-500">
          Name
        </span>
        <p className="mt-1 font-medium">{fullName(viewing)}</p>
      </div>
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-accent-500">
          Email
        </span>
        <p className="mt-1 text-slate-300 text-xs">{viewing.email}</p>
      </div>
      <div className="pt-2 border-t border-slate-800">
        <span className="text-[11px] text-slate-400">Role</span>
        <p className="font-semibold">{roleLabel(viewing.role)}</p>
      </div>
    </div>
  ) : null;

  const statusOptions = [
    { value: 1, label: "Active" },
    { value: 0, label: "Inactive" },
  ];
  const accessOptions = [
    { value: 0, label: "Allowed" },
    { value: 1, label: "Blocked" },
  ];
  const lookupOptions = (list, key) => [
    { value: "", label: "None" },
    ...list.map((x) => ({ value: x.id, label: labelOf(x[key]) || `#${x.id}` })),
  ];
  // choices for the multi-select (no "None" row: an empty selection already means none)
  const positionOptions = positions.map((x) => ({
    value: x.id,
    label: labelOf(x.position_title) || `#${x.id}`,
  }));

  const labelCls = "text-sm text-slate-600 dark:text-slate-400 block w-full";
  const sectionTitle =
    "text-xs font-bold uppercase tracking-wider text-accent-600";

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
          <h1 className="text-2xl font-extrabold">
            {showRemoved ? "Removed Users" : "Users Manager"}
          </h1>
          <p className="text-sm text-slate-500">
            {showRemoved
              ? "Removed accounts. Restore a user, or delete the account permanently."
              : "Manage system users, roles, account permissions, and profiles."}
          </p>
        </div>
        <div className="flex gap-2 self-start">
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
            <Plus className="w-4 h-4" /> Add user
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, phone..."
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
        <button
          type="button"
          onClick={() => setShowRemoved((v) => !v)}
          aria-pressed={showRemoved}
          className={`px-4 py-2 text-sm font-medium rounded-xl border flex items-center gap-2 transition-colors ${
            showRemoved
              ? "border-accent-500 bg-accent-50 dark:bg-accent-950/30 text-accent-700 dark:text-accent-300"
              : "border-slate-300 dark:border-slate-700 hover:border-accent-500"
          }`}
        >
          {showRemoved ? (
            <UsersIcon className="w-4 h-4" />
          ) : (
            <Archive className="w-4 h-4" />
          )}
          {showRemoved ? "Active users" : "Removed users"}
        </button>
      </div>

      {showFilters && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-sm">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500">Role</div>
            <div className="flex flex-wrap gap-2">
              <Chip
                active={roleFilter === "all"}
                onClick={() => setRoleFilter("all")}
              >
                All
              </Chip>
              {roleChoices.map((r) => (
                <Chip
                  key={r.code}
                  active={roleFilter === r.code}
                  onClick={() => setRoleFilter(r.code)}
                >
                  {r.label} ({countBy((u) => u.role === r.code)})
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
                Active ({countBy((u) => u.status === 1)})
              </Chip>
              <Chip
                active={statusFilter === 0}
                onClick={() => setStatusFilter(0)}
              >
                Inactive ({countBy((u) => u.status === 0)})
              </Chip>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500">Access</div>
            <div className="flex flex-wrap gap-2">
              <Chip
                active={accessFilter === "all"}
                onClick={() => setAccessFilter("all")}
              >
                All
              </Chip>
              <Chip
                active={accessFilter === 0}
                onClick={() => setAccessFilter(0)}
              >
                Allowed ({countBy((u) => u.isBlocked === 0)})
              </Chip>
              <Chip
                active={accessFilter === 1}
                onClick={() => setAccessFilter(1)}
              >
                Blocked ({countBy((u) => u.isBlocked === 1)})
              </Chip>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500">
              Email verification
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip
                active={verifyFilter === "all"}
                onClick={() => setVerifyFilter("all")}
              >
                All
              </Chip>
              <Chip
                active={verifyFilter === 1}
                onClick={() => setVerifyFilter(1)}
              >
                Verified ({countBy((u) => u.isVerifiedEmail === 1)})
              </Chip>
              <Chip
                active={verifyFilter === 0}
                onClick={() => setVerifyFilter(0)}
              >
                Unverified ({countBy((u) => u.isVerifiedEmail === 0)})
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

      {/* ===== MESSAGES as a bar: between the search/filters and the table ===== */}
      {SHOW_NOTICE_AS === "banner" && notice && (
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
          title="Could not load the users"
          action={
            <button
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

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4">User</th>
              <th className="p-4">Contact</th>
              <th className="p-4">Role</th>
              <th className="p-4">Status</th>
              <th className="p-4">Access</th>
              <th className="p-4">Created / Last login</th>
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
                  {users.length === 0
                    ? showRemoved
                      ? "No removed users."
                      : "No users yet."
                    : "No users match your filters."}
                </td>
              </tr>
            )}
            {!loading &&
              pageItems.map((u) => {
                const thumb = assetUrl(u.avatarThumbnail || u.avatar);
                const isActive = u.status === 1;
                const isBlocked = u.isBlocked === 1;
                const isVerified = u.isVerifiedEmail === 1;
                const busy = busyId === u.id;
                const isMe =
                  currentUserId != null &&
                  String(u.id) === String(currentUserId);
                return (
                  <tr
                    key={u.id}
                    className="border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3 min-w-48">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover bg-slate-100 dark:bg-slate-800"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-accent-100 dark:bg-accent-950/40 text-accent-700 dark:text-accent-400 font-bold flex items-center justify-center text-sm">
                            {u.firstName?.[0]?.toUpperCase() || "U"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold break-words">
                              {fullName(u)}
                            </span>
                            {isMe && (
                              <span className="inline-flex items-center rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-bold text-accent-700 dark:bg-accent-950/40 dark:text-accent-300">
                                Me
                              </span>
                            )}
                          </div>
                          {nativeName(u) && (
                            <div className="text-xs text-slate-400">
                              {nativeName(u)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-mono text-xs break-all">
                        {u.email}
                      </div>
                      <VerifiedBadge verified={isVerified} />
                      <div className="text-xs text-slate-400 mt-1">
                        {u.phone || "—"}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                          ROLE_BADGE[u.role] || ROLE_BADGE.customer
                        }`}
                      >
                        {roleLabel(u.role)}
                      </span>
                      {u.positionIds.length > 0 && (
                        <div className="mt-1 text-xs text-slate-400 break-words max-w-[12rem]">
                          {positionsLabel(u.positionIds)}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </span>
                        {!showRemoved && (
                          <Toggle
                            checked={isActive}
                            disabled={busy}
                            label={
                              isActive
                                ? "Make this account inactive"
                                : "Activate this account"
                            }
                            onChange={() => toggleStatus(u)}
                          />
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {showRemoved ? (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            isBlocked
                              ? "bg-rose-100 text-rose-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {isBlocked ? "Blocked" : "Allowed"}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleBlocked(u)}
                          disabled={busy}
                          title={
                            isBlocked ? "Unblock this user" : "Block this user"
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-wait ${
                            isBlocked
                              ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          }`}
                        >
                          {isBlocked ? (
                            <>
                              <Ban className="w-3.5 h-3.5" /> Blocked
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" /> Allowed
                            </>
                          )}
                        </button>
                      )}
                    </td>
                    <td className="p-4 text-xs text-slate-400 whitespace-nowrap">
                      <div>C: {fmtDate(u.createdAt)}</div>
                      <div>U: {fmtDate(u.updatedAt)}</div>
                      {showRemoved && u.removedAt ? (
                        <div>R: {fmtDate(u.removedAt)}</div>
                      ) : (
                        <div>
                          L: {u.lastLoginAt ? fmtDate(u.lastLoginAt) : "Never"}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        {canImpersonate && !showRemoved && (
                          <button
                            type="button"
                            title={`Impersonate ${fullName(u)}`}
                            aria-label={`Impersonate ${fullName(u)}`}
                            disabled={
                              busy ||
                              isMe ||
                              u.status !== 1 ||
                              u.isBlocked === 1
                            }
                            onClick={() => handleImpersonate(u)}
                            className="p-2 rounded-lg text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <UserRoundCog className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => setViewing(u)}
                          title="View"
                          aria-label="View details"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {showRemoved ? (
                          <>
                            <button
                              onClick={() => handleRestore(u)}
                              disabled={busy}
                              title="Restore"
                              aria-label="Restore"
                              className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 transition-colors disabled:opacity-50"
                            >
                              <ArchiveRestore className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(u)}
                              disabled={busy}
                              title="Delete (permanent)"
                              aria-label="Delete permanently"
                              className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            {!isVerified && (
                              <>
                                <button
                                  onClick={() => handleSendCode(u)}
                                  disabled={busy}
                                  title="Send verification code to the email"
                                  aria-label="Send verification code"
                                  className="p-2 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/30 text-sky-600 transition-colors disabled:opacity-50"
                                >
                                  <Mail className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleMarkVerified(u)}
                                  disabled={busy}
                                  title="Mark email as verified (no code)"
                                  aria-label="Mark email as verified"
                                  className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 transition-colors disabled:opacity-50"
                                >
                                  <MailCheck className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => openEdit(u)}
                              title="Edit"
                              aria-label="Edit"
                              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRemove(u)}
                              disabled={busy}
                              title={
                                'Remove (adds "Removed-" to email and phone, can be restored)'
                              }
                              aria-label="Remove"
                              className="p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-600 transition-colors disabled:opacity-50"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(u)}
                              disabled={busy}
                              title="Delete (permanent)"
                              aria-label="Delete permanently"
                              className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
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

      {/* ===== VIEW modal (read-only) + full-screen avatar ===== */}
      {viewing && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closeView}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="User details"
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-lg font-bold">User details</h3>
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
                <div className="flex items-start gap-4">
                  {viewing.avatar ? (
                    <button
                      type="button"
                      onClick={() => setLightboxOpen(true)}
                      aria-label="View avatar full screen"
                      title="Click to view full screen"
                      className="shrink-0 cursor-zoom-in"
                    >
                      <img
                        src={assetUrl(viewing.avatar)}
                        alt=""
                        className="w-20 h-20 rounded-full object-cover bg-slate-100 dark:bg-slate-800"
                      />
                    </button>
                  ) : (
                    <div className="w-20 h-20 shrink-0 rounded-full bg-accent-100 dark:bg-accent-950/40 text-accent-700 dark:text-accent-400 font-bold text-2xl flex items-center justify-center">
                      {viewing.firstName?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <h4 className="text-xl font-extrabold break-words">
                        {fullName(viewing)}
                      </h4>
                      <p className="text-sm text-slate-500 break-all">
                        {viewing.email}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                          ROLE_BADGE[viewing.role] || ROLE_BADGE.customer
                        }`}
                      >
                        {roleLabel(viewing.role)}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                          viewing.status === 1
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {viewing.status === 1 ? "Active" : "Inactive"}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                          viewing.isBlocked === 1
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {viewing.isBlocked === 1 ? "Blocked" : "Allowed"}
                      </span>
                      {viewing.isRemoved === 1 && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-slate-800 text-white">
                          Removed
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <section className="space-y-3">
                  <h5 className={sectionTitle}>Profile</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <Field label="Native name">
                      {nativeName(viewing) || "—"}
                    </Field>
                    <Field label="Phone">{viewing.phone || "—"}</Field>
                    <Field label="Gender">
                      {nameIn(genders, viewing.genderId, "gender")}
                    </Field>
                    <Field label="Nationality">
                      {nameIn(
                        nationalities,
                        viewing.nationalityId,
                        "nationality",
                      )}
                    </Field>
                    <Field label="Country">{viewing.country || "—"}</Field>
                    <Field label="Region">{viewing.region || "—"}</Field>
                    <Field label="Address">{viewing.address || "—"}</Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Latin name order">
                      {viewing.isFullname === 1
                        ? "First name + Last name"
                        : "Last name + First name"}
                    </Field>

                    <Field label="Native name order">
                      {viewing.isNfullname === 1
                        ? "First name + Last name"
                        : "Last name + First name"}
                    </Field>
                  </div>
                </section>

                <section className="space-y-3">
                  <h5 className={sectionTitle}>Email verification</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <Field label="Email">{viewing.email}</Field>
                    <Field label="Status">
                      {viewing.isVerifiedEmail === 1
                        ? "Verified"
                        : "Unverified"}
                    </Field>
                    <Field label="Verified on">
                      {viewing.isVerifiedEmail === 1
                        ? fmtDateTime(viewing.emailVerifiedAt)
                        : "—"}
                    </Field>
                  </div>
                </section>

                <section className="space-y-3">
                  <h5 className={sectionTitle}>Access</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <Field label="Role">{roleLabel(viewing.role)}</Field>
                    <Field label="Positions">
                      {positionsLabel(viewing.positionIds)}
                    </Field>
                    <Field label="Extra permission">
                      {nameIn(permissions, viewing.permissionId, "name")}
                    </Field>
                  </div>
                </section>

                {viewing.description && (
                  <section className="space-y-2">
                    <h5 className={sectionTitle}>Description</h5>
                    <p className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap break-words">
                      {viewing.description}
                    </p>
                  </section>
                )}

                <section className="space-y-2">
                  <h5 className={sectionTitle}>Date</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <Field label="Created">
                      {fmtDateTime(viewing.createdAt)}
                    </Field>
                    <Field label="Updated">
                      {fmtDateTime(viewing.updatedAt)}
                    </Field>
                    <Field label="Last login">
                      {viewing.lastLoginAt
                        ? fmtDateTime(viewing.lastLoginAt)
                        : "Never"}
                    </Field>
                    {viewing.isRemoved === 1 && (
                      <Field label="Removed">
                        {fmtDateTime(viewing.removedAt)}
                      </Field>
                    )}
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
                {viewing.isRemoved === 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const u = viewing;
                      closeView();
                      handleRestore(u);
                    }}
                    className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <ArchiveRestore className="w-4 h-4" /> Restore
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const u = viewing;
                      closeView();
                      openEdit(u);
                    }}
                    className="py-2.5 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* sibling of the modal on purpose: its clicks must not reach the modal's backdrop handler */}
          {lightboxOpen && viewing.avatar && (
            <ImageLightbox
              src={assetUrl(viewing.avatar)}
              alt={fullName(viewing)}
              title={fullName(viewing)}
              info={lightboxInfo}
              infoTitle="User details"
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
            noValidate
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col relative"
          >
            {/* Sticky Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 z-10 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-lg font-bold">
                {editing === "new" ? "Add user" : "Edit user"}
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
                <h4 className={sectionTitle}>Avatar</h4>
                <ImageUpload
                  key={editing === "new" ? "new" : editing.id}
                  label="Avatar"
                  currentUrl={editing === "new" ? "" : assetUrl(editing.avatar)}
                  onChange={setImageChange}
                />
              </section>

              <section className="space-y-3">
                <h4 className={sectionTitle}>Name</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={labelCls}>
                    First name *
                    <input
                      className={`${inputCls} mt-1 w-full`}
                      value={form.firstName}
                      onChange={(e) => setField("firstName", e.target.value)}
                    />
                  </label>
                  <label className={labelCls}>
                    Last name
                    <input
                      className={`${inputCls} mt-1 w-full`}
                      value={form.lastName}
                      onChange={(e) => setField("lastName", e.target.value)}
                    />
                  </label>
                  <label className={labelCls}>
                    First name (native)
                    <input
                      className={`${inputCls} mt-1 w-full`}
                      placeholder="e.g. ស្រីពេជ្រ"
                      value={form.firstNameNative}
                      onChange={(e) =>
                        setField("firstNameNative", e.target.value)
                      }
                    />
                  </label>
                  <label className={labelCls}>
                    Last name (native)
                    <input
                      className={`${inputCls} mt-1 w-full`}
                      value={form.lastNameNative}
                      onChange={(e) =>
                        setField("lastNameNative", e.target.value)
                      }
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className={sectionTitle}>Contact &amp; login</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={labelCls}>
                    Email *
                    <input
                      type="email"
                      className={`${inputCls} mt-1 w-full`}
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                    />
                    <span className="block mt-1 text-xs text-slate-500">
                      {editing === "new"
                        ? "A verification code is sent to this address. The user enters it after signing in."
                        : "Changing the email marks it unverified and sends a code to the new address."}
                    </span>
                  </label>
                  <label className={labelCls}>
                    Phone
                    <input
                      className={`${inputCls} mt-1 w-full`}
                      value={form.phone}
                      onChange={(e) => setField("phone", e.target.value)}
                    />
                  </label>
                  <label className={`${labelCls} sm:col-span-2`}>
                    {editing === "new" ? "Password *" : "New password"}
                    <input
                      type="password"
                      autoComplete="new-password"
                      className={`${inputCls} mt-1 w-full`}
                      placeholder={
                        editing === "new"
                          ? "At least 8 characters"
                          : "Leave empty to keep the current password"
                      }
                      value={form.password}
                      onChange={(e) => setField("password", e.target.value)}
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className={sectionTitle}>Role &amp; permissions</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={labelCls}>
                    Role
                    <div className="relative mt-1 w-full">
                      <CustomSelect
                        value={form.roleId}
                        onChange={(value) => setField("roleId", value)}
                        placeholder="Choose..."
                        options={roleChoices.map((r) => ({
                          value: r.value,
                          label: r.label,
                        }))}
                      />
                    </div>
                  </label>
                  <label className={labelCls}>
                    Extra permission
                    <div className="relative mt-1 w-full">
                      <CustomSelect
                        value={form.permissionId}
                        onChange={(value) => setField("permissionId", value)}
                        placeholder="None"
                        options={lookupOptions(permissions, "name")}
                      />
                    </div>
                  </label>

                  {/* a div (not a label) on purpose: a label would trigger its first checkbox on every click */}
                  <div className={`${labelCls} sm:col-span-2`}>
                    Positions (you can choose several)
                    <MultiSelect
                      value={form.positionIds}
                      onChange={(value) => setField("positionIds", value)}
                      options={positionOptions}
                      placeholder="None"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className={sectionTitle}>Personal</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={labelCls}>
                    Gender
                    <div className="relative mt-1 w-full">
                      <CustomSelect
                        value={form.genderId}
                        onChange={(value) => setField("genderId", value)}
                        placeholder="None"
                        options={lookupOptions(genders, "gender")}
                      />
                    </div>
                  </label>
                  <label className={labelCls}>
                    Nationality
                    <div className="relative mt-1 w-full">
                      <CustomSelect
                        value={form.nationalityId}
                        onChange={(value) => setField("nationalityId", value)}
                        placeholder="None"
                        options={lookupOptions(nationalities, "nationality")}
                      />
                    </div>
                  </label>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className={sectionTitle}>Address</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className={`${labelCls} sm:col-span-3`}>
                    Address
                    <input
                      className={`${inputCls} mt-1 w-full`}
                      value={form.address}
                      onChange={(e) => setField("address", e.target.value)}
                    />
                  </label>
                  <label className={labelCls}>
                    Region
                    <input
                      className={`${inputCls} mt-1 w-full`}
                      value={form.region}
                      onChange={(e) => setField("region", e.target.value)}
                    />
                  </label>
                  <label className={labelCls}>
                    Country
                    <input
                      className={`${inputCls} mt-1 w-full`}
                      value={form.country}
                      onChange={(e) => setField("country", e.target.value)}
                    />
                  </label>
                </div>
                <label className={labelCls}>
                  Description / notes
                  <textarea
                    rows={3}
                    className={`${inputCls} mt-1 w-full resize-none`}
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                  />
                </label>
              </section>

              <section className="space-y-3">
                <h4 className={sectionTitle}>Display</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={labelCls}>
                    Latin name order
                    <div className="relative mt-1 w-full">
                      <CustomSelect
                        value={form.isFullname}
                        onChange={(value) =>
                          setField("isFullname", Number(value))
                        }
                        options={[
                          { value: 1, label: "First name + Last name" },
                          { value: 0, label: "Last name + First name" },
                        ]}
                      />
                    </div>
                  </label>

                  <label className={labelCls}>
                    Native name order
                    <div className="relative mt-1 w-full">
                      <CustomSelect
                        value={form.isNfullname}
                        onChange={(value) =>
                          setField("isNfullname", Number(value))
                        }
                        options={[
                          { value: 1, label: "First name + Last name" },
                          { value: 0, label: "Last name + First name" },
                        ]}
                      />
                    </div>
                  </label>

                  <label className={labelCls}>
                    Status
                    <div className="relative mt-1 w-full">
                      <CustomSelect
                        value={form.status}
                        onChange={(value) => setField("status", value)}
                        options={statusOptions}
                      />
                    </div>
                  </label>

                  <label className={labelCls}>
                    Access
                    <div className="relative mt-1 w-full">
                      <CustomSelect
                        value={form.isBlocked}
                        onChange={(value) => setField("isBlocked", value)}
                        options={accessOptions}
                      />
                    </div>
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
                  {saving
                    ? "Saving..."
                    : editing === "new"
                      ? "Create user"
                      : "Save user"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ===== IMPERSONATION CONFIRMATION MODAL ===== */}
      {impersonationTarget && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setImpersonationTarget(null);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="impersonation-modal-title"
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 id="impersonation-modal-title" className="text-lg font-bold">
                Confirm impersonation
              </h3>

              <button
                type="button"
                onClick={() => setImpersonationTarget(null)}
                aria-label="Close"
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-11 h-11 rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400 flex items-center justify-center">
                  <UserRoundCog className="w-5 h-5" />
                </div>

                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Switch to this user's account?
                  </p>

                  <p className="mt-2 text-sm font-medium text-violet-600 dark:text-violet-400 break-words">
                    {fullName(impersonationTarget) || impersonationTarget.email}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Your session will switch to this user's account. You should
                    be able to return to your administrator account afterward.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setImpersonationTarget(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmImpersonate}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <UserRoundCog className="w-4 h-4" />
                Start impersonation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
