import { http } from "./http.js";

export const impersonationService = {
  start: (userId) =>
    http(`/impersonation/start/${encodeURIComponent(userId)}`, {
      method: "POST",
    }),

  stop: () =>
    http("/impersonation/stop", {
      method: "POST",
    }),

  status: () =>
    http("/impersonation/status"),
};