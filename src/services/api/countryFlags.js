import { http } from "./http.js";

export const countryFlagsService = {
  list: () => http("/country-flags"),
  create: (formData) => http("/country-flags", { method: "POST", body: formData }),
  update: (id, formData) => http(`/country-flags/${id}`, { method: "PUT", body: formData }),
  setStatus: (id, status) => http(`/country-flags/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id) => http(`/country-flags/${id}`, { method: "DELETE" }),
};
