import { http } from "./http.js";

/* Currencies: currencies, exchangeRate */

export const currenciesService = {
  list: () => http("/currencies"),
  create: (formData) => http("/currencies", { method: "POST", body: formData }),
  update: (id, formData) => http(`/currencies/${id}`, { method: "PUT", body: formData }),
  setStatus: (id, status) => http(`/currencies/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id) => http(`/currencies/${id}`, { method: "DELETE" }),
};

export const exchangeRateService = {
  list: () => http("/exchange-rates"),
  create: (data) => http("/exchange-rates", { method: "POST", body: data }),
  update: (id, data) => http(`/exchange-rates/${id}`, { method: "PUT", body: data }),
  setStatus: (id, status) => http(`/exchange-rates/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id) => http(`/exchange-rates/${id}`, { method: "DELETE" }),
};