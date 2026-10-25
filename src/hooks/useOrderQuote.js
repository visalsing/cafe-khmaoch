import { useEffect, useMemo, useState } from "react";
import { orderService } from "../services/api";

const SIZES = ["price", "big", "small"];

// a cart line the server can price needs the product id and the size
export const isPricable = (i) =>
  Number.isInteger(Number(i?.productId)) && Number(i.productId) > 0 && SIZES.includes(i?.size);

// cart line -> what the server wants. Prices are NOT sent: the server reads them from the database
export const toApiItems = (items) =>
  items.map((i) => ({
    productId: Number(i.productId),
    size: i.size,
    qty: Number(i.quantity) || 1,
    sugarLevelId: i.sugarLevelId ?? null,
    iceLevelId: i.iceLevelId ?? null,
    coffeeLevelId: i.coffeeLevelId ?? null,
  }));

// delivery choices (names + fees) from the database
export function useShopOptions() {
  const [options, setOptions] = useState({ delivery: [], loaded: false });
  useEffect(() => {
    let alive = true;
    orderService
      .options()
      .then((o) => alive && setOptions({ ...o, delivery: o.delivery || [], loaded: true }))
      .catch(() => alive && setOptions({ delivery: [], loaded: true })); // the page still works with pickup only
    return () => {
      alive = false;
    };
  }, []);
  return options;
}

// the server's price for the cart. { quote, error, pending, apiItems, priceable }
export function useOrderQuote({ items, orderType, deliveryId, promoCode }) {
  const [state, setState] = useState({ quote: null, error: "", pending: false });
  const priceable = items.length > 0 && items.every(isPricable);
  const apiItems = useMemo(() => (priceable ? toApiItems(items) : []), [items, priceable]);
  const delivery = orderType === "delivery" ? deliveryId : null;
  const key = JSON.stringify([apiItems, orderType, delivery, promoCode || ""]);

  useEffect(() => {
    if (!priceable) {
      setState({ quote: null, error: "", pending: false });
      return undefined;
    }
    let alive = true;
    setState((s) => ({ ...s, pending: true }));
    const timer = setTimeout(() => {
      orderService
        .quote({ items: apiItems, orderType, deliveryId: delivery, promoCode: promoCode || "" })
        .then((quote) => alive && setState({ quote, error: "", pending: false }))
        .catch((err) => alive && setState({ quote: null, error: err.message || "Could not price your order.", pending: false }));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { ...state, apiItems, priceable };
}