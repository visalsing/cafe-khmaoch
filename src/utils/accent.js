// src/utils/accent.js
import { useState, useEffect } from "react";

export const ACCENTS = [
  { value: "amber",     label: "Amber",     swatch: "#e27200" },
  { value: "yellow",    label: "Yellow",    swatch: "#d6af08" },
  { value: "orange",    label: "Orange",    swatch: "#f05a0a" },
  { value: "brown",     label: "Brown",     swatch: "#8c5830" },
  { value: "caramel",   label: "Caramel",   swatch: "#c87824" },
  { value: "honey",     label: "Honey",     swatch: "#d6960e" },
  { value: "cinnamon",  label: "Cinnamon",  swatch: "#be5428" },
  { value: "cherry",    label: "Cherry",    swatch: "#d61e46" },
  { value: "mocha",     label: "Mocha",     swatch: "#947058" },
  { value: "chocolate", label: "Chocolate", swatch: "#6c3626" },
];

const KEY = "app_accent";
const DEFAULT = "amber";
const EVENT = "accentChange";

export function getSavedAccent() {
  try {
    const saved = localStorage.getItem(KEY);
    return ACCENTS.some((a) => a.value === saved) ? saved : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function applyAccent(v) {
  document.documentElement.dataset.accent = v;
}

export function useAccent() {
  const [accent, setAccentState] = useState(getSavedAccent);

  // keep every component (and other tabs) in sync, same pattern as digitStyleChange
  useEffect(() => {
    const sync = () => setAccentState(getSavedAccent());
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);

  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  const setAccent = (value) => {
    if (!ACCENTS.some((a) => a.value === value)) return;
    try { localStorage.setItem(KEY, value); } catch {}
    setAccentState(value);
    window.dispatchEvent(new Event(EVENT));
  };

  return [accent, setAccent];
}