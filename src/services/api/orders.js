import { http } from "./http.js";

const qs = (o = {}) => {
  const p = new URLSearchParams(
    Object.entries(o).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    ),
  );
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const orderService = {
  list: (filters) => http(`/orders${qs(filters)}`),
  get: (ref) => http(`/orders/${encodeURIComponent(ref)}`),
  create: (payload) => http("/orders", { method: "POST", body: payload }), // POS
  createOnline: (payload) =>
    http("/orders/online", { method: "POST", body: payload }), // website checkout
  setStatus: (ref, status) =>
    http(`/orders/${encodeURIComponent(ref)}/status`, {
      method: "PATCH",
      body: { status },
    }),
  addPayment: (ref, payment) =>
    http(`/orders/${encodeURIComponent(ref)}/payments`, {
      method: "POST",
      body: payment,
    }),
  mine: () => http("/orders/mine"),
  options: () => http("/orders/options"),
  quote: (payload) => http("/orders/quote", { method: "POST", body: payload }),
  checkPromo: (code) => http(`/orders/promo/${encodeURIComponent(code)}`),
};
orderService.updateStatus = orderService.setStatus; // in case a page still uses the old name
