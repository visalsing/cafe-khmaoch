import { http } from "./http.js";

export const rolesService = {
  list: () => http("/roles"),
  create: (formData) => http("/roles", { method: "POST", body: formData }),
  update: (id, formData) => http(`/roles/${id}`, { method: "PUT", body: formData }),
  setStatus: (id, status) => http(`/roles/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id) => http(`/roles/${id}`, { method: "DELETE" }),
};
