import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { loginVerificationService } from "../../services/api";

const OTP_LENGTH = 6;

const maskEmail = (email = "") => {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, 2)}${"*".repeat(Math.max(1, name.length - 2))}@${domain}`;
};

export default function Login() {
  const { currentUser, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const notice = location.state?.notice;

  // "login" = email + password, "code" = the email OTP for an unverified email
  const [step, setStep] = useState("login");
  const [code, setCode] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [cooldown, setCooldown] = useState(0); // seconds until "Resend" works again
  const [info, setInfo] = useState("");

  // the server said "Please verify your email first." -> show the "Click here to verify" link
  const needsVerifyLink = /verify your email/i.test(error);

  // If already logged in, redirect away from /login
  useEffect(() => {
    if (!loading && currentUser) {
      const destination =
        currentUser.role === "customer"
          ? "/"
          : location.state?.from || "/dashboard";
      navigate(destination, { replace: true });
    }
  }, [currentUser, loading, navigate, location]);

  // resend countdown (must stay ABOVE the early return below)
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  // Show nothing or a loader while checking authentication status to prevent flashing
  if (loading || currentUser) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center text-stone-500">
        <p>Loading...</p>
      </div>
    );
  }

  // the normal sign in (the server refuses it while the email is unverified)
  const signIn = async (typedEmail, typedPassword) => {
    const res = await login(typedEmail, typedPassword);
    if (!res || !res.ok) {
      setError(res?.error || "Sign in failed. Please try again.");
      return false;
    }
    // customers go back to the website; everyone else to the page they came from, or the dashboard
    navigate(
      res.user.role === "customer" ? "/" : location.state?.from || "/dashboard",
      { replace: true },
    );
    return true;
  };

  // opens the code step when the server says this account needs verification
  const openCodeStep = (typedEmail, typedPassword, check) => {
    setEmail(typedEmail);
    setPassword(typedPassword);
    setVerifyToken(check.verifyToken);
    setCooldown(check.resendAfter ?? 60);
    setCode("");
    setError("");
    setInfo("Your email is not verified yet. We sent a 6-digit code to it.");
    setStep("code");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError("");

    // read the inputs directly as well, so browser autofill always works (the inputs have a `name`)
    const data = new FormData(e.currentTarget);
    const typedEmail = String(data.get("email") || email).trim();
    const typedPassword = String(data.get("password") || password);
    setEmail(typedEmail);
    setPassword(typedPassword);

    setBusy(true);
    try {
      // 1. does this account still need to verify its email?
      //    If this check fails for any reason it must NEVER block a normal sign in.
      let check = null;
      try {
        check = await loginVerificationService.start(typedEmail, typedPassword);
      } catch (err) {
        console.error("Email verification check failed:", err);
      }
      if (check?.needsVerification) {
        openCodeStep(typedEmail, typedPassword, check);
        return;
      }
      // 2. verified (or wrong password): the normal login shows the result
      await signIn(typedEmail, typedPassword);
    } catch (err) {
      setError(
        err?.message && err.message !== "Failed to fetch"
          ? err.message
          : "Cannot reach the server. Please try again later.",
      );
    } finally {
      setBusy(false);
    }
  };

  // the "Click here to verify" link under the error message
  const startFromLink = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const check = await loginVerificationService.start(email, password);
      if (check?.needsVerification) {
        openCodeStep(email, password, check);
      } else {
        setError(
          "Could not start the verification. Check your email and password, then try again.",
        );
      }
    } catch (err) {
      console.error("Could not start the email verification:", err);
      setError(
        err?.message || "Could not start the verification. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value = code) => {
    if (busy) return;
    if (value.length !== OTP_LENGTH)
      return setError(`Enter the ${OTP_LENGTH}-digit code from your email.`);

    setBusy(true);
    setError("");
    setInfo("");
    try {
      await loginVerificationService.verify(verifyToken, value);
      // the email is verified now, so the normal login works
      const ok = await signIn(email, password);
      if (!ok) backToLogin(); // keep the error message on the login form
    } catch (err) {
      setError(err?.message || "That code is incorrect or has expired.");
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

  const resend = async () => {
    if (busy || cooldown > 0) return;
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const res = await loginVerificationService.resend(verifyToken);
      setCode("");
      setCooldown(res?.resendAfter ?? 60);
      setInfo("A new code is on its way. Older codes no longer work.");
    } catch (err) {
      setError(err?.message || "Could not send a new code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // back to the email + password form (the password is not kept)
  const backToLogin = () => {
    setStep("login");
    setCode("");
    setVerifyToken("");
    setPassword("");
    setCooldown(0);
    setInfo("");
  };

  const inputCls =
    "w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm";

  /* ===== step 2: email code ===== */
  if (step === "code") {
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
              Enter the 6-digit code we sent to {maskEmail(email)}. It expires
              in 10 minutes.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="login-code"
                className="block text-sm font-medium mb-1"
              >
                6-digit code
              </label>
              <input
                id="login-code"
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

            <button
              type="button"
              onClick={() => verify()}
              disabled={busy || code.length !== OTP_LENGTH}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-md text-sm cursor-pointer"
            >
              {busy ? "Checking..." : "Verify and sign in"}
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
              <button
                type="button"
                onClick={backToLogin}
                className="text-stone-500 hover:underline cursor-pointer"
              >
                Back to sign in
              </button>
            </div>
          </div>

          {info && !error && (
            <p
              role="status"
              className="text-xs text-emerald-600 font-medium text-center"
            >
              {info}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="text-xs text-rose-500 font-medium text-center"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ===== step 1: email + password ===== */
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="text-4xl mb-1">☕</div>
          <h1 className="text-2xl font-extrabold tracking-tight">Café ខ្មោច</h1>
          <p className="text-sm text-stone-500">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              className={inputCls}
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              className={inputCls}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate("/forget-password")}
              className="text-sm font-medium text-amber-600 hover:text-amber-700 hover:underline"
            >
              Forgot password?
            </button>
          </div>

          {error && (
            <p role="alert" className="text-xs text-rose-500 font-medium">
              {error}
              {needsVerifyLink && (
                <>
                  {" "}
                  {/* <button
                    type="button"
                    onClick={startFromLink}
                    disabled={busy}
                    className="font-semibold text-amber-600 hover:text-amber-700 underline disabled:opacity-50 cursor-pointer"
                  >
                    Click here to verify.
                  </button> */}
                  <button
                    type="button"
                    onClick={() =>
                      navigate("/verify-email", {
                        state: { email, password },
                      })
                    }
                    disabled={busy}
                    className="font-semibold text-amber-600 hover:text-amber-700 underline"
                  >
                    Click here to verify.
                  </button>
                </>
              )}
            </p>
          )}

          {notice && !error && (
            <p role="status" className="text-xs text-emerald-600 font-medium">
              {notice}
            </p>
          )}

          <button
            disabled={busy}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-md text-sm cursor-pointer"
          >
            {busy ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
