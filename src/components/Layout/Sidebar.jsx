// Sidebar.jsx

import React, { useState, useEffect } from "react";
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
  CreditCardIcon,
  BadgeDollarSignIcon,
  WarehouseIcon,
  Zap,
  X,
} from "lucide-react";

const menuItems = [
  { id: "homepage", icon: LayoutDashboard, label: "Homepage" },
  { id: "settings", icon: Settings, label: "Settings" },
  {
    id: "orderbooking",
    icon: ListOrderedIcon,
    label: "Order Booking",
    submenu: [
      { id: "takeorderimports", label: "Take Order Imports" },
      { id: "stock-allocation", label: "Stock Allocation" },
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
      { id: "good-issue-note", label: "Good Issue Note" },
      { id: "goodReturnNote", label: "Good Return Note" },
    ],
  },
  {
    id: "Stock-inquiry",
    icon: SendToBackIcon,
    label: "Stock Inquiry",
    submenu: [{ id: "stock-inquiry", label: "Stock Inquiry" }],
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
  { id: "routeSettlement", icon: RouteIcon, label: "Route Settlement" },
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
  const [expandedItems, setExpandedItems] = useState(new Set());

  // Auto expand parent dropdown if a child page is selected
  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.submenu?.some((sub) => sub.id === currentPage)) {
        setExpandedItems((prev) => new Set([...prev, item.id]));
      }
    });
  }, [currentPage]);

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

  const handleLinkClick = (id, isMobile = false) => {
    onPageChange(id);
    if (isMobile) onToggle();
  };

  const renderNavContent = (isMobile = false) => (
    <nav className="flex-1 p-4 space-y-2 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600">
      {menuItems.map((item) => {
        const isSubmenuActive = item.submenu?.some(
          (sub) => sub.id === currentPage,
        );
        const isParentActive =
          currentPage === item.id || item.active || isSubmenuActive;

        return (
          <div key={item.id}>
            {item.submenu ? (
              /* Dropdown toggle button */
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
              /* Direct page link with href="#" */
              <a
                href={`#${item.id}`}
                onClick={() => handleLinkClick(item.id, isMobile)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                  isParentActive
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {(!collapsed || isMobile) && (
                    <span className="font-medium ml-2">{item.label}</span>
                  )}
                </div>
              </a>
            )}

            {/* Submenus */}
            {(!collapsed || isMobile) &&
              item.submenu &&
              expandedItems.has(item.id) && (
                <div className="ml-8 mt-2 space-y-1">
                  {item.submenu.map((subitem) => {
                    const isSubActive = currentPage === subitem.id;

                    return (
                      <a
                        key={subitem.id}
                        href={`#${subitem.id}`}
                        onClick={() => handleLinkClick(subitem.id, isMobile)}
                        className={`block w-full text-left p-2 text-sm rounded-lg transition-all ${
                          isSubActive
                            ? "bg-blue-100 text-blue-700 font-medium dark:bg-blue-500/15 dark:text-blue-300"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        {subitem.label}
                      </a>
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
      {/* DESKTOP SIDEBAR */}
      <div
        className={`hidden md:flex ${
          collapsed ? "w-20" : "w-72"
        } h-screen transition-all duration-300 ease-in-out bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50 flex-col relative z-10`}
      >
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center space-x-3">
            {/* <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Zap className="w-6 h-6 text-white" />
              https://cl2.dcode.unilever.com/ngui/asset/images/dcode-logo.svg
            </div> */}
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <img
                src="https://cl2.dcode.unilever.com/ngui/asset/images/dcode-logo.svg"
                alt="DCode Logo"
                className="w-6 h-6 object-contain"
              />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">
                  DDT & DCODE Docs
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Digitized, Distributor, Transform
                </p>
              </div>
            )}
          </div>
        </div>

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

      {/* MOBILE OVERLAY */}
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
