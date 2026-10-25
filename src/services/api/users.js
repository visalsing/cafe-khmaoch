import { http } from "./http.js";

// export const userService = {
//   sendVerification: (id) => request(`/users/${id}/send-verification`, { method: "POST" }),
//   markVerified: (id) => request(`/users/${id}/mark-verified`, { method: "POST" }),

//   list: (arg = false) => http(`/users${arg === true || arg?.removed ? "?removed=1" : ""}`), // list(true) = removed users
//   create: (formData) => http("/users", { method: "POST", body: formData }),
//   update: (id, formData) => http(`/users/${id}`, { method: "PUT", body: formData }),
//   setStatus: (id, status) => http(`/users/${id}/status`, { method: "PATCH", body: { status } }),
//   setBlocked: (id, blocked) => http(`/users/${id}/block`, { method: "PATCH", body: { blocked } }),
//   remove: (id) => http(`/users/${id}/remove`, { method: "POST" }),   // REMOVE: adds "Removed-" to email + phone, can be restored
//   restore: (id) => http(`/users/${id}/restore`, { method: "POST" }), // takes "Removed-" off again
//   delete: (id) => http(`/users/${id}`, { method: "DELETE" }),         // DELETE: gone for good
// };

// src/services/api/users.js


export const userService = {
  list: (arg = false) => http(`/users${arg === true || arg?.removed ? "?removed=1" : ""}`), // list(true) = removed users
  create: (formData) => http("/users", { method: "POST", body: formData }),
  update: (id, formData) => http(`/users/${id}`, { method: "PUT", body: formData }),
  setStatus: (id, status) => http(`/users/${id}/status`, { method: "PATCH", body: { status } }),
  setBlocked: (id, blocked) => http(`/users/${id}/block`, { method: "PATCH", body: { blocked } }),
  remove: (id) => http(`/users/${id}/remove`, { method: "POST" }),   // REMOVE: adds "Removed-" to email + phone, can be restored
  restore: (id) => http(`/users/${id}/restore`, { method: "POST" }), // takes "Removed-" off again
  delete: (id) => http(`/users/${id}`, { method: "DELETE" }),         // DELETE: gone for good

  // email verification (admin side)
  sendVerification: (id) => http(`/users/${id}/send-verification`, { method: "POST" }),
  markVerified: (id) => http(`/users/${id}/mark-verified`, { method: "POST" }),
};


// new export:
export const emailVerificationService = {
  requestCode: () => request("/email-verification/request", { method: "POST" }),
  verifyCode: (code) =>
    request("/email-verification/verify", { method: "POST", body: JSON.stringify({ code }) }),
};


export const loginVerificationService = {
  start: (email, password) =>
    http("/login-verification/start", {
      method: "POST",
      body: { email, password },
    }),

  verify: (verifyToken, code) =>
    http("/login-verification/verify", {
      method: "POST",
      body: { verifyToken, code },
    }),

  resend: (verifyToken) =>
    http("/login-verification/resend", {
      method: "POST",
      body: { verifyToken },
    }),
};
