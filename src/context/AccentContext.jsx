// src/context/AccentContext.jsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { accentService } from "../services/api.js";
import { useAuth } from "./AuthContext.jsx";
import {
  ACCENT_KEY,
  applyAccent,
  getSavedAccent,
  isValidAccent,
  storeAccent,
} from "../utils/accent.js";

const AccentContext = createContext(null);

export function AccentProvider({ children }) {
  const { currentUser, loading: authLoading } = useAuth();

  // savedAccent = persisted. accent = currently shown (may be a preview).
  const [savedAccent, setSavedAccent] = useState(getSavedAccent);
  const [accent, setAccent] = useState(getSavedAccent);
  const [accentRows, setAccentRows] = useState([]);

  const commitAccent = useCallback((code) => {
    if (!isValidAccent(code)) return;
    setSavedAccent(code);
    setAccent(code);
    storeAccent(code);
  }, []);

  // The ONLY place that restores the accent. Runs when the user changes.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    const load = async () => {
      try {
        const data = await accentService.list();
        if (cancelled || !Array.isArray(data)) return;

        const usable = data.filter((r) => isValidAccent(r.code));
        setAccentRows(usable);

        let selected = null;

        if (currentUser) {
          const mine = await accentService.getMine();
          if (cancelled) return;
          const accentId = mine?.accentId ?? mine?.accent_id ?? null;
          if (accentId != null) {
            selected = usable.find((r) => Number(r.id) === Number(accentId));
          }
        } else {
          const saved = localStorage.getItem(ACCENT_KEY);
          selected = usable.find((r) => r.code === saved);
        }

        // Fallback: Admin default
        if (!selected) {
          selected = usable.find((r) => Number(r.is_selected) === 1);
        }

        if (selected) {
          setAccent(selected.code);
          setSavedAccent(selected.code);
          // Cache for a flash-free next load, signed-in users only.
          // A guest's localStorage is written only when they click Save.
          if (currentUser) storeAccent(selected.code);
        }
      } catch (error) {
        console.error("Failed to load accent:", error);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, authLoading]);

  // Apply to <html>. Previews are applied but never persisted here.
  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  // Database for signed-in users, localStorage for guests. Throws if the API fails.
  const saveAccent = useCallback(
    async (code) => {
      const row = accentRows.find((r) => r.code === code);
      if (currentUser && row?.id != null) {
        await accentService.setMine(Number(row.id));
      }
      commitAccent(code);
    },
    [accentRows, currentUser, commitAccent],
  );

  return (
    <AccentContext.Provider
      value={{ accent, setAccent, savedAccent, commitAccent, saveAccent, accentRows }}
    >
      {children}
    </AccentContext.Provider>
  );
}

export const useAccentContext = () => {
  const ctx = useContext(AccentContext);
  if (!ctx) {
    return {
      accent: getSavedAccent(),
      setAccent: () => {},
      savedAccent: getSavedAccent(),
      commitAccent: () => {},
      saveAccent: async () => {},
      accentRows: [],
    };
  }
  return ctx;
};