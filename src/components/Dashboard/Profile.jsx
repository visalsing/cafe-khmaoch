import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  Pencil,
  RotateCcw,
  Mail,
  MailCheck,
  MailWarning,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { useDateFormat } from "../../utils/useDateFormat.js";
import { useDigits } from "../../utils/digitFormatter";
import {
  authService,
  profileService,
  gendersService,
  nationalitiesService,
  rolesService,
  positionsService,
  permissionsService,
  assetUrl,
} from "../../services/api";
import ImageUpload from "./ImageUpload";
import ImageLightbox from "./ImageLightbox";
import CustomSelect from "./CustomSelect";
import { inputCls, asList, tr, fmtDate } from "./Shared.jsx";

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

// "Verified" / "Unverified" pill shown next to the email
function VerifiedBadge({ verified }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${
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

// a white card with a small accent title (same look as the sections of the Add / Edit forms)
function Card({ icon: Icon, title, action, children }) {
  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent-600">
          {Icon && <Icon className="w-4 h-4" />}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const fmtDateTime = (v) => (v ? new Date(v).toLocaleString() : "—");
const EMAIL_RE = /^\S+@\S+\.\S+$/;

/* ---------- the API row -> one clean shape ----------
   Accepts camelCase (firstName) or snake_case (first_name) keys, so the page keeps
   working whichever one the server returns. */
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
const normalizeUser = (u) => ({
  id: u.id,
  firstName: pick(u, "firstName", "first_name") ?? "",
  lastName: pick(u, "lastName", "last_name") ?? "",
  firstNameNative: pick(u, "firstNameNative", "first_name_native") ?? "",
  lastNameNative: pick(u, "lastNameNative", "last_name_native") ?? "",
  email: pick(u, "email") ?? "",
  phone: pick(u, "phone") ?? "",
  role: pick(u, "role", "roleCode", "role_code") ?? "",
  genderId: pick(u, "genderId", "gender_id") ?? "",
  nationalityId: pick(u, "nationalityId", "nationality_id") ?? "",
  positionId: pick(u, "positionId", "position_id") ?? "",
  permissionId: pick(u, "permissionId", "permission_id") ?? "",
  address: pick(u, "address") ?? "",
  region: pick(u, "region") ?? "",
  country: pick(u, "country") ?? "",
  description: pick(u, "description") ?? "",
  status: toBit(pick(u, "status"), 1),
  isVerifiedEmail: toBit(pick(u, "isVerifiedEmail", "is_verified_email"), 0),
  emailVerifiedAt: pick(u, "emailVerifiedAt", "email_verified_at"),
  avatar: pick(u, "avatar") ?? "",
  avatarThumbnail: pick(u, "avatarThumbnail", "avatar_thumbnail") ?? "",
  createdAt: pick(u, "createdAt", "created_at"),
  updatedAt: pick(u, "updatedAt", "updated_at"),
  lastLoginAt: pick(u, "lastLoginAt", "last_login_at"),
});

const fullName = (u) => `${u.lastName} ${u.firstName}`.trim();
const nativeName = (u) => `${u.lastNameNative} ${u.firstNameNative}`.trim();

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
const FALLBACK_ROLES = { customer: "Customer", staff: "Staff", admin: "Admin" };

/* ---------- form helpers ----------
   A person can only edit their OWN personal details here. Role, status, blocked,
   position and permission are NOT editable on this page (an admin changes them in Users). */
const emptyForm = {
  firstName: "",
  lastName: "",
  firstNameNative: "",
  lastNameNative: "",
  email: "",
  phone: "",
  genderId: "",
  nationalityId: "",
  address: "",
  region: "",
  country: "",
  description: "",
};
const NO_IMAGE_CHANGE = { file: null, remove: false };
const emptyPw = { current: "", next: "", confirm: "" };

// the form values for the signed-in user (used when opening Edit and for the "nothing changed" check)
const formFromProfile = (u) => ({
  firstName: u.firstName,
  lastName: u.lastName,
  firstNameNative: u.firstNameNative,
  lastNameNative: u.lastNameNative,
  email: u.email,
  phone: u.phone,
  genderId: u.genderId,
  nationalityId: u.nationalityId,
  address: u.address,
  region: u.region,
  country: u.country,
  description: u.description,
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
    gender: idOrNull(f.genderId),
    nationality: idOrNull(f.nationalityId),
    address: f.address.trim(),
    region: f.region.trim(),
    country: f.country.trim(),
    description: f.description.trim(),
  });

// loads one lookup list; a missing service or a failed request just leaves the list empty
const loadLookup = (service, setter) =>
  Promise.resolve(service?.list?.())
    .then((d) => setter(asList(d)))
    .catch(() => {});

export default function Profile() {
  // const { refreshUser } = useAuth(); // re-reads the signed-in user so the sidebar / top bar show the new name and photo
  const { refreshUser, isImpersonating, stopImpersonation } = useAuth();
  const { language, t } = useLanguage();
  const { date, dateTime } = useDateFormat();
  const formatNum = useDigits();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // lookups for the select boxes and the labels
  const [genders, setGenders] = useState([]);
  const [nationalities, setNationalities] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [positions, setPositions] = useState([]);
  const [permissions, setPermissions] = useState([]);

  // edit profile modal
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [imageChange, setImageChange] = useState(NO_IMAGE_CHANGE);
  const [saving, setSaving] = useState(false);
  const [modalHidden, setModalHidden] = useState(false); // form is hidden (not lost) while its alert is shown
  const [lightboxOpen, setLightboxOpen] = useState(false); // full-screen avatar

  // email verification
  const [code, setCode] = useState("");
  const [codeBusy, setCodeBusy] = useState(""); // "" | "send" | "verify"
  const [cooldown, setCooldown] = useState(0); // seconds until a new code can be requested

  // Change email
  const [newEmail, setNewEmail] = useState("");
  const [emailChangeCode, setEmailChangeCode] = useState("");
  const [emailChangeRequested, setEmailChangeRequested] = useState(false);
  const [emailChangeBusy, setEmailChangeBusy] = useState(false);

  // Change password OTP
  const [passwordCode, setPasswordCode] = useState("");
  const [passwordCodeRequested, setPasswordCodeRequested] = useState(false);
  const [passwordCodeBusy, setPasswordCodeBusy] = useState(false);

  // Forgot Password
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [forgotPasswordCodeRequested, setForgotPasswordCodeRequested] =
    useState(false);
  const [forgotPasswordCode, setForgotPasswordCode] = useState("");
  const [forgotPasswordBusy, setForgotPasswordBusy] = useState(false);
  const [forgotPasswordSaving, setForgotPasswordSaving] = useState(false);
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");

  // change password
  const [pw, setPw] = useState(emptyPw);
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  // ALL alerts are shown on the page, under the title
  const [notice, setNotice] = useState(null); // { id, type, title, message, returnToForm }
  const noticeRef = useRef(null);

  const notify = (type, title, message, { returnToForm = false } = {}) =>
    setNotice({ id: Date.now(), type, title, message, returnToForm });

  // closing an alert that came from the form brings the form back
  const dismissNotice = () => {
    if (notice?.returnToForm) setModalHidden(false);
    setNotice(null);
  };

  // returns true when the profile was loaded; silent = no "Loading..." flash
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      let data;
      try {
        data = await profileService.get();
      } catch (err) {
        // the /profile endpoint is not on the server yet -> use the sign-in endpoint instead
        if (err.status !== 404) throw err;
        data = await authService.me();
      }
      const raw = data?.user || data;
      if (!raw || raw.id === undefined || raw.id === null)
        throw new Error("Could not load your profile.");
      setProfile(normalizeUser(raw));
      return true;
    } catch (err) {
      console.error("Failed to load the profile:", err);
      setError(err.message || "Failed to load your profile.");
      return false;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

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

  // counts down the "send a new code" wait
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const roleLabel = (roleCode) => {
    const fromTable = rolesList.find((r) => r.code === roleCode);
    return (
      (fromTable && labelOf(fromTable.role_title)) ||
      FALLBACK_ROLES[roleCode] ||
      (roleCode ? roleCode.toUpperCase() : "—")
    );
  };

  const nameIn = (list, id, key) => {
    if (id === "" || id === null || id === undefined) return "—";
    const item = list.find((x) => x.id === Number(id));
    return item ? labelOf(item[key]) || "—" : `#${id}?`;
  };
  const lookupOptions = (list, key) => [
    { value: "", label: "None" },
    ...list.map((x) => ({ value: x.id, label: labelOf(x[key]) || `#${x.id}` })),
  ];

  const openEdit = () => {
    setForm(formFromProfile(profile));
    setImageChange(NO_IMAGE_CHANGE);
    setNotice(null);
    setModalHidden(false);
    setEditing(true);
  };

  const close = () => {
    setEditing(false);
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

    if (!form.firstName.trim()) return warn("First name is required.");
    if (!EMAIL_RE.test(form.email.trim()))
      return warn("Please enter a valid email.");

    // editing but nothing was touched (no field changed, no avatar chosen/removed)
    const textChanged =
      fingerprint(form) !== fingerprint(formFromProfile(profile));
    const imageChanged = Boolean(imageChange.file || imageChange.remove);
    if (!textChanged && !imageChanged) {
      close();
      return notify(
        "warning",
        "No changes",
        "There is nothing updated/changed.",
      );
    }

    const emailChanged =
      form.email.trim().toLowerCase() !== profile.email.toLowerCase();

    setSaving(true);
    try {
      // multipart form: text fields + the avatar file (server makes avatar + thumbnail from it)
      const fd = new FormData();
      fd.append("firstName", form.firstName.trim());
      fd.append("lastName", form.lastName.trim());
      fd.append("firstNameNative", form.firstNameNative.trim());
      fd.append("lastNameNative", form.lastNameNative.trim());
      // fd.append("email", form.email.trim());
      fd.append("phone", form.phone.trim());
      fd.append("genderId", String(form.genderId ?? ""));
      fd.append("nationalityId", String(form.nationalityId ?? ""));
      fd.append("address", form.address.trim());
      fd.append("region", form.region.trim());
      fd.append("country", form.country.trim());
      fd.append("description", form.description.trim());
      if (imageChange.file)
        fd.append("image", imageChange.file); // field name must be "image"
      else if (imageChange.remove) fd.append("removeAvatar", "1");

      const saved = await profileService.update(fd);

      close();
      await load({ silent: true });
      await refreshUser?.();
      notify(
        "success",
        "Profile updated",
        "Your profile was updated successfully." +
          (emailChanged
            ? saved?.verificationSent
              ? " A verification code was sent to your new email address."
              : " Your new email address still needs to be verified."
            : ""),
      );
    } catch (err) {
      console.error("Error saving the profile:", err);
      setModalHidden(true);
      notify(
        "error",
        "Failed to update your profile",
        err.message || "Something went wrong. Please try again.",
        { returnToForm: true },
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [ok] = await Promise.all([load({ silent: true }), loadLookups()]);
      if (ok !== false) {
        await refreshUser?.();
        notify(
          "success",
          "Profile refreshed",
          "Your profile was reloaded from the database.",
        );
      }
    } finally {
      setRefreshing(false);
    }
  };

  // email a verification code to the signed-in user
  const handleSendCode = async () => {
    if (cooldown > 0 || codeBusy) return;
    setCodeBusy("send");
    try {
      const res = await profileService.sendVerification();
      const wait = Math.ceil(Number(res?.retryAfter));
      setCooldown(wait > 0 ? wait : 60);
      notify(
        "success",
        "Code sent",
        `A 6-digit code was sent to ${profile.email}. Enter it below to verify your email.`,
      );
    } catch (err) {
      notify(
        "error",
        "Failed to send the code",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setCodeBusy("");
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (codeBusy) return;
    if (code.length !== 6)
      return notify(
        "warning",
        "Enter the code",
        "Type the 6-digit code from the email.",
      );
    setCodeBusy("verify");
    try {
      await profileService.verifyEmail(code);
      setCode("");
      setCooldown(0);
      await load({ silent: true });
      await refreshUser?.();
      notify(
        "success",
        "Email verified",
        "Thank you. Your email address is now verified.",
      );
    } catch (err) {
      notify(
        "error",
        "Could not verify the email",
        err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setCodeBusy("");
    }
  };

  const handleRequestEmailChange = async (e) => {
    e.preventDefault();

    const targetEmail = newEmail.trim().toLowerCase();

    if (!EMAIL_RE.test(targetEmail)) {
      return notify(
        "warning",
        "Invalid email",
        "Enter a valid new email address.",
      );
    }

    if (targetEmail === profile.email.trim().toLowerCase()) {
      return notify(
        "warning",
        "No change",
        "Enter an email address different from your current one.",
      );
    }

    setEmailChangeBusy(true);

    try {
      await profileService.requestEmailChange(targetEmail);

      setNewEmail(targetEmail);
      setEmailChangeRequested(true);

      notify(
        "success",
        "Verification code sent",
        `Check ${targetEmail} for your 6-digit verification code.`,
      );
    } catch (err) {
      notify(
        "error",
        "Could not send the code",
        err.message || "Please try again.",
      );
    } finally {
      setEmailChangeBusy(false);
    }
  };

  const handleVerifyEmailChange = async (e) => {
    e.preventDefault();

    if (!/^\d{6}$/.test(emailChangeCode.trim())) {
      return notify("warning", "Invalid code", "Enter the 6-digit code.");
    }

    setEmailChangeBusy(true);

    try {
      await profileService.verifyEmailChange(
        newEmail.trim().toLowerCase(),
        emailChangeCode.trim(),
      );

      setEmailChangeCode("");
      setEmailChangeRequested(false);
      setNewEmail("");

      await load({ silent: true });
      await refreshUser?.();

      notify(
        "success",
        "Email changed",
        "Your new email address has been verified and saved.",
      );
    } catch (err) {
      notify(
        "error",
        "Email change failed",
        err.message || "The code may be incorrect or expired.",
      );
    } finally {
      setEmailChangeBusy(false);
    }
  };

  // const handlePassword = async (e) => {
  //   e.preventDefault();
  //   if (pwSaving) return;

  //   const warn = (message) =>
  //     notify("warning", "Please check the form", message);

  //   if (!pw.current) return warn("Enter your current password.");
  //   if (pw.next.length < 8)
  //     return warn("The new password must be at least 8 characters.");
  //   if (pw.next !== pw.confirm)
  //     return warn("The new password and the confirmation do not match.");
  //   if (pw.next === pw.current)
  //     return warn("The new password must be different from the current one.");

  //   setPwSaving(true);
  //   try {
  //     await profileService.changePassword(pw.current, pw.next);
  //     setPw(emptyPw);
  //     notify(
  //       "success",
  //       "Password updated",
  //       "Your password was changed successfully.",
  //     );
  //   } catch (err) {
  //     notify(
  //       "error",
  //       "Failed to update the password",
  //       err.message || "Something went wrong. Please try again.",
  //     );
  //   } finally {
  //     setPwSaving(false);
  //   }
  // };

  const handlePassword = async (e) => {
    e.preventDefault();

    if (pwSaving || passwordCodeBusy) return;

    const warn = (message) =>
      notify("warning", "Please check the form", message);

    if (!pw.current) return warn("Enter your current password.");

    if (pw.next.length < 8) {
      return warn("The new password must be at least 8 characters.");
    }

    if (pw.next !== pw.confirm) {
      return warn("The new password and confirmation do not match.");
    }

    if (pw.next === pw.current) {
      return warn("Your new password must differ from your current password.");
    }

    // First submission: validate the current password and send an OTP.
    if (!passwordCodeRequested) {
      setPasswordCodeBusy(true);

      try {
        await profileService.requestPasswordChangeCode(pw.current);
        setPasswordCodeRequested(true);

        notify(
          "success",
          "Verification code sent",
          `Check ${profile.email} for your 6-digit password-change code.`,
        );
      } catch (err) {
        notify(
          "error",
          "Could not send the code",
          err.message || "Please check your current password and try again.",
        );
      } finally {
        setPasswordCodeBusy(false);
      }

      return;
    }

    // Second submission: verify the OTP and change the password.
    if (!/^\d{6}$/.test(passwordCode.trim())) {
      return warn("Enter the 6-digit verification code.");
    }

    setPwSaving(true);

    try {
      await profileService.verifyPasswordChange({
        currentPassword: pw.current,
        newPassword: pw.next,
        code: passwordCode.trim(),
      });

      setPw(emptyPw);
      setPasswordCode("");
      setPasswordCodeRequested(false);

      notify(
        "success",
        "Password updated",
        "Your password was changed successfully.",
      );
    } catch (err) {
      notify(
        "error",
        "Failed to update the password",
        err.message || "The code may be incorrect or expired.",
      );
    } finally {
      setPwSaving(false);
    }
  };

  const handleRequestForgotPasswordCode = async () => {
    if (forgotPasswordBusy || forgotPasswordSaving) return;

    setForgotPasswordBusy(true);

    try {
      // await profileService.requestForgotPasswordChangeCode();
      await profileService.requestForgotPasswordChangeCode(profile.email);

      setForgotPasswordCodeRequested(true);

      notify(
        "success",
        "Verification code sent",
        `Check ${profile.email} for your 6-digit password-reset code.`,
      );
    } catch (err) {
      notify(
        "error",
        "Could not send the code",
        err.message || "Please try again.",
      );
    } finally {
      setForgotPasswordBusy(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();

    if (forgotPasswordSaving || forgotPasswordBusy) return;

    const email = profile?.email?.trim().toLowerCase();
    const code = forgotPasswordCode.trim();

    if (!email) {
      return notify(
        "error",
        "Missing email",
        "Could not find your registered email.",
      );
    }

    if (!/^\d{6}$/.test(code)) {
      return notify("warning", "Invalid code", "Enter the 6-digit code.");
    }

    if (forgotNewPassword.length < 8) {
      return notify(
        "warning",
        "Password too short",
        "Your new password must be at least 8 characters.",
      );
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      return notify(
        "warning",
        "Passwords do not match",
        "Confirm your new password correctly.",
      );
    }

    setForgotPasswordSaving(true);

    try {
      // Step 1: Verify the email OTP and obtain a reset token.
      const verification = await profileService.verifyForgotPasswordCode({
        email,
        code,
      });

      const resetToken = verification?.resetToken;

      if (!resetToken) {
        throw new Error("The server did not return a password-reset token.");
      }

      // Step 2: Confirm the password reset using the token.
      await profileService.confirmForgotPasswordReset({
        resetToken,
        password: forgotNewPassword,
      });

      setForgotPasswordMode(false);
      setForgotPasswordCodeRequested(false);
      setForgotPasswordCode("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");

      setPw(emptyPw);
      setPasswordCode("");
      setPasswordCodeRequested(false);

      notify(
        "success",
        "Password updated",
        "Your password was reset successfully. You can now sign in with your new password.",
      );
    } catch (err) {
      console.error("Forgot-password reset failed:", err);

      notify(
        "error",
        "Could not reset password",
        err.message || "The code may be incorrect or expired.",
      );
    } finally {
      setForgotPasswordSaving(false);
    }
  };

  const labelCls = "text-sm text-slate-600 dark:text-slate-400 block w-full";
  const sectionTitle =
    "text-xs font-bold uppercase tracking-wider text-accent-600";
  const pwType = showPw ? "text" : "password";

  const isVerified = profile?.isVerifiedEmail === 1;
  const pwMismatch = pw.confirm !== "" && pw.next !== pw.confirm;

  // content of the lightbox "Info" popup (dark style, because the lightbox is dark)
  const lightboxInfo = profile ? (
    <div className="space-y-3 text-sm">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-accent-500">
          Name
        </span>
        <p className="mt-1 font-medium">{fullName(profile)}</p>
      </div>
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-accent-500">
          Email
        </span>
        <p className="mt-1 text-slate-300 text-xs">{profile.email}</p>
      </div>
      <div className="pt-2 border-t border-slate-800">
        <span className="text-[11px] text-slate-400">Role</span>
        <p className="font-semibold">{roleLabel(profile.role)}</p>
      </div>
    </div>
  ) : null;

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
          <h1 className="text-2xl font-extrabold">{t("my_profile")}</h1>
          <p className="text-sm text-slate-500">
            Your personal details, email verification and password.
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 hover:border-accent-500 disabled:opacity-60 transition-colors"
          >
            <RotateCcw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {t("refresh")}
          </button>
          <button
            onClick={openEdit}
            disabled={!profile}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white flex items-center gap-2 transition-colors shadow-sm"
          >
            <Pencil className="w-4 h-4" /> {t("edit_profile")}
          </button>
        </div>
      </div>

      {/* ===== ALERTS: under the title ===== */}
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
          title="Could not load your profile"
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

      {loading && !profile && (
        <p className="text-center py-16 text-slate-400">
          Loading your profile...
        </p>
      )}

      {profile && (
        <>
          {/* ===== summary ===== */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              {profile.avatar ? (
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  aria-label="View avatar full screen"
                  title="Click to view full screen"
                  className="shrink-0 cursor-zoom-in self-start"
                >
                  <img
                    src={assetUrl(profile.avatar)}
                    alt=""
                    className="w-24 h-24 rounded-full object-cover bg-slate-100 dark:bg-slate-800"
                  />
                </button>
              ) : (
                <div className="w-24 h-24 shrink-0 rounded-full bg-accent-100 dark:bg-accent-950/40 text-accent-700 dark:text-accent-400 font-bold text-3xl flex items-center justify-center self-start">
                  {profile.firstName?.[0]?.toUpperCase() || (
                    <UserIcon className="w-10 h-10" />
                  )}
                </div>
              )}

              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <h2 className="text-2xl font-extrabold break-words">
                    {fullName(profile) || "Your profile"}
                  </h2>
                  {nativeName(profile) && (
                    <p className="text-sm text-slate-400">
                      {nativeName(profile)}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-600 dark:text-slate-300 break-all">
                    {profile.email}
                  </span>
                  <VerifiedBadge verified={isVerified} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                      ROLE_BADGE[profile.role] || ROLE_BADGE.customer
                    }`}
                  >
                    {roleLabel(profile.role)}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                      profile.status === 1
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {profile.status === 1 ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ===== personal details ===== */}
            <Card icon={UserIcon} title="Personal details">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Native name">{nativeName(profile) || "—"}</Field>
                <Field label="Phone">{profile.phone || "—"}</Field>
                <Field label="Gender">
                  {nameIn(genders, profile.genderId, "gender")}
                </Field>
                <Field label="Nationality">
                  {nameIn(nationalities, profile.nationalityId, "nationality")}
                </Field>
                <Field label="Country">{profile.country || "—"}</Field>
                <Field label="Region">{profile.region || "—"}</Field>
                <div className="col-span-2">
                  <Field label="Address">{profile.address || "—"}</Field>
                </div>
                {profile.description && (
                  <div className="col-span-2">
                    <Field label="About">
                      <span className="whitespace-pre-wrap">
                        {profile.description}
                      </span>
                    </Field>
                  </div>
                )}
              </div>
            </Card>

            {/* ===== account (read-only: an admin changes these in Users) ===== */}
            <Card icon={ShieldCheck} title="Account">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Role">{roleLabel(profile.role)}</Field>
                <Field label="Position">
                  {nameIn(positions, profile.positionId, "position_title")}
                </Field>
                <Field label="Extra permission">
                  {nameIn(permissions, profile.permissionId, "name")}
                </Field>
                <Field label="Member since">
                  {dateTime(profile.createdAt)}
                </Field>
                <Field label="Last login">
                  {profile.lastLoginAt
                    ? dateTime(profile.lastLoginAt)
                    : "Never"}
                </Field>
                <Field label="Last updated">
                  {dateTime(profile.updatedAt)}
                </Field>
              </div>
              <p className="text-xs text-slate-500">
                Your role and permissions are managed by an administrator.
              </p>
            </Card>
          </div>

          {/* ===== email verification ===== */}
          <Card
            icon={Mail}
            title="Email verification"
            action={<VerifiedBadge verified={isVerified} />}
          >
            {isVerified ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <b>{profile.email}</b> was verified
                {profile.emailVerifiedAt
                  ? ` on ${dateTime(profile.emailVerifiedAt)}`
                  : ""}
                .
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Your email <b>{profile.email}</b> is not verified yet. We send
                  a 6-digit code to it; type the code here to confirm it is
                  yours.
                </p>

                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={cooldown > 0 || Boolean(codeBusy)}
                    className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:border-accent-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    {codeBusy === "send"
                      ? "Sending..."
                      : cooldown > 0
                        ? `Send again in ${cooldown}s`
                        : "Send code"}
                  </button>

                  <form
                    onSubmit={handleVerify}
                    className="flex flex-1 gap-3 sm:max-w-sm"
                  >
                    <input
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="123456"
                      aria-label="6-digit verification code"
                      className={`${inputCls} text-center font-mono tracking-[0.4em] text-base`}
                    />
                    <button
                      disabled={code.length !== 6 || Boolean(codeBusy)}
                      className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-accent-600 hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors shadow-sm"
                    >
                      {codeBusy === "verify" ? "Checking..." : "Verify"}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </Card>

          {/* ===== email change form ==== */}
          <Card icon={Mail} title="Change email">
            <p className="text-sm text-slate-500">
              Current email: <strong>{profile?.email || "—"}</strong>
            </p>

            <form onSubmit={handleRequestEmailChange} className="space-y-3">
              <label className={labelCls}>
                New email address
                <input
                  type="email"
                  required
                  value={newEmail}
                  disabled={emailChangeBusy || emailChangeRequested}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className={`${inputCls} mt-1 w-full`}
                  placeholder="you@example.com"
                />
              </label>

              {!emailChangeRequested ? (
                <button
                  type="submit"
                  disabled={emailChangeBusy}
                  className="px-4 py-2 rounded-xl bg-accent-600 text-white font-semibold disabled:opacity-50"
                >
                  {emailChangeBusy
                    ? "Sending code..."
                    : "Send verification code"}
                </button>
              ) : (
                <p className="text-sm text-slate-500">
                  Your current email remains active until the new address is
                  verified.
                </p>
              )}
            </form>

            {emailChangeRequested && (
              <form onSubmit={handleVerifyEmailChange} className="space-y-3">
                <label className={labelCls}>
                  Verification code
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={emailChangeCode}
                    onChange={(e) =>
                      setEmailChangeCode(
                        e.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    className={`${inputCls} mt-1 w-full`}
                    placeholder="6-digit code"
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={emailChangeBusy || emailChangeCode.length !== 6}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50"
                  >
                    {emailChangeBusy
                      ? "Verifying..."
                      : "Verify and change email"}
                  </button>

                  <button
                    type="button"
                    disabled={emailChangeBusy}
                    onClick={() => {
                      setEmailChangeRequested(false);
                      setEmailChangeCode("");
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </Card>

          {/* ===== change password ===== */}
          <Card icon={KeyRound} title="Change password">
            {!forgotPasswordMode ? (
              <>
                <form
                  onSubmit={handlePassword}
                  className="space-y-4"
                  noValidate
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className={labelCls}>
                      Current password
                      <input
                        type={pwType}
                        autoComplete="current-password"
                        className={`${inputCls} mt-1 w-full`}
                        value={pw.current}
                        onChange={(e) =>
                          setPw({ ...pw, current: e.target.value })
                        }
                        required
                      />
                    </label>

                    <label className={labelCls}>
                      New password
                      <input
                        type={pwType}
                        autoComplete="new-password"
                        className={`${inputCls} mt-1 w-full`}
                        placeholder="At least 8 characters"
                        value={pw.next}
                        onChange={(e) => setPw({ ...pw, next: e.target.value })}
                        required
                      />
                    </label>

                    <label className={labelCls}>
                      Confirm new password
                      <input
                        type={pwType}
                        autoComplete="new-password"
                        className={`${inputCls} mt-1 w-full ${
                          pwMismatch
                            ? "border-red-400 focus:border-red-500"
                            : ""
                        }`}
                        value={pw.confirm}
                        onChange={(e) =>
                          setPw({ ...pw, confirm: e.target.value })
                        }
                        required
                      />
                      {pwMismatch && (
                        <span className="block mt-1 text-xs text-red-600">
                          The passwords do not match.
                        </span>
                      )}
                    </label>

                    {passwordCodeRequested && (
                      <label className={labelCls}>
                        Email verification code
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={passwordCode}
                          onChange={(e) =>
                            setPasswordCode(
                              e.target.value.replace(/\D/g, "").slice(0, 6),
                            )
                          }
                          className={`${inputCls} mt-1 w-full`}
                          placeholder="Enter the 6-digit code"
                          required
                        />
                        <span className="block mt-1 text-xs text-slate-500">
                          A code was sent to {profile.email}.
                        </span>
                      </label>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="text-sm text-slate-500 hover:text-accent-600 flex items-center gap-1.5"
                      >
                        {showPw ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                        {showPw ? "Hide passwords" : "Show passwords"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setForgotPasswordMode(true);
                          setNotice(null);
                        }}
                        className="text-sm font-medium text-accent-600 hover:text-accent-700 hover:underline"
                      >
                        Forgot current password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={pwSaving || passwordCodeBusy}
                      className="px-4 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-semibold disabled:opacity-50"
                    >
                      {pwSaving
                        ? "Updating password..."
                        : passwordCodeBusy
                          ? "Sending code..."
                          : passwordCodeRequested
                            ? "Verify code and change password"
                            : "Send code to change password"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <form
                onSubmit={handleForgotPasswordSubmit}
                className="space-y-4"
                noValidate
              >
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                    Reset password without your current password
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    We will send a verification code to your registered email
                    address: <strong>{profile.email}</strong>.
                  </p>
                </div>

                {!forgotPasswordCodeRequested ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleRequestForgotPasswordCode}
                      disabled={forgotPasswordBusy}
                      className="px-4 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-semibold disabled:opacity-50"
                    >
                      {forgotPasswordBusy
                        ? "Sending code..."
                        : "Send reset code"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setForgotPasswordMode(false);
                        setForgotPasswordCode("");
                      }}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold"
                    >
                      Back to change password
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <label className={labelCls}>
                        Email verification code
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          required
                          value={forgotPasswordCode}
                          onChange={(e) =>
                            setForgotPasswordCode(
                              e.target.value.replace(/\D/g, "").slice(0, 6),
                            )
                          }
                          className={`${inputCls} mt-1 w-full`}
                          placeholder="6-digit code"
                        />
                      </label>

                      <label className={labelCls}>
                        New password
                        <input
                          type={pwType}
                          autoComplete="new-password"
                          required
                          minLength={8}
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          className={`${inputCls} mt-1 w-full`}
                          placeholder="At least 8 characters"
                        />
                      </label>

                      <label className={labelCls}>
                        Confirm new password
                        <input
                          type={pwType}
                          autoComplete="new-password"
                          required
                          minLength={8}
                          value={forgotConfirmPassword}
                          onChange={(e) =>
                            setForgotConfirmPassword(e.target.value)
                          }
                          className={`${inputCls} mt-1 w-full ${
                            forgotConfirmPassword &&
                            forgotNewPassword !== forgotConfirmPassword
                              ? "border-red-400 focus:border-red-500"
                              : ""
                          }`}
                          placeholder="Confirm new password"
                        />
                        {forgotConfirmPassword &&
                          forgotNewPassword !== forgotConfirmPassword && (
                            <span className="block mt-1 text-xs text-red-600">
                              The passwords do not match.
                            </span>
                          )}
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-4">
                        <button
                          type="button"
                          onClick={() => setShowPw((v) => !v)}
                          className="text-sm text-slate-500 hover:text-accent-600 flex items-center gap-1.5"
                        >
                          {showPw ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                          {showPw ? "Hide passwords" : "Show passwords"}
                        </button>

                        <button
                          type="button"
                          disabled={forgotPasswordBusy}
                          onClick={handleRequestForgotPasswordCode}
                          className="text-sm font-medium text-accent-600 hover:underline disabled:opacity-50"
                        >
                          {forgotPasswordBusy ? "Sending..." : "Resend code"}
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={
                          forgotPasswordSaving ||
                          forgotPasswordCode.length !== 6 ||
                          forgotNewPassword.length < 8 ||
                          forgotNewPassword !== forgotConfirmPassword
                        }
                        className="px-4 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-semibold disabled:opacity-50"
                      >
                        {forgotPasswordSaving
                          ? "Resetting password..."
                          : "Verify code and reset password"}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
          </Card>
        </>
      )}

      {/* full-screen avatar */}
      {lightboxOpen && profile?.avatar && (
        <ImageLightbox
          src={assetUrl(profile.avatar)}
          alt={fullName(profile)}
          title={fullName(profile)}
          info={lightboxInfo}
          infoTitle={t("my_profile")}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/* ===== EDIT PROFILE modal ===== */}
      {editing && profile && (
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
              <h3 className="text-lg font-bold">{t("edit_profile")}</h3>
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
                  key={profile.id}
                  label="Avatar"
                  currentUrl={assetUrl(profile.avatar)}
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
                    {t("last_name")}
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
                <h4 className={sectionTitle}>Contact</h4>
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
                      Changing your email marks it unverified and sends a code
                      to the new address.
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`${labelCls} sm:col-span-2`}>
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
                  About you
                  <textarea
                    rows={3}
                    className={`${inputCls} mt-1 w-full resize-none`}
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                  />
                </label>
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
                  {saving ? "Saving..." : "Save profile"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
