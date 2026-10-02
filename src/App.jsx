import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// Layout Imports
import Sidebar from "./components/Layout/Sidebar.jsx";
import Header from "./components/Layout/Header.jsx";

// Auth Import
import Login from "./components/Auth/Login.jsx";

// Page Components
import HomePage from "./components/Homepage/Homepage.jsx";
import Dashboard from "./components/Dashboard/Dashboard.jsx";
import Settings from "./components/Settings/Settings.jsx";
import TakeOrderImports from "./components/OrderBooking/TakeOrderImports.jsx";
import StockAllocation from "./components/OrderBooking/StockAllocation.jsx";
import StockAllocationSlideDeck from "./components/OrderBooking/StockAllocationSlideDeck.jsx";
import OrderEditing from "./components/OrderBooking/OrderEditing.jsx";
import OrderCancel from "./components/OrderBooking/OrderCancel.jsx";
import ManualSaleOrderCreation from "./components/OrderBooking/ManualSaleOrderCreation.jsx";
import TakeOrderFromSalesman from "./components/OrderBooking/TakeOrderFromSalesman.jsx";
import EditOrderSaleDcode from "./components/OrderBooking/EditOrderSaleDcode.jsx";
import ChangeProductType from "./components/SAN/ChangeProductType.jsx";
import MoveWarehouse from "./components/SAN/MoveWarehouse.jsx";
import GoodIssueNote from "./components/GIN-GRN/GoodIssueNote.jsx";
import StockInquiry from "./components/StockInquiry/StockInquiry.jsx";
import CheckDepositSlip from "./components/DepositSlip/CheckDepositSlip.jsx";
import EditDepositSlip from "./components/DepositSlip/EditDepositSlip.jsx";
import ChangeDeliveryDate from "./components/Delivery/ChangeDeliveryDate.jsx";
import RouteSettlement from "./components/RouteSettlement/RouteSettlement.jsx";
import PrintInvoice from "./components/Print/PrintInvoice.jsx";
import PrintPicklist from "./components/Print/PrintPicklist.jsx";
import CheckSKUPriceSaleOutlet from "./components/Price/CheckSKUPriceSaleOutlet.jsx";
import CheckSKUPriceUnilever from "./components/Price/CheckSKUPriceUnilever.jsx";
import DispatchAdviceII from "./components/DispatchAdviceII/DispatchAdviceII.jsx";
import FreshSalesOrderBelow24h from "./components/SalesReturn/FreshSalesReturnBelow24h.jsx";
import IndexPage from "./components/Index.jsx";
import CartPage from "./components/Cart/Cart.jsx";
import SettingsPage from "./components/Settings/SettingsPage.jsx";
import ShopAll from "./components/IndexPage/ShopAll.jsx";
import POS from "./components/Dashboard/POS.jsx";
import MenuManager from "./components/Dashboard/MenuManager.jsx";
import Orders from "./components/Dashboard/Orders.jsx";
import Reports from "./components/Dashboard/Report.jsx";
import Checkout from "./components/Checkout/Checkout.jsx";
import PagesOverview from "./components/Dashboard/Pages/PagesOverview.jsx";
import HeroManager from "./components/Dashboard/Pages/HeroManager.jsx";
import { RequireDashboard, Guard, HomeGuard } from "./components/Auth/AccessControl.jsx";
import Users from "./components/Dashboard/Users/Users.jsx";
import RolesPermissions from "./components/Dashboard/Users/RolesPermissions.jsx";

function DashboardLayout() {
  const [sideBarCollapsed, setSideBarCollapsed] = useState(false);
  const location = useLocation();

  const currentPage =
    location.pathname.replace(/^\/dashboard\/?/, "") || "dashboard";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-all duration-500">
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          collapsed={sideBarCollapsed}
          onToggle={() => setSideBarCollapsed(!sideBarCollapsed)}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            sideBarCollapsed={sideBarCollapsed}
            onToggleSidebar={() => setSideBarCollapsed(!sideBarCollapsed)}
            currentPage={currentPage}
          />

          <main className="flex-1 overflow-y-auto bg-transparent">
            <div className="p-6 space-y-6">
              <Routes>
                {/* Fixed: Use path="" to match the base /dashboard route cleanly */}
                {/* <Route path="" element={<Dashboard />} />
                <Route path="/homepage" element={<HomePage />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/pos" element={<POS />} />
                <Route path="/menu" element={<MenuManager />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/pages" element={<PagesOverview />} />
                <Route path="/pages/hero" element={<HeroManager />} /> */}
                <Route path="/homepage" element={<HomePage />} />
                <Route path="/settings" element={<Settings />} />
                <Route
                  path=""
                  element={
                    <HomeGuard>
                      <Dashboard />
                    </HomeGuard>
                  }
                />
                <Route
                  path="/pos"
                  element={
                    <Guard permission="pos">
                      <POS />
                    </Guard>
                  }
                />
                <Route
                  path="/menu"
                  element={
                    <Guard permission="menu">
                      <MenuManager />
                    </Guard>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <Guard permission="orders">
                      <Orders />
                    </Guard>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <Guard permission="reports">
                      <Reports />
                    </Guard>
                  }
                />
                <Route
                  path="/pages"
                  element={
                    <Guard permission="pages">
                      <PagesOverview />
                    </Guard>
                  }
                />
                <Route
                  path="/pages/hero"
                  element={
                    <Guard permission="pages">
                      <HeroManager />
                    </Guard>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <Guard permission="users">
                      <Users />
                    </Guard>
                  }
                />
                <Route
                  path="/roles-permissions"
                  element={
                    <Guard permission="roles">
                      <RolesPermissions />
                    </Guard>
                  }
                />

                {/* Order Booking */}
                <Route
                  path="/takeorderimports"
                  element={<TakeOrderImports />}
                />
                <Route path="/stock-allocation" element={<StockAllocation />} />
                <Route path="/orderediting" element={<OrderEditing />} />
                <Route path="/ordercancel" element={<OrderCancel />} />
                <Route
                  path="/manualSaleOrderCreation"
                  element={<ManualSaleOrderCreation />}
                />
                <Route
                  path="/takeOrderFromSalesman"
                  element={<TakeOrderFromSalesman />}
                />
                <Route
                  path="/editOrderSaleDcode"
                  element={<EditOrderSaleDcode />}
                />

                {/* SAN */}
                <Route
                  path="/changeProductType"
                  element={<ChangeProductType />}
                />
                <Route path="/moveWarehouse" element={<MoveWarehouse />} />

                {/* GIN / GRN */}
                <Route path="/good-issue-note" element={<GoodIssueNote />} />

                {/* Sales Return */}
                <Route
                  path="/fresh-sales-return-below24h"
                  element={<FreshSalesOrderBelow24h />}
                />

                {/* Stock Inquiry */}
                <Route path="/stock-inquiry" element={<StockInquiry />} />

                {/* Dispatch Advice II */}
                <Route
                  path="/dispatch-advice-ii"
                  element={<DispatchAdviceII />}
                />

                {/* Deposit Slip */}
                <Route
                  path="/checkDepositSlip"
                  element={<CheckDepositSlip />}
                />
                <Route path="/editDepositSlip" element={<EditDepositSlip />} />

                {/* Delivery */}
                <Route
                  path="/changeDeliveryDate"
                  element={<ChangeDeliveryDate />}
                />

                {/* Print */}
                <Route path="/printInvoice" element={<PrintInvoice />} />
                <Route path="/printPicklist" element={<PrintPicklist />} />

                {/* Route Settlement */}
                <Route path="/routeSettlement" element={<RouteSettlement />} />

                {/* Price */}
                <Route
                  path="/priceOutlet"
                  element={<CheckSKUPriceSaleOutlet />}
                />
                <Route
                  path="/priceUnilever"
                  element={<CheckSKUPriceUnilever />}
                />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public Pages (No /dashboard prefix) */}
      <Route path="/" element={<IndexPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/settings-page" element={<SettingsPage />} />
      <Route path="/shop" element={<ShopAll />} />
      <Route path="/checkout" element={<Checkout />} />

      {/* Full screen slide view without header & sidebar */}
      <Route
        path="/stock-allocation-slides"
        element={<StockAllocationSlideDeck />}
      />

      {/* Main Dashboard Layout (Handles all /dashboard/* routes) */}
      {/* <Route path="/dashboard/*" element={<DashboardLayout />} /> */}
      <Route path="/dashboard/*" element={<RequireDashboard><DashboardLayout /></RequireDashboard>} />
    </Routes>
  );
}
