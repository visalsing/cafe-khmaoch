import React, { createContext, useContext, useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "system"
  );
  
  // State for database themes and helper choices used in SettingsPage
  const [choices, setChoices] = useState([
    { value: "light", label: "Light", description: "Light appearance", Icon: Sun },
    { value: "dark", label: "Dark", description: "Dark appearance", Icon: Moon },
    { value: "system", label: "System", description: "Follow system preference", Icon: Monitor },
  ]);

  // Fetch themes from database on mount to respect is_selected = 1
  useEffect(() => {
    fetch("/api/themes") // Replace with your actual backend endpoint
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const formattedChoices = data.map((item) => {
            let Icon = Monitor;
            if (item.value === "light") Icon = Sun;
            if (item.value === "dark") Icon = Moon;

            return {
              value: item.value,
              label: item.name || item.value,
              description: item.description || "",
              Icon,
            };
          });
          setChoices(formattedChoices);

          // Find the default theme where is_selected === 1 from the database
          const defaultTheme = data.find(
            (item) => item.is_selected === 1 || item.is_selected === true
          );
          
          if (defaultTheme && !localStorage.getItem("theme")) {
            setTheme(defaultTheme.value);
          }
        }
      })
      .catch((err) => console.error("Failed to fetch database themes:", err));
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

  // Keep in sync if system preference changes while "system" is selected
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      document.documentElement.classList.toggle("dark", mq.matches);
    };
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, [theme]);

  const cycleTheme = () => {
    setTheme((prev) =>
      prev === "light" ? "dark" : prev === "dark" ? "system" : "light"
    );
  };

  // Function to handle user selection and update the database (is_selected = 1)
  const choose = async (choice) => {
    setTheme(choice.value);
    localStorage.setItem("theme", choice.value);

    try {
      await fetch("/api/themes/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: choice.value }),
      });
    } catch (err) {
      console.error("Failed to update selected theme in database:", err);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme, choices, choose }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);