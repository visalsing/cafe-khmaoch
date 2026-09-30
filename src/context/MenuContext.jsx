import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { menuService } from "../services/api";

const MenuContext = createContext(null);

export function MenuProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setItems(await menuService.list());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Keep other browser tabs in sync (e.g. dashboard tab + storefront tab)
  useEffect(() => {
    const onStorage = (e) => e.key === "bb_menu_v1" && refresh();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const addItem = async (data) => {
    const item = await menuService.create(data);
    setItems((prev) => [item, ...prev]);
    return item;
  };
  const updateItem = async (id, changes) => {
    const updated = await menuService.update(id, changes);
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    return updated;
  };
  const removeItem = async (id) => {
    await menuService.remove(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };
  const resetMenu = async () => setItems(await menuService.reset());

  // What customers/POS can see and sell
  const availableItems = useMemo(() => items.filter((i) => i.available !== false), [items]);
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(availableItems.map((i) => i.category)))],
    [availableItems]
  );

  return (
    <MenuContext.Provider
      value={{ items, availableItems, categories, loading, error, addItem, updateItem, removeItem, resetMenu, refresh }}
    >
      {children}
    </MenuContext.Provider>
  );
}

export const useMenu = () => {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used inside <MenuProvider>");
  return ctx;
};