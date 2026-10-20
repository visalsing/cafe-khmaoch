import React from "react";

export default function Languages({ selectedLanguage, onSelectLanguage }) {
  const languages = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "km", name: "ភាសាខ្មែរ (Khmer)", flag: "🇰🇭" },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Language / ភាសា
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Select your preferred application language.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {languages.map((lang) => {
          const isSelected = selectedLanguage === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => onSelectLanguage(lang.code)}
              className={`flex items-center justify-between p-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                isSelected
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 shadow-sm"
                  : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-amber-300"
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl">{lang.flag}</span>
                <span>{lang.name}</span>
              </div>
              {isSelected && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}