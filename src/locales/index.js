// src/locales/index.js
//
// Combines the separate per-language files into one lookup object:
// { en: {...}, km: {...}, zh: {...}, lo: {...} }
//
// To add a new language: create src/locales/<code>.js with the same keys
// as en.js, import it below, add it to this object, and add an entry to
// LANGUAGES in LanguageContext.jsx.

import en from "./lang/en.js";
import km from "./lang/km.js";
import zh from "./lang/zh.js";
import lo from "./lang/lo.js";
import ja from "./lang/ja.js";
import vi from "./lang/vi.js";

const translations = { en, km, zh, lo, ja, vi };

export default translations;