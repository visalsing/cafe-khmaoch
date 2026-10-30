// services/api/qr.js
import { http } from "./http.js";

/* QR codes shown on the website */

export const qrService = {
  list: () => http("/qr"),                         // dashboard only
  getSelected: () => http("/qr/selected"),         // public: the one QR shown on the site (or null)
  create: (formData) => http("/qr", { method: "POST", body: formData }),
  update: (id, formData) => http(`/qr/${id}`, { method: "PUT", body: formData }),
  select: (id) => http(`/qr/${id}/select`, { method: "PUT" }),
  remove: (id) => http(`/qr/${id}`, { method: "DELETE" }),
};