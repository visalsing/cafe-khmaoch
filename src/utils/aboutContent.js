import { assetUrl } from "../services/api";

// the text of the chosen language, else English, else nothing (the page then uses its built-in text)
export const pickText = (obj, lang) => (obj && typeof obj === "object" ? obj[lang] || obj.en || "" : "");

// a stored picture path -> a URL the browser can open
export function uploadUrl(stored) {
  if (!stored) return "";
  if (/^(https?:)?\/\//i.test(stored) || /^(data|blob):/i.test(stored)) return stored; // from another website
  const clean = String(stored).replace(/^\/+/, "");
  // works with either style of assetUrl: one that adds "/api/uploads/" itself, or one that expects the full path
  const viaHelper = assetUrl(clean);
  return /\/uploads\//.test(viaHelper) ? viaHelper : assetUrl(`/api/uploads/${clean}`);
}