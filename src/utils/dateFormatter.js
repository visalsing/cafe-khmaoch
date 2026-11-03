import { formatDigits } from "./digitFormatter";

// "km-KH", "en-US", "EN" -> "km", "en", "en"
const baseLang = (language) =>
  String(language || "en").toLowerCase().split(/[-_]/)[0];

// Supported locale mappings
const INTL_LOCALES = {
  en: "en-US",
  km: "km-KH",
  lo: "lo-LA",
  zh: "zh-CN",
  ja: "ja-JP",
  ko: "ko-KR",
  my: "my-MM",
  fr: "fr-FR",
  vi: "vi-VN",
};

// Localized month names
const MONTHS = {
  // English
  en: [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ],

  // Khmer
  km: [
    "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា",
    "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ",
  ],

  // Lao
  lo: [
    "ມ.ກ.", "ກ.ພ.", "ມ.ນ.", "ມ.ສ.", "ພ.ພ.", "ມິ.ຖ.",
    "ກ.ລ.", "ສ.ຫ.", "ກ.ຍ.", "ຕ.ລ.", "ພ.ຈ.", "ທ.ວ.",
  ],

  // Chinese (Simplified)
  zh: [
    "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月",
  ],

  // Japanese
  ja: [
    "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月",
  ],

  // Korean
  ko: [
    "1월", "2월", "3월", "4월", "5월", "6월",
    "7월", "8월", "9월", "10월", "11월", "12월",
  ],

  // Burmese
  my: [
    "ဇန်", "ဖေ", "မတ်", "ဧပြီ", "မေ", "ဇွန်",
    "ဇူ", "ဩဂုတ်", "စက်", "အောက်", "နို", "ဒီ",
  ],

  // French
  fr: [
    "janv.", "févr.", "mars", "avr.", "mai", "juin",
    "juil.", "août", "sept.", "oct.", "nov.", "déc.",
  ],

  // Vietnamese
  vi: [
    "thg 1", "thg 2", "thg 3", "thg 4", "thg 5", "thg 6",
    "thg 7", "thg 8", "thg 9", "thg 10", "thg 11", "thg 12",
  ],
};

// Localized day periods
const DAY_PERIODS = {
  // English
  en: {
    midnight: "Midnight",
    earlyMorning: "Early morning",
    am: "AM",
    noon: "Noon",
    afternoon: "PM",
    evening: "PM",
    night: "PM",
  },

  // Khmer
  km: {
    midnight: "កណ្ដាលយប់",
    earlyMorning: "ព្រលឹម",
    am: "ព្រឹក",
    noon: "ថ្ងៃត្រង់",
    afternoon: "រសៀល",
    evening: "ល្ងាច",
    night: "យប់",
  },

  // Lao
  lo: {
    midnight: "ທ່ຽງຄືນ",
    earlyMorning: "ຕອນເດິກ",
    am: "ຕອນເຊົ້າ",
    noon: "ຕອນທ່ຽງ",
    afternoon: "ຕອນບ່າຍ",
    evening: "ຕອນແລງ",
    night: "ຕອນກາງຄືນ",
  },

  // Chinese (Simplified)
  zh: {
    midnight: "午夜",
    earlyMorning: "凌晨",
    am: "上午",
    noon: "中午",
    afternoon: "下午",
    evening: "傍晚",
    night: "晚上",
  },

  // Japanese
  ja: {
    midnight: "深夜",
    earlyMorning: "早朝",
    am: "午前",
    noon: "正午",
    afternoon: "午後",
    evening: "夕方",
    night: "夜",
  },

  // Korean
  ko: {
    midnight: "자정",
    earlyMorning: "새벽",
    am: "오전",
    noon: "정오",
    afternoon: "오후",
    evening: "저녁",
    night: "밤",
  },

  // Burmese
  my: {
    midnight: "သန်းခေါင်ယံ",
    earlyMorning: "မနက်အစောပိုင်း",
    am: "နံနက်",
    noon: "မွန်းတည့်",
    afternoon: "နေ့လယ်",
    evening: "ညနေ",
    night: "ည",
  },

  // French
  fr: {
    midnight: "minuit",
    earlyMorning: "tôt le matin",
    am: "du matin",
    noon: "midi",
    afternoon: "de l’après-midi",
    evening: "du soir",
    night: "du soir",
  },

  // Vietnamese
  vi: {
    midnight: "nửa đêm",
    earlyMorning: "sáng sớm",
    am: "buổi sáng",
    noon: "buổi trưa",
    afternoon: "buổi chiều",
    evening: "buổi tối",
    night: "ban đêm",
  },
};

// Get localized day period using 24-hour time
const getDayPeriod = (h, lang) => {
  const periods = DAY_PERIODS[lang] || DAY_PERIODS.en;

  if (h === 0) return periods.midnight;
  if (h >= 1 && h <= 5) return periods.earlyMorning || periods.am;
  if (h >= 6 && h <= 11) return periods.am;
  if (h === 12) return periods.noon;
  if (h >= 13 && h <= 15) return periods.afternoon;
  if (h >= 16 && h <= 18) return periods.evening;

  return periods.night;
};

// Convert input to valid Date
const toDate = (v) => {
  if (!v) return null;

  const d = v instanceof Date ? v : new Date(v);

  return Number.isNaN(d.getTime()) ? null : d;
};

// Always two digits
const pad = (n) => String(n).padStart(2, "0");

// Get locale with Latin digits before formatDigits()
const getLocale = (lang) =>
  `${INTL_LOCALES[lang] || lang}-u-nu-latn`;

// Date formatting
function dateText(d, lang) {
  if (MONTHS[lang]) {
    return `${pad(d.getDate())} ${MONTHS[lang][d.getMonth()]} ${d.getFullYear()}`;
  }

  return new Intl.DateTimeFormat(getLocale(lang), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

// Time formatting
function timeText(d, lang) {
  const h24 = d.getHours();
  const h12 = pad(h24 % 12 || 12);

  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());

  // English: 04:30:00 PM
  if (lang === "en") {
    return `${h12}:${mm}:${ss} ${h24 < 12 ? "AM" : "PM"}`;
  }

  // French: 16:30:00 (24-hour format)
  if (lang === "fr") {
    return `${pad(h24)}:${mm}:${ss}`;
  }

  // Khmer: ០៤៖៣០៖០០ ល្ងាច
  if (lang === "km") {
    return `${h12}៖${mm}៖${ss} ${getDayPeriod(h24, lang)}`;
  }

  // Lao, Chinese, Japanese, Korean, Burmese, Vietnamese
  return `${h12}:${mm}:${ss} ${getDayPeriod(h24, lang)}`;
}

// Format date
// Example: 04 Oct 2026
export function formatDate(
  value,
  { language = "en", digitStyle = "standard" } = {}
) {
  const d = toDate(value);

  if (!d) return "—";

  const lang = baseLang(language);

  return formatDigits(dateText(d, lang), digitStyle);
}

// Format date and time
// Example: 04 Oct 2026, 04:21:50 PM
export function formatDateTime(
  value,
  { language = "en", digitStyle = "standard" } = {}
) {
  const d = toDate(value);

  if (!d) return "—";

  const lang = baseLang(language);

  return formatDigits(
    `${dateText(d, lang)}, ${timeText(d, lang)}`,
    digitStyle
  );
}