
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { loginVerificationService } from "../../services/api";

const OTP_LENGTH = 6;
const DEFAULT_COOLDOWN = 60;

const maskEmail = (email = "") => {
  const [name = "", domain = ""] = email.split("@");

  if (!domain) return email;

  return `${name.slice(0, 2)}${"*".repeat(
    Math.max(1, name.length - 2)
  )}@${domain}`;
};

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "";
  const password = location.state?.password || "";

  const [code, setCode] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [sessionExpired, setSessionExpired] = useState(false);

  const startedRef = useRef(false);

  // Start verification when the page opens.
  useEffect(() => {
    if (!email || !password) {
      navigate("/login", { replace: true });
      return;
    }

    // Prevent duplicate requests from React StrictMode.
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;

    async function startVerification() {
      setBusy(true);
      setError("");
      setInfo("Sending your verification code...");

      try {
        const result = await loginVerificationService.start(
          email,
          password
        );

        if (cancelled) return;

        if (!result?.needsVerification || !result?.verifyToken) {
          setInfo("");
          setError(
            "Your email may already be verified, or your sign-in details are incorrect. Please return to sign in."
          );
          setSessionExpired(true);
          return;
        }

        setVerifyToken(result.verifyToken);
        setCooldown(
          Math.max(0, Number(result.resendAfter ?? DEFAULT_COOLDOWN))
        );
        setInfo(
          "A 6-digit verification code has been sent to your email."
        );
      } catch (err) {
        if (cancelled) return;

        setInfo("");
        setError(err?.message || "Could not send the verification code.");

        if (err?.status === 401 || err?.status === 403) {
          setSessionExpired(true);
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    startVerification();

    return () => {
      cancelled = true;
    };
  }, [email, password, navigate]);

  // Resend countdown.
  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setTimeout(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [cooldown]);

  const verify = async (event) => {
    event?.preventDefault();

    if (busy) return;

    if (!/^\d{6}$/.test(code)) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    if (!verifyToken) {
      setError(
        "Your verification session is missing. Please return to sign in and try again."
      );
      setSessionExpired(true);
      return;
    }

    setBusy(true);
    setError("");
    setInfo("");

    try {
      await loginVerificationService.verify(verifyToken, code);

      navigate("/login", {
        replace: true,
        state: {
          notice: "Email verified successfully. Please sign in.",
          email,
        },
      });
    } catch (err) {
      setError(
        err?.message || "The code is incorrect or has expired."
      );

      if (err?.status === 401 || err?.status === 403) {
        setSessionExpired(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCodeChange = (event) => {
    const value = event.target.value
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    setCode(value);
    setError("");
  };

  const resend = async () => {
    if (busy || cooldown > 0 || !verifyToken || sessionExpired) {
      return;
    }

    setBusy(true);
    setError("");
    setInfo("");

    try {
      const result = await loginVerificationService.resend(verifyToken);

      setCode("");
      setCooldown(
        Math.max(0, Number(result?.resendAfter ?? DEFAULT_COOLDOWN))
      );
      setInfo("A new verification code has been sent to your email.");
    } catch (err) {
      setError(err?.message || "Could not resend the verification code.");

      if (err?.status === 400 || err?.status === 401 || err?.status === 403) {
        setSessionExpired(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full px-4 py-3 rounded-xl border border-stone-200 " +
    "dark:border-stone-700 bg-stone-50 dark:bg-stone-950 " +
    "text-stone-900 dark:text-white focus:outline-none " +
    "focus:ring-2 focus:ring-amber-500 text-sm";

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <MailCheck className="w-6 h-6 text-amber-600" />
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight">
            Verify your email
          </h1>

          <p className="text-sm text-stone-500">
            Enter the 6-digit code sent to{" "}
            <span className="font-semibold text-stone-700 dark:text-stone-300">
              {maskEmail(email)}
            </span>
            . The code expires in 10 minutes.
          </p>
        </div>

        <form onSubmit={verify} className="space-y-4">
          <div>
            <label
              htmlFor="verification-code"
              className="block text-sm font-medium mb-1"
            >
              Verification code
            </label>

            <input
              id="verification-code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              autoFocus
              maxLength={OTP_LENGTH}
              placeholder="000000"
              value={code}
              onChange={handleCodeChange}
              disabled={busy || sessionExpired}
              className={`${inputCls} text-center text-2xl font-mono tracking-[0.5em]`}
            />
          </div>

          <button
            type="submit"
            disabled={
              busy ||
              sessionExpired ||
              !verifyToken ||
              code.length !== OTP_LENGTH
            }
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-md text-sm"
          >
            {busy ? "Please wait..." : "Verify email"}
          </button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={resend}
              disabled={
                busy ||
                cooldown > 0 ||
                !verifyToken ||
                sessionExpired
              }
              className="font-medium text-amber-600 hover:text-amber-700 disabled:text-stone-400"
            >
              {cooldown > 0
                ? `Resend code in ${cooldown}s`
                : "Resend code"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="text-stone-500 hover:underline"
            >
              Back to sign in
            </button>
          </div>
        </form>

        {info && (
          <p role="status" className="text-xs text-emerald-600 font-medium text-center">
            {info}
          </p>
        )}

        {error && (
          <p role="alert" className="text-xs text-rose-500 font-medium text-center">
            {error}
          </p>
        )}

        {sessionExpired && (
          <button
            type="button"
            onClick={() => navigate("/login", { replace: true, state: { email } })}
            className="w-full text-sm font-semibold text-amber-700 hover:underline"
          >
            Return to sign in and try again
          </button>
        )}
      </div>
    </div>
  );
}
