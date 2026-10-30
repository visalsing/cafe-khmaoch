import { useCallback } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";

const asText = (v) => {
  if (Array.isArray(v)) return v.map(asText).filter(Boolean).join(", ");
  if (v === null || v === undefined) return "";
  return String(v).trim();
};

/**
 * The text of a database value that holds several languages: {"en":"Coffee","km":"កាហ្វេ"}
 * Also accepts the same JSON as text, a list ({"en":["Owner","Manager"]}) or plain text.
 * Order tried: the chosen language -> English -> any language that has text.
 */
export function localize(value, lang = "en") {
  if (value === null || value === undefined || value === "") return "";

  let data = value;
  if (typeof data === "string") {
    const text = data.trim();
    if (text[0] !== "{" && text[0] !== "[") return data; // ordinary text: nothing to translate
    try {
      data = JSON.parse(text);
    } catch {
      return data;
    }
  }

  if (data === null) return "";
  if (Array.isArray(data) || typeof data !== "object") return asText(data);

  for (const candidate of [data[lang], data.en, ...Object.values(data)]) {
    const text = asText(candidate);
    if (text) return text;
  }
  return "";
}

// const tr = useLocalized();   then   tr(product.name)
export default function useLocalized() {
  const { language } = useLanguage();
  const lang = language || "en";
  return useCallback((value) => localize(value, lang), [lang]);
}