import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { heroService } from "../services/api";

const HeroContext = createContext(null);

export function HeroProvider({ children }) {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setSlides(await heroService.list());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // keep other tabs in sync (dashboard tab + storefront tab)
  useEffect(() => {
    const onStorage = (e) => e.key === "bb_hero_v1" && refresh();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const addSlide = async (data) => {
    const slide = await heroService.create(data);
    setSlides((prev) => [...prev, slide]);
  };
  const updateSlide = async (id, changes) => {
    const updated = await heroService.update(id, changes);
    setSlides((prev) => prev.map((s) => (s.id === id ? updated : s)));
  };
  const removeSlide = async (id) => {
    await heroService.remove(id);
    setSlides((prev) => prev.filter((s) => s.id !== id));
  };
  const moveSlide = async (id, dir) => {
    const idx = slides.findIndex((s) => s.id === id);
    const to = idx + dir;
    if (idx === -1 || to < 0 || to >= slides.length) return;
    const next = [...slides];
    [next[idx], next[to]] = [next[to], next[idx]];
    setSlides(next); // instant UI, then persist
    await heroService.reorder(next.map((s) => s.id));
  };
  const resetSlides = async () => setSlides(await heroService.reset());

  const visibleSlides = useMemo(() => slides.filter((s) => s.visible !== false), [slides]);

  return (
    <HeroContext.Provider
      value={{ slides, visibleSlides, loading, addSlide, updateSlide, removeSlide, moveSlide, resetSlides }}
    >
      {children}
    </HeroContext.Provider>
  );
}

export const useHero = () => {
  const ctx = useContext(HeroContext);
  if (!ctx) throw new Error("useHero must be used inside <HeroProvider>");
  return ctx;
};