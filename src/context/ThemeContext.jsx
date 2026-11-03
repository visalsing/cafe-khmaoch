// src/context/ThemeContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { themeService } from "../services/api.js";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Initialize instantly from localStorage if available to prevent flashing/slow load
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "system");

  // Fetch the latest theme configuration from the database on mount
  const syncThemeFromDB = () => {
    themeService
      .list()
      .then((data) => {
        if (!Array.isArray(data)) return;

        // 1. Check if Admin set a new default (is_selected === 1) and user has no local override
        const adminDefault = data.find(
          (r) => r.is_selected === 1 || r.is_selected === true
        );

        // If no local storage exists, strictly follow Admin's default
        if (adminDefault && !localStorage.getItem("theme_user_override")) {
          setTheme(adminDefault.code);
          localStorage.setItem("theme", adminDefault.code);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    syncThemeFromDB();

    // Listen to custom cross-tab or cross-component sync events for real-time feel
    const handleThemeUpdate = () => syncThemeFromDB();
    window.addEventListener("themeChanged", handleThemeUpdate);
    return () => window.removeEventListener("themeChanged", handleThemeUpdate);
  }, []);

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

  const updateTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    localStorage.setItem("theme_user_override", "true"); // Mark that user chose explicitly
    window.dispatchEvent(new Event("themeChanged"));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: updateTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    return { theme: "system", setTheme: () => {}, cycleTheme: () => {} };
  }
  return context;
};