import React, { useState, useEffect, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Settings,
  ChevronDown,
  ListOrderedIcon,
  PackageCheckIcon,
  SendToBackIcon,
  TruckIcon,
  RouteIcon,
  PrinterIcon,
  BadgeDollarSignIcon,
  WarehouseIcon,
  CreditCardIcon,
  Zap,
  X,
  Search,
  SearchX,
  HomeIcon,
  Coffee,
  ShoppingCart,
  Receipt,
  ChartColumn,
  LayoutTemplate,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { Users, ShieldCheck, LogOut } from "lucide-react";        // add to your lucide import
import Avatar from "../Dashboard/Users/Avatar";
import { ROLE_INFO, fullName } from "../../utils/access";

const { currentUser, can, logout } = useAuth();

const PERMISSION_BY_ID = {
  dashboard: "dashboard", pos: "pos", orders: "orders", "menu-manager": "menu", reports: "reports",
  pages: "pages", "pages-overview": "pages", "pages-hero": "pages",
  "users-list": "users", "roles-permissions": "roles",
};

// inside function Sidebar(...):
// const { currentUser, can, logout } = useAuth();
const isAdmin = currentUser?.role === "admin";
const allowed = (id) => isAdmin || (PERMISSION_BY_ID[id] && can(PERMISSION_BY_ID[id]));

const visibleMenuItems = useMemo(
  () =>
    menuItems.reduce((acc, item) => {
      if (item.submenu) {
        const subs = item.submenu.filter((s) => allowed(s.id));
        if (subs.length) acc.push({ ...item, submenu: subs });
      } else if (allowed(item.id)) {
        acc.push(item);
      }
      return acc;
    }, []),
  [currentUser, can]
);

const menuItems = [
  {
    id: "dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  { id: "pos", path: "/dashboard/pos", icon: ShoppingCart, label: "POS" },
  {
    id: "menu-manager",
    path: "/dashboard/menu",
    icon: Coffee,
    label: "Menu Manager",
  },
  { id: "orders", path: "/dashboard/orders", icon: Receipt, label: "Orders" },
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
  {
    id: "users",
    icon: Users,
    label: "Users",
    submenu: [
      { id: "users-list", path: "/dashboard/users", label: "Users" },
      {
        id: "roles-permissions",
        path: "/dashboard/roles-permissions",
        label: "Roles & Permissions",
      },
    ],
  },
  {
    id: "orderbooking",
    icon: ListOrderedIcon,
    label: "Order Booking",
    submenu: [
      {
        id: "takeorderimports",
        path: "/dashboard/takeorderimports",
        label: "Take Order Imports",
      },
      {
        id: "stock-allocation",
        path: "/dashboard/stock-allocation",
        label: "Stock Allocation",
      },
      {
        id: "orderediting",
        path: "/dashboard/orderediting",
        label: "Order Editing",
      },
      {
        id: "ordercancel",
        path: "/dashboard/ordercancel",
        label: "Order Cancel",
      },
      {
        id: "manualSaleOrderCreation",
        path: "/dashboard/manualSaleOrderCreation",
        label: "Manual Sale Order Creation",
      },
      {
        id: "takeOrderFromSalesman",
        path: "/dashboard/takeOrderFromSalesman",
        label: "Take Order From Salesman",
      },
      {
        id: "editOrderSaleDcode",
        path: "/dashboard/editOrderSaleDcode",
        label: "Edit Order Sale in DCode",
      },
    ],
  },
  {
    id: "san",
    icon: WarehouseIcon,
    label: "SAN",
    submenu: [
      {
        id: "changeProductType",
        path: "/dashboard/changeProductType",
        label: "Change Product Type",
      },
      {
        id: "moveWarehouse",
        path: "/dashboard/moveWarehouse",
        label: "Move Warehouse",
      },
    ],
  },
  {
    id: "gin-grn",
    icon: PackageCheckIcon,
    label: "GIN/GRN",
    submenu: [
      {
        id: "good-issue-note",
        path: "/dashboard/good-issue-note",
        label: "Good Issue Note",
      },
      {
        id: "goodReturnNote",
        path: "/dashboard/goodReturnNote",
        label: "Good Return Note",
      },
    ],
  },
  {
    id: "sales-return",
    icon: PackageCheckIcon,
    label: "Sales Return",
    submenu: [
      {
        id: "sales-return",
        path: "/dashboard/sales-return",
        label: "Sales Return",
      },
      {
        id: "fresh-sales-return",
        path: "/dashboard/fresh-sales-return",
        label: "Fresh Sales Return",
      },
      {
        id: "fresh-sales-return-below24h",
        path: "/dashboard/fresh-sales-return-below24h",
        label: "Fresh Sales Return Below 24h",
      },
    ],
  },
  {
    id: "Stock-Inquiry",
    icon: SendToBackIcon,
    label: "Stock Inquiry",
    submenu: [
      {
        id: "stock-inquiry",
        path: "/dashboard/stock-inquiry",
        label: "Stock Inquiry",
      },
    ],
  },
  {
    id: "Dispatch-Advice-II",
    icon: SendToBackIcon,
    label: "Dispatch Advice II",
    submenu: [
      {
        id: "dispatch-advice-ii",
        path: "/dashboard/dispatch-advice-ii",
        label: "Dispatch Advice II",
      },
    ],
  },
  {
    id: "depositslip",
    icon: CreditCardIcon,
    label: "Deposit Slip",
    submenu: [
      {
        id: "checkDepositSlip",
        path: "/dashboard/checkDepositSlip",
        label: "Check Deposit Slip",
      },
      {
        id: "editDepositSlip",
        path: "/dashboard/editDepositSlip",
        label: "Edit Deposit Slip",
      },
    ],
  },
  {
    id: "delivery",
    icon: TruckIcon,
    label: "Delivery",
    submenu: [
      {
        id: "changeDeliveryDate",
        path: "/dashboard/changeDeliveryDate",
        label: "Change Delivery Date",
      },
    ],
  },
  {
    id: "print",
    icon: PrinterIcon,
    label: "Print",
    submenu: [
      {
        id: "printInvoice",
        path: "/dashboard/printInvoice",
        label: "Print Invoice",
      },
      {
        id: "printPicklist",
        path: "/dashboard/printPicklist",
        label: "Print Picklist",
      },
    ],
  },
  {
    id: "routeSettlement",
    path: "/dashboard/routeSettlement",
    icon: RouteIcon,
    label: "Route Settlement",
  },
  {
    id: "price",
    icon: BadgeDollarSignIcon,
    label: "Price",
    submenu: [
      {
        id: "priceOutlet",
        path: "/dashboard/priceOutlet",
        label: "Check SKU Price Sale to Outlet",
      },
      {
        id: "priceUnilever",
        path: "/dashboard/priceUnilever",
        label: "Check SKU Price from Unilever",
      },
    ],
  },
];

function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const isSearching = searchQuery.trim().length > 0;

  const filteredMenuItems = useMemo(() => {
    if (!isSearching) return menuItems;

    const query = searchQuery.trim().toLowerCase();

    return menuItems.reduce((acc, item) => {
      const labelMatches = item.label.toLowerCase().includes(query);

      if (item.submenu) {
        const matchingSubmenu = item.submenu.filter((sub) =>
          sub.label.toLowerCase().includes(query),
        );

        if (labelMatches || matchingSubmenu.length > 0) {
          acc.push({
            ...item,
            submenu: labelMatches ? item.submenu : matchingSubmenu,
          });
        }
      } else if (labelMatches) {
        acc.push(item);
      }

      return acc;
    }, []);
  }, [searchQuery, isSearching]);

  useEffect(() => {
    if (isSearching) return;
    menuItems.forEach((item) => {
      if (item.submenu?.some((sub) => sub.path === location.pathname)) {
        setExpandedItems((prev) => new Set([...prev, item.id]));
      }
    });
  }, [location.pathname, isSearching]);

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
            focus:ring-blue-500 focus:border-transparent transition-all"
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
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                  }`}
                  onClick={() => toggleExpanded(item.id)}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {(!collapsed || isMobile) && (
                      <span className="font-medium ml-2">{item.label}</span>
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
                  end // <--- Add this prop here so it only matches "/dashboard" exactly!
                  onClick={() => handleLinkClick(isMobile)}
                  className={({ isActive }) =>
                    `w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    }`
                  }
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {(!collapsed || isMobile) && (
                      <span className="font-medium ml-2">{item.label}</span>
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
                              ? "bg-blue-100 text-blue-700 font-medium dark:bg-blue-500/15 dark:text-blue-300"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                          }`
                        }
                      >
                        {subitem.label}
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

  return (
    <>
      <div
        className={`hidden md:flex ${
          collapsed ? "w-20" : "w-72"
        } h-screen transition-all duration-300 ease-in-out bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50 flex-col relative z-10`}
      >
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <img
                src="https://scontent.fpnh18-2.fna.fbcdn.net/v/t39.30808-6/654322007_1356423336538566_7798828526873508250_n.jpg?stp=dst-jpg_tt6&cstp=mx828x828&ctp=s828x828&_nc_cat=102&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeHLG6cF5oyO4KIltffKzPkDg29pJuzyes6Db2km7PJ6zpXH9qffAs3khTNUihEpFRrsZFf3KZdhc7xw3M_AbuW0&_nc_ohc=J5bssy70AskQ7kNvwHPTAbX&_nc_oc=AdpWJ1T-7jOxXxsyrnSi2nU5NW7LqRBvVq-W-us9kyZgMzbrfPAn6TOqzu7g1wCzez0&_nc_zt=23&_nc_ht=scontent.fpnh18-2.fna&_nc_gid=3-Ys3WRWKOaqozE_9uImAw&_nc_ss=7b2a8&oh=00_AQM2yfXLaYir7lHFD79tfpyYIK_D0B35d290lbOfcx8KYA&oe=6AC3E969"
                alt="Café ខ្មោច Logo"
                className="w-6 h-6 object-contain"
              />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">
                  Café ខ្មោច
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Coffee, Relaxed & Thrilled
                </p>
              </div>
            )}
          </div>
        </div>

        {!collapsed && renderSearchBar()}

        {renderNavContent(false)}

        {!collapsed && (
          <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <img
                src="https://play-lh.googleusercontent.com/7Ac5TgaL15Ra4bvFVHJKCdJp4qvnL4djZj5bKc6RN-MZjzrvkeHbJytek0NPTSdZcp8"
                alt="user avatar"
                className="w-10 h-10 rounded-full ring-2 ring-blue-500 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                  Visalsing
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Administrator
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900 md:hidden transition-all duration-300 ease-in-out transform animate-in slide-in-from-top fade-in">
          <div className="flex items-center justify-between p-6 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">
                  DDT & DCODE Docs
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Unilever
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

          <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <img
                src="https://play-lh.googleusercontent.com/7Ac5TgaL15Ra4bvFVHJKCdJp4qvnL4djZj5bKc6RN-MZjzrvkeHbJytek0NPTSdZcp8"
                alt="user avatar"
                className="w-10 h-10 rounded-full ring-2 ring-blue-500 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                  Visalsing
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Administrator
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;
