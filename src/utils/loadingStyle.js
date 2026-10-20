import { useSyncExternalStore } from "react";

const STORAGE_KEY = "app_loading_style";
const CHANGE_EVENT = "loadingStyleChange";

export const LOADING_STYLES = [
  { value: "dots", label: "Bounce Dots" },
  { value: "pulse", label: "Pulse Ring" },
  { value: "spinner", label: "Spinner" },
  { value: "orbit", label: "Orbit" },
  { value: "bars", label: "Wave Bars" },
  { value: "coffee", label: "Coffee Cup" },
  { value: "progress", label: "Progress Bar" },
  { value: "text", label: "Classic Text" },
];
export const DEFAULT_LOADING_STYLE = "dots"; // used until someone picks another one

const isStyle = (v) => LOADING_STYLES.some((s) => s.value === v);

// only used when the browser blocks localStorage (the choice then lasts until the page is reloaded)
let memoryStyle = DEFAULT_LOADING_STYLE;

export function getLoadingStyle() {
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    /* storage blocked */
  }
  return isStyle(saved) ? saved : memoryStyle;
}

export function setLoadingStyle(value) {
  if (!isStyle(value)) return;
  memoryStyle = value;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* storage blocked */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT)); // every loader on screen updates at once
}

function subscribe(callback) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback); // the style was changed in another tab
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// const [style, setStyle] = useLoadingStyle();
export function useLoadingStyle() {
  const style = useSyncExternalStore(subscribe, getLoadingStyle, () => DEFAULT_LOADING_STYLE);
  return [style, setLoadingStyle];
}