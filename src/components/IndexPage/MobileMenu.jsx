// IndexPage/MobileMenu.jsx
import React, { useState, useEffect } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import useActiveSection from "../../hooks/useActiveSection";
import { useLanguage } from "../../context/LanguageContext.jsx";

export default function MobileMenu({ isOpen, onClose }) {
  const { language, t } = useLanguage();
  const {
    currentUser,
    canEnterDashboard,
    canEnterProfile,
    logout,
    isImpersonating,
    stopImpersonation,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const activeSection = useActiveSection();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close menu or modal with Escape key.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSubmitting) {
        if (showLogoutModal) {
          setShowLogoutModal(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, showLogoutModal, isSubmitting, onClose]);

  if (!isOpen) return null;

  const navLinks = [
    { id: "hero", label: t("home"), href: "/#hero" },
    { id: "shop", label: t("menu"), href: "/#shop" },
    { id: "gallery", label: t("gallery"), href: "/#gallery" },
    { id: "about", label: t("about_us"), href: "/#about" },
    { id: "contact", label: t("contact"), href: "/#contact" },
  ];

  const actionLabel = isImpersonating ? "Exit Impersonation" : "Logout";

  const handleConfirmLogout = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      if (isImpersonating) {
        await stopImpersonation();

        setShowLogoutModal(false);
        onClose();
        navigate("/dashboard", { replace: true });
      } else {
        await logout();

        setShowLogoutModal(false);
        onClose();
        navigate("/", { replace: true });
      }
    } catch (error) {
      console.error(t("logout_exit_impersonate"), error);

      window.alert(error.message || t("session_act_failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Full-Screen Mobile Menu */}
      <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white transition-colors duration-200">
        {/* Top Header Row */}
        <div className="max-w-7xl w-full mx-auto px-6 h-20 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800">
          {/* Brand Logo & Name */}
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => handleNavigation("/")}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-500 to-orange-600 flex items-center justify-center shadow-md overflow-hidden p-1.5">
              <span className="text-white text-xl">☕</span>
            </div>

            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-accent-600 to-orange-600 bg-clip-text text-transparent">
              Café ខ្មោច
            </span>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-accent-600 dark:hover:text-accent-400 hover:bg-accent-50 dark:hover:bg-neutral-700 flex items-center justify-center transition-all shadow-sm cursor-pointer"
            title="Close Menu"
            aria-label="Close navigation menu"
          >
            ✕
          </button>
        </div>

        {/* Centered Navigation Links */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center px-4 py-6 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive =
              location.pathname === "/" && activeSection === link.id;

            return (
              <a
                key={link.id}
                href={link.href}
                onClick={onClose}
                aria-current={isActive ? "location" : undefined}
                className={`!text-lg transition-all cursor-pointer ${
                  isActive
                    ? "text-accent-600 dark:text-accent-400 font-bold scale-105"
                    : "text-neutral-600 dark:text-neutral-300 hover:text-accent-600 dark:hover:text-accent-400"
                }`}
              >
                {link.label}
              </a>
            );
          })}

          {/* Settings */}
          <button
            type="button"
            onClick={() => handleNavigation("/settings-page")}
            className={`!text-lg transition-all cursor-pointer ${
              location.pathname === "/settings-page"
                ? "text-accent-600 dark:text-accent-400 font-bold"
                : "text-neutral-600 dark:text-neutral-300 hover:text-accent-600 dark:hover:text-accent-400"
            }`}
          >
            {t("settings")}
          </button>

          {/* Profile */}
          {canEnterProfile && (
            <button
              type="button"
              onClick={() => handleNavigation("/profile")}
              className={`!text-lg transition-all cursor-pointer ${
                location.pathname.startsWith("/profile")
                  ? "text-accent-600 dark:text-accent-400 font-bold"
                  : "text-neutral-600 dark:text-neutral-300 hover:text-accent-600 dark:hover:text-accent-400"
              }`}
            >
              {t("profile")}
            </button>
          )}

          {/* Dashboard */}
          {canEnterDashboard && (
            <button
              type="button"
              onClick={() => handleNavigation("/dashboard")}
              className={`!text-lg transition-all cursor-pointer ${
                location.pathname.startsWith("/dashboard")
                  ? "text-accent-600 dark:text-accent-400 font-bold"
                  : "text-neutral-600 dark:text-neutral-300 hover:text-accent-600 dark:hover:text-accent-400"
              }`}
            >
              {t("dashboard")}
            </button>
          )}
        </div>

        {/* Bottom Login / Logout / Exit Impersonation */}
        <div className="p-6 max-w-sm w-full mx-auto pb-12">
          {currentUser ? (
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              disabled={isSubmitting}
              className={`w-full py-3.5 rounded-full text-white font-semibold text-center shadow-lg transition-opacity cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                isImpersonating
                  ? "bg-gradient-to-r from-orange-500 to-accent-600 hover:opacity-90"
                  : "bg-gradient-to-r from-red-500 to-rose-600 hover:opacity-90"
              }`}
            >
              <LogOut className="w-5 h-5" />
              {actionLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleNavigation("/login")}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-accent-500 to-orange-600 text-white font-semibold text-center shadow-lg hover:opacity-90 transition-opacity cursor-pointer"
            >
              {t("login")}
            </button>
          )}
        </div>
      </div>

      {/* Logout / Exit Impersonation Confirmation Modal */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            if (!isSubmitting) {
              setShowLogoutModal(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-logout-modal-title"
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white"
            onClick={(event) => event.stopPropagation()}
          >
            <h3
              id="mobile-logout-modal-title"
              className="text-lg font-bold text-neutral-900 dark:text-white"
            >
              {isImpersonating ? t("exit_impersonation") : t("confirm_logout")}
            </h3>

            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              {isImpersonating
                ? t("return_to_admin_acc")
                : t("are_you_sure_logout")}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-60"
              >
                {t("cancel")}
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmLogout}
                className={`px-4 py-2 text-sm font-semibold rounded-xl text-white transition-colors shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                  isImpersonating
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isSubmitting
                  ? t("please_wait")
                  : isImpersonating
                    ? t("return_to_amdin")
                    : t("yes_logout")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}