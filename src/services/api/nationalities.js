import { http } from "./http.js";

export const nationalitiesService = {
  list: () => http("/nationalities"),
  create: (formData) => http("/nationalities", { method: "POST", body: formData }),
  update: (id, formData) => http(`/nationalities/${id}`, { method: "PUT", body: formData }),
  setStatus: (id, status) => http(`/nationalities/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id) => http(`/nationalities/${id}`, { method: "DELETE" }),
};