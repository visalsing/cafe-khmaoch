import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const CART_KEY = "bb_cart_v1";
const MAX_QTY = 99; // the server accepts 1-99 per line
const CartContext = createContext(null);
const round2 = (n) => Math.round(n * 100) / 100;

// read the saved cart; anything that is not a valid line is ignored, so a damaged value can never crash the site
const readCart = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY));
    if (!Array.isArray(saved)) return [];
    return saved
      .filter((i) => i && i.id !== undefined && Number(i.quantity) > 0 && Number.isFinite(Number(i.price)))
      .map((i) => ({
        ...i,
        price: Number(i.price),
        quantity: Math.max(1, Math.min(MAX_QTY, Math.round(Number(i.quantity)))),
      }));
  } catch {
    return [];
  }
};

export function CartProvider({ children }) {
  const [items, setItems] = useState(readCart);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      /* storage full or blocked: the cart still works until the page is closed */
    }
  }, [items]);

  // A NEW line keeps EVERYTHING the shop sends (productId, size, sugarLevelId, iceLevelId, coffeeLevelId ...):
  // the server needs those to price the order.
  const addItem = useCallback((item, qty = 1) => {
    if (!item || item.id === undefined) return;
    const add = Math.max(1, Math.floor(Number(qty) || 1));
    setItems((prev) => {
      const found = prev.find((i) => i.id === item.id);
      if (found)
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + add) } : i));
      return [...prev, { ...item, price: Number(item.price) || 0, quantity: Math.min(MAX_QTY, add) }];
    });
  }, []);

  const updateQuantity = useCallback(
    (id, delta) =>
      setItems((prev) =>
        prev
          .map((i) => (i.id === id ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + delta) } : i))
          .filter((i) => i.quantity > 0),
      ),
    [],
  );

  const removeItem = useCallback((id) => setItems((prev) => prev.filter((i) => i.id !== id)), []);
  const clearCart = useCallback(() => setItems([]), []);

  const cartCount = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);
  // display only: the server calculates the real prices when the order is placed
  const subtotal = useMemo(() => round2(items.reduce((s, i) => s + i.price * i.quantity, 0)), [items]);

  const value = useMemo(
    () => ({ items, cartCount, subtotal, addItem, updateQuantity, removeItem, clearCart }),
    [items, cartCount, subtotal, addItem, updateQuantity, removeItem, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
};