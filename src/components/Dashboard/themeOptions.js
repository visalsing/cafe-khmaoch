import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const { theme, setTheme, savedTheme, commitTheme } = useTheme();
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();

  const [rows, setRows] = useState(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { type: "success" | "error", text }

  // Only load the list (for labels and ids). It never changes the theme.
  useEffect(() => {
    let cancelled = false;
    themeService
      .list()
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        setRows(data.filter((r) => BUILT_IN[r.code]));
      })
      .catch((error) => console.error("[themes] Failed to load themes:", error));
    return () => {
      cancelled = true;
    };
  }, []);

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
          THEME_ICONS[r.icon] || THEME_ICONS[keys.icon] || THEME_ICONS.Monitor,
      };
    });
  }, [rows, language, t]);

  const dirty = theme !== savedTheme;

  // Clicking a card previews it. Nothing is saved yet.
  const select = useCallback(
    (choice) => {
      if (!choice) return;
      setStatus(null);
      setTheme(choice.value);
    },
    [setTheme],
  );

  const save = useCallback(async () => {
    const choice = choices.find((c) => c.value === theme);
    setSaving(true);
    setStatus(null);
    try {
      if (currentUser && choice?.id != null) {
        await themeService.setMine(Number(choice.id));
      }
      commitTheme(theme);
      setStatus({
        type: "success",
        text: t("themeSaved") || "Theme saved successfully.",
      });
    } catch (error) {
      console.error("[themes] Failed to save theme:", error);
      setStatus({
        type: "error",
        text: t("themeSaveFailed") || "Could not save theme. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }, [choices, theme, currentUser, commitTheme, t]);

  const cancel = useCallback(() => {
    setTheme(savedTheme);
    setStatus(null);
  }, [setTheme, savedTheme]);

  const dismissStatus = useCallback(() => setStatus(null), []);

  // Auto-hide the success message.
  useEffect(() => {
    if (status?.type !== "success") return undefined;
    const timer = setTimeout(() => setStatus(null), 3000);
    return () => clearTimeout(timer);
  }, [status]);

  // Leaving the page with an unsaved preview: revert to the saved theme.
  const latest = useRef({ dirty, savedTheme, setTheme });
  latest.current = { dirty, savedTheme, setTheme };
  useEffect(
    () => () => {
      const { dirty, savedTheme, setTheme } = latest.current;
      if (dirty) setTheme(savedTheme);
    },
    [],
  );

  return { choices, select, dirty, saving, status, save, cancel, dismissStatus };
}