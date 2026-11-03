// src/context/ThemeContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { themeService } from "../services/api.js";
import { useAuth } from "./AuthContext.jsx";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const { currentUser } = useAuth();
  const [theme, setTheme] = useState(() => {
    // If user has a saved choice in auth profile, use it; otherwise fallback to local/system
    return currentUser?.theme_code || localStorage.getItem("theme") || "system";
  });

  // Sync and resolve theme based on User Preference > Admin Default
  useEffect(() => {
    let cancelled = false;

    // 1. If the logged-in user has a theme_id assigned in the database, resolve its code
    if (currentUser?.theme_id) {
      themeService
        .list()
        .then((data) => {
          if (cancelled || !Array.isArray(data)) return;
          const userThemeRow = data.find((r) => r.id === currentUser.theme_id);
          if (userThemeRow) {
            setTheme(userThemeRow.code);
            localStorage.setItem("theme", userThemeRow.code);
          }
        })
        .catch(() => {});
      return;
    }

    // 2. If user has NO theme_id (blank), check for Admin's global default (is_selected = 1)
    if (!currentUser?.theme_id && !localStorage.getItem("theme_user_override")) {
      themeService
        .list()
        .then((data) => {
          if (cancelled || !Array.isArray(data)) return;
          const adminDefault = data.find(
            (r) => r.is_selected === 1 || r.is_selected === true
          );
          if (adminDefault) {
            setTheme(adminDefault.code);
            localStorage.setItem("theme", adminDefault.code);
          }
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const resolveTheme = (mode) => {
    if (mode === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return mode;
  };

  useEffect(() => {
    const root = document.documentElement;
    const applied = resolveTheme(theme);
    root.classList.toggle("dark", applied === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const cycleTheme = () => {
    setTheme((prev) =>
      prev === "light" ? "dark" : prev === "dark" ? "system" : "light"
    );
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
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
      cycleTheme: () => {},
    };
  }
  return context;
};