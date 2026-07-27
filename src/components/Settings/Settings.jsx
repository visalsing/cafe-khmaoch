import React from "react";
import { Sun, Moon, Monitor, Check, Languages } from "lucide-react";
import { useTheme } from "../../context/ThemeContext.jsx"; // adjust path if needed
import { useLanguage } from "../../context/LanguageContext.jsx"; // adjust path if needed

const themeOptions = [
  { value: "light", labelKey: "light", descriptionKey: "lightDescription", icon: Sun },
  { value: "dark", labelKey: "dark", descriptionKey: "darkDescription", icon: Moon },
  { value: "system", labelKey: "system", descriptionKey: "systemDescription", icon: Monitor },
];

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t, languages } = useLanguage();

  return (
    <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
      <h2 className="text-2xl font-bold dark:text-white">{t("settings")}</h2>
      <p className="text-slate-500 dark:text-slate-400">{t("systemPreferences")}</p>

      {/* Appearance section */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
          {t("appearance")}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          {t("appearanceDescription")}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themeOptions.map(({ value, labelKey, descriptionKey, icon: Icon }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                onClick={() => setTheme(value)}
                aria-pressed={active}
                className={`relative text-left p-4 rounded-xl border transition-all
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${
                    active
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-400"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
              >
                {active && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                )}
                <Icon
                  className={`w-5 h-5 mb-3 ${
                    active ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"
                  }`}
                />
                <p className="text-sm font-semibold dark:text-white text-slate-800">{t(labelKey)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t(descriptionKey)}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Language section */}
      <div className="mt-8">
        <div className="flex items-center space-x-2 mb-1">
          <Languages className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("language")}
          </h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          {t("languageDescription")}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {languages.map(({ code, label, nativeLabel }) => {
            const active = language === code;
            return (
              <button
                key={code}
                onClick={() => setLanguage(code)}
                aria-pressed={active}
                className={`relative text-left p-4 rounded-xl border transition-all
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${
                    active
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-400"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
              >
                {active && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                )}
                <p className="text-sm font-semibold dark:text-white text-slate-800">{nativeLabel}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}