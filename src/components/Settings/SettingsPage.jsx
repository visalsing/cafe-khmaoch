// src/pages/SettingsPage.jsx
import React, { useState, useEffect } from "react";
import { Sun, Moon, Monitor, Check, Languages, Hash, Hourglass, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

// Flag image mapping
const flagImages = {
  kh: "https://flagcdn.com/w40/kh.png",
  en: "https://flagcdn.com/w40/gb.png",
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

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t, languages = [] } = useLanguage();

  // Loading screen style: the same store Settings.jsx uses, so both pages always agree
  const [loadingStyle, setLoadingStyle] = useLoadingStyle();
  const [previewing, setPreviewing] = useState(false);

  // Sync state with localStorage & trigger custom event for live cross-component sync
  const [digitStyle, setDigitStyle] = useState(() => {
    return localStorage.getItem("app_digit_style") || "standard";
  });

  useEffect(() => {
    const handleSync = () => {
      setDigitStyle(localStorage.getItem("app_digit_style") || "standard");
    };

    window.addEventListener("storage", handleSync);
    window.addEventListener("digitStyleChange", handleSync);

    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("digitStyleChange", handleSync);
    };
  }, []);

  const handleDigitChange = (value) => {
    setDigitStyle(value);
    localStorage.setItem("app_digit_style", value);
    window.dispatchEvent(new Event("digitStyleChange"));
  };

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
    "border-amber-600 bg-amber-50/70 dark:border-amber-500 dark:bg-amber-950/30 shadow-sm";

  const inactiveCard =
    "border-amber-100 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-700 bg-white dark:bg-slate-900/50";

  const focusStyle =
    "focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900";

  return (
    <div className="min-h-screen bg-amber-50/40 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* ================= NAVBAR SECTION ================= */}
      <nav className="sticky top-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-amber-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => navigate("/dashboard")}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-800 to-amber-500 flex items-center justify-center text-white font-bold text-xl shadow-md">
              ⚙️
            </div>

            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-amber-900 to-amber-600 dark:from-amber-400 dark:to-amber-500 bg-clip-text text-transparent">
              SM Solar Plus Settings
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate("/")}
            className={`px-4 py-2 text-sm font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-xl border border-amber-200 dark:border-amber-800 transition-all ${focusStyle}`}
          >
            &larr; Back to Homepage
          </button>
        </div>
      </nav>

      {/* ================= MAIN CONTAINER ================= */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {t("settings") || "Settings"}
          </h1>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("systemPreferences") ||
              "Manage system configuration, appearance themes, and language preferences"}
          </p>
        </div>

        <div className="space-y-6">
          {/* Appearance Section Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-amber-100 dark:border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1">
                {t("appearance") || "Appearance"}
              </h3>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("appearanceDescription") ||
                  "Choose how the dashboard looks on this device."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {themeOptions.map(({ value, labelKey, descriptionKey, icon: Icon }) => {
                const active = theme === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    aria-pressed={active}
                    className={`relative p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between text-left ${focusStyle} ${
                      active ? activeCard : inactiveCard
                    }`}
                  >
                    {active && (
                      <span className="absolute top-4 right-4 w-5 h-5 rounded-full bg-amber-600 dark:bg-amber-500 flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </span>
                    )}

                    <div>
                      <Icon
                        className={`w-6 h-6 mb-3 ${
                          active
                            ? "text-amber-800 dark:text-amber-400"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      />

                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {t(labelKey)}
                      </p>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      {t(descriptionKey)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Language Section Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-amber-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center space-x-2">
              <Languages className="w-4 h-4 text-amber-700 dark:text-amber-400" />

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  {t("language") || "Language"}
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("languageDescription") ||
                    "Choose the language used throughout the dashboard."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {languages.map(({ code, label, nativeLabel }) => {
                const active = language === code;
                const flagUrl =
                  flagImages[code] ||
                  `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLanguage(code)}
                    aria-pressed={active}
                    className={`relative p-5 rounded-2xl border cursor-pointer transition-all flex flex-col items-center text-center justify-center space-y-3 ${focusStyle} ${
                      active ? activeCard : inactiveCard
                    }`}
                  >
                    {active && (
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-600 dark:bg-amber-500 flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </span>
                    )}

                    {/* Language flag */}
                    <div className="w-7 h-5 rounded shadow-sm overflow-hidden flex items-center justify-center bg-amber-50 dark:bg-slate-800 flex-shrink-0">
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
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {nativeLabel}
                      </p>

                      <p className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-0.5">
                        {label}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Number Digits System Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-amber-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center space-x-2">
              <Hash className="w-4 h-4 text-amber-700 dark:text-amber-400" />

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  {t("numberDigitsStyle") || "Number Digits Style"}
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("numberDigitsDescription") ||
                    "Choose standard digits or localized numerical systems (Khmer, Lao, Burmese)."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {digitOptions.map(({ value, label, sample }) => {
                const active = digitStyle === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleDigitChange(value)}
                    aria-pressed={active}
                    className={`relative p-5 rounded-2xl border cursor-pointer transition-all flex flex-col items-center text-center justify-center space-y-2 ${focusStyle} ${
                      active ? activeCard : inactiveCard
                    }`}
                  >
                    {active && (
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-600 dark:bg-amber-500 flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </span>
                    )}

                    <p className="text-xl font-extrabold text-amber-700 dark:text-amber-400">
                      {sample}
                    </p>

                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loading Screen Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-amber-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center space-x-2">
              <Hourglass className="w-4 h-4 text-amber-700 dark:text-amber-400" />

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Loading Screen
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Choose the animation shown while a page or your account is loading. It is saved in this browser.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {LOADING_STYLES.map(({ value, label }) => {
                const active = loadingStyle === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLoadingStyle(value)}
                    aria-pressed={active}
                    className={`relative p-5 rounded-2xl border cursor-pointer transition-all flex flex-col items-center text-center justify-center space-y-3 ${focusStyle} ${
                      active ? activeCard : inactiveCard
                    }`}
                  >
                    {active && (
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-600 dark:bg-amber-500 flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </span>
                    )}

                    {/* live preview of the animation */}
                    <div className="h-20 w-full flex items-center justify-center overflow-hidden">
                      <Loader type={value} label={label} decorative />
                    </div>

                    <p
                      className={`text-xs font-bold ${
                        active
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-slate-900 dark:text-white"
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
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-amber-600 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer ${focusStyle}`}
            >
              <Play className="w-4 h-4" /> Preview full screen
            </button>
          </div>
        </div>
      </main>

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