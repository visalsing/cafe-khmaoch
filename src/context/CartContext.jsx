import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const CART_KEY = "bb_cart_v1";
const CartContext = createContext(null);
const round2 = (n) => Math.round(n * 100) / 100;

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (p) =>
    setItems((prev) => {
      const found = prev.find((i) => i.id === p.id);
      return found
        ? prev.map((i) => (i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i))
        : [
            ...prev,
            { id: p.id, title: p.title, category: p.category, price: Number(p.price), img: p.img, quantity: 1 },
          ];
    });

  const updateQuantity = (id, delta) =>
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i)).filter((i) => i.quantity > 0)
    );

  const removeItem = (id) => setItems((prev) => prev.filter((i) => i.id !== id));
  const clearCart = () => setItems([]);

  const cartCount = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);
  const subtotal = useMemo(() => round2(items.reduce((s, i) => s + i.price * i.quantity, 0)), [items]);

  return (
    <CartContext.Provider value={{ items, cartCount, subtotal, addItem, updateQuantity, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
};