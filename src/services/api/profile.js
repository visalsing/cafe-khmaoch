// src/services/api/profile.js
import { http } from "./http.js";

const profileService = {
  // Profile
  get: () => http("/profile"),

  update: (formData) =>
    http("/profile", {
      method: "PUT",
      body: formData,
    }),

  // Existing email verification
  sendVerification: () =>
    http("/email-verification/request", {
      method: "POST",
    }),

  verifyEmail: (code) =>
    http("/email-verification/verify", {
      method: "POST",
      body: { code },
    }),

  // Change email — requires matching backend routes
  requestEmailChange: (email) =>
    http("/profile/email-change/request", {
      method: "POST",
      body: { email },
    }),

  verifyEmailChange: (email, code) =>
    http("/profile/email-change/verify", {
      method: "POST",
      body: { email, code },
    }),

  // Change password with OTP — requires matching backend routes
  requestPasswordChangeCode: (currentPassword) =>
    http("/profile/password-change/request", {
      method: "POST",
      body: { currentPassword },
    }),

  verifyPasswordChange: ({ currentPassword, newPassword, code }) =>
    http("/profile/password-change/verify", {
      method: "POST",
      body: { currentPassword, newPassword, code },
    }),

  // Existing direct password change
  changePassword: (currentPassword, newPassword) =>
    http("/profile/password", {
      method: "PUT",
      body: { currentPassword, newPassword },
    }),


  resetPasswordFromProfile: ({ email, code }) =>
    http("/password-reset/verify", {
      method: "POST",
      body: { email, code },
    }),

  // Existing forgot-password flow
  requestForgotPasswordChangeCode: (email) =>
    http("/password-reset/request", {
      method: "POST",
      body: { email },
    }),

  verifyForgotPasswordCode: ({ email, code }) =>
    http("/password-reset/verify", {
      method: "POST",
      body: { email, code },
    }),

  confirmForgotPasswordReset: ({ resetToken, password }) =>
    http("/password-reset/confirm", {
      method: "POST",
      body: { resetToken, password },
    }),
    
};

export { profileService };
export default profileService;
