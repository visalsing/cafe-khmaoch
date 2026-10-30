import React, { useState, useEffect, useMemo, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Settings,
  ChevronDown,
  X,
  Search,
  SearchX,
  HomeIcon,
  Coffee,
  ShoppingCart,
  Receipt,
  ChartColumn,
  LayoutTemplate,
  Users,
  ShieldCheck,
  LogOut,
  BoxesIcon,
  CoinsIcon,
  FlagIcon,
  PersonStanding,
  Flag,
  User,
  QrCode,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../Dashboard/Users/Avatar";
import LogoutModal from "../Auth/LogoutModal";
import { ROLE_INFO, fullName } from "../../utils/access";
import logoImg from "../../assets/logo/cafe-khmaoch-rmbg.png"; // or your preferred logo path

const PERMISSION_BY_ID = {
  dashboard: "dashboard",
  pos: "pos",
  orders: "orders",
  "menu-manager": "menu",
  reports: "reports",
  pages: "pages",
  "pages-overview": "pages",
  "pages-hero": "pages",
  "users-list": "users",
  "roles-permissions": "roles",
};

const menuItems = [
  {
    id: "profile",
    path: "/dashboard/profile",
    icon: User,
    label: "Profile",
  },
  {
    id: "dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    id: "pos",
    path: "/dashboard/pos",
    icon: ShoppingCart,
    label: "Post of Sales (POS)",
  },
  { id: "orders", path: "/dashboard/orders", icon: Receipt, label: "Orders" },
  {
    id: "menu-management",
    icon: LayoutTemplate,
    label: "Menu Management",
    submenu: [
      {
        id: "menu",
        path: "/dashboard/menu",
        icon: Coffee,
        label: "Menu Items",
      },
      {
        id: "categories",
        path: "/dashboard/categories",
        icon: BoxesIcon,
        label: "Categories",
      },
      {
        id: "drink-types",
        path: "/dashboard/drink-types",
        icon: BoxesIcon,
        label: "Drink Types",
      },
    ],
  },
  {
    id: "levels-customization",
    icon: LayoutTemplate,
    label: "Level Customization",
    submenu: [
      {
        id: "levels-options-overview",
        path: "/dashboard/levels-options",
        label: "Levels Options",
      },
      {
        id: "sugar-level",
        path: "/dashboard/sugar-level",
        label: "Sugar Level",
      },
      { id: "ice-level", path: "/dashboard/ice-level", label: "Ice Level" },
      {
        id: "coffee-level",
        path: "/dashboard/coffee-level",
        label: "Coffee Level",
      },
    ],
  },
  {
    id: "reports",
    path: "/dashboard/reports",
    icon: ChartColumn,
    label: "Reports",
  },
  {
    id: "pages",
    icon: LayoutTemplate,
    label: "Pages",
    submenu: [
      { id: "pages-overview", path: "/dashboard/pages", label: "Pages" },
      { id: "pages-hero", path: "/dashboard/pages/hero", label: "Hero" },
      { id: "map", path: "/dashboard/pages/maps", label: "Map" },
    ],
  },
  {
    id: "user-management",
    icon: LayoutTemplate,
    label: "User Management",
    submenu: [
      {
        id: "users",
        path: "/dashboard/users",
        icon: Users,
        label: "Users",
      },
      {
        id: "positions",
        path: "/dashboard/positions",
        icon: PersonStanding,
        label: "Positions",
      },
      {
        id: "roles",
        path: "/dashboard/roles",
        icon: PersonStanding,
        label: "Roles",
      },
      {
        id: "roles-permissions",
        path: "/dashboard/roles-permissions",
        icon: Users,
        label: "Roles & Permissions",
      },
      {
        id: "permissions",
        path: "/dashboard/permissions",
        icon: PersonStanding,
        label: "Permission Lists",
      },
    ],
  },
  {
    id: "system-settings",
    icon: LayoutTemplate,
    label: "Customization",
    submenu: [
      {
        id: "exchange-rate",
        path: "/dashboard/exchange-rate",
        icon: CoinsIcon,
        label: "Exchange Rate",
      },
      {
        id: "currencies",
        path: "/dashboard/currencies",
        icon: CoinsIcon,
        label: "Currencies",
      },
      {
        id: "country-flags",
        path: "/dashboard/country-flags",
        icon: FlagIcon,
        label: "Country Flags",
      },
      {
        id: "genders",
        path: "/dashboard/genders",
        icon: PersonStanding,
        label: "Genders",
      },
      {
        id: "nationalities",
        path: "/dashboard/nationalities",
        icon: Flag,
        label: "Nationalities",
      },
      {
        id: "qr-management",
        path: "/dashboard/qr-management",
        icon: QrCode,
        label: "QR Website",
      },
    ],
  },
  {
    id: "homepage",
    path: "/dashboard/homepage",
    icon: HomeIcon,
    label: "Homepage",
  },
  {
    id: "settings",
    path: "/dashboard/settings",
    icon: Settings,
    label: "Settings",
  },
];

function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const { language, t } = useLanguage();
  const { currentUser, can, isImpersonating } = useAuth();

  const [expandedItems, setExpandedItems] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Logout always asks first. Only while an administrator is impersonating,
  // the same place becomes "Exit impersonation".
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const logoutFromMobile = useRef(false);

  const askLogout = (fromMobile = false) => {
    logoutFromMobile.current = fromMobile;
    setShowLogoutModal(true);
  };

  const isAdmin = currentUser?.role === "admin";
  const allowed = (id) =>
    isAdmin || (PERMISSION_BY_ID[id] && can(PERMISSION_BY_ID[id]));

  // 1. First filter items based on user permissions
  const authorizedMenuItems = useMemo(() => {
    return menuItems.reduce((acc, item) => {
      if (item.submenu) {
        const subs = item.submenu.filter((s) => allowed(s.id));
        if (subs.length) acc.push({ ...item, submenu: subs });
      } else if (allowed(item.id)) {
        acc.push(item);
      }
      return acc;
    }, []);
  }, [currentUser, can]);

  const isSearching = searchQuery.trim().length > 0;

  // Normalize text for case-insensitive, Unicode-aware searching.
  const normalizeSearchText = (value) =>
    String(value ?? "")
      .normalize("NFC")
      .toLocaleLowerCase(language)
      .trim();

  // Translate a menu item based on its ID.
  const getItemLabel = (item) => {
    const keys = {
      profile: "profile",
      dashboard: "dashboard",
      pos: "point_of_sales_pos",
      orders: "orders",
      "menu-management": "menu_management",
      "levels-customization": "level_customization",
      reports: "reports",
      pages: "pages",
      "user-management": "user_management",
      "system-settings": "system_customization",
      homepage: "homepage",
      settings: "settings",
    };

    const key = keys[item.id];
    return key ? t(key) : item.label;
  };

  // Translate submenu labels based on their IDs.
  const getSubItemLabel = (item) => {
    const keys = {
      menu: "menu_items",
      categories: "drinks_categories",
      "drink-types": "drinks_types",
      "levels-options-overview": "level_options",
      "sugar-level": "sugar_levels",
      "ice-level": "ice_levels",
      "coffee-level": "coffee_levels",
      "pages-overview": "page_overviews",
      "pages-hero": "page_hero",
      map: "page_map",
      users: "users",
      positions: "positions",
      roles: "roles",
      "roles-permissions": "role_permissions",
      permissions: "permission_lists",
      "exchange-rate": "exchange_rate",
      currencies: "currencies",
      "country-flags": "countries_flags",
      genders: "genders",
      nationalities: "nationalities",
      "qr-management": "qr_website",
    };

    const key = keys[item.id];
    return key ? t(key) : item.label;
  };

  // 2. Then filter items based on search query
  const filteredMenuItems = useMemo(() => {
    if (!isSearching) return authorizedMenuItems;

    const query = normalizeSearchText(searchQuery);

    return authorizedMenuItems.reduce((result, item) => {
      const translatedLabel = getItemLabel(item);

      const parentMatches = [item.label, translatedLabel, item.id].some(
        (text) => normalizeSearchText(text).includes(query),
      );

      if (item.submenu) {
        const matchingSubmenu = item.submenu.filter((sub) => {
          const translatedSubLabel = getSubItemLabel(sub);

          return [sub.label, translatedSubLabel, sub.id].some((text) =>
            normalizeSearchText(text).includes(query),
          );
        });

        if (parentMatches || matchingSubmenu.length > 0) {
          result.push({
            ...item,
            submenu: parentMatches ? item.submenu : matchingSubmenu,
          });
        }
      } else if (parentMatches) {
        result.push(item);
      }

      return result;
    }, []);
  }, [searchQuery, isSearching, authorizedMenuItems, language, t]);

  useEffect(() => {
    if (isSearching) return;
    authorizedMenuItems.forEach((item) => {
      if (item.submenu?.some((sub) => sub.path === location.pathname)) {
        setExpandedItems((prev) => new Set([...prev, item.id]));
      }
    });
  }, [location.pathname, isSearching, authorizedMenuItems]);

  useEffect(() => {
    if (!isSearching) return;
    const matchedIds = filteredMenuItems
      .filter((item) => item.submenu)
      .map((item) => item.id);
    setExpandedItems(new Set(matchedIds));
  }, [isSearching, filteredMenuItems]);

  const toggleExpanded = (itemId) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleLinkClick = (isMobile = false) => {
    if (isMobile && onToggle) {
      onToggle();
    }
  };

  const clearSearch = () => setSearchQuery("");

  const renderSearchBar = () => (
    <div className="px-4 pt-4">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search menu..."
          className="w-full pl-9 pr-9 py-2.5 bg-slate-100
            dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl
            text-sm text-slate-800 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2
            focus:ring-accent-500 focus:border-transparent transition-all"
        />
        {isSearching && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-md text-slate-400
              hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  const renderNavContent = (isMobile = false) => (
    <nav className="flex-1 p-4 space-y-2 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600">
      {filteredMenuItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-10 px-4 text-slate-400 dark:text-slate-500">
          <SearchX className="w-8 h-8 mb-2" />
          <p className="text-sm">No menu items match "{searchQuery}"</p>
        </div>
      ) : (
        filteredMenuItems.map((item) => {
          const isSubmenuActive = item.submenu?.some(
            (sub) => sub.path === location.pathname,
          );
          const isParentActive =
            location.pathname === item.path || isSubmenuActive;

          return (
            <div key={item.id}>
              {item.submenu ? (
                <button
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                    isParentActive
                      ? "bg-gradient-to-r from-accent-500 to-accent-600 text-white shadow-lg shadow-accent-500/25"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                  }`}
                  onClick={() => toggleExpanded(item.id)}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {(!collapsed || isMobile) && (
                      // <span className="font-medium ml-2">{item.label}</span>
                      <span className="font-medium ml-2">
                        {t(
                          {
                            profile: "profile",
                            dashboard: "dashboard",
                            pos: "pos",
                            orders: "orders",
                            "menu-management": "menu_management",
                            "levels-customization": "levels_customization",
                            reports: "reports",
                            pages: "pages",
                            "user-management": "user_management",
                            "system-settings": "system_customization",
                            homepage: "nav_homepage",
                            settings: "nav_settings",
                          }[item.id] || item.label,
                        )}
                      </span>
                    )}
                  </div>
                  {(!collapsed || isMobile) && (
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        expandedItems.has(item.id) ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </button>
              ) : (
                <NavLink
                  to={item.path}
                  end
                  onClick={() => handleLinkClick(isMobile)}
                  className={({ isActive }) =>
                    `w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-accent-500 to-accent-600 text-white shadow-lg shadow-accent-500/25"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    }`
                  }
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {(!collapsed || isMobile) && (
                      // <span className="font-medium ml-2">{item.label}</span>
                      <span className="font-medium ml-2">
                        {t(
                          {
                            profile: "profile",
                            dashboard: "dashboard",
                            pos: "point_of_sales_pos",
                            orders: "orders",
                            "menu-management": "menu_management",
                            "levels-customization": "level_customization",
                            reports: "reports",
                            pages: "pages",
                            "user-management": "user_management",
                            "system-settings": "system_customization",
                            homepage: "homepage",
                            settings: "settings",
                          }[item.id] || item.label,
                        )}
                      </span>
                    )}
                  </div>
                </NavLink>
              )}

              {(!collapsed || isMobile) &&
                item.submenu &&
                expandedItems.has(item.id) && (
                  <div className="ml-8 mt-2 space-y-1">
                    {item.submenu.map((subitem) => (
                      <NavLink
                        key={subitem.id}
                        to={subitem.path}
                        end
                        onClick={() => handleLinkClick(isMobile)}
                        className={({ isActive }) =>
                          `block w-full text-left p-2 text-sm rounded-lg transition-all ${
                            isActive
                              ? "bg-accent-100 text-accent-700 font-medium dark:bg-accent-500/15 dark:text-accent-400"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                          }`
                        }
                      >
                        {/* {subitem.label} */}
                        {t(
                          {
                            menu: "menu_items",
                            categories: "drinks_categories",
                            "drink-types": "drinks_types",
                            "levels-options-overview": "level_options",
                            "sugar-level": "sugar_levels",
                            "ice-level": "ice_levels",
                            "coffee-level": "coffee_levels",
                            "pages-overview": "page_overviews",
                            "pages-hero": "page_hero",
                            map: "page_map",
                            users: "users",
                            positions: "positions",
                            roles: "roles",
                            "roles-permissions": "role_permissions",
                            permissions: "permission_lists",
                            "exchange-rate": "exchange_rate",
                            currencies: "currencies",
                            "country-flags": "countries_flags",
                            genders: "genders",
                            nationalities: "nationalities",
                            "qr-management": "qr_website",
                          }[subitem.id] || subitem.label,
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
            </div>
          );
        })
      )}
    </nav>
  );

  // The user card at the bottom.
  //  - normal mode:        desktop = small "Log out" icon, phone menu = a "Log out" button
  //  - impersonation mode: an accent card with an "Exit impersonation" button (desktop and phone)
  const renderUserCard = (isMobile = false) => (
    <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50">
      <div
        className={`rounded-xl p-3 ${
          isImpersonating
            ? "bg-accent-50 ring-1 ring-accent-200 dark:bg-accent-950/30 dark:ring-accent-800/60"
            : "bg-slate-50 dark:bg-slate-800/50"
        }`}
      >
        <div className="flex items-center space-x-3">
          <Avatar
            user={currentUser}
            className="w-10 h-10 rounded-full ring-2 ring-accent-500 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
              {fullName(currentUser) || "User"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {ROLE_INFO[currentUser?.role]?.label ||
                currentUser?.role ||
                "Member"}
            </p>
          </div>

          {!isMobile && !isImpersonating && (
            <button
              type="button"
              onClick={() => askLogout(false)}
              title="Log out"
              aria-label="Log out"
              className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {isImpersonating && (
          <>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-accent-700 dark:text-accent-400">
              {t("impersonation_mode")}
            </p>
            <button
              type="button"
              onClick={() => askLogout(isMobile)}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30"
            >
              <ShieldCheck className="w-4 h-4" />
              {t("exit_impersonation")}
            </button>
          </>
        )}

        {isMobile && !isImpersonating && (
          <button
            type="button"
            onClick={() => askLogout(true)}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/30"
          >
            <LogOut className="w-4 h-4" />
            {t("log_out")}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div
        className={`hidden md:flex ${
          collapsed ? "w-20" : "w-72"
        } h-screen transition-all duration-300 ease-in-out bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50 flex-col relative z-10`}
      >
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-accent-500 to-accent-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 overflow-hidden p-1.5">
              <img
                src={logoImg}
                alt="Café Logo"
                className="w-full h-full object-contain"
              />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">
                  Café ខ្មោច
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("coffee_relaxed_spooky")}
                </p>
              </div>
            )}
          </div>
        </div>

        {!collapsed && renderSearchBar()}

        {renderNavContent(false)}

        {!collapsed && renderUserCard(false)}

        {/* narrow sidebar: only an icon (accent while impersonating) */}
        {collapsed && (
          <div className="flex justify-center border-t border-slate-200/50 p-3 dark:border-slate-700/50">
            <button
              type="button"
              onClick={() => askLogout(false)}
              title={isImpersonating ? "Exit impersonation" : "Log out"}
              aria-label={isImpersonating ? "Exit impersonation" : "Log out"}
              className={`p-2.5 rounded-xl transition-colors ${
                isImpersonating
                  ? "bg-accent-100 text-accent-700 hover:bg-accent-200 dark:bg-accent-900/40 dark:text-accent-300 dark:hover:bg-accent-900/60"
                  : "text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
              }`}
            >
              {isImpersonating ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <LogOut className="w-5 h-5" />
              )}
            </button>
          </div>
        )}
      </div>

      {collapsed && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900 md:hidden transition-all duration-300 ease-in-out transform animate-in slide-in-from-top fade-in">
          <div className="flex items-center justify-between p-6 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-accent-500 to-accent-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 overflow-hidden p-1.5">
                <img
                  src={logoImg}
                  alt="Café Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">
                  Café ខ្មោច
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("coffee_relaxed_spooky")}
                </p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {renderSearchBar()}

          {renderNavContent(true)}

          {renderUserCard(true)}
        </div>
      )}

      {/* Outside the blurred sidebar on purpose, so it covers the whole screen */}
      <LogoutModal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onDone={() => {
          if (logoutFromMobile.current) onToggle?.(); // also close the phone menu
        }}
      />
    </>
  );
}

export default Sidebar;
