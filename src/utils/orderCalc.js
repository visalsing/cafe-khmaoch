export const TAX_RATE = 0.08;
export const PROMO_CODES = { BLOSSOM10: 10 }; // code -> % off
export const DELIVERY_FEES = { standard: 0, express: 3.5, freight: 8 }; // standard = pickup / dine-in

export const round2 = (n) => Math.round(n * 100) / 100;
export const money = (n) => `$${Number(n).toFixed(2)}`;
export const promoPercent = (code) => PROMO_CODES[String(code || "").trim().toUpperCase()] || 0;

// storefront cart uses `quantity`, POS and saved orders use `qty`
export const qtyOf = (line) => line.qty ?? line.quantity ?? 0;

export function calcTotals(items, { discountPct = 0, deliveryId = "standard" } = {}) {
  const subtotal = round2(items.reduce((s, l) => s + l.price * qtyOf(l), 0));
  const discount = round2((subtotal * discountPct) / 100);
  const shipping = DELIVERY_FEES[deliveryId] ?? 0;
  const tax = round2((subtotal - discount) * TAX_RATE);
  const total = round2(subtotal - discount + shipping + tax);
  return { subtotal, discount, shipping, tax, total };
}