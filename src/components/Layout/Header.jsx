import React from "react";
import {
  Menu,
  Search,
  Filter,
  Plus,
  Bell,
  Settings,
  ChevronDown,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";

import { useTheme } from "../../context/ThemeContext.jsx"; // adjust path

function Header({ sideBarCollapsed, onToggleSidebar, currentPage = "dashboard" }) {
  // inside Header component:
  const { theme, cycleTheme } = useTheme();
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  // Safe fallback in case currentPage is ever undefined/empty
  const pageLabel = (currentPage || "dashboard").replace("-", " ");

  return (
    <div
      className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50
    dark:border-slate-700/50 px-6 py-4"
    >
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          <button
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300
                hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            onClick={onToggleSidebar}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden md:block">
            <h1 className="text-2xl font-black text-slate-800 dark:text-white capitalize">
              {pageLabel}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {currentPage === "dashboard"
                ? "Welcome back, Sing! Here's what's happening today."
                : `Viewing your ${pageLabel} stats.`}
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle */}
          <button
            onClick={cycleTheme}
            title={`Theme: ${theme}`}
            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800
    transition-colors"
          >
            <ThemeIcon className="w-5 h-5" />
          </button>

          {/* Settings */}
          <button
            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100
          dark:hover:bg-slate-800 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
export default Header;