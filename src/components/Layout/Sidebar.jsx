// Sidebar.jsx

import React, { useState } from "react";

import {
  LayoutDashboard,
  BarChart3,
  Users,
  ShoppingBag,
  Zap,
  CreditCard,
  Package,
  MessageSquare,
  Calendar,
  FileText,
  Settings,
  ChevronDown,
  BookSearchIcon,
  ListOrderedIcon,
  PackageCheckIcon,
  SendToBackIcon,
  TruckIcon,
  RouteIcon,
  PrinterIcon,
  CreditCardIcon,
  BadgeDollarSignIcon,
  WarehouseIcon,
  X,
} from "lucide-react";
import CheckStock from "../OrderBooking/CheckStock";

const menuItems = [
  // {
  //   id: "dashboard",
  //   icon: LayoutDashboard,
  //   label: "Dashboard",
  //   // active: true,
  //   badge: "New",
  // },
  {
    id: "homepage",
    icon: LayoutDashboard,
    label: "Homepage",
    // active: true,
    // badge: "New",
  },
  // {
  //   id: "analytics",
  //   icon: BarChart3,
  //   label: "Analytics",
  //   submenu: [
  //     { id: "overview", label: "Overview" },
  //     { id: "reports", label: "Reports" },
  //     { id: "insights", label: "Insights" },
  //   ],
  // },
  // {
  //   id: "users",
  //   icon: Users,
  //   label: "Users",
  //   count: "2.4k",
  //   submenu: [
  //     { id: "all-users", label: "All Users" },
  //     { id: "roles", label: "Roles & Permissions" },
  //     { id: "activity", label: "User Activity" },
  //   ],
  // },
  // {
  //   id: "ecommerce",
  //   icon: ShoppingBag,
  //   label: "E-commerce",
  //   submenu: [
  //     { id: "products", label: "Products" },
  //     { id: "orders", label: "Orders" },
  //     { id: "customers", label: "Customers" },
  //   ],
  // },
  // {
  //   id: "inventory",
  //   icon: Package,
  //   label: "Inventory",
  //   count: "847",
  // },
  // {
  //   id: "transactions",
  //   icon: CreditCard,
  //   label: "Transactions",
  // },
  // {
  //   id: "messages",
  //   icon: MessageSquare,
  //   label: "Messages",
  //   badge: "12",
  // },
  // {
  //   id: "calendar",
  //   icon: Calendar,
  //   label: "Calendar",
  // },
  // {
  //   id: "reports",
  //   icon: FileText,
  //   label: "Reports",
  // },
  {
    id: "settings",
    icon: Settings,
    label: "Settings",
  },
  //   {
  //   id: "orderbooking",
  //   icon: ListOrderedIcon,
  //   label: "Order Booking",
  // },
  {
    id: "orderbooking",
    icon: ListOrderedIcon,
    label: "Order Booking",
    submenu: [
      { id: "takeorderimports", label: "Take Order Imports" },
      { id: "checkstock", label: "Check Stock" },
      { id: "orderediting", label: "Order Editing" },
      { id: "ordercancel", label: "Order Cancel" },
      { id: "manualSaleOrderCreation", label: "Manual Sale Order Creation" },
      { id: "takeOrderFromSalesman", label: "Take Order From Salesman" },
      { id: "editOrderSaleDcode", label: "Edit Order Sale in DCode" },
    ],
  },
  {
    id: "san",
    icon: WarehouseIcon,
    label: "SAN",
    submenu: [
      { id: "changeProductType", label: "Change Product Type" },
      { id: "moveWarehouse", label: "Move Warehouse" },
    ],
  },
  {
    id: "gin-grn",
    icon: PackageCheckIcon,
    label: "GIN/GRN",
    submenu: [
      { id: "goodIssueNote", label: "Good Issue Note" },
      { id: "goodReturnNote", label: "Good Return Note" },
    ],
  },
  {
    id: "stock-inquiry",
    icon: SendToBackIcon,
    label: "Stock Inquiry",
    submenu: [{ id: "stockInquiry", label: "Stock Inquiry" }],
  },
  {
    id: "depositslip",
    icon: CreditCardIcon,
    label: "Deposit Slip",
    submenu: [
      { id: "checkDepositSlip", label: "Check Deposit Slip" },
      { id: "editDepositSlip", label: "Edit Deposit Slip" },
    ],
  },
  {
    id: "delivery",
    icon: TruckIcon,
    label: "Delivery",
    submenu: [{ id: "changeDeliveryDate", label: "Change Delivery Date" }],
  },
  {
    id: "print",
    icon: PrinterIcon,
    label: "Print",
    submenu: [
      { id: "printInvoice", label: "Print Invoice" },
      { id: "printPicklist", label: "Print Picklist" },
    ],
  },
  {
    id: "routeSettlement",
    icon: RouteIcon,
    label: "Route Settlement",
  },
  {
    id: "price",
    icon: BadgeDollarSignIcon,
    label: "Price",
    submenu: [
      { id: "priceOutlet", label: "Check SKU Price Sale to Outlet" },
      { id: "priceUnilever", label: "Check SKU Price from Unilever" },
    ],
  },
];

function Sidebar({ collapsed, onToggle, currentPage, onPageChange }) {
  const [expandedItems, setExpandedItems] = useState(new Set(["analytics"]));

  const toggleExpanded = (itemid) => {
    const newExpanded = new Set(expandedItems);

    if (newExpanded.has(itemid)) {
      newExpanded.delete(itemid);
    } else {
      newExpanded.add(itemid);
    }

    setExpandedItems(newExpanded);
  };

  const renderNavContent = (isMobile = false) => (
    <nav
      className="flex-1 p-4 space-y-2 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 
      [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 
      dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full 
      hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600"
    >
      {menuItems.map((item) => {
        const isSubmenuActive = item.submenu?.some(
          (sub) => sub.id === currentPage
        );
        const isParentActive =
          currentPage === item.id || item.active || isSubmenuActive;

        return (
          <div key={item.id}>
            <button
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 
              text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 
              ${
                isParentActive
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
              }`}
              onClick={() => {
                if (item.submenu) {
                  toggleExpanded(item.id);
                } else {
                  onPageChange(item.id);
                  if (isMobile) onToggle(); // Close mobile overlay when navigating
                }
              }}
            >
              <div className="flex items-center space-x-3">
                <item.icon className="w-5 h-5" />

                {(!collapsed || isMobile) && (
                  <>
                    <span className="font-medium ml-2">{item.label}</span>

                    {item.badge && (
                      <span className="px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                        {item.badge}
                      </span>
                    )}

                    {item.count && (
                      <span
                        className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700
                        text-slate-600 dark:text-slate-300 rounded-full"
                      >
                        {item.count}
                      </span>
                    )}
                  </>
                )}
              </div>

              {(!collapsed || isMobile) && item.submenu && (
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    expandedItems.has(item.id) ? "rotate-180" : ""
                  }`}
                />
              )}
            </button>

            {/* Submenus */}
            {(!collapsed || isMobile) &&
              item.submenu &&
              expandedItems.has(item.id) && (
                <div className="ml-8 mt-2 space-y-1">
                  {item.submenu.map((subitem) => {
                    const isSubActive = currentPage === subitem.id;

                    return (
                      <button
                        key={subitem.id}
                        onClick={() => {
                          onPageChange(subitem.id);
                          if (isMobile) onToggle(); // Close mobile overlay when navigating
                        }}
                        className={`block w-full text-left p-2 text-sm rounded-lg transition-all
                        ${
                          isSubActive
                            ? "bg-blue-100 text-blue-700 font-medium dark:bg-blue-500/15 dark:text-blue-300"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        {subitem.label}
                      </button>
                    );
                  })}
                </div>
              )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* ------------------- DESKTOP SIDEBAR ------------------- */}
      <div
        className={`hidden md:flex ${
          collapsed ? "w-20" : "w-72"
        } h-screen transition-all duration-300 ease-in-out bg-white/80 dark:bg-slate-900/80
        backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50 flex-col
        relative z-10`}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl
                flex items-center justify-center shadow-lg"
            >
              <Zap className="w-6 h-6 text-white" />
            </div>

            {!collapsed && (
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white">
                  Nexus
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Admin Panel
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Navigation */}
        {renderNavContent(false)}

        {/* User Profile */}
        {!collapsed && (
          <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <img
                src="https://play-lh.googleusercontent.com/7Ac5TgaL15Ra4bvFVHJKCdJp4qvnL4djZj5bKc6RN-MZjzrvkeHbJytek0NPTSdZcp8"
                alt="user"
                className="w-10 h-10 rounded-full ring-2 ring-blue-500"
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

      {/* ------------------- MOBILE FULL-SCREEN OVERLAY ------------------- */}
      {/* Triggered on mobile screens when `collapsed` is set to `false` */}
      {!collapsed && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900 md:hidden 
               transition-all duration-300 ease-in-out transform animate-in slide-in-from-top fade-in">
          {/* Header section with Close Button */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white">
                  Nexus
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Admin Panel
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onToggle}
              className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Full Screen Scrollable Menu */}
          {renderNavContent(true)}

          {/* User Profile Section at bottom */}
          <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <img
                src="https://play-lh.googleusercontent.com/7Ac5TgaL15Ra4bvFVHJKCdJp4qvnL4djZj5bKc6RN-MZjzrvkeHbJytek0NPTSdZcp8"
                alt="user"
                className="w-10 h-10 rounded-full ring-2 ring-blue-500"
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