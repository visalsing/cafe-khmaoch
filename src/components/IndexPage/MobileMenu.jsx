import React, { useState, useEffect } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import useActiveSection from "../../hooks/useActiveSection";

export default function MobileMenu({ isOpen, onClose }) {
  const { currentUser, canEnterDashboard, canEnterProfile, logout } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  // which home-page section is on screen (hero / shop / about / contact).
  // Hooks must stay ABOVE the `if (!isOpen) return null` line below.
  const activeSection = useActiveSection();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Close menu or modal with Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
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
  }, [isOpen, showLogoutModal, onClose]);

  if (!isOpen) return null;

  const navLinks = [
    { id: "hero", label: "Home", href: "/#hero" },
    { id: "shop", label: "Menu", href: "/#shop" },
    { id: "about", label: "Our Story", href: "/#about" },
    { id: "contact", label: "Contact", href: "/#contact" },
  ];

  const handleConfirmLogout = async () => {
    try {
      await logout();
      setShowLogoutModal(false);
      onClose();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Full-Screen Mobile Menu */}
      <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-200">
        {/* Top Header Row */}
        <div className="max-w-7xl w-full mx-auto px-6 h-20 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          {/* Brand Logo & Name */}
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => handleNavigation("/")}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-md overflow-hidden p-1.5">
              <span className="text-white text-xl">☕</span>
            </div>

            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Café ខ្មោច
            </span>
          </div>

          

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-700 flex items-center justify-center transition-all shadow-sm cursor-pointer"
            title="Close Menu"
            aria-label="Close navigation menu"
          >
            ✕
          </button>
        </div>

        {/* Centered Navigation Links
            (the avatar + name is no longer here: it sits next to the cart in the top bar) */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center px-4 py-6 overflow-y-auto">
          {/* Home Page Sections */}
          {navLinks.map((link) => {
            const isActive =
              location.pathname === "/" && activeSection === link.id;

            return (
              <a
                key={link.id}
                href={link.href}
                onClick={onClose}
                aria-current={isActive ? "location" : undefined}
                className={`text-lg transition-all cursor-pointer ${
                  isActive
                    ? "text-amber-600 dark:text-amber-400 font-bold scale-105"
                    : "text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400"
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
            className={`text-lg transition-all cursor-pointer ${
              location.pathname === "/settings-page"
                ? "text-amber-600 dark:text-amber-400 font-bold scale-105"
                : "text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400"
            }`}
          >
            Settings
          </button>

          {/* Profile */}
          {canEnterProfile && (
            <button
              type="button"
              onClick={() => handleNavigation("/profile")}
              className={`text-lg transition-all cursor-pointer ${
                location.pathname.startsWith("/profile")
                  ? "text-amber-600 dark:text-amber-400 font-bold scale-105"
                  : "text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400"
              }`}
            >
              Profile
            </button>
          )}

          {/* Dashboard */}
          {canEnterDashboard && (
            <button
              type="button"
              onClick={() => handleNavigation("/dashboard")}
              className={`text-lg transition-all cursor-pointer ${
                location.pathname.startsWith("/dashboard")
                  ? "text-amber-600 dark:text-amber-400 font-bold scale-105"
                  : "text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400"
              }`}
            >
              Dashboard
            </button>
          )}
        </div>

        {/* Bottom Login / Logout Button */}
        <div className="p-6 max-w-sm w-full mx-auto pb-12">
          {currentUser ? (
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold text-center shadow-lg hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleNavigation("/login")}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-center shadow-lg hover:opacity-90 transition-opacity cursor-pointer"
            >
              Login
            </button>
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-logout-modal-title"
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
            onClick={(event) => event.stopPropagation()}
          >
            <h3
              id="mobile-logout-modal-title"
              className="text-lg font-bold text-slate-900 dark:text-white"
            >
              Confirm Logout
            </h3>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to log out?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              {/* Cancel */}
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {/* Confirm Logout */}
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors shadow-sm cursor-pointer"
              >
                Yes, Log out!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}