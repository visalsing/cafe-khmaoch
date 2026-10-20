import { http } from "./http.js";

export const permissionsService = {
  list: () => http("/permissions"),
  create: (formData) => http("/permissions", { method: "POST", body: formData }),
  update: (id, formData) => http(`/permissions/${id}`, { method: "PUT", body: formData }),
  setStatus: (id, status) => http(`/permissions/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id) => http(`/permissions/${id}`, { method: "DELETE" }),
};