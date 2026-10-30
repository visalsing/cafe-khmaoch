import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoaderCircle, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const errorText = (err) =>
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  err?.data?.message ||
  err?.message ||
  "Something went wrong. Please try again.";

/**
 * One confirmation window for "Log out" and "Exit impersonation".
 * Normal mode: "Log out?".  Impersonation mode only: "Exit impersonation?".
 * Render it OUTSIDE any element that has backdrop-blur / transform, or "fixed" stops meaning "the whole screen".
 */
export default function LogoutModal({
  open,
  onClose,
  onDone, // optional: runs after the action worked (the sidebar uses it to close the phone menu)
  logoutTo = "/",
  exitTo = "/dashboard",
}) {
  const { logout, isImpersonating, stopImpersonation } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cancelRef = useRef(null);
  const lockedMode = useRef(false); // the wording must not flip while the request runs

  // a fresh window every time it opens
  useEffect(() => {
    if (!open) return;
    setBusy(false);
    setError("");
    cancelRef.current?.focus();
  }, [open]);

  // Escape closes it (not while it is working) and the page behind stays still
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !busy) onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  const exitMode = busy ? lockedMode.current : isImpersonating;

  const confirm = async () => {
    if (busy) return;
    lockedMode.current = isImpersonating;
    setBusy(true);
    setError("");
    try {
      if (isImpersonating) {
        await stopImpersonation();
        onDone?.();
        onClose?.();
        navigate(exitTo, { replace: true });
      } else {
        await logout();
        onDone?.();
        onClose?.();
        navigate(logoutTo, { replace: true });
      }
    } catch (err) {
      console.error("Session action failed:", err);
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        aria-describedby="logout-text"
        className="w-full max-w-sm space-y-4 rounded-3xl border border-stone-200 bg-white p-6 text-stone-900 shadow-2xl dark:border-stone-800 dark:bg-stone-900 dark:text-white"
      >
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            exitMode
              ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40"
              : "bg-rose-50 text-rose-600 dark:bg-rose-950/40"
          }`}
        >
          {exitMode ? (
            <ShieldCheck className="h-5 w-5" />
          ) : (
            <LogOut className="h-5 w-5" />
          )}
        </div>

        <div>
          <h3 id="logout-title" className="text-lg font-bold">
            {exitMode ? "Exit impersonation?" : "Log out?"}
          </h3>
          <p
            id="logout-text"
            className="mt-1 text-sm text-stone-500 dark:text-stone-400"
          >
            {exitMode
              ? "You will return to your administrator account."
              : "You will need to sign in again to see your account."}
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
          >
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-amber-500 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:text-amber-400"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
              exitMode
                ? "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500/30"
                : "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500/30"
            }`}
          >
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {busy
              ? "Please wait..."
              : exitMode
                ? "Return to Admin"
                : "Yes, log out"}
          </button>
        </div>
      </div>
    </div>
  );
}