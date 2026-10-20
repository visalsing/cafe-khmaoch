import { http } from "./http.js";

/* Currencies: genders */

export const gendersService = {
  list: () => http("/genders"),
  create: (formData) => http("/genders", { method: "POST", body: formData }),
  update: (id, formData) => http(`/genders/${id}`, { method: "PUT", body: formData }),
  setStatus: (id, status) => http(`/genders/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id) => http(`/genders/${id}`, { method: "DELETE" }),
};