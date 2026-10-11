import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { menuService } from "../services/api";

const MenuContext = createContext(null);

const defaultCategories = [
  { id: "cat_1", name: "Coffee", description: "Freshly brewed hot & iced coffee", img: "", thumbnail: "", status: "Active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "cat_2", name: "Bakery", description: "Fresh daily pastries and cakes", img: "", thumbnail: "", status: "Active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

export function MenuProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Categories state
  const [categoriesList, setCategoriesList] = useState(defaultCategories);

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

  // Category Actions
  const addCategory = async (newCat) => {
    setCategoriesList((prev) => [...prev, newCat]);
    return newCat;
  };

  const updateCategory = async (id, data) => {
    setCategoriesList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c))
    );
  };

  const removeCategory = async (id) => {
    setCategoriesList((prev) => prev.filter((c) => c.id !== id));
  };

  const resetCategories = async () => {
    setCategoriesList(defaultCategories);
  };

  // What customers/POS can see and sell
  const availableItems = useMemo(() => items.filter((i) => i.available !== false), [items]);
  
  // Combine dynamic categories list with fallback
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(categoriesList.map((c) => c.name)))],
    [categoriesList]
  );

  return (
    <MenuContext.Provider
      value={{
        items,
        availableItems,
        categories,
        categoriesList,
        loading,
        error,
        addItem,
        updateItem,
        removeItem,
        resetMenu,
        refresh,
        addCategory,
        updateCategory,
        removeCategory,
        resetCategories,
      }}
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