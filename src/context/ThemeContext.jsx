// src/context/ThemeContext.jsx
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { themeService } from "../services/api.js";
import { useAuth } from "./AuthContext.jsx";

const ThemeContext = createContext(null);
const VALID_CODES = ["light", "dark", "system"];

export function ThemeProvider({ children }) {
  const { currentUser, loading: authLoading } = useAuth();

  // savedTheme = what is persisted. theme = what is currently shown (may be a preview).
  const [savedTheme, setSavedTheme] = useState(
    () => localStorage.getItem("theme") || "system",
  );
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "system",
  );

  // Persist a theme as the saved one (called after a successful Save).
  const commitTheme = useCallback((code) => {
    setSavedTheme(code);
    setTheme(code);
    localStorage.setItem("theme", code);
  }, []);

  // Restore the saved theme once, when the user changes (login/logout/refresh).
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    const loadTheme = async () => {
      try {
        const data = await themeService.list();
        if (cancelled || !Array.isArray(data)) return;

        const usable = data.filter((r) => VALID_CODES.includes(r.code));
        let selected = null;

        if (currentUser) {
          // Signed-in: database preference first.
          const mine = await themeService.getMine();
          if (cancelled) return;
          const themeId = mine?.themeId ?? mine?.theme_id ?? null;
          if (themeId != null) {
            selected = usable.find((r) => Number(r.id) === Number(themeId));
          }
        } else {
          // Guest: localStorage first.
          const saved = localStorage.getItem("theme");
          selected = usable.find((r) => r.code === saved);
        }

        // Fallback: Admin default.
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

  // Apply the theme to <html>. No localStorage write here anymore:
  // previews must not be persisted, only commitTheme() does that.
  useEffect(() => {
    const applied =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme || "light";

    document.documentElement.classList.toggle("dark", applied === "dark");
  }, [theme]);

  const cycleTheme = () => {
    setTheme((prev) =>
      prev === "light" ? "dark" : prev === "dark" ? "system" : "light",
    );
  };

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, savedTheme, commitTheme, cycleTheme }}
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
      cycleTheme: () => {},
    };
  }
  return context;
};