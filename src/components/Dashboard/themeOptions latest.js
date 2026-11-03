import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { themeService } from "../../services/api.js";
import { THEME_ICONS } from "./ThemeIcons.jsx";

// the three themes the app knows, with the translation keys you already use
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
        if (usable.length) setRows(usable);
      })
      .catch(() => {}); // if the request fails, the built-in list below is used
    return () => {
      cancelled = true;
    };
  }, []);

  const choices = useMemo(() => {
    const list = rows || Object.keys(BUILT_IN).map((code) => ({ id: null, code, name: {}, description: {}, icon: BUILT_IN[code].icon }));
    return list.map((r) => {
      const keys = BUILT_IN[r.code];
      return {
        id: r.id ?? null,
        value: r.code,
        // database text for this language -> your built-in translation -> database English
        label: r.name?.[language] || t(keys.name) || r.name?.en || r.code,
        description: r.description?.[language] || t(keys.description) || r.description?.en || "",
        Icon: THEME_ICONS[r.icon] || THEME_ICONS[keys.icon] || THEME_ICONS.Monitor,
      };
    });
  }, [rows, language, t]);

  // applies the theme now; a signed-in user's choice is also saved on the server
  const choose = useCallback(
    async (choice) => {
      setTheme(choice.value);
      if (currentUser && choice.id) {
        try {
          await themeService.setMine(choice.id);
        } catch {
          /* it still works in this browser */
        }
      }
    },
    [setTheme, currentUser],
  );

  return { choices, choose };
}