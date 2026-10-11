import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { heroService } from "../services/api";

const HeroContext = createContext(null);

export function HeroProvider({ children }) {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await heroService.list();
      setSlides(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load hero slides:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // status is 1 (shown) or 0 (hidden)
  const visibleSlides = useMemo(() => slides.filter((s) => Number(s.status) === 1), [slides]);

  return (
    <HeroContext.Provider value={{ slides, visibleSlides, loading, refresh }}>{children}</HeroContext.Provider>
  );
}

export const useHero = () => {
  const ctx = useContext(HeroContext);
  if (!ctx) throw new Error("useHero must be used inside <HeroProvider>");
  return ctx;
};