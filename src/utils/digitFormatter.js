// src/utils/digitFormatter.js

const DIGIT_SETS = {
  standard: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  khmer: ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'],
  lao: ['໐', '໑', '໒', '໓', '໔', '໕', '໖', '໗', '໘', '໙'],
  burmese: ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'],
};

export function formatDigits(input, type = 'standard') {
  const targetSet = DIGIT_SETS[type] || DIGIT_SETS.standard;
  return String(input).replace(/[0-9]/g, (match) => targetSet[Number(match)]);
}

import { useState, useEffect } from "react";

/**
 * Custom hook to format numbers according to the user's digit preference in Settings.
 */
export function useDigits() {
  const [style, setStyle] = useState(() => {
    return localStorage.getItem("app_digit_style") || "standard";
  });

  // Optional: Listen for changes if updated in real-time across tabs/components
  useEffect(() => {
    const handleStorageChange = () => {
      setStyle(localStorage.getItem("app_digit_style") || "standard");
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("digitStyleChange", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("digitStyleChange", handleStorageChange);
    };
  }, []);

  return (num) => formatDigits(num, style);
}