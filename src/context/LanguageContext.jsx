import React, { createContext, useContext, useEffect, useState } from "react";
import translations from "../locales/index.js"; // adjust path if needed

const LanguageContext = createContext();

export const LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "km", label: "Khmer", nativeLabel: "ខ្មែរ" },
  { code: "zh", label: "Chinese", nativeLabel: "中文" },
  { code: "lo", label: "Lao", nativeLabel: "ລາວ" },
];

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(
    () => localStorage.getItem("language") || "en"
  );

  useEffect(() => {
    localStorage.setItem("language", language);
    // Optional: keeps screen readers / browser features aware of the active language
    document.documentElement.lang = language;
  }, [language]);

  // t("key") looks up translations[language][key], falling back to English,
  // then to the key itself so missing translations never crash the UI.
  const t = (key) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);