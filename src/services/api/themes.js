import { http } from "./http.js";

export const themeService = {
  list: () => http("/themes"), // the visible themes (Settings pages)
  listAll: () => http("/themes/all"), // every theme (dashboard, admin)
  getMine: () => http("/themes/me"),
  setMine: (themeId) => http("/themes/me", { method: "PATCH", body: { themeId } }),
  update: (id, body) => http(`/themes/${id}`, { method: "PUT", body }),
  setStatus: (id, status) => http(`/themes/${id}/status`, { method: "PATCH", body: { status } }),
  select: (id) => http(`/themes/${id}/select`, { method: "PATCH" }),
};