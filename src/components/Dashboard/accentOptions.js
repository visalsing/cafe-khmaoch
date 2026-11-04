import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccentContext } from "../../context/AccentContext.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { ACCENTS } from "../../utils/accent.js";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export function useAccentOptions() {
  const { accent, setAccent, savedAccent, saveAccent, accentRows } =
    useAccentContext();
  const { t, language } = useLanguage();

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { type: "success" | "error", text }

  // Cards come from the database rows (labels, order, swatch, hidden ones removed),
  // falling back to the built-in list while loading.
  const choices = useMemo(() => {
    const list = accentRows.length
      ? accentRows
      : ACCENTS.map((a) => ({ id: null, code: a.value, name: {}, swatch: a.swatch }));

    return list.map((r) => {
      const base = ACCENTS.find((a) => a.value === r.code);
      return {
        id: r.id ?? null,
        value: r.code,
        label: r.name?.[language] || r.name?.en || base?.label || r.code,
        swatch: HEX_RE.test(r.swatch || "") ? r.swatch : base?.swatch || "#888888",
      };
    });
  }, [accentRows, language]);

  const dirty = accent !== savedAccent;

  // Clicking a card previews it. Nothing is saved yet.
  const select = useCallback(
    (choice) => {
      if (!choice) return;
      setStatus(null);
      setAccent(choice.value);
    },
    [setAccent],
  );

  const save = useCallback(async () => {
    setSaving(true);
    setStatus(null);
    try {
      await saveAccent(accent);
      setStatus({
        type: "success",
        text: t("accentSaved") || "Accent color saved successfully.",
      });
    } catch (error) {
      console.error("[accents] Failed to save accent:", error);
      setStatus({
        type: "error",
        text:
          t("accentSaveFailed") ||
          "Could not save accent color. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }, [accent, saveAccent, t]);

  const cancel = useCallback(() => {
    setAccent(savedAccent);
    setStatus(null);
  }, [setAccent, savedAccent]);

  const dismissStatus = useCallback(() => setStatus(null), []);

  // Auto-hide the success message.
  useEffect(() => {
    if (status?.type !== "success") return undefined;
    const timer = setTimeout(() => setStatus(null), 3000);
    return () => clearTimeout(timer);
  }, [status]);

  // Leaving the page with an unsaved preview: revert to the saved accent.
  const latest = useRef({ dirty, savedAccent, setAccent });
  latest.current = { dirty, savedAccent, setAccent };
  useEffect(
    () => () => {
      const { dirty, savedAccent, setAccent } = latest.current;
      if (dirty) setAccent(savedAccent);
    },
    [],
  );

  return { choices, accent, select, dirty, saving, status, save, cancel, dismissStatus };
}