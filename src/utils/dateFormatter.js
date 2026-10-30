import { formatDigits } from "./digitFormatter";

// "km-KH", "en-US", "EN" -> "km", "en", "en"
const baseLang = (language) =>
  String(language || "en").toLowerCase().split(/[-_]/)[0];

const MONTHS = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  km: ["មករា", "កុម្ភៈ", "មិនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"],
};

// Other languages: let Intl write the date, day first where the language allows it.
const INTL_LOCALES = { zh: "zh-CN", lo: "lo-LA", ja: "ja-JP", vi: "vi-VN" };

// Khmer day periods, by 24h hour
const khmerPeriod = (h) => {
  if (h === 0) return "កណ្ដាលយប់"; // 12 AM, midnight
  if (h >= 1 && h <= 3) return "យប់"; // 1-3 AM
  if (h >= 4 && h <= 11) return "ព្រឹក"; // 4-11 AM
  if (h === 12) return "ថ្ងៃត្រង់"; // 12 PM, noon
  if (h >= 13 && h <= 15) return "រសៀល"; // 1-3 PM
  if (h >= 16 && h <= 18) return "ល្ងាច"; // 4-6 PM
  return "យប់"; // 7-11 PM
};

const toDate = (v) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const pad = (n) => String(n).padStart(2, "0");

// Returns text with Latin digits; formatDigits() converts them at the end.
function dateText(d, lang) {
  if (MONTHS[lang]) {
    return `${d.getDate()} ${MONTHS[lang][d.getMonth()]} ${d.getFullYear()}`;
  }
  return new Intl.DateTimeFormat(`${INTL_LOCALES[lang] || lang}-u-nu-latn`, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

function timeText(d, lang) {
  const h24 = d.getHours();
  const h12 = h24 % 12 || 12;
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());

  if (lang === "km") {
    return `${h12}៖${mm}៖${ss} ${khmerPeriod(h24)}`; // ៤៖២១៖៥០ ល្ងាច
  }
  if (lang === "en") {
    return `${h12}:${mm}:${ss} ${h24 < 12 ? "AM" : "PM"}`; // 4:21:50 PM
  }
  // other languages: Intl's own 12h time (e.g. 下午4:21:50)
  return new Intl.DateTimeFormat(`${INTL_LOCALES[lang] || lang}-u-nu-latn`, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })
    .format(d)
    .replace(/[\u202f\u00a0]/g, " ");
}

// 4 Oct 2026  |  ៤ តុលា ២០២៦
export function formatDate(value, { language = "en", digitStyle = "standard" } = {}) {
  const d = toDate(value);
  if (!d) return "—";
  return formatDigits(dateText(d, baseLang(language)), digitStyle);
}

// 4 Oct 2026, 4:21:50 PM  |  ៤ តុលា ២០២៦, ៤៖២១៖៥០ ល្ងាច
export function formatDateTime(value, { language = "en", digitStyle = "standard" } = {}) {
  const d = toDate(value);
  if (!d) return "—";
  const lang = baseLang(language);
  return formatDigits(`${dateText(d, lang)}, ${timeText(d, lang)}`, digitStyle);
}