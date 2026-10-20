import React, { useState, useEffect } from "react";
import { Sun, Moon, Monitor, Check, Languages, Hash, Hourglass, Play } from "lucide-react";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";
import LoadingScreen, { Loader } from "../Loading/Loading.jsx";
import { LOADING_STYLES, useLoadingStyle } from "../../utils/loadingStyle.js";

const themeOptions = [
  { value: "light", labelKey: "light", descriptionKey: "lightDescription", icon: Sun },
  { value: "dark", labelKey: "dark", descriptionKey: "darkDescription", icon: Moon },
  { value: "system", labelKey: "system", descriptionKey: "systemDescription", icon: Monitor },
];

// Number digit formatting styles options
const digitOptions = [
  { value: "standard", label: "Standard (0-9)", sample: "12345" },
  { value: "khmer", label: "ខ្មែរ (Khmer)", sample: "១២៣៤៥" },
  { value: "lao", label: "ລາວ (Lao)", sample: "໑໒໓໔໕" },
  { value: "burmese", label: "မြန်မာ (Burmese)", sample: "၁၂၃၄၅" },
];

const flagImages = {
  en: "https://flagcdn.com/w40/gb.png",
  kh: "https://flagcdn.com/w40/kh.png",
  km: "https://flagcdn.com/w40/kh.png",
  zh: "https://flagcdn.com/w40/cn.png",
  tw: "https://flagcdn.com/w40/tw.png",
  lo: "https://flagcdn.com/w40/la.png",
  es: "https://flagcdn.com/w40/es.png",
  fr: "https://flagcdn.com/w40/fr.png",
  de: "https://flagcdn.com/w40/de.png",
  ja: "https://flagcdn.com/w40/jp.png",
  vi: "https://flagcdn.com/w40/vn.png",
};

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t, languages = [] } = useLanguage();
  const [loadingStyle, setLoadingStyle] = useLoadingStyle();
  const [previewing, setPreviewing] = useState(false);

  // State for digit format preference (persisted in localStorage)
  const [digitStyle, setDigitStyle] = useState(() => {
    return localStorage.getItem("app_digit_style") || "standard";
  });

  useEffect(() => {
    localStorage.setItem("app_digit_style", digitStyle);
    // Optional: Dispatch a custom event if other components need to react immediately
    window.dispatchEvent(new Event("digitStyleChange"));
  }, [digitStyle]);

  // the full-screen preview closes by itself after 3 seconds, or with a click / the Esc key
  useEffect(() => {
    if (!previewing) return undefined;
    const timer = setTimeout(() => setPreviewing(false), 3000);
    const onKey = (e) => e.key === "Escape" && setPreviewing(false);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [previewing]);

  const activeCard =
    "border-amber-600 bg-amber-50 dark:border-amber-500 dark:bg-amber-500/10";

  const inactiveCard =
    "border-slate-200 dark:border-slate-700 hover:bg-amber-50/60 dark:hover:bg-amber-950/20";

  const focusStyle =
    "focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900";

  return (
    <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-amber-100 dark:border-slate-700 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("settings")}
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          {t("systemPreferences")}
        </p>
      </div>

      {/* Appearance section */}
      <div>
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
                type="button"
                onClick={() => setTheme(value)}
                aria-pressed={active}
                className={`relative text-left p-4 rounded-xl border transition-all ${focusStyle} ${
                  active ? activeCard : inactiveCard
                }`}
              >
                {active && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-600 dark:bg-amber-500 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                )}
                <Icon
                  className={`w-5 h-5 mb-3 ${
                    active ? "text-amber-700 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"
                  }`}
                />
                <p className="text-sm font-semibold text-slate-800 dark:text-white">
                  {t(labelKey)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t(descriptionKey)}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Language section */}
      <div>
        <div className="flex items-center space-x-2 mb-1">
          <Languages className="w-4 h-4 text-amber-700 dark:text-amber-400" />
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
            const flagUrl =
              flagImages[code] || `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

            return (
              <button
                key={code}
                type="button"
                onClick={() => setLanguage(code)}
                aria-pressed={active}
                className={`relative text-left p-4 rounded-xl border transition-all flex flex-col justify-between ${focusStyle} ${
                  active ? activeCard : inactiveCard
                }`}
              >
                {active && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-600 dark:bg-amber-500 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                )}
                <div className="w-7 h-5 rounded shadow-sm overflow-hidden flex items-center justify-center bg-amber-50 dark:bg-slate-800 mb-3 flex-shrink-0">
                  <img
                    src={flagUrl}
                    alt={`${nativeLabel} flag`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      if (e.currentTarget.parentElement) {
                        e.currentTarget.parentElement.textContent = "🌐";
                      }
                    }}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">
                    {nativeLabel}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {label}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Number Digits System section */}
      <div>
        <div className="flex items-center space-x-2 mb-1">
          <Hash className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Number Digits Style
          </h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Choose between standard numbers or localized traditional digit systems (e.g., Khmer, Lao, Burmese).
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {digitOptions.map(({ value, label, sample }) => {
            const active = digitStyle === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setDigitStyle(value)}
                aria-pressed={active}
                className={`relative text-left p-4 rounded-xl border transition-all flex flex-col justify-between ${focusStyle} ${
                  active ? activeCard : inactiveCard
                }`}
              >
                {active && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-600 dark:bg-amber-500 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                )}
                <div>
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-400 mb-2">
                    {sample}
                  </p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">
                    {label}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading Screen section */}
      <div>
        <div className="flex items-center space-x-2 mb-1">
          <Hourglass className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Loading Screen
          </h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Choose the animation shown while a page or your account is loading. It is saved in this browser.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {LOADING_STYLES.map(({ value, label }) => {
            const active = loadingStyle === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setLoadingStyle(value)}
                aria-pressed={active}
                className={`relative text-left p-4 rounded-xl border transition-all flex flex-col justify-between ${focusStyle} ${
                  active ? activeCard : inactiveCard
                }`}
              >
                {active && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-600 dark:bg-amber-500 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                )}
                <div className="h-20 flex items-center justify-center mb-2 overflow-hidden">
                  <Loader type={value} label={label} decorative />
                </div>
                <p
                  className={`text-sm font-semibold text-center ${
                    active ? "text-amber-700 dark:text-amber-400" : "text-slate-800 dark:text-white"
                  }`}
                >
                  {label}
                </p>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setPreviewing(true)}
          className={`mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-amber-600 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors ${focusStyle}`}
        >
          <Play className="w-4 h-4" /> Preview full screen
        </button>
      </div>

      {/* Full-screen preview of the chosen loading screen */}
      {previewing && (
        <div
          className="fixed inset-0 z-[100] cursor-pointer"
          onClick={() => setPreviewing(false)}
          role="presentation"
        >
          <LoadingScreen />
          <p className="absolute bottom-8 inset-x-0 text-center text-xs text-stone-400">
            Click anywhere or press Esc to close
          </p>
        </div>
      )}
    </div>
  );
}