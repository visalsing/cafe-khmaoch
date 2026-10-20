import { http } from "./http.js";

/* Homepage content: hero slider and map */

export const heroService = {
  // staff with the "pages" permission also receive hidden slides; everyone else only gets the visible ones
  list: () => http("/hero?all=1"),
  create: (formData) => http("/hero", { method: "POST", body: formData }),
  update: (id, formData) => http(`/hero/${id}`, { method: "PUT", body: formData }),
  setStatus: (id, status) => http(`/hero/${id}/status`, { method: "PATCH", body: { status } }),
  reorder: (ids) => http("/hero/reorder", { method: "PUT", body: { ids } }),
  reset: () => http("/hero/reset", { method: "POST" }),
  remove: (id) => http(`/hero/${id}`, { method: "DELETE" }),
};

export const mapService = {
  // dashboard: every map with full { en, km } texts (needs login)
  list: () => http("/maps?raw=1"),
  // storefront: visible maps, already translated to one language (public)
  listPublic: (lang = "en") => http(`/maps?lang=${lang}`),
  create: (formData) => http("/maps", { method: "POST", body: formData }),
  update: (id, formData) => http(`/maps/${id}`, { method: "PUT", body: formData }),
  setStatus: (id, status) => http(`/maps/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id) => http(`/maps/${id}`, { method: "DELETE" }),
};