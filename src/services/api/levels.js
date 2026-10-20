import { http } from "./http.js";

/* Customization levels: Sugar, Ice, Coffee and the option groups they belong to */

export const sugarLevelService = {
  list: () => http("/sugar-levels"),
  create: (formData) => http("/sugar-levels", { method: "POST", body: formData }),
  update: (id, formData) => http(`/sugar-levels/${id}`, { method: "PUT", body: formData }),
  setStatus: (id, status) => http(`/sugar-levels/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id) => http(`/sugar-levels/${id}`, { method: "DELETE" }),
};

export const iceLevelService = {
  list: () => http("/ice-levels"),
  create: (formData) => http("/ice-levels", { method: "POST", body: formData }),
  update: (id, formData) => http(`/ice-levels/${id}`, { method: "PUT", body: formData }),
  setStatus: (id, status) => http(`/ice-levels/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id) => http(`/ice-levels/${id}`, { method: "DELETE" }),
};

export const coffeeLevelService = {
  list: () => http("/coffee-levels"),
  create: (formData) => http("/coffee-levels", { method: "POST", body: formData }),
  update: (id, formData) => http(`/coffee-levels/${id}`, { method: "PUT", body: formData }),
  setStatus: (id, status) => http(`/coffee-levels/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id) => http(`/coffee-levels/${id}`, { method: "DELETE" }),
};

export const levelsOptionsService = {
  list: () => http("/levels-options"),
  create: (formData) => http("/levels-options", { method: "POST", body: formData }),
  update: (id, formData) => http(`/levels-options/${id}`, { method: "PUT", body: formData }),
  setStatus: (id, status) => http(`/levels-options/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id) => http(`/levels-options/${id}`, { method: "DELETE" }),
};