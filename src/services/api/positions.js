import { http } from "./http.js";

export const positionsService = {
  list: () => http("/positions"),
  create: (formData) => http("/positions", { method: "POST", body: formData }),
  update: (id, formData) => http(`/positions/${id}`, { method: "PUT", body: formData }),
  setStatus: (id, status) => http(`/positions/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id) => http(`/positions/${id}`, { method: "DELETE" }),
};
