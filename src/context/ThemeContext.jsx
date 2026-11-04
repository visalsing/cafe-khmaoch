// src/context/ThemeContext.jsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { themeService } from "../services/api.js";
import { useAuth } from "./AuthContext.jsx";

const ThemeContext = createContext(null);
const VALID_CODES = ["light", "dark", "system"];
const CYCLE = ["light", "dark", "system"];

export function ThemeProvider({ children }) {
  const { currentUser, loading: authLoading } = useAuth();

  // savedTheme = persisted. theme = currently shown (may be a preview).
  const [savedTheme, setSavedTheme] = useState(
    () => localStorage.getItem("theme") || "system",
  );
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "system",
  );

  // Theme rows from the database (needed to find the id for a code).
  const [themeRows, setThemeRows] = useState([]);

  const commitTheme = useCallback((code) => {
    setSavedTheme(code);
    setTheme(code);
    localStorage.setItem("theme", code);
  }, []);

  // Restore the saved theme once, when the user changes.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    const loadTheme = async () => {
      try {
        const data = await themeService.list();
        if (cancelled || !Array.isArray(data)) return;

        const usable = data.filter((r) => VALID_CODES.includes(r.code));
        setThemeRows(usable);

        let selected = null;

        if (currentUser) {
          const mine = await themeService.getMine();
          if (cancelled) return;
          const themeId = mine?.themeId ?? mine?.theme_id ?? null;
          if (themeId != null) {
            selected = usable.find((r) => Number(r.id) === Number(themeId));
          }
        } else {
          const saved = localStorage.getItem("theme");
          selected = usable.find((r) => r.code === saved);
        }

        if (!selected) {
          selected = usable.find((r) => Number(r.is_selected) === 1);
        }

        if (selected) {
          setTheme(selected.code);
          setSavedTheme(selected.code);
          localStorage.setItem("theme", selected.code);
        }
      } catch (error) {
        console.error("Failed to load user theme:", error);
      }
    };

    loadTheme();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, authLoading]);

  // Apply the theme to <html>. Previews are never written to localStorage here.
  useEffect(() => {
    const applied =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme || "light";

    document.documentElement.classList.toggle("dark", applied === "dark");
  }, [theme]);

  // Save a theme right away: database for logged-in users, localStorage for guests.
  const saveTheme = useCallback(
    async (code) => {
      const row = themeRows.find((r) => r.code === code);

      if (currentUser && row?.id != null) {
        await themeService.setMine(Number(row.id)); // throws on failure
      }
      commitTheme(code);
    },
    [themeRows, currentUser, commitTheme],
  );

  // Header sun/moon button: light -> dark -> system -> light, saved immediately.
  const busy = useRef(false);

  const cycleTheme = useCallback(async () => {
    if (busy.current) return; // ignore clicks while a save is running
    busy.current = true;

    const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length];
    const previous = savedTheme;

    setTheme(next); // instant feedback

    try {
      await saveTheme(next);
    } catch (error) {
      console.error("Failed to save theme:", error);
      setTheme(previous); // revert if the save failed
    } finally {
      busy.current = false;
    }
  }, [theme, savedTheme, saveTheme]);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, savedTheme, commitTheme, saveTheme, cycleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: "system",
      setTheme: () => {},
      savedTheme: "system",
      commitTheme: () => {},
      saveTheme: async () => {},
      cycleTheme: () => {},
    };
  }
  return context;
};