import { useLanguage } from "../context/LanguageContext.jsx";
import { useDigitStyle } from "./digitFormatter";
import { formatDate, formatDateTime } from "./dateFormatter";

export function useDateFormat() {
  const { language } = useLanguage();
  const digitStyle = useDigitStyle();
  return {
    date: (v) => formatDate(v, { language, digitStyle }),
    dateTime: (v) => formatDateTime(v, { language, digitStyle }),
  };
}