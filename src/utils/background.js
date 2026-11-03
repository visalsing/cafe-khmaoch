import { useCallback, useEffect, useState } from "react";

const KEY = "app_background_style";
const EVENT = "backgroundStyleChange";

export const BACKGROUND_STYLES = [
  { value: "none", label: "Solid / None" },
  { value: "particles", label: "Particles" },
  { value: "bubbles", label: "Bubbles" },
  { value: "rain", label: "Raindrops" },
  { value: "stars", label: "Stars" },
  { value: "lightning", label: "Lightning" },
  { value: "ghosts", label: "Ghosts" },
  { value: "bats", label: "Bats" },
  { value: "skulls", label: "Skulls" },
  { value: "jack-o-lantern", label: "Jack-o'-lantern" },
  { value: "halloween", label: "Halloween" },
  { value: "cats", label: "Cats" },
  { value: "moons", label: "Moons" },
  { value: "snow", label: "Snow" },
  { value: "cafe-khmaoch", label: "Café ខ្មោច"},
  { value: "cafe-khmaoch-2", label: "Café ខ្មោច​ II"}
];

const read = () => {
  try {
    const v = localStorage.getItem(KEY);
    return BACKGROUND_STYLES.some((s) => s.value === v) ? v : "none";
  } catch {
    return "none";
  }
};

export function useBackgroundStyle() {
  const [style, setStyleState] = useState(read);

  useEffect(() => {
    const sync = () => setStyleState(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setStyle = useCallback((value) => {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      // storage unavailable, the change just won't persist
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [style, setStyle];
}