import { http } from "./http.js";

export const aboutService = {
  get: () => http("/about"),
  save: (payload) => http("/about", { method: "PUT", body: payload }),
  uploadImages: (files) => {
    const form = new FormData();
    files.forEach((file) => form.append("images", file));
    return http("/about/images", { method: "POST", body: form });
  },
  removeImage: (key) => http(`/about/images/${encodeURIComponent(key)}`, { method: "DELETE" }),
};