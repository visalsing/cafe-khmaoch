import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
// import logoImg from "../../../src/assets/logo/sm-solar-plus-logo.jpg";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";

// export default function Navbar({
//   cartCount,
//   setMobileMenuOpen,
//   isLoggedIn,
//   setIsLoggedIn,
// }) {
//   const navigate = useNavigate();
//   const location = useLocation();
export default function Navbar({ setMobileMenuOpen }) {
  // props removed
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount } = useCart();
  const { currentUser, canEnterDashboard, logout } = useAuth();
  const [activeSection, setActiveSection] = useState("hero");

  // Track active section on scroll when on the home page
  useEffect(() => {
    if (location.pathname !== "/") return;

    const sections = ["hero", "shop", "about", "stats"];
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200; // Offset for navbar height

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Check on initial load
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  // const navLinks = [
  //   { id: "hero", label: "Home", href: "/#hero" },
  //   { id: "shop", label: "Products", href: "/#shop" },
  //   { id: "about", label: "Technology", href: "/#about" },
  //   { id: "stats", label: "Impact", href: "/#stats" },
  // ];
  const navLinks = [
    { id: "hero", label: "Home", href: "/#hero" },
    { id: "shop", label: "Menu", href: "/#shop" },
    { id: "about", label: "Our Story", href: "/#about" },
    { id: "stats", label: "Highlights", href: "/#stats" },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        {/* <div
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md overflow-hidden">
            <img src={logoImg} alt="SM Solar Plus Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            SM Solar Plus
          </span>
        </div> */}
        {/* // Brand block: */}
        <div
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white text-xl shadow-md">
            ☕
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            Bean & Blossom
          </span>
        </div>
        {/* Desktop Links (Collapses below 900px using custom max-[900px]:hidden and lg:flex) */}
        <div className="hidden max-[900px]:hidden lg:flex items-center space-x-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          {navLinks.map((link) => {
            const isActive =
              location.pathname === "/" && activeSection === link.id;
            return (
              <a
                key={link.id}
                href={link.href}
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

          <button
            onClick={() => navigate("/settings-page")}
            className={`transition-colors text-left cursor-pointer ${
              location.pathname === "/settings-page"
                ? "text-amber-600 dark:text-amber-400 font-bold"
                : "hover:text-amber-600 dark:hover:text-amber-400"
            }`}
          >
            Settings
          </button>

          {/* <button
            onClick={() => navigate("/dashboard")}
            className={`transition-colors text-left cursor-pointer ${
              location.pathname === "/dashboard"
                ? "text-amber-600 dark:text-amber-400 font-bold"
                : "hover:text-amber-600 dark:hover:text-amber-400"
            }`}
          >
            Dashboard
          </button> */}
          {canEnterDashboard && (
            <button
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
        {/* Actions: Cart, Login, Mobile Menu */}
        <div className="flex items-center space-x-3">
          {/* Cart Button */}
          <button
            onClick={() => navigate("/cart")}
            className="relative w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-600 border-amber-600 hover:border-red-600 hover:bg-amber-100 flex items-center justify-center transition-colors cursor-pointer"
            title="Cart"
          >
            🛒
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-600 text-white font-bold text-xs rounded-full flex items-center justify-center shadow">
                {cartCount}
              </span>
            )}
          </button>

          {/* Login / Logout Button */}
          {/* {isLoggedIn ? (
            <button
              onClick={() => setIsLoggedIn(false)}
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
            >
              Logout
            </button> */}
          {currentUser ? (
            <button
              onClick={logout}
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
            >
              Logout ({currentUser.firstName})
            </button>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-blue-950/50 hover:bg-amber-100 dark:hover:bg-blue-900/50 rounded-xl border border-amber-200 dark:border-amber-800 transition-all cursor-pointer"
            >
              Login
            </button>
          )}

          {/* Mobile Hamburger Menu Button (Triggered below 900px breakpoint) */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex lg:hidden w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 items-center justify-center transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            title="Menu"
          >
            ☰
          </button>
        </div>
      </div>
    </nav>
  );
}
