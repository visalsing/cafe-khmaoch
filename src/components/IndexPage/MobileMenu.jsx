import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

export default function MobileMenu({ isOpen, onClose, isLoggedIn, setIsLoggedIn }) {
  const { currentUser, canEnterDashboard, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState("hero");

  // Track active section on scroll when on the home page
  useEffect(() => {
    if (location.pathname !== "/") return;

    const sections = ["hero", "shop", "about", "stats"];
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;

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
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  if (!isOpen) return null;

  const navLinks = [
    { id: "hero", label: "Home", href: "/#hero" },
    { id: "shop", label: "Menu", href: "/#shop" },
    { id: "about", label: "Our Story", href: "/#about" },
    { id: "stats", label: "Highlights", href: "/#stats" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white animate-fadeIn">
      
      {/* Top Header Row */}
      <div className="max-w-7xl w-full mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <div
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => { navigate("/"); onClose(); }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white text-xl shadow-md">
            ☕
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
            Bean & Blossom
          </span>
        </div>

        {/* Square Close Button */}
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 hover:bg-slate-800 flex items-center justify-center transition-all shadow-md cursor-pointer"
          title="Close Menu"
        >
          ✕
        </button>
      </div>

      {/* Centered Navigation Links with Active State Logic */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center px-4 -mt-10">
        {navLinks.navLinks || navLinks.map((link) => {
          const isActive = location.pathname === "/" && activeSection === link.id;
          return (
            <a
              key={link.id}
              href={link.href}
              onClick={onClose}
              className={`text-lg transition-colors cursor-pointer ${
                isActive
                  ? "text-amber-400 font-bold scale-105"
                  : "text-slate-300 hover:text-amber-400 dark:hover:text-amber-400"
              }`}
            >
              {link.label}
            </a>
          );
        })}

        <button 
          onClick={() => { navigate("/settings-page"); onClose(); }} 
          className={`text-lg transition-colors cursor-pointer ${
            location.pathname === "/settings-page"
              ? "text-amber-400 font-bold scale-105"
              : "text-slate-300 hover:text-amber-400 dark:hover:text-amber-400"
          }`}
        >
          Settings
        </button>

        <button 
          onClick={() => { navigate("/dashboard"); onClose(); }} 
          className={`text-lg transition-colors cursor-pointer ${
            location.pathname === "/dashboard"
              ? "text-amber-400 font-bold scale-105"
              : "text-slate-300 hover:text-amber-400 dark:hover:text-amber-400"
          }`}
        >
          Dashboard
        </button>
      </div>

      {/* Bottom Action Button (Login/Logout) */}
      <div className="p-6 max-w-sm w-full mx-auto pb-12">
        {isLoggedIn ? (
          <button
            onClick={() => { setIsLoggedIn(false); onClose(); }}
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold text-center shadow-lg hover:opacity-90 transition-opacity cursor-pointer"
          >
            Logout
          </button>
        ) : (
          <button
            onClick={() => { navigate("/login"); onClose(); }}
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-center shadow-lg hover:opacity-90 transition-opacity cursor-pointer"
          >
            Login
          </button>
        )}
      </div>

    </div>
  );
}