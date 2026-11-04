// Settings/PreferenceActions.jsx
import React from "react";
import { Check, AlertCircle, X } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext.jsx";

export default function PreferenceActions({
  dirty,
  saving,
  status,
  save,
  cancel,
  dismissStatus,
  label, // e.g. "theme" or "accent color"
}) {
  const { t } = useLanguage();

  const focusStyle =
    "focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900";

  return (
    <div className="mt-4 space-y-3">
      {status && (
        <div
          role={status.type === "error" ? "alert" : "status"}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border ${
            status.type === "success"
              ? "bg-green-50 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-900"
              : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900"
          }`}
        >
          {status.type === "success" ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span className="flex-1">{status.text}</span>
          <button
            type="button"
            onClick={dismissStatus}
            aria-label="Dismiss"
            className="opacity-70 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* {dirty && !status && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {t("unsavedChanges") ||
            "You have unsaved changes. This is a preview only."}
        </p>
      )} */}
      {dirty && !status && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {t("unsavedChanges") ||
            `You have unsaved ${label || "changes"}. This is a preview only.`}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className={`px-4 py-2 text-sm font-semibold rounded-xl bg-accent-600 text-white hover:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${focusStyle}`}
        >
          {saving
            ? t("saving") || "Saving..."
            : t("saveChanges") || "Save Changes"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={!dirty || saving}
          className={`px-4 py-2 text-sm font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${focusStyle}`}
        >
          {t("cancel") || "Cancel"}
        </button>
      </div>
    </div>
  );
}
