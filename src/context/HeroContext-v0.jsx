import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { heroService } from "../services/api";

const HeroContext = createContext(null);

export function HeroProvider({ children }) {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await heroService.list();
      setSlides(data);
    } catch (err) {
      console.error("Failed to load hero slides:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
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

  const setSlideStatus = async (id, status) => {
    const updated = await heroService.setStatus(id, status);
    setSlides((prev) => prev.map((s) => (s.id === id ? updated : s)));
  };

  const moveSlide = async (id, dir) => {
    const idx = slides.findIndex((s) => s.id === id);
    const to = idx + dir;
    if (idx === -1 || to < 0 || to >= slides.length) return;
    const next = [...slides];
    [next[idx], next[to]] = [next[to], next[idx]];
    setSlides(next); // instant UI update
    
    // If you have a reorder endpoint on your backend, call it here:
    // await heroService.reorder(next.map((s) => s.id));
  };

  // Filter visible slides based on database status (status === 1 means shown)
  const visibleSlides = useMemo(() => slides.filter((s) => s.status === 1), [slides]);

  return (
    <HeroContext.Provider
      value={{ 
        slides, 
        visibleSlides, 
        loading, 
        refresh, 
        addSlide, 
        updateSlide, 
        removeSlide, 
        setSlideStatus, 
        moveSlide 
      }}
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