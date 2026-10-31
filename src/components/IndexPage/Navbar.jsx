import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext.jsx";
import { assetUrl } from "../../services/api.js";
import useActiveSection from "../../hooks/useActiveSection";
import { useLanguage } from "../../context/LanguageContext.jsx";
import logoImg from "../../assets/logo/cafe-khmaoch-rmbg.png";

// Returns true once the page is scrolled past `threshold` px
function useScrolled(threshold = 100) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);

    onScroll(); // set the correct initial state (e.g. after a refresh mid-page)
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}

export default function Navbar({ setMobileMenuOpen }) {
  const { t } = useLanguage();
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
  const scrolled = useScrolled(100);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navLinks = [
    { id: "hero", label: t("home"), href: "/#hero" },
    { id: "shop", label: t("menu"), href: "/#shop" },
    { id: "gallery", label: t("gallery"), href: "/#gallery" },
    { id: "about", label: t("about_us"), href: "/#about" },
    { id: "contact", label: t("contact"), href: "/#contact" },
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
      console.error(t("logout_exit_impersonate"), error);
      window.alert(error.message || t("session_act_failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Home / Logo: always land at the very top of the page.
  // withHash = true  -> URL becomes /#hero
  // withHash = false -> URL becomes /
  const goHome = (withHash) => {
    const target = withHash ? "/#hero" : "/";

    if (location.pathname !== "/") {
      navigate(target);
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    // Update the URL without letting the browser jump to the #hero anchor
    window.history.replaceState(null, "", target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNavClick = (event, link) => {
    if (link.id !== "hero") return;

    event.preventDefault();
    goHome(true);
  };

  // If the page opens or reloads on /#hero, stay at the top instead of
  // jumping to the hero (which would sit under the sticky navbar)
  useEffect(() => {
    if (location.pathname === "/" && location.hash === "#hero") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [location.pathname, location.hash]);

  // const handleNavClick = (event, link) => {
  //   if (link.id !== "hero") return;

  //   // Home = top of the page, not the #hero anchor
  //   event.preventDefault();

  //   if (location.pathname !== "/") {
  //     navigate("/");
  //     window.scrollTo({ top: 0, behavior: "auto" });
  //     return;
  //   }

  //   // Remove any leftover #hash from the URL
  //   if (location.hash) {
  //     window.history.replaceState(null, "", "/");
  //   }

  //   window.scrollTo({ top: 0, behavior: "smooth" });
  // };

  const avatarSrc = currentUser?.avatarThumbnail || currentUser?.avatar;
  const onProfilePage = location.pathname.startsWith("/profile");
  const actionLabel = isImpersonating ? t("exit_impersonation") : t("logout");

  const avatarNode = avatarSrc ? (
    <img
      src={assetUrl(avatarSrc)}
      alt={`${currentUser?.firstName || "User"} avatar`}
      className="w-7 h-7 rounded-full object-cover bg-slate-200 dark:bg-slate-700 shrink-0"
    />
  ) : (
    <div className="w-7 h-7 rounded-full bg-accent-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
      {currentUser?.firstName?.[0]?.toUpperCase() || "U"}
    </div>
  );

  const userName = (
    <span className="hidden sm:inline text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[90px]">
      {currentUser?.lastName || "User"} {currentUser?.firstName || "User"}
    </span>
  );

  // The bar contents, shared by the section navbar and the sticky navbar
  const renderBar = () => (
    <div className="h-16 flex items-center justify-between">
      {/* Brand Logo */}
      <div
        className="flex items-center space-x-3 cursor-pointer"
        onClick={() => goHome(false)}
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-500 to-accent-600 flex items-center justify-center shadow-md overflow-hidden p-1.5">
          <img
            src={logoImg}
            alt="Café ខ្មោច Logo"
            className="w-full h-full object-contain"
          />
        </div>

        <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-accent-600 to-accent-600 bg-clip-text text-transparent">
          Café ខ្មោច
        </span>
      </div>

      {/* Desktop Navigation Links */}
      <div className="hidden lg:flex items-center space-x-6 text-sm font-medium text-slate-600 dark:text-slate-300">
        {navLinks.map((link) => {
          const isActive =
            location.pathname === "/" && activeSection === link.id;

          return (
            <a
              key={link.id}
              href={link.href}
              onClick={(event) => handleNavClick(event, link)}
              aria-current={isActive ? "location" : undefined}
              className={`transition-colors cursor-pointer ${
                isActive
                  ? "text-accent-600 dark:text-accent-400 font-bold"
                  : "hover:text-accent-600 dark:hover:text-accent-400"
              }`}
            >
              {link.label}
            </a>
          );
        })}

        <button
          type="button"
          onClick={() => navigate("/settings-page")}
          className={`transition-colors text-left cursor-pointer ${
            location.pathname === "/settings-page"
              ? "text-accent-600 dark:text-accent-400 font-bold"
              : "hover:text-accent-600 dark:hover:text-accent-400"
          }`}
        >
          {t("settings")}
        </button>

        {canEnterDashboard && (
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className={`transition-colors text-left cursor-pointer ${
              location.pathname.startsWith("/dashboard")
                ? "text-accent-600 dark:text-accent-400 font-bold"
                : "hover:text-accent-600 dark:hover:text-accent-400"
            }`}
          >
            {t("dashboard")}
          </button>
        )}
      </div>

      {/* Cart, Profile, Logout and Mobile Menu */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        <button
          type="button"
          onClick={() => navigate("/cart")}
          className="relative w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-accent-600 hover:bg-accent-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          title={t("cart")}
          aria-label={`Shopping cart${
            cartCount > 0 ? `, ${cartCount} items` : ""
          }`}
        >
          🛒
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-accent-600 text-white font-bold text-xs rounded-full flex items-center justify-center shadow">
              {cartCount}
            </span>
          )}
        </button>

        {currentUser ? (
          <div className="flex items-center">
            {canEnterProfile ? (
              <Link
                to="/profile"
                title={t("my_profile")}
                aria-label="Open my profile"
                aria-current={onProfilePage ? "page" : undefined}
                className={`h-10 w-10 sm:w-auto rounded-xl flex items-center justify-center sm:justify-start bg-slate-100 dark:bg-slate-800 hover:bg-accent-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0 sm:px-2.5 sm:space-x-2 ${
                  onProfilePage
                    ? "ring-2 ring-accent-500"
                    : "border border-transparent"
                }`}
              >
                {avatarNode}
                {userName}
              </Link>
            ) : (
              <div className="h-10 w-10 sm:w-auto rounded-xl flex items-center justify-center sm:justify-start bg-slate-100 dark:bg-slate-800 shrink-0 sm:px-2.5 sm:space-x-2">
                {avatarNode}
                {userName}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              disabled={isSubmitting}
              title={actionLabel}
              aria-label={actionLabel}
              className={`hidden sm:inline-flex items-center justify-center gap-1.5 h-10 px-3 ml-2 sm:ml-3 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed ${
                isImpersonating
                  ? "bg-accent-100 text-accent-800 hover:bg-accent-200 dark:bg-accent-950 dark:text-accent-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-red-500 hover:text-white"
              }`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {actionLabel}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="hidden sm:inline-flex items-center justify-center h-10 px-4 text-sm font-semibold text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-blue-950/50 hover:bg-accent-100 dark:hover:bg-blue-900/50 rounded-xl border border-accent-200 dark:border-accent-800 transition-all cursor-pointer"
          >
            {t("login")}
          </button>
        )}

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
  );

  return (
    <>
      {/* 1) SECTION NAVBAR: in the page flow, scrolls away with the page */}
      {/* <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <nav className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm px-4 sm:px-6">
          {renderBar()}
        </nav>
      </header> */}

      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <nav className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm px-3 sm:px-4">
          {renderBar()}
        </nav>
      </header>

      {/* 2) STICKY NAVBAR: slides in only after scrolling */}
      <nav
        aria-hidden={!scrolled}
        className={`fixed top-0 inset-x-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-[transform,visibility] duration-300 ${
          scrolled
            ? "translate-y-0 visible"
            : "-translate-y-full invisible pointer-events-none"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {renderBar()}
        </div>
      </nav>

      {/* Logout / Exit Impersonation Confirmation Modal */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            if (!isSubmitting) setShowLogoutModal(false);
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
              {isImpersonating ? t("exit_impersonation") : t("confirm_logout")}
            </h3>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              {isImpersonating
                ? t("return_to_admin_acc")
                : t("are_you_sure_logout")}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-60"
              >
                {t("cancel")}
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmLogout}
                className={`px-4 py-2 text-sm font-semibold rounded-xl text-white transition-all shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                  isImpersonating
                    ? "bg-accent-600 hover:bg-accent-700"
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
