// Dashboard/themeOptions.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { themeService } from "../../services/api.js";
import { THEME_ICONS } from "./ThemeIcons.jsx";

const BUILT_IN = {
  light: { name: "light", description: "lightDescription", icon: "Sun" },
  dark: { name: "dark", description: "darkDescription", icon: "Moon" },
  system: { name: "system", description: "systemDescription", icon: "Monitor" },
};

export function useThemeOptions() {
  const { setTheme } = useTheme();
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let cancelled = false;
    themeService
      .list()
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        const usable = data.filter((r) => BUILT_IN[r.code]);
        if (usable.length) {
          setRows(usable);

          // If no theme is saved locally or by user, fall back to Admin default (`is_selected = 1`)
          if (!localStorage.getItem("theme") && !currentUser?.theme_id) {
            const adminDefault = usable.find(
              (r) => r.is_selected === 1 || r.is_selected === true
            );
            if (adminDefault) {
              setTheme(adminDefault.code);
            }
          }
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [setTheme, currentUser]);

  const choices = useMemo(() => {
    const list =
      rows ||
      Object.keys(BUILT_IN).map((code) => ({
        id: null,
        code,
        name: {},
        description: {},
        icon: BUILT_IN[code].icon,
      }));

    return list.map((r) => {
      const keys = BUILT_IN[r.code] || BUILT_IN.system;
      return {
        id: r.id ?? null,
        value: r.code,
        label: r.name?.[language] || t(keys.name) || r.name?.en || r.code,
        description:
          r.description?.[language] ||
          t(keys.description) ||
          r.description?.en ||
          "",
        Icon:
          THEME_ICONS[r.icon] ||
          THEME_ICONS[keys.icon] ||
          THEME_ICONS.Monitor,
      };
    });
  }, [rows, language, t]);

  const choose = useCallback(
    async (choice) => {
      setTheme(choice.value);
      localStorage.setItem("theme", choice.value);

      if (currentUser && choice.id) {
        try {
          await themeService.setMine(choice.id); // Updates users.theme_id on server
        } catch {
          /* fallback to local storage */
        }
      }
    },
    [setTheme, currentUser],
  );

  // ALWAYS return choices so SettingsPage never throws "choices is undefined"
  return { choices, choose };
}