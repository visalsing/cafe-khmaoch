import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, KeyRound, MailCheck, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { passwordResetService } from "../../services/api";
import LoadingScreen from "../Loading/Loading";

const OTP_LENGTH = 6;
const MIN_PASSWORD = 8;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

const maskEmail = (email) => {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, 2)}${"*".repeat(Math.max(1, name.length - 2))}@${domain}`;
};

const STEPS = ["email", "code", "password"];

export default function ForgetPassword() {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("email"); // "email" | "code" | "password"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cooldown, setCooldown] = useState(0); // seconds until "Resend" works again

  // people who are already signed in do not need this page
  useEffect(() => {
    if (!loading && currentUser) navigate("/", { replace: true });
  }, [loading, currentUser, navigate]);

  // resend countdown
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const fail = (err, fallback) => setError(err?.message || fallback);

  const restart = () => {
    setStep("email");
    setCode("");
    setResetToken("");
    setPassword("");
    setConfirm("");
    setError("");
    setInfo("");
    setCooldown(0);
  };

  /* ----- step 1: send the code ----- */
  const sendCode = async (e) => {
    e.preventDefault();
    if (busy) return;
    const clean = email.trim();
    if (!EMAIL_RE.test(clean)) return setError("Please enter a valid email address.");

    setBusy(true);
    setError("");
    setInfo("");
    try {
      const res = await passwordResetService.requestCode(clean);
      setEmail(clean);
      setCode("");
      setStep("code");
      setCooldown(res?.resendAfter ?? 60);
      setInfo("If an account exists for that email, a 6-digit code is on its way.");
    } catch (err) {
      fail(err, "Could not send the code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (busy || cooldown > 0) return;
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const res = await passwordResetService.requestCode(email);
      setCode("");
      setCooldown(res?.resendAfter ?? 60);
      setInfo("A new code is on its way. Older codes no longer work.");
    } catch (err) {
      fail(err, "Could not send a new code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  /* ----- step 2: check the code ----- */
  const verify = async (value = code) => {
    if (busy) return;
    if (value.length !== OTP_LENGTH) return setError(`Enter the ${OTP_LENGTH}-digit code from your email.`);

    setBusy(true);
    setError("");
    setInfo("");
    try {
      const res = await passwordResetService.verifyCode(email, value);
      setResetToken(res.resetToken);
      setStep("password");
    } catch (err) {
      fail(err, "That code is incorrect or has expired.");
    } finally {
      setBusy(false);
    }
  };

  const onCodeChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH); // pasting "123 456" works too
    setCode(digits);
    setError("");
    if (digits.length === OTP_LENGTH) verify(digits); // the 6th digit submits by itself
  };

  /* ----- step 3: new password ----- */
  const savePassword = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (password.length < MIN_PASSWORD) return setError(`Password must be at least ${MIN_PASSWORD} characters.`);
    if (password !== confirm) return setError("The two passwords do not match.");

    setBusy(true);
    setError("");
    try {
      await passwordResetService.resetPassword(resetToken, password);
      navigate("/login", {
        replace: true,
        state: { notice: "Your password was changed. Please sign in with your new password." },
      });
    } catch (err) {
      fail(err, "Could not change the password. Please start again.");
    } finally {
      setBusy(false);
    }
  };

  if (loading || currentUser) return <LoadingScreen />;

  const inputCls =
    "w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm";
  const primaryBtn =
    "w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-md text-sm cursor-pointer";

  const heading = {
    email: { Icon: MailCheck, title: "Forgot your password?", text: "Enter the email of your account and we will send you a 6-digit code." },
    code: { Icon: KeyRound, title: "Check your email", text: `We sent a 6-digit code to ${maskEmail(email)}. It expires in 10 minutes.` },
    password: { Icon: ShieldCheck, title: "Create a new password", text: "Choose a password you have not used before." },
  }[step];

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm p-8 space-y-6">
        {/* progress */}
        <div className="flex gap-2" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`h-1.5 flex-1 rounded-full ${
                i <= STEPS.indexOf(step) ? "bg-amber-500" : "bg-stone-200 dark:bg-stone-700"
              }`}
            />
          ))}
        </div>

        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <heading.Icon className="w-6 h-6 text-amber-600" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">{heading.title}</h1>
          <p className="text-sm text-stone-500">{heading.text}</p>
        </div>

        {/* ===== step 1 ===== */}
        {step === "email" && (
          <form onSubmit={sendCode} className="space-y-4">
            <div>
              <label htmlFor="fp-email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                id="fp-email"
                name="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                className={inputCls}
              />
            </div>
            <button disabled={busy} className={primaryBtn}>
              {busy ? "Sending..." : "Send code"}
            </button>
          </form>
        )}

        {/* ===== step 2 ===== */}
        {step === "code" && (
          <div className="space-y-4">
            <div>
              <label htmlFor="fp-code" className="block text-sm font-medium mb-1">
                6-digit code
              </label>
              <input
                id="fp-code"
                name="code"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                autoFocus
                maxLength={OTP_LENGTH + 2}
                placeholder="••••••"
                value={code}
                onChange={onCodeChange}
                disabled={busy}
                className={`${inputCls} text-center text-2xl font-mono tracking-[0.5em] py-3`}
              />
            </div>

            <button type="button" onClick={() => verify()} disabled={busy || code.length !== OTP_LENGTH} className={primaryBtn}>
              {busy ? "Checking..." : "Verify code"}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={resend}
                disabled={busy || cooldown > 0}
                className="font-medium text-amber-600 hover:text-amber-700 hover:underline disabled:text-stone-400 disabled:no-underline disabled:cursor-not-allowed cursor-pointer"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>
              <button type="button" onClick={restart} className="text-stone-500 hover:underline cursor-pointer">
                Use a different email
              </button>
            </div>
          </div>
        )}

        {/* ===== step 3 ===== */}
        {step === "password" && (
          <form onSubmit={savePassword} className="space-y-4">
            <div>
              <label htmlFor="fp-password" className="block text-sm font-medium mb-1">
                New password
              </label>
              <div className="relative">
                <input
                  id="fp-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoFocus
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  className={`${inputCls} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 px-3 text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-stone-500">At least {MIN_PASSWORD} characters.</p>
            </div>

            <div>
              <label htmlFor="fp-confirm" className="block text-sm font-medium mb-1">
                Confirm new password
              </label>
              <input
                id="fp-confirm"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setError("");
                }}
                className={inputCls}
              />
            </div>

            <button disabled={busy} className={primaryBtn}>
              {busy ? "Saving..." : "Change password"}
            </button>
            <button type="button" onClick={restart} className="w-full text-sm text-stone-500 hover:underline cursor-pointer">
              Start over
            </button>
          </form>
        )}

        {info && !error && (
          <p role="status" className="text-xs text-emerald-600 font-medium text-center">
            {info}
          </p>
        )}
        {error && (
          <p role="alert" className="text-xs text-rose-500 font-medium text-center">
            {error}
          </p>
        )}

        <Link
          to="/login"
          className="flex items-center justify-center gap-1.5 text-sm font-medium text-stone-500 hover:text-amber-600"
        >
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Link>
      </div>
    </div>
  );
}