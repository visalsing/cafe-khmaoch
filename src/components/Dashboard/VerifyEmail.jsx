import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MailCheck, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { emailVerificationService } from "../../services/api";
import LoadingScreen from "../Loading/Loading";

const OTP_LENGTH = 6;

const maskEmail = (email = "") => {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, 2)}${"*".repeat(Math.max(1, name.length - 2))}@${domain}`;
};

// Route: /verify-email  (the user must be signed in)
export default function VerifyEmail() {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [done, setDone] = useState(false);

  // not signed in -> login; already verified -> home
  useEffect(() => {
    if (loading) return;
    if (!currentUser) navigate("/login", { replace: true });
    else if (currentUser.isVerifiedEmail && !done) navigate("/", { replace: true });
  }, [loading, currentUser, done, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const sendCode = async () => {
    if (busy || cooldown > 0) return;
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const res = await emailVerificationService.requestCode();
      setCooldown(res?.resendAfter ?? 60);
      setInfo("A new code is on its way. Older codes no longer work.");
    } catch (err) {
      setError(err?.message || "Could not send the code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value = code) => {
    if (busy) return;
    if (value.length !== OTP_LENGTH) return setError(`Enter the ${OTP_LENGTH}-digit code from your email.`);
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await emailVerificationService.verifyCode(value);
      setDone(true);
      // reload so the signed-in user is fetched again with isVerifiedEmail = true
      setTimeout(() => window.location.assign("/"), 1200);
    } catch (err) {
      setError(err?.message || "That code is incorrect or has expired.");
    } finally {
      setBusy(false);
    }
  };

  const onCodeChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setCode(digits);
    setError("");
    if (digits.length === OTP_LENGTH) verify(digits);
  };

  if (loading || !currentUser) return <LoadingScreen />;

  const Icon = done ? ShieldCheck : MailCheck;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Icon className="w-6 h-6 text-amber-600" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {done ? "Email verified" : "Verify your email"}
          </h1>
          <p className="text-sm text-stone-500">
            {done
              ? "Thank you. Your email address is now verified."
              : `Enter the 6-digit code we sent to ${maskEmail(currentUser.email)}.`}
          </p>
        </div>

        {!done && (
          <div className="space-y-4">
            <input
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
              aria-label="6-digit code"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-center text-2xl font-mono tracking-[0.5em]"
            />

            <button
              type="button"
              onClick={() => verify()}
              disabled={busy || code.length !== OTP_LENGTH}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-md text-sm cursor-pointer"
            >
              {busy ? "Checking..." : "Verify email"}
            </button>

            <button
              type="button"
              onClick={sendCode}
              disabled={busy || cooldown > 0}
              className="w-full text-sm font-medium text-amber-600 hover:text-amber-700 hover:underline disabled:text-stone-400 disabled:no-underline disabled:cursor-not-allowed cursor-pointer"
            >
              {cooldown > 0 ? `Send a new code in ${cooldown}s` : "Send me a new code"}
            </button>
          </div>
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
      </div>
    </div>
  );
}