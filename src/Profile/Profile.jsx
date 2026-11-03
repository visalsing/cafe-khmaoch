import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  User,
  Shield,
  ShieldCheck,
  ShoppingBag,
  LogOut,
  ChevronRight,
  ArrowLeft,
  Mail,
  MailCheck,
  MailWarning,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Phone,
  CalendarDays,
  Clock,
  Lock,
  Receipt,
  Coffee,
  RotateCcw,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import useLocalized, { localize } from "../hooks/useLocalized";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { assetUrl, orderService, profileService } from "../services/api";
import { dual } from "../utils/currency";
import ReceiptModal from "../components/Dashboard/Receipt";
import ImageLightbox from "../components/Dashboard/ImageLightbox";
import LogoutModal from "../components/Auth/LogoutModal";

/* <pure> */
const OTP_LENGTH = 6;
const onlyDigits = (s) => String(s ?? "").replace(/\D/g, "");

// One keystroke / autofill in one of the 6 code boxes -> the new code and the box to focus next.
function applyOtpInput(value, index, raw) {
  const digits = onlyDigits(raw);

  // the box was emptied (Backspace / Delete)
  if (digits.length === 0) {
    return {
      value: value.slice(0, index) + value.slice(index + 1),
      focus: index,
    };
  }

  // the whole code arrived at once (browser autofill of the emailed code)
  if (digits.length > 1 && index === 0) {
    const full = digits.slice(0, OTP_LENGTH);
    return { value: full, focus: Math.min(OTP_LENGTH - 1, full.length) };
  }

  // one digit typed: take the LAST typed digit (a box that already had a digit gets replaced)
  const one = digits.slice(-1);
  const next = onlyDigits(
    value.slice(0, index) + one + value.slice(index + 1),
  ).slice(0, OTP_LENGTH);
  return { value: next, focus: Math.min(OTP_LENGTH - 1, index + 1) };
}

// 0 = empty, 1 = weak, 2 = fair, 3 = good, 4 = strong
function passwordStrength(pw) {
  if (!pw) return { level: 0, label: "" };
  if (pw.length < 8) return { level: 1, label: "Too short" };
  const points = [
    pw.length >= 12,
    /[a-z]/.test(pw) && /[A-Z]/.test(pw),
    /\d/.test(pw),
    /[^A-Za-z0-9]/.test(pw),
  ].filter(Boolean).length;
  if (points <= 1) return { level: 2, label: "Fair" };
  if (points === 2) return { level: 3, label: "Good" };
  return { level: 4, label: "Strong" };
}
/* </pure> */

/* ---------- Reusable styles ---------- */

const inputClass =
  "w-full rounded-xl border border-stone-200 dark:border-stone-700 " +
  "bg-white dark:bg-stone-950 px-4 py-2.5 text-sm " +
  "text-stone-900 dark:text-white placeholder:text-stone-400 outline-none transition " +
  "focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15 " +
  "disabled:cursor-not-allowed disabled:bg-stone-100 dark:disabled:bg-stone-900 disabled:text-stone-500";

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl " +
  "bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm " +
  "transition hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl " +
  "border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-5 py-2.5 " +
  "text-sm font-semibold text-stone-700 dark:text-stone-200 " +
  "transition hover:border-accent-500 hover:text-accent-700 dark:hover:text-accent-400 " +
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/20 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const emptyPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
  code: "",
};

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.data?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

// accept camelCase or snake_case keys from the server
const pick = (o, ...keys) => {
  for (const k of keys)
    if (o?.[k] !== undefined && o?.[k] !== null) return o[k];
  return undefined;
};
const isActiveStatus = (v) =>
  v === undefined ||
  v === null ||
  v === 1 ||
  v === true ||
  String(v).toLowerCase() === "active" ||
  String(v) === "1";

// 1 / 0 from a number, boolean or string; anything else gives the fallback
const toBit = (v, fallback) => {
  if (v === true || v === 1 || v === "1" || v === "true") return 1;
  if (v === false || v === 0 || v === "0" || v === "false") return 0;
  return fallback;
};

// firstThenLast: 1 = "First Last", 0 = "Last First" (anything else counts as 1)
const joinName = (first, last, firstThenLast) =>
  (firstThenLast === 0 ? [last, first] : [first, last])
    .filter(Boolean)
    .join(" ")
    .trim();

const normalizeUser = (u) => ({
  firstName: pick(u, "firstName", "first_name") ?? "",
  lastName: pick(u, "lastName", "last_name") ?? "",
  firstNameNative: pick(u, "firstNameNative", "first_name_native") ?? "",
  lastNameNative: pick(u, "lastNameNative", "last_name_native") ?? "",
  // is_fullname = Latin name order, is_nfullname = native name order
  isFullname: toBit(pick(u, "isFullname", "is_fullname"), 1),
  isNfullname: toBit(pick(u, "isNfullname", "is_nfullname"), 1),
  email: pick(u, "email") ?? "",
  phone: pick(u, "phone") ?? "",
  role: pick(u, "role", "roleCode", "role_code") ?? "customer",
  avatar: pick(u, "avatar") ?? "",
  active: isActiveStatus(pick(u, "status")),
  createdAt: pick(u, "createdAt", "created_at"),
  lastLoginAt: pick(u, "lastLoginAt", "last_login_at"),
  verified: (() => {
    const v = pick(u, "isVerifiedEmail", "is_verified_email");
    if (v === undefined) return null; // the server does not say
    return v === true || v === 1 || v === "1" || v === "true";
  })(),
});

/* ---------- small UI pieces ---------- */

function Notice({ notice, onClose }) {
  if (!notice) return null;
  const success = notice.type === "success";

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-start gap-3 rounded-2xl border p-4 shadow-sm ${
        success
          ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
          : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
      }`}
    >
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          success
            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50"
            : "bg-rose-100 text-rose-600 dark:bg-rose-900/50"
        }`}
      >
        {success ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{notice.title}</p>
        <p className="mt-0.5 break-words text-sm opacity-90">
          {notice.message}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        className="rounded-lg p-1 text-lg leading-none opacity-50 transition hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}

function Panel({ children, className = "" }) {
  return (
    <div
      className={`rounded-3xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900 ${className}`}
    >
      {children}
    </div>
  );
}

function PanelHeader({ icon: Icon, title, description, aside }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-6 py-5 dark:border-stone-800">
      <div className="flex items-start gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600 ring-1 ring-accent-100 dark:bg-accent-950/40 dark:text-accent-400 dark:ring-accent-900/50">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-base font-bold tracking-tight text-stone-900 dark:text-white">
            {title}
          </h3>
          <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
            {description}
          </p>
        </div>
      </div>
      {aside}
    </div>
  );
}

// 1 ── 2 progress for the two-step flows
function Stepper({ steps, current }) {
  return (
    <ol className="flex items-center gap-3" aria-label="Progress">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex items-center gap-3">
            <span
              aria-current={active ? "step" : undefined}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                done
                  ? "bg-emerald-500 text-white"
                  : active
                    ? "bg-accent-600 text-white ring-4 ring-accent-500/20"
                    : "bg-stone-100 text-stone-400 dark:bg-stone-800"
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : n}
            </span>
            <span
              className={`text-sm font-semibold ${
                active
                  ? "text-stone-900 dark:text-white"
                  : "text-stone-400 dark:text-stone-500"
              }`}
            >
              {label}
            </span>
            {n < steps.length && (
              <span
                className={`hidden h-px w-8 sm:block ${
                  done ? "bg-emerald-400" : "bg-stone-200 dark:bg-stone-700"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function FieldLabel({ children, hint }) {
  return (
    <span className="mb-1.5 flex items-baseline justify-between gap-3">
      <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">
        {children}
      </span>
      {hint && <span className="text-xs text-stone-400">{hint}</span>}
    </span>
  );
}

// six separate boxes for the emailed code (type, paste or autofill)
function OtpInput({ value, onChange, disabled, autoFocus = false, label }) {
  const refs = useRef([]);

  const focusBox = (i) => {
    const box = refs.current[Math.max(0, Math.min(OTP_LENGTH - 1, i))];
    if (box) {
      box.focus();
      box.select?.();
    }
  };

  useEffect(() => {
    if (autoFocus) focusBox(0);
  }, [autoFocus]);

  const handleChange = (i, raw) => {
    const result = applyOtpInput(value, i, raw);
    onChange(result.value);
    // wait for React to paint the new digit, then move
    requestAnimationFrame(() => focusBox(result.focus));
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !value[i]) {
      e.preventDefault();
      focusBox(i - 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusBox(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusBox(i + 1);
    }
  };

  const handlePaste = (e) => {
    const pasted = onlyDigits(e.clipboardData.getData("text")).slice(
      0,
      OTP_LENGTH,
    );
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    requestAnimationFrame(() =>
      focusBox(Math.min(OTP_LENGTH - 1, pasted.length)),
    );
  };

  return (
    <div
      role="group"
      aria-label={label}
      className="flex gap-2 sm:gap-3"
      onPaste={handlePaste}
    >
      {Array.from({ length: OTP_LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
          disabled={disabled}
          className={`h-12 w-10 rounded-xl border bg-white text-center font-mono text-lg font-bold text-stone-900 outline-none transition dark:bg-stone-950 dark:text-white sm:h-14 sm:w-12 sm:text-xl ${
            value[i]
              ? "border-accent-500 ring-4 ring-accent-500/10"
              : "border-stone-200 dark:border-stone-700"
          } focus:border-accent-500 focus:ring-4 focus:ring-accent-500/20 disabled:opacity-60`}
        />
      ))}
    </div>
  );
}

function PasswordInput({
  label,
  hint,
  value,
  onChange,
  placeholder,
  show,
  onToggle,
  autoComplete,
  disabled,
  invalid = false,
}) {
  return (
    <label className="block">
      <FieldLabel hint={hint}>{label}</FieldLabel>

      <div className="relative">
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          className={`${inputClass} pl-10 pr-12 ${
            invalid
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15"
              : ""
          }`}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          required
        />

        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex items-center rounded-r-xl px-3.5 text-stone-400 transition hover:text-stone-700 dark:hover:text-stone-200"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

const STRENGTH_STYLE = [
  "",
  "bg-rose-500",
  "bg-orange-500",
  "bg-accent-500",
  "bg-emerald-500",
];
const STRENGTH_TEXT = [
  "",
  "text-rose-600",
  "text-orange-600",
  "text-accent-600",
  "text-emerald-600",
];

function StrengthMeter({ password }) {
  const { level, label } = passwordStrength(password);
  if (!password) return null;
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              n <= level
                ? STRENGTH_STYLE[level]
                : "bg-stone-200 dark:bg-stone-700"
            }`}
          />
        ))}
      </div>
      <p className={`mt-1.5 text-xs font-semibold ${STRENGTH_TEXT[level]}`}>
        {label}
        <span className="ml-1 font-normal text-stone-400">
          {level < 4 && level > 0
            ? "· use 12+ characters, upper and lower case, numbers and symbols"
            : ""}
        </span>
      </p>
    </div>
  );
}

function InfoTile({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3.5 rounded-2xl border border-stone-100 bg-stone-50/60 p-4 dark:border-stone-800 dark:bg-stone-950/40">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-stone-500 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:text-stone-400 dark:ring-stone-700">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          {label}
        </p>
        <div className="mt-0.5 break-words text-sm font-semibold text-stone-900 dark:text-stone-100">
          {children}
        </div>
      </div>
    </div>
  );
}

function VerifiedPill({ verified }) {
  if (verified === null) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        verified
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900"
          : "bg-accent-50 text-accent-700 ring-1 ring-accent-200 dark:bg-accent-950/40 dark:text-accent-300 dark:ring-accent-900"
      }`}
    >
      {verified ? (
        <MailCheck className="h-3 w-3" />
      ) : (
        <MailWarning className="h-3 w-3" />
      )}
      {verified ? "Email verified" : "Email not verified"}
    </span>
  );
}

const NAV_ITEMS = [
  { id: "overview", label: "Profile", hint: "Your details", icon: User },
  { id: "security", label: "Security", hint: "Email & password", icon: Shield },
  { id: "orders", label: "Orders", hint: "Your purchases", icon: ShoppingBag },
];

/* ---------- orders ---------- */
const ORDER_STEPS = ["pending", "preparing", "ready", "completed"];
const ACTIVE_STATUSES = ["pending", "preparing", "ready"];
const ORDER_STATUS = {
  pending: {
    label: "Received",
    cls: "bg-accent-50 text-accent-700 ring-accent-200 dark:bg-accent-950/40 dark:text-accent-300 dark:ring-accent-900",
  },
  preparing: {
    label: "Preparing",
    cls: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900",
  },
  ready: {
    label: "Ready",
    cls: "bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:ring-purple-900",
  },
  completed: {
    label: "Completed",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",
  },
};
const pillBase =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1";

// size key -> the translation keys you already use in the shop
const SIZE_KEY = { price: "regular", big: "big", small: "small" };

function localizeItem(item, lang, t) {
  const name =
    localize(item.productName, lang) || item.productTitle || item.title || "";
  const opt = item.options || {};
  const details = [
    opt.size ? t(SIZE_KEY[item.size] || "regular") : null, // the size is only listed when the drink has several sizes
    localize(opt.sugar, lang),
    localize(opt.ice, lang),
    localize(opt.coffee, lang),
  ].filter(Boolean);
  const detailTitle = details.length ? `(${details.join(", ")})` : "";
  return {
    ...item,
    productTitle: name,
    detailTitle,
    title: detailTitle ? `${name} ${detailTitle}` : name,
  };
}

const localizeOrder = (order, lang, t) => ({
  ...order,
  items: (order.items || []).map((item) => localizeItem(item, lang, t)),
});

function OrderCard({ order, onReceipt }) {
  const status = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
  const step = ORDER_STEPS.indexOf(order.status); // -1 for a cancelled order: no progress bar
  const lines = order.items || [];
  const count = lines.reduce((n, l) => n + (Number(l.qty) || 0), 0);
  const total = dual(order.total);
  const unpaid =
    order.paymentStatus === "unpaid" && order.status !== "cancelled";
  const paid = order.paymentStatus === "paid";

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-stone-900 dark:text-white">
            {order.orderNumber}
          </p>
          <p className="text-xs text-stone-500">
            {new Date(order.createdAt).toLocaleString()} ·{" "}
            <span className="capitalize">{order.orderType}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${pillBase} ${status.cls}`}>{status.label}</span>
          {unpaid && (
            <span
              className={`${pillBase} bg-stone-100 text-stone-600 ring-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:ring-stone-700`}
            >
              Pay on {order.orderType === "delivery" ? "delivery" : "pickup"}
            </span>
          )}
          {paid && (
            <span
              className={`${pillBase} bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900`}
            >
              Paid
            </span>
          )}
        </div>
      </div>

      {step >= 0 && (
        <div
          className="mt-4"
          role="img"
          aria-label={`Order status: ${status.label}`}
        >
          <div className="flex gap-1.5">
            {ORDER_STEPS.map((s, i) => (
              <span
                key={s}
                className={`h-1.5 flex-1 rounded-full ${
                  i <= step
                    ? step === ORDER_STEPS.length - 1
                      ? "bg-emerald-500"
                      : "bg-accent-500"
                    : "bg-stone-200 dark:bg-stone-700"
                }`}
              />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-stone-400">
            <span>Received</span>
            <span>Preparing</span>
            <span>Ready</span>
            <span>Done</span>
          </div>
        </div>
      )}

      <ul className="mt-4 space-y-1 text-sm text-stone-600 dark:text-stone-300">
        {lines.slice(0, 4).map((l) => (
          <li key={l.id} className="flex gap-2">
            <span className="shrink-0 font-semibold">{l.qty}×</span>
            <span className="min-w-0 break-words">{l.title}</span>
          </li>
        ))}
        {lines.length > 4 && (
          <li className="text-xs text-stone-400">+{lines.length - 4} more</li>
        )}
      </ul>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-stone-100 pt-4 dark:border-stone-800">
        <div>
          <p className="text-xs text-stone-400">
            {count} item{count === 1 ? "" : "s"}
          </p>
          <p className="text-lg font-extrabold text-accent-600 dark:text-accent-400">
            {total.riel}
          </p>
          <p className="text-xs text-stone-400">{total.usd}</p>
        </div>
        <button
          type="button"
          onClick={() => onReceipt(order)}
          className={secondaryButton}
        >
          <Receipt className="h-4 w-4" />
          View receipt
        </button>
      </div>
    </li>
  );
}

export default function Profile() {
  const { language, t } = useLanguage();
  const tr = useLocalized();
  const {
    currentUser,
    loading,
    refreshUser,
    isImpersonating,
    stopImpersonation,
  } = useAuth();
  const navigate = useNavigate();
  const [exitingImpersonation, setExitingImpersonation] = useState(false);

  const [activeTab, setActiveTab] = useState("overview");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAvatarLightbox, setShowAvatarLightbox] = useState(false);

  // Page notifications.
  const [notice, setNotice] = useState(null);

  // Email change.
  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);

  // Password change.
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [passwordCodeSent, setPasswordCodeSent] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // OTP resend cooldown.
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [passwordCooldown, setPasswordCooldown] = useState(0);

  useEffect(() => {
    if (!loading && !currentUser) {
      navigate("/login", { replace: true });
    }
  }, [currentUser, loading, navigate]);

  useEffect(() => {
    if (emailCooldown <= 0) return;
    const timer = setTimeout(() => setEmailCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [emailCooldown]);

  useEffect(() => {
    if (passwordCooldown <= 0) return;
    const timer = setTimeout(() => setPasswordCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [passwordCooldown]);

  // success messages disappear by themselves, errors stay until closed
  useEffect(() => {
    if (!notice || notice.type !== "success") return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Orders.
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [visibleOrders, setVisibleOrders] = useState(10);
  const [receiptOrder, setReceiptOrder] = useState(null);

  const userId = currentUser?.id;

  const loadOrders = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setOrdersLoading(true);
    try {
      const rows = await orderService.mine();
      setOrders(Array.isArray(rows) ? rows : []);
      setOrdersError("");
    } catch (error) {
      setOrdersError(getErrorMessage(error));
    } finally {
      setOrdersLoaded(true);
      if (!silent) setOrdersLoading(false);
    }
  }, []);

  // a different account (for example impersonation starts or stops): forget the old list
  useEffect(() => {
    setOrders([]);
    setOrdersLoaded(false);
    setOrdersError("");
    setVisibleOrders(10);
    setReceiptOrder(null);
  }, [userId]);

  // load the list when the Orders tab opens
  useEffect(() => {
    if (activeTab === "orders" && userId) loadOrders();
  }, [activeTab, userId, loadOrders]);

  // while an order is still being prepared, look for a new status every 20 seconds
  const hasActiveOrder = orders.some((o) => ACTIVE_STATUSES.includes(o.status));
  useEffect(() => {
    if (activeTab !== "orders" || !userId || !hasActiveOrder) return undefined;
    const id = setInterval(() => {
      if (!document.hidden) loadOrders({ silent: true });
    }, 20000);
    return () => clearInterval(id);
  }, [activeTab, userId, hasActiveOrder, loadOrders]);

  // the order lines in the language chosen on the site
  const localizedOrders = useMemo(
    () => orders.map((order) => localizeOrder(order, language || "en", t)),
    [orders, language, t],
  );

  if (loading || !currentUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-stone-500">
        <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
        <p>Loading profile...</p>
      </div>
    );
  }

  const me = normalizeUser(currentUser);
  // roles are stored in every language: {"en":"Customer","km":"..."}. The code is only the fallback
  const roleLabel = tr(pick(currentUser, "roleTitle", "role_title")) || me.role;

  // name order comes from the account: is_fullname (Latin) and is_nfullname (native)
  const displayName =
    joinName(me.firstName, me.lastName, me.isFullname) || "Customer";
  const nativeDisplayName = joinName(
    me.firstNameNative,
    me.lastNameNative,
    me.isNfullname,
  );
  const initial = (me.firstName || me.email || "U")[0].toUpperCase();

  const notify = (type, title, message) => {
    setNotice({ id: Date.now(), type, title, message });
  };

  const clearNotice = () => setNotice(null);

  const goTo = (tab) => {
    setActiveTab(tab);
    clearNotice();
  };

  const updatePasswordField = (field, value) => {
    setPasswordForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((previous) => ({
      ...previous,
      [field]: !previous[field],
    }));
  };

  /* ---------- Email change: request OTP ---------- */

  const handleRequestEmailCode = async (event) => {
    event.preventDefault();
    clearNotice();

    const email = newEmail.trim().toLowerCase();

    if (!email) {
      notify("error", "Email required", "Enter your new email address.");
      return;
    }

    if (email === me.email.trim().toLowerCase()) {
      notify(
        "error",
        "Same email address",
        "Please enter an email address different from your current one.",
      );
      return;
    }

    setEmailBusy(true);

    try {
      await profileService.requestEmailChange(email);

      setEmailCodeSent(true);
      setEmailCode("");
      setEmailCooldown(60);

      notify(
        "success",
        "Verification code sent",
        `Check ${email} for your verification code.`,
      );
    } catch (error) {
      notify("error", "Could not send code", getErrorMessage(error));
    } finally {
      setEmailBusy(false);
    }
  };

  /* ---------- Email change: verify OTP ---------- */

  const handleVerifyEmailCode = async (event) => {
    event.preventDefault();
    clearNotice();

    const email = newEmail.trim().toLowerCase();
    const code = emailCode.trim();

    if (!/^\d{6}$/.test(code)) {
      notify(
        "error",
        "Invalid verification code",
        "Enter the six-digit code from your email.",
      );
      return;
    }

    setEmailBusy(true);

    try {
      await profileService.verifyEmailChange(email, code);

      setEmailCodeSent(false);
      setEmailCode("");
      setNewEmail("");
      setEmailCooldown(0);

      // Refresh the signed-in user so the new address shows everywhere.
      try {
        await refreshUser?.();
      } catch {
        /* the next page load will pick the change up */
      }
      window.dispatchEvent(new CustomEvent("profile:email-updated"));

      notify(
        "success",
        "Email updated",
        "Your email address has been updated successfully.",
      );
    } catch (error) {
      notify("error", "Email verification failed", getErrorMessage(error));
    } finally {
      setEmailBusy(false);
    }
  };

  /* ---------- Password change: request OTP ---------- */

  const handleRequestPasswordCode = async (event) => {
    event.preventDefault();
    clearNotice();

    if (!passwordForm.currentPassword) {
      notify(
        "error",
        "Current password required",
        "Enter your current password first.",
      );
      return;
    }

    setPasswordBusy(true);

    try {
      await profileService.requestPasswordChangeCode(
        passwordForm.currentPassword,
      );

      setPasswordCodeSent(true);
      setPasswordCooldown(60);

      notify(
        "success",
        "Verification code sent",
        `A verification code has been sent to ${
          me.email || "your current email address"
        }.`,
      );
    } catch (error) {
      notify("error", "Could not send code", getErrorMessage(error));
    } finally {
      setPasswordBusy(false);
    }
  };

  /* ---------- Password change: verify OTP and save ---------- */

  const handleVerifyPasswordChange = async (event) => {
    event.preventDefault();
    clearNotice();

    if (!passwordForm.currentPassword) {
      notify("error", "Password required", "Enter your current password.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      notify(
        "error",
        "Password too short",
        "Your new password must contain at least eight characters.",
      );
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      notify(
        "error",
        "Passwords do not match",
        "Confirm your new password correctly.",
      );
      return;
    }

    if (!/^\d{6}$/.test(passwordForm.code.trim())) {
      notify(
        "error",
        "Invalid verification code",
        "Enter the six-digit code sent to your current email.",
      );
      return;
    }

    setPasswordBusy(true);

    try {
      await profileService.verifyPasswordChange({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        code: passwordForm.code.trim(),
      });

      setPasswordForm(emptyPasswordForm);
      setPasswordCodeSent(false);
      setPasswordCooldown(0);
      setShowPasswords({
        current: false,
        new: false,
        confirm: false,
      });

      notify(
        "success",
        "Password changed",
        "Your password has been changed successfully.",
      );
    } catch (error) {
      notify("error", "Password change failed", getErrorMessage(error));
    } finally {
      setPasswordBusy(false);
    }
  };

  /* ---------- Content ---------- */

  const renderOverview = () => (
    <div className="space-y-6">
      {/* identity card */}
      <Panel className="overflow-hidden">
        <div className="relative z-0 h-28 bg-gradient-to-r from-accent-500 via-orange-500 to-accent-600 sm:h-32">
          <div className="absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10" />
          <div className="absolute right-24 top-10 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-black/10" />
        </div>

        <div className="px-6 pb-6">
          <div className="relative z-10 -mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="relative z-20 flex items-end gap-4">
              {me.avatar ? (
                <button
                  type="button"
                  onClick={() => setShowAvatarLightbox(true)}
                  aria-label="View profile picture"
                  className="relative z-20 shrink-0 cursor-zoom-in rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40"
                >
                  <img
                    src={assetUrl(me.avatar)}
                    alt="Profile avatar"
                    className="h-24 w-24 rounded-2xl border-4 border-white bg-stone-100 object-cover shadow-md dark:border-stone-900 dark:bg-stone-800 sm:h-28 sm:w-28"
                  />
                </button>
              ) : (
                <div className="relative z-20 flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-accent-500 to-orange-600 text-4xl font-extrabold text-white shadow-md dark:border-stone-900 sm:h-28 sm:w-28">
                  {initial}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => goTo("security")}
              className={secondaryButton}
            >
              <Shield className="h-4 w-4" />
              Manage security
            </button>
          </div>

          <div className="mt-4 space-y-2">
            <div>
              <h2 className="break-words text-2xl font-extrabold tracking-tight text-stone-900 dark:text-white">
                {displayName}
              </h2>
              {nativeDisplayName && (
                <p className="break-words text-base font-semibold text-stone-500 dark:text-stone-400">
                  {nativeDisplayName}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-stone-600 ring-1 ring-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:ring-stone-700">
                {roleLabel}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                  me.active
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900"
                    : "bg-stone-100 text-stone-600 ring-stone-200 dark:bg-stone-800 dark:ring-stone-700"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    me.active ? "bg-emerald-500" : "bg-stone-400"
                  }`}
                />
                {me.active ? "Active" : "Inactive"}
              </span>
              <VerifiedPill verified={me.verified} />
            </div>
          </div>
        </div>
      </Panel>

      {/* details */}
      <Panel>
        <PanelHeader
          icon={User}
          title="Account details"
          description="The information linked to your account."
        />
        <div className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2">
          <InfoTile icon={Mail} label="Email address">
            <span className="break-all">{me.email || "—"}</span>
          </InfoTile>
          <InfoTile icon={Phone} label="Phone number">
            {me.phone || "—"}
          </InfoTile>
          <InfoTile icon={CalendarDays} label="Member since">
            {me.createdAt
              ? new Date(me.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "—"}
          </InfoTile>
          <InfoTile icon={Clock} label="Last sign-in">
            {me.lastLoginAt ? new Date(me.lastLoginAt).toLocaleString() : "—"}
          </InfoTile>
        </div>
      </Panel>

      {/* quick actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          {
            icon: Mail,
            title: "Change email address",
            text: "Confirm a new address with a code.",
          },
          {
            icon: KeyRound,
            title: "Change password",
            text: "Protected by a code sent to your email.",
          },
        ].map(({ icon: Icon, title, text }) => (
          <button
            key={title}
            type="button"
            onClick={() => goTo("security")}
            className="group flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm transition hover:border-accent-400 hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600 transition group-hover:bg-accent-600 group-hover:text-white dark:bg-accent-950/40 dark:text-accent-400">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-stone-900 dark:text-white">
                {title}
              </span>
              <span className="block text-xs text-stone-500">{text}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-accent-600" />
          </button>
        ))}
      </div>
    </div>
  );

  const renderSecurity = () => {
    const strengthOk = passwordForm.newPassword.length >= 8;
    const mismatch =
      passwordForm.confirmPassword !== "" &&
      passwordForm.newPassword !== passwordForm.confirmPassword;
    const matches =
      passwordForm.confirmPassword !== "" &&
      passwordForm.newPassword === passwordForm.confirmPassword;

    return (
      <div className="space-y-6">
        {isImpersonating && (
          <div className="flex items-start gap-3 rounded-2xl border border-accent-200 bg-accent-50 p-4 text-sm text-accent-900 dark:border-accent-900/60 dark:bg-accent-950/30 dark:text-accent-200">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Email and password changes are turned off while you are
              impersonating, so an administrator can never take over a
              customer's sign-in details.
            </p>
          </div>
        )}

        <fieldset
          disabled={isImpersonating}
          className={`min-w-0 space-y-6 ${isImpersonating ? "opacity-60" : ""}`}
        >
          {/* Change email */}
          <Panel>
            <PanelHeader
              icon={Mail}
              title="Email address"
              description="Confirm the new address with a one-time code before it replaces the old one."
            />

            <div className="space-y-6 p-6">
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-stone-50 p-4 dark:bg-stone-950/50">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Current email
                  </p>
                  <p className="mt-0.5 break-all text-sm font-semibold text-stone-900 dark:text-white">
                    {me.email || "No email available"}
                  </p>
                </div>
                <VerifiedPill verified={me.verified} />
              </div>

              <Stepper
                steps={["New address", "Verify code"]}
                current={emailCodeSent ? 2 : 1}
              />

              <form
                onSubmit={
                  emailCodeSent ? handleVerifyEmailCode : handleRequestEmailCode
                }
                className="space-y-5"
              >
                <label className="block">
                  <FieldLabel>New email address</FieldLabel>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      type="email"
                      className={`${inputClass} pl-10`}
                      value={newEmail}
                      onChange={(event) => setNewEmail(event.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      disabled={emailBusy || emailCodeSent}
                    />
                  </div>
                </label>

                {emailCodeSent && (
                  <div className="rounded-2xl border border-accent-200 bg-accent-50/60 p-5 dark:border-accent-900/50 dark:bg-accent-950/20">
                    <p className="text-sm font-semibold text-stone-900 dark:text-white">
                      Enter the 6-digit code
                    </p>
                    <p className="mb-4 mt-0.5 text-xs text-stone-500">
                      We sent it to{" "}
                      <b className="break-all">
                        {newEmail.trim().toLowerCase()}
                      </b>
                      .
                    </p>
                    <OtpInput
                      value={emailCode}
                      onChange={setEmailCode}
                      disabled={emailBusy}
                      autoFocus
                      label="Email verification code"
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className={primaryButton}
                    disabled={
                      emailBusy || (emailCodeSent && emailCode.length !== 6)
                    }
                  >
                    {emailBusy && (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    )}
                    {emailCodeSent
                      ? "Verify & change email"
                      : "Send verification code"}
                  </button>

                  {emailCodeSent && (
                    <>
                      <button
                        type="button"
                        className={secondaryButton}
                        disabled={emailBusy || emailCooldown > 0}
                        onClick={handleRequestEmailCode}
                      >
                        {emailCooldown > 0
                          ? `Resend in ${emailCooldown}s`
                          : "Resend code"}
                      </button>

                      <button
                        type="button"
                        className="rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-500 transition hover:text-stone-800 disabled:opacity-60 dark:hover:text-stone-200"
                        disabled={emailBusy}
                        onClick={() => {
                          setEmailCodeSent(false);
                          setEmailCode("");
                          setEmailCooldown(0);
                          clearNotice();
                        }}
                      >
                        Use a different address
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>
          </Panel>

          {/* Change password */}
          <Panel>
            <PanelHeader
              icon={KeyRound}
              title="Password"
              description="Confirm your current password, then verify a code sent to your email."
            />

            <div className="space-y-6 p-6">
              <Stepper
                steps={["Confirm identity", "Set new password"]}
                current={passwordCodeSent ? 2 : 1}
              />

              <form
                onSubmit={
                  passwordCodeSent
                    ? handleVerifyPasswordChange
                    : handleRequestPasswordCode
                }
                className="space-y-5"
              >
                <PasswordInput
                  label="Current password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    updatePasswordField("currentPassword", event.target.value)
                  }
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                  show={showPasswords.current}
                  onToggle={() => togglePasswordVisibility("current")}
                  disabled={passwordBusy || passwordCodeSent}
                />

                {passwordCodeSent && (
                  <>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div>
                        <PasswordInput
                          label="New password"
                          hint="At least 8 characters"
                          value={passwordForm.newPassword}
                          onChange={(event) =>
                            updatePasswordField(
                              "newPassword",
                              event.target.value,
                            )
                          }
                          placeholder="Create a new password"
                          autoComplete="new-password"
                          show={showPasswords.new}
                          onToggle={() => togglePasswordVisibility("new")}
                          disabled={passwordBusy}
                        />
                        <StrengthMeter password={passwordForm.newPassword} />
                      </div>

                      <div>
                        <PasswordInput
                          label="Confirm new password"
                          value={passwordForm.confirmPassword}
                          onChange={(event) =>
                            updatePasswordField(
                              "confirmPassword",
                              event.target.value,
                            )
                          }
                          placeholder="Enter it again"
                          autoComplete="new-password"
                          show={showPasswords.confirm}
                          onToggle={() => togglePasswordVisibility("confirm")}
                          disabled={passwordBusy}
                          invalid={mismatch}
                        />
                        {mismatch && (
                          <p className="mt-2 text-xs font-semibold text-rose-600">
                            The passwords do not match.
                          </p>
                        )}
                        {matches && (
                          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <Check className="h-3.5 w-3.5" /> The passwords
                            match.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-accent-200 bg-accent-50/60 p-5 dark:border-accent-900/50 dark:bg-accent-950/20">
                      <p className="text-sm font-semibold text-stone-900 dark:text-white">
                        Enter the 6-digit code
                      </p>
                      <p className="mb-4 mt-0.5 text-xs text-stone-500">
                        We sent it to <b className="break-all">{me.email}</b>.
                      </p>
                      <OtpInput
                        value={passwordForm.code}
                        onChange={(value) => updatePasswordField("code", value)}
                        disabled={passwordBusy}
                        autoFocus
                        label="Password change verification code"
                      />
                    </div>
                  </>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className={primaryButton}
                    disabled={
                      passwordBusy ||
                      (passwordCodeSent &&
                        (!strengthOk ||
                          mismatch ||
                          passwordForm.confirmPassword === "" ||
                          passwordForm.code.length !== 6))
                    }
                  >
                    {passwordBusy && (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    )}
                    {passwordCodeSent
                      ? "Verify & change password"
                      : "Send verification code"}
                  </button>

                  {passwordCodeSent && (
                    <>
                      <button
                        type="button"
                        className={secondaryButton}
                        disabled={passwordBusy || passwordCooldown > 0}
                        onClick={handleRequestPasswordCode}
                      >
                        {passwordCooldown > 0
                          ? `Resend in ${passwordCooldown}s`
                          : "Resend code"}
                      </button>

                      <button
                        type="button"
                        className="rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-500 transition hover:text-stone-800 disabled:opacity-60 dark:hover:text-stone-200"
                        disabled={passwordBusy}
                        onClick={() => {
                          setPasswordForm(emptyPasswordForm);
                          setPasswordCodeSent(false);
                          setPasswordCooldown(0);
                          clearNotice();
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>
          </Panel>
        </fieldset>

        {/* reassurance */}
        <div className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p>
            Codes expire after a short time and can only be used once. We will
            never ask you for a code by phone or chat.
          </p>
        </div>
      </div>
    );
  };

  const renderOrders = () => (
    <Panel>
      <PanelHeader
        icon={Receipt}
        title="Order history"
        description="Orders you placed while signed in. They update by themselves while being prepared."
        aside={
          <button
            type="button"
            onClick={() => loadOrders()}
            disabled={ordersLoading}
            aria-label="Refresh orders"
            title="Refresh"
            className={`${secondaryButton} !px-3 !py-2`}
          >
            <RotateCcw
              className={`h-4 w-4 ${ordersLoading ? "animate-spin" : ""}`}
            />
          </button>
        }
      />

      <div className="p-6">
        {ordersError && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
            <span className="min-w-0 break-words">{ordersError}</span>
            <button
              type="button"
              onClick={() => loadOrders()}
              className="shrink-0 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {!ordersLoaded && ordersLoading ? (
          <div className="flex items-center justify-center py-14 text-stone-500">
            <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
            <p className="text-sm">Loading your orders...</p>
          </div>
        ) : orders.length === 0 ? (
          !ordersError && (
            <div className="py-10 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-50 text-accent-500 ring-1 ring-accent-100 dark:bg-accent-950/30 dark:ring-accent-900/50">
                <Coffee className="h-7 w-7" />
              </span>
              <p className="mt-5 text-base font-bold text-stone-900 dark:text-white">
                No orders yet
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">
                When you place an order while signed in, it shows up here so you
                can follow it and see what you ordered.
              </p>
              <button
                type="button"
                onClick={() => navigate("/shop")}
                className={`${primaryButton} mt-6`}
              >
                Browse the menu
              </button>
            </div>
          )
        ) : (
          <>
            <ul className="space-y-4">
              {localizedOrders.slice(0, visibleOrders).map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onReceipt={setReceiptOrder}
                />
              ))}
            </ul>
            {orders.length > visibleOrders && (
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleOrders((n) => n + 10)}
                  className={secondaryButton}
                >
                  Show more ({orders.length - visibleOrders} more)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Panel>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "security":
        return renderSecurity();
      case "orders":
        return renderOrders();
      default:
        return renderOverview();
    }
  };

  const activeItem = NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0];

  /* ---------- Impersonation (the banner button) ---------- */
  const handleExitImpersonation = async () => {
    if (!isImpersonating || exitingImpersonation) return;

    setExitingImpersonation(true);
    clearNotice();

    try {
      await stopImpersonation();

      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Failed to exit impersonation:", error);

      notify("error", "Could not exit impersonation", getErrorMessage(error));
    } finally {
      setExitingImpersonation(false);
    }
  };

  // Normal mode: "Log out". Impersonation mode only: "Exit impersonation".
  const sessionLabel = isImpersonating ? "Exit impersonation" : "Log out";

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {isImpersonating && (
          <div
            role="status"
            className="mb-8 overflow-hidden rounded-2xl border border-accent-300 bg-accent-50 shadow-sm dark:border-accent-800 dark:bg-accent-950/30"
          >
            {/* hazard stripe */}
            <div
              aria-hidden="true"
              className="h-1.5"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #f59e0b 0 12px, #fde68a 12px 24px)",
              }}
            />
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex min-w-0 items-start gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-700 ring-1 ring-accent-200 dark:bg-accent-900/50 dark:text-accent-300 dark:ring-accent-800">
                  <Eye className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-widest text-accent-700 dark:text-accent-400">
                    Impersonation mode
                  </p>
                  <h2 className="mt-0.5 break-words text-base font-bold text-accent-950 dark:text-accent-100">
                    Viewing as {displayName}
                  </h2>
                  <p className="mt-1 text-sm text-accent-800 dark:text-accent-300">
                    You are signed in as <b className="break-all">{me.email}</b>
                    . Changing the email or password is turned off while you are
                    here.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExitImpersonation}
                disabled={exitingImpersonation}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exitingImpersonation ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                {exitingImpersonation
                  ? "Returning to admin..."
                  : "Exit impersonation"}
              </button>
            </div>
          </div>
        )}

        {/* page header */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 transition hover:text-accent-600"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("back_to_home")}
          </button>
          <p className="text-xs font-bold uppercase tracking-widest text-accent-600">
            {t("my_account")}
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">
            {activeItem.label}
          </h1>
          <p className="mt-1 text-sm text-stone-500">{activeItem.hint}</p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* navigation */}
          <aside className="w-full shrink-0 lg:w-72">
            <div className="lg:sticky lg:top-6 space-y-4">
              <div className="hidden items-center gap-3.5 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900 lg:flex">
                {me.avatar ? (
                  <img
                    src={assetUrl(me.avatar)}
                    alt=""
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-orange-600 text-lg font-bold text-white">
                    {initial}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-stone-900 dark:text-white">
                    {displayName}
                  </div>
                  {nativeDisplayName && (
                    <div className="truncate text-xs text-stone-400">
                      {nativeDisplayName}
                    </div>
                  )}
                  <div className="truncate text-xs text-stone-500">
                    {me.email}
                  </div>
                </div>
              </div>

              <nav
                aria-label="Account sections"
                className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
              >
                {NAV_ITEMS.map(({ id, label, hint, icon: Icon }) => {
                  const active = activeTab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => goTo(id)}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-left transition lg:w-full ${
                        active
                          ? "bg-accent-600 text-white shadow-md shadow-accent-600/20"
                          : "border border-stone-200 bg-white text-stone-600 hover:border-accent-400 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 lg:border-transparent lg:bg-transparent lg:hover:bg-stone-100 dark:lg:hover:bg-stone-800"
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">
                          {label}
                        </span>
                        <span
                          className={`hidden text-xs lg:block ${
                            active ? "text-white/80" : "text-stone-400"
                          }`}
                        >
                          {hint}
                        </span>
                      </span>
                      <ChevronRight
                        className={`ml-auto hidden h-4 w-4 lg:block ${
                          active ? "opacity-80" : "opacity-30"
                        }`}
                      />
                    </button>
                  );
                })}
              </nav>

              <div className="hidden border-t border-stone-200 pt-4 dark:border-stone-800 lg:block">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <LogOut className="h-[18px] w-[18px]" />
                  {sessionLabel}
                </button>
              </div>
            </div>
          </aside>

          {/* content */}
          <section className="min-w-0 flex-1 space-y-5">
            <Notice notice={notice} onClose={clearNotice} />
            {renderContent()}

            <div className="lg:hidden">
              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/30"
              >
                <LogOut className="h-4 w-4" />
                {sessionLabel}
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* The same confirmation window as the dashboard sidebar */}
      <LogoutModal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
      />

      {showAvatarLightbox && me.avatar && (
        <ImageLightbox
          src={assetUrl(me.avatar)}
          alt={`${displayName}'s profile picture`}
          title="Profile picture"
          downloadName="profile-picture"
          onClose={() => setShowAvatarLightbox(false)}
        />
      )}

      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </>
  );
}