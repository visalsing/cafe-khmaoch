import { http } from "./http.js";

/* Auth, users, roles & permissions */

export const authService = {
  login: (email, password) =>
    http("/auth/login", { method: "POST", body: { email, password } }),
  register: (data) => http("/auth/register", { method: "POST", body: data }),
  logout: () => http("/auth/logout", { method: "POST" }),
  me: () => http("/auth/me"),
};

// export const userService = {
//   list: () => http("/users"),
//   create: (data) => http("/users", { method: "POST", body: data }),
//   update: (id, changes) =>
//     http(`/users/${id}`, { method: "PUT", body: changes }),
//   remove: (id) => http(`/users/${id}`, { method: "DELETE" }),
// };

// services/api.js
// export const userService = {
//   list: (opts = {}) => http(`/users${opts.removed ? "?removed=1" : ""}`),
//   create: (formData) => http("/users", { method: "POST", body: formData }),
//   update: (id, formData) => http(`/users/${id}`, { method: "PUT", body: formData }),
//   setStatus: (id, status) => http(`/users/${id}/status`, { method: "PATCH", body: { status } }),
//   setBlocked: (id, blocked) => http(`/users/${id}/block`, { method: "PATCH", body: { blocked } }),
//   remove: (id) => http(`/users/${id}/remove`, { method: "POST" }),    // soft remove, can be restored
//   restore: (id) => http(`/users/${id}/restore`, { method: "POST" }),
//   delete: (id) => http(`/users/${id}`, { method: "DELETE" }),          // permanent
// };

// export const accessService = {
//   get: () => http("/access"),
//   saveStaff: (permissions) =>
//     http("/access/staff", { method: "PUT", body: { permissions } }),
//   reset: () => http("/access/staff/reset", { method: "POST" }),
// };

// export const accessService = {
//   get: () => http("/access"),
//   saveRole: (id, permissions) => http(`/access/roles/${id}`, { method: "PUT", body: { permissions } }),
//   saveStaff: (permissions) => http("/access/staff", { method: "PUT", body: { permissions } }), // used by the old page
//   reset: () => http("/access/staff/reset", { method: "POST" }),                                  // staff back to the defaults
// };



export const accessService = {
  // GET /api/access
  get: () => http("/access"),

  // PUT /api/access/roles/:id
  saveRole: (roleId, permissions) =>
    http(`/access/roles/${roleId}`, {
      method: "PUT",
      body: { permissions },
    }),

  // POST /api/access/staff/reset
  reset: () =>
    http("/access/staff/reset", {
      method: "POST",
    }),
};
