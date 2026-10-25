
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const CART_KEY = "bb_cart_v1";

const CartContext = createContext(null);

const round2 = (number) => Math.round(number * 100) / 100;

// Normalize the price from the database into a number.
const normalizePrice = (price) => {
  const number = Number(price);

  return Number.isFinite(number) ? number : 0;
};

// Create a stable key for each product configuration.
// Different sizes or customizations should remain separate cart items.
const getCartItemId = (item) => {
  if (item.cartItemId) {
    return String(item.cartItemId);
  }

  return [
    item.productId ?? item.id,
    item.sizeId ?? item.size ?? "",
    item.sugarLevelId ?? item.sugarLevel ?? "",
    item.iceLevelId ?? item.iceLevel ?? "",
    item.coffeeLevelId ?? item.coffeeLevel ?? "",
  ].join("::");
};

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      const parsed = saved ? JSON.parse(saved) : [];

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Failed to load cart from localStorage:", error);
      return [];
    }
  });

  // Persist cart items in the browser.
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Failed to save cart to localStorage:", error);
    }
  }, [items]);

  // Add a product or increase the quantity of an identical configuration.
  const addItem = useCallback((item) => {
    if (!item || typeof item !== "object") {
      console.error("Cannot add an invalid cart item:", item);
      return;
    }

    const cartItemId = getCartItemId(item);

    const newItem = {
      ...item,
      cartItemId,
      price: normalizePrice(item.price),
    };

    setItems((previousItems) => {
      const existingItem = previousItems.find(
        (cartItem) =>
          getCartItemId(cartItem) === cartItemId,
      );

      if (existingItem) {
        return previousItems.map((cartItem) =>
          getCartItemId(cartItem) === cartItemId
            ? {
                ...cartItem,
                quantity: (Number(cartItem.quantity) || 1) + 1,
              }
            : cartItem,
        );
      }

      return [
        ...previousItems,
        {
          ...newItem,
          quantity: 1,
        },
      ];
    });
  }, []);

  // Update quantity by a positive or negative delta.
  const updateQuantity = useCallback((id, delta) => {
    setItems((previousItems) =>
      previousItems
        .map((item) => {
          if (getCartItemId(item) !== String(id)) {
            return item;
          }

          return {
            ...item,
            quantity: Math.max(
              0,
              (Number(item.quantity) || 0) + Number(delta),
            ),
          };
        })
        .filter((item) => item.quantity > 0),
    );
  }, []);

  // Remove one configuration from the cart.
  const removeItem = useCallback((id) => {
    setItems((previousItems) =>
      previousItems.filter(
        (item) => getCartItemId(item) !== String(id),
      ),
    );
  }, []);

  // Remove all items from the cart.
  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  // Total quantity of all items.
  const cartCount = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0),
        0,
      ),
    [items],
  );

  // Total price before any delivery fees, taxes, or discounts.
  const subtotal = useMemo(
    () =>
      round2(
        items.reduce(
          (sum, item) =>
            sum +
            normalizePrice(item.price) *
              (Number(item.quantity) || 0),
          0,
        ),
      ),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      cartCount,
      subtotal,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [
      items,
      cartCount,
      subtotal,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    ],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside <CartProvider>");
  }

  return context;
};
