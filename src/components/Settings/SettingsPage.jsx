// src/pages/SettingsPage.jsx
import React, { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  Monitor,
  Check,
  Languages,
  Hash,
  Hourglass,
  Play,
  Palette,
  Sparkles,
  ComputerIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useThemeOptions } from "../Dashboard/themeOptions.js";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";
import LoadingScreen, { Loader } from "../Loading/Loading.jsx";
import { LOADING_STYLES, useLoadingStyle } from "../../utils/loadingStyle.js";
import { ACCENTS, useAccent } from "../../utils/accent.js";
import BackgroundEffect from "../Dashboard/BackgroundEffect.jsx";
import {
  BACKGROUND_STYLES,
  useBackgroundStyle,
} from "../../utils/background.js";

const themeOptions = [
  {
    value: "light",
    labelKey: "light",
    descriptionKey: "lightDescription",
    icon: Sun,
  },
  {
    value: "dark",
    labelKey: "dark",
    descriptionKey: "darkDescription",
    icon: Moon,
  },
  {
    value: "system",
    labelKey: "system",
    descriptionKey: "systemDescription",
    icon: Monitor,
  },
];

// Number digit formatting styles options
const digitOptions = [
  { value: "standard", label: "Standard (0-9)", sample: "12345" },
  { value: "khmer", label: "ខ្មែរ (Khmer)", sample: "១២៣៤៥" },
  { value: "lao", label: "ລາວ (Lao)", sample: "໑໒໓໔໕" },
  { value: "burmese", label: "မြန်မာ (Burmese)", sample: "၁၂၃၄၅" },
  // { value: "chinese", label: "(Chinese)", sample: "〡〢〣〤〥"}
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
  my: "https://flagcdn.com/w40/mm.png",
  ko: "https://flagcdn.com/w40/kr.png",
};

export default function SettingsPage() {
  const navigate = useNavigate();
  // const { theme, setTheme } = useTheme();
  const { theme } = useTheme();
  const { choices, choose } = useThemeOptions();
  const { language, setLanguage, t, languages = [] } = useLanguage();
  const [backgroundStyle, setBackgroundStyle] = useBackgroundStyle();

  // Loading screen style: the same store Settings.jsx uses, so both pages always agree
  const [loadingStyle, setLoadingStyle] = useLoadingStyle();

  // Which full-screen preview is open: "loading" | "background" | null
  const [previewing, setPreviewing] = useState(null);

  // Accent color: the same store Settings.jsx uses
  const [accent, setAccent] = useAccent();

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

  // Full-screen previews close with a click or the Esc key.
  // The loading screen preview also closes by itself after 3 seconds;
  // the background preview stays open so you can watch the animation.
  useEffect(() => {
    if (!previewing) return undefined;

    const timer =
      previewing === "loading"
        ? setTimeout(() => setPreviewing(null), 3000)
        : null;
    const onKey = (e) => e.key === "Escape" && setPreviewing(null);
    window.addEventListener("keydown", onKey);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [previewing]);

  const activeCard =
    "border-accent-600 bg-accent-50/70 dark:border-accent-500 dark:bg-accent-950/30 shadow-sm";

  const inactiveCard =
    "border-accent-100 dark:border-neutral-800 hover:border-accent-400 dark:hover:border-accent-700 bg-white dark:bg-neutral-900/50";

  const focusStyle =
    "focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900";

  const previewButton = `inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-accent-600 text-accent-700 dark:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-950/30 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent ${focusStyle}`;

  return (
    <div className="min-h-screen bg-accent-50/40 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors duration-300">
      {/* ================= NAVBAR SECTION ================= */}
      <nav className="sticky top-0 z-40 bg-white/85 dark:bg-neutral-900/85 backdrop-blur-md border-b border-accent-100 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => navigate("/dashboard")}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-700 to-accent-500 flex items-center justify-center text-white font-bold text-xl shadow-md">
              ⚙️
            </div>

            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-accent-950 to-accent-600 dark:from-accent-400 dark:to-accent-500 bg-clip-text text-transparent">
              SM Solar Plus Settings
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate("/")}
            className={`px-4 py-2 text-sm font-semibold text-accent-700 dark:text-accent-400 bg-accent-50 dark:bg-accent-950/40 hover:bg-accent-100 dark:hover:bg-accent-950/60 rounded-xl border border-accent-400/40 dark:border-accent-700 transition-all ${focusStyle}`}
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

          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {t("systemPreferences") ||
              "Manage system configuration, appearance themes, and language preferences"}
          </p>
        </div>

        <div className="space-y-6">
          {/* Appearance Section Card */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl shadow-sm border border-accent-100 dark:border-neutral-800 space-y-4">
            <div>
              <div className="flex items-center space-x-2">
                <ComputerIcon className="w-4 h-4 text-accent-700 dark:text-accent-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white mb-1">
                  {t("appearance") || "Appearance"}
                </h3>
              </div>

              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {t("appearanceDescription") ||
                  "Choose how the dashboard looks on this device."}
              </p>
            </div>

            {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {themeOptions.map(
                ({ value, labelKey, descriptionKey, icon: Icon }) => {
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
                        <span className="absolute top-4 right-4 w-5 h-5 rounded-full bg-accent-600 dark:bg-accent-500 flex items-center justify-center shadow-md">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </span>
                      )}

                      <div>
                        <Icon
                          className={`w-6 h-6 mb-3 ${
                            active
                              ? "text-accent-700 dark:text-accent-400"
                              : "text-neutral-500 dark:text-neutral-400"
                          }`}
                        />

                        <p className="text-sm font-bold text-neutral-900 dark:text-white">
                          {t(labelKey)}
                        </p>
                      </div>

                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                        {t(descriptionKey)}
                      </p>
                    </button>
                  );
                },
              )}
            </div> */}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {choices.map((choice) => {
                const active = theme === choice.value;
                const Icon = choice.Icon;
                return (
                  <button
                    key={choice.value}
                    type="button"
                    onClick={() => choose(choice)}
                    aria-pressed={active}
                    className={`relative p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between text-left ${focusStyle} ${active ? activeCard : inactiveCard}`}
                  >
                    {active && (
                      <span className="absolute top-4 right-4 w-5 h-5 rounded-full bg-accent-600 dark:bg-accent-500 flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </span>
                    )}
                    <div>
                      <Icon
                        className={`w-6 h-6 mb-3 ${active ? "text-accent-700 dark:text-accent-400" : "text-neutral-500 dark:text-neutral-400"}`}
                      />
                      <p className="text-sm font-bold text-neutral-900 dark:text-white">
                        {choice.label}
                      </p>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                      {choice.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {choices.map((choice) => {
                const active = theme === choice.value;
                const Icon = choice.Icon;
                return (
                  <button
                    key={choice.value}
                    type="button"
                    onClick={() => choose(choice)}
                    aria-pressed={active}
                    className={`relative text-left p-4 rounded-xl border transition-all ${focusStyle} ${active ? activeCard : inactiveCard}`}
                  >
                    {active && (
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-accent-600 dark:bg-accent-500 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </span>
                    )}
                    <Icon
                      className={`w-5 h-5 mb-3 ${active ? "text-accent-700 dark:text-accent-400" : "text-neutral-500 dark:text-neutral-400"}`}
                    />
                    <p className="text-sm font-semibold text-neutral-800 dark:text-white">
                      {choice.label}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      {choice.description}
                    </p>
                  </button>
                );
              })}
            </div> */}
          </div>

          {/* Accent Color Card */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl shadow-sm border border-accent-100 dark:border-neutral-800 space-y-4">
            <div className="flex items-center space-x-2">
              <Palette className="w-4 h-4 text-accent-700 dark:text-accent-400" />

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                  {t("accentColor") || "Accent Color"}
                </h3>

                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {t("accentColorDescription") ||
                    "Pick the highlight color used across the app."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {ACCENTS.map(({ value, label, swatch }) => {
                const active = accent === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAccent(value)}
                    aria-pressed={active}
                    className={`relative p-5 rounded-2xl border cursor-pointer transition-all flex flex-col items-center text-center justify-center space-y-3 ${focusStyle} ${
                      active ? activeCard : inactiveCard
                    }`}
                  >
                    {active && (
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-accent-600 dark:bg-accent-500 flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </span>
                    )}

                    {/* inline hex on purpose: each swatch shows its own color, not the active accent */}
                    <span
                      className="block w-8 h-8 rounded-full shadow-sm"
                      style={{ background: swatch }}
                    />

                    <p className="text-xs font-bold text-neutral-900 dark:text-white">
                      {label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Background Effect Card */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl shadow-sm border border-accent-100 dark:border-neutral-800 space-y-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-accent-700 dark:text-accent-400" />

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                  Background Effect
                </h3>

                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Choose an animated effect behind the page. It follows your
                  accent color and is saved in this browser.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {BACKGROUND_STYLES.map(({ value, label }) => {
                const active = backgroundStyle === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setBackgroundStyle(value)}
                    aria-pressed={active}
                    className={`relative p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${focusStyle} ${
                      active ? activeCard : inactiveCard
                    }`}
                  >
                    {active && (
                      <span className="absolute top-3 right-3 z-10 w-5 h-5 rounded-full bg-accent-600 dark:bg-accent-500 flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </span>
                    )}

                    {/* Live background animation preview */}
                    <div className="relative h-20 w-full rounded-lg overflow-hidden mb-3">
                      <BackgroundEffect type={value} contained />
                    </div>

                    <p
                      className={`text-xs font-bold text-center ${
                        active
                          ? "text-accent-700 dark:text-accent-400"
                          : "text-neutral-900 dark:text-white"
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
              onClick={() => setPreviewing("background")}
              disabled={backgroundStyle === "none"}
              className={previewButton}
            >
              <Play className="w-4 h-4" /> Preview full screen
            </button>
          </div>

          {/* Language Section Card */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl shadow-sm border border-accent-100 dark:border-neutral-800 space-y-4">
            <div className="flex items-center space-x-2">
              <Languages className="w-4 h-4 text-accent-700 dark:text-accent-400" />

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                  {t("language") || "Language"}
                </h3>

                <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-accent-600 dark:bg-accent-500 flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </span>
                    )}

                    {/* Language flag */}
                    <div className="w-7 h-5 rounded shadow-sm overflow-hidden flex items-center justify-center bg-accent-50 dark:bg-neutral-800 flex-shrink-0">
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
                      <p className="text-sm font-bold text-neutral-900 dark:text-white">
                        {nativeLabel}
                      </p>

                      <p className="text-xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mt-0.5">
                        {label}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Number Digits System Card */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl shadow-sm border border-accent-100 dark:border-neutral-800 space-y-4">
            <div className="flex items-center space-x-2">
              <Hash className="w-4 h-4 text-accent-700 dark:text-accent-400" />

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                  {t("numberDigitsStyle") || "Number Digits Style"}
                </h3>

                <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-accent-600 dark:bg-accent-500 flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </span>
                    )}

                    <p className="text-xl font-extrabold text-accent-700 dark:text-accent-400">
                      {sample}
                    </p>

                    <p className="text-xs font-bold text-neutral-900 dark:text-white">
                      {label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loading Screen Card */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl shadow-sm border border-accent-100 dark:border-neutral-800 space-y-4">
            <div className="flex items-center space-x-2">
              <Hourglass className="w-4 h-4 text-accent-700 dark:text-accent-400" />

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                  Loading Screen
                </h3>

                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Choose the animation shown while a page or your account is
                  loading. It is saved in this browser.
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
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-accent-600 dark:bg-accent-500 flex items-center justify-center shadow-md">
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
                          ? "text-accent-700 dark:text-accent-400"
                          : "text-neutral-900 dark:text-white"
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
              onClick={() => setPreviewing("loading")}
              className={previewButton}
            >
              <Play className="w-4 h-4" /> Preview full screen
            </button>
          </div>
        </div>
      </main>

      {/* Full-screen preview of the chosen loading screen */}
      {previewing === "loading" && (
        <div
          className="fixed inset-0 z-[100] cursor-pointer"
          onClick={() => setPreviewing(null)}
          role="presentation"
        >
          <LoadingScreen />
          <p className="absolute bottom-8 inset-x-0 text-center text-xs text-neutral-400">
            Click anywhere or press Esc to close
          </p>
        </div>
      )}

      {/* Full-screen preview of the chosen background effect */}
      {previewing === "background" && (
        <div
          className="fixed inset-0 z-[100] cursor-pointer bg-neutral-50 dark:bg-neutral-950"
          onClick={() => setPreviewing(null)}
          role="presentation"
        >
          <BackgroundEffect type={backgroundStyle} />
          <p className="absolute bottom-8 inset-x-0 text-center text-xs text-neutral-400">
            Click anywhere or press Esc to close
          </p>
        </div>
      )}
    </div>
  );
}
