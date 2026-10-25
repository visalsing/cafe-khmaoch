import { http } from "./http.js";

export const passwordResetService = {
  requestCode: (email) => http("/password-reset/request", { method: "POST", body: { email } }),
  verifyCode: (email, code) => http("/password-reset/verify", { method: "POST", body: { email, code } }),
  resetPassword: (resetToken, password) => http("/password-reset/confirm", { method: "POST", body: { resetToken, password } }),
};