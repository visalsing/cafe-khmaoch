// src/pages/SettingsPage.jsx
import React from "react";
import { Sun, Moon, Monitor, Check, Languages } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";

const themeOptions = [
  { value: "light", labelKey: "light", descriptionKey: "lightDescription", icon: Sun },
  { value: "dark", labelKey: "dark", descriptionKey: "darkDescription", icon: Moon },
  { value: "system", labelKey: "system", descriptionKey: "systemDescription", icon: Monitor },
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
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t, languages = [] } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* ================= NAVBAR SECTION ================= */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => navigate("/dashboard")}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
              ⚙️
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              SM Solar Plus Settings
            </span>
          </div>

          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl border border-blue-200 dark:border-blue-800 transition-all"
          >
            &larr; Back to Homepage
          </button>
        </div>
      </nav>

      {/* ================= MAIN CONTAINER ================= */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{t("settings") || "Settings"}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("systemPreferences") || "Manage system configuration, appearance themes, and language preferences"}
          </p>
        </div>

        <div className="space-y-6">
          {/* Appearance Section Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1">
                {t("appearance") || "Appearance"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("appearanceDescription") || "Choose how the dashboard looks on this device."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {themeOptions.map(({ value, labelKey, descriptionKey, icon: Icon }) => {
                const active = theme === value;
                return (
                  <div
                    key={value}
                    onClick={() => setTheme(value)}
                    aria-pressed={active}
                    className={`relative p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                      active
                        ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 hover:border-blue-400 bg-white dark:bg-slate-900/50"
                    }`}
                  >
                    {active && (
                      <span className="absolute top-4 right-4 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </span>
                    )}
                    <div>
                      <Icon
                        className={`w-6 h-6 mb-3 ${
                          active ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"
                        }`}
                      />
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{t(labelKey)}</p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{t(descriptionKey)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Language Section Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center space-x-2">
              <Languages className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  {t("language") || "Language"}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("languageDescription") || "Choose the language used throughout the dashboard."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {languages.map(({ code, label, nativeLabel }) => {
                const active = language === code;
                const flagUrl = flagImages[code] || `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

                return (
                  <div
                    key={code}
                    onClick={() => setLanguage(code)}
                    aria-pressed={active}
                    className={`relative p-5 rounded-2xl border cursor-pointer transition-all flex flex-col items-center text-center justify-center space-y-3 ${
                      active
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 hover:border-blue-400 bg-white dark:bg-slate-900/50"
                    }`}
                  >
                    {active && (
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </span>
                    )}

                    {/* Scaled down flag container (w-7 h-5) */}
                    <div className="w-7 h-5 rounded shadow-sm overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                      <img 
                        src={flagUrl} 
                        alt={`${nativeLabel} flag`} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '🌐';
                        }}
                      />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{nativeLabel}</p>
                      <p className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-0.5">{label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}