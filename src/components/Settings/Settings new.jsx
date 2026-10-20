import React, { useState } from "react";
import Languages from "./SettingsModules/Languages";
import Themes from "./SettingsModules/Themes";

export default function Settings() {
  const [language, setLanguage] = useState("en");
  const [theme, setTheme] = useState("system");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your app preferences and settings.
          </p>
        </div>

        {/* Modules */}
        <div className="space-y-6">
          <Themes currentTheme={theme} onSelectTheme={setTheme} />
          <Languages
            selectedLanguage={language}
            onSelectLanguage={setLanguage}
          />
        </div>
      </div>
    </div>
  );
}