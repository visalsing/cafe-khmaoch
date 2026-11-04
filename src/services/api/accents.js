import { http } from "./http.js";

export const accentService = {
  list: () => http("/accents"), // the visible accents (Settings pages)
  listAll: () => http("/accents/all"), // every accent (dashboard, admin)
  getMine: () => http("/accents/me"),
  setMine: (accentId) => http("/accents/me", { method: "PATCH", body: { accentId } }),
  update: (id, body) => http(`/accents/${id}`, { method: "PUT", body }),
  setStatus: (id, status) => http(`/accents/${id}/status`, { method: "PATCH", body: { status } }),
  select: (id) => http(`/accents/${id}/select`, { method: "PATCH" }),
};