import { http } from "./http.js";

export const userService = {
  list: (arg = false) => http(`/users${arg === true || arg?.removed ? "?removed=1" : ""}`), // list(true) = removed users
  create: (formData) => http("/users", { method: "POST", body: formData }),
  update: (id, formData) => http(`/users/${id}`, { method: "PUT", body: formData }),
  setStatus: (id, status) => http(`/users/${id}/status`, { method: "PATCH", body: { status } }),
  setBlocked: (id, blocked) => http(`/users/${id}/block`, { method: "PATCH", body: { blocked } }),
  remove: (id) => http(`/users/${id}/remove`, { method: "POST" }),   // REMOVE: adds "Removed-" to email + phone, can be restored
  restore: (id) => http(`/users/${id}/restore`, { method: "POST" }), // takes "Removed-" off again
  delete: (id) => http(`/users/${id}`, { method: "DELETE" }),         // DELETE: gone for good
};