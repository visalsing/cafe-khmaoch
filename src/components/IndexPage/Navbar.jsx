
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext.jsx";
import { assetUrl } from "../../services/api.js";
import useActiveSection from "../../hooks/useActiveSection";
import logoImg from "../../assets/logo/cafe-khmaoch-rmbg.png";

export default function Navbar({ setMobileMenuOpen }) {
  const navigate = useNavigate();
  const location = useLocation();

  const { cartCount } = useCart();

  const {
    currentUser,
    canEnterDashboard,
    canEnterProfile,
    logout,
    isImpersonating,
    stopImpersonation,
  } = useAuth();

  const activeSection = useActiveSection();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navLinks = [
    { id: "hero", label: "Home", href: "/#hero" },
    { id: "shop", label: "Menu", href: "/#shop" },
    { id: "gallery", label: "Gallery", href: "/#gallery" },
    { id: "about", label: "Our Story", href: "/#about" },
    { id: "contact", label: "Contact", href: "/#contact" },
  ];


const handleConfirmLogout = async () => {
  if (isSubmitting) return;

  setIsSubmitting(true);

  try {
    if (isImpersonating) {
      await stopImpersonation();

      setShowLogoutModal(false);
      navigate("/dashboard", { replace: true });
    } else {
      await logout();

      setShowLogoutModal(false);
      navigate("/", { replace: true });
    }
  } catch (error) {
    console.error(
      "Logout / impersonation exit failed:",
      error
    );

    window.alert(
      error.message ||
        "The session action failed. Please try again."
    );
  } finally {
    setIsSubmitting(false);
  }
};


  const avatarSrc =
    currentUser?.avatarThumbnail || currentUser?.avatar;

  const onProfilePage = location.pathname.startsWith("/profile");

  const actionLabel = isImpersonating
    ? "Exit Impersonation"
    : "Logout";

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-md overflow-hidden p-1.5">
              <img
                src={logoImg}
                alt="Café ខ្មោច Logo"
                className="w-full h-full object-contain"
              />
            </div>

            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Café ខ្មោច
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            {navLinks.map((link) => {
              const isActive =
                location.pathname === "/" &&
                activeSection === link.id;

              return (
                <a
                  key={link.id}
                  href={link.href}
                  aria-current={isActive ? "location" : undefined}
                  className={`transition-colors cursor-pointer ${
                    isActive
                      ? "text-amber-600 dark:text-amber-400 font-bold"
                      : "hover:text-amber-600 dark:hover:text-amber-400"
                  }`}
                >
                  {link.label}
                </a>
              );
            })}

            {/* Settings */}
            <button
              type="button"
              onClick={() => navigate("/settings-page")}
              className={`transition-colors text-left cursor-pointer ${
                location.pathname === "/settings-page"
                  ? "text-amber-600 dark:text-amber-400 font-bold"
                  : "hover:text-amber-600 dark:hover:text-amber-400"
              }`}
            >
              Settings
            </button>

            {/* Dashboard */}
            {canEnterDashboard && (
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className={`transition-colors text-left cursor-pointer ${
                  location.pathname.startsWith("/dashboard")
                    ? "text-amber-600 dark:text-amber-400 font-bold"
                    : "hover:text-amber-600 dark:hover:text-amber-400"
                }`}
              >
                Dashboard
              </button>
            )}
          </div>

          {/* Cart, Profile, Logout and Mobile Menu */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Cart Button */}
            <button
              type="button"
              onClick={() => navigate("/cart")}
              className="relative w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-600 hover:bg-amber-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Cart"
              aria-label={`Shopping cart${
                cartCount > 0 ? `, ${cartCount} items` : ""
              }`}
            >
              🛒

              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-amber-600 text-white font-bold text-xs rounded-full flex items-center justify-center shadow">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Logged-in User */}
            {currentUser ? (
              <div className="flex items-center">
                {/* Profile Link */}
                {canEnterProfile ? (
                  <Link
                    to="/profile"
                    title="My profile"
                    aria-label="Open my profile"
                    aria-current={
                      onProfilePage ? "page" : undefined
                    }
                    className={`h-10 w-10 sm:w-auto rounded-xl flex items-center justify-center sm:justify-start bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0 sm:px-2.5 sm:space-x-2 ${
                      onProfilePage
                        ? "ring-2 ring-amber-500"
                        : "border border-transparent"
                    }`}
                  >
                    {avatarSrc ? (
                      <img
                        src={assetUrl(avatarSrc)}
                        alt={`${
                          currentUser.firstName || "User"
                        } avatar`}
                        className="w-7 h-7 rounded-full object-cover bg-slate-200 dark:bg-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {currentUser.firstName?.[0]?.toUpperCase() ||
                          "U"}
                      </div>
                    )}

                    <span className="hidden sm:inline text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[90px]">
                      {currentUser.firstName || "User"}
                    </span>
                  </Link>
                ) : (
                  /* Avatar without Profile Link */
                  <div className="h-10 w-10 sm:w-auto rounded-xl flex items-center justify-center sm:justify-start bg-slate-100 dark:bg-slate-800 shrink-0 sm:px-2.5 sm:space-x-2">
                    {avatarSrc ? (
                      <img
                        src={assetUrl(avatarSrc)}
                        alt="User avatar"
                        className="w-7 h-7 rounded-full object-cover bg-slate-200 dark:bg-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {currentUser.firstName?.[0]?.toUpperCase() ||
                          "U"}
                      </div>
                    )}

                    <span className="hidden sm:inline text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[90px]">
                      {currentUser.firstName || "User"}
                    </span>
                  </div>
                )}

                {/* Logout / Exit Impersonation */}
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  disabled={isSubmitting}
                  title={actionLabel}
                  aria-label={actionLabel}
                  className={`hidden sm:inline-flex items-center justify-center gap-1.5 h-10 px-3 ml-2 sm:ml-3 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed ${
                    isImpersonating
                      ? "bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-300"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-red-500 hover:text-white"
                  }`}
                >
                  <LogOut className="w-4 h-4 shrink-0" />

                  {actionLabel}
                </button>
              </div>
            ) : (
              /* Login Button */
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="hidden sm:inline-flex items-center justify-center h-10 px-4 text-sm font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-blue-950/50 hover:bg-amber-100 dark:hover:bg-blue-900/50 rounded-xl border border-amber-200 dark:border-amber-800 transition-all cursor-pointer"
              >
                Login
              </button>
            )}

            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex lg:hidden w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 items-center justify-center transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer shrink-0"
              title="Menu"
              aria-label="Open navigation menu"
            >
              ☰
            </button>
          </div>
        </div>
      </nav>

      {/* Logout / Exit Impersonation Confirmation Modal */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            if (!isSubmitting) {
              setShowLogoutModal(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-slate-200 dark:border-slate-800"
            onClick={(event) => event.stopPropagation()}
          >
            <h3
              id="logout-modal-title"
              className="text-lg font-bold text-slate-900 dark:text-white"
            >
              {isImpersonating
                ? "Exit Impersonation"
                : "Confirm Logout"}
            </h3>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              {isImpersonating
                ? "Return to your administrator account?"
                : "Are you sure you want to log out?"}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmLogout}
                className={`px-4 py-2 text-sm font-semibold rounded-xl text-white transition-all shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                  isImpersonating
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isSubmitting
                  ? "Please wait..."
                  : isImpersonating
                    ? "Return to Admin"
                    : "Yes, Log out!"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
