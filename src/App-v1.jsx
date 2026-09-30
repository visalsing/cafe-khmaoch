// App.jsx
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

function DashboardLayout() {
  const [sideBarCollapsed, setSideBarCollapsed] = useState(false);
  const location = useLocation();

  const currentPage = location.pathname.replace(/^\//, "") || "homepage";

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
                <Route path="/" element={<Navigate to="/homepage" replace />} />
                <Route path="/homepage" element={<HomePage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                {/* <Route path="/dashboard" element={<Dashboard />} /> */}
                <Route path="/settings" element={<Settings />} />

                {/* Order Booking */}
                <Route path="/takeorderimports" element={<TakeOrderImports />} />
                <Route path="/stock-allocation" element={<StockAllocation />} />
                <Route path="/orderediting" element={<OrderEditing />} />
                <Route path="/ordercancel" element={<OrderCancel />} />
                <Route path="/manualSaleOrderCreation" element={<ManualSaleOrderCreation />} />
                <Route path="/takeOrderFromSalesman" element={<TakeOrderFromSalesman />} />
                <Route path="/editOrderSaleDcode" element={<EditOrderSaleDcode />} />

                {/* SAN */}
                <Route path="/changeProductType" element={<ChangeProductType />} />
                <Route path="/moveWarehouse" element={<MoveWarehouse />} />

                {/* GIN / GRN */}
                <Route path="/good-issue-note" element={<GoodIssueNote />} />

                {/* Sales Return */}
                <Route path="/fresh-sales-return-below24h" element={<FreshSalesOrderBelow24h />} />

                {/* Stock Inquiry */}
                <Route path="/stock-inquiry" element={<StockInquiry />} />

                {/* Dispatch Advice II */}
                <Route path="/dispatch-advice-ii" element={<DispatchAdviceII />} />

                {/* Deposit Slip */}
                <Route path="/checkDepositSlip" element={<CheckDepositSlip />} />
                <Route path="/editDepositSlip" element={<EditDepositSlip />} />

                {/* Delivery */}
                <Route path="/changeDeliveryDate" element={<ChangeDeliveryDate />} />

                {/* Print */}
                <Route path="/printInvoice" element={<PrintInvoice />} />
                <Route path="/printPicklist" element={<PrintPicklist />} />

                {/* Route Settlement */}
                <Route path="/routeSettlement" element={<RouteSettlement />} />

                {/* Price */}
                <Route path="/priceOutlet" element={<CheckSKUPriceSaleOutlet />} />
                <Route path="/priceUnilever" element={<CheckSKUPriceUnilever />} />
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
      {/* Root path now loads IndexPage directly without requiring /index */}
      <Route path="/" element={<IndexPage />} />

      <Route path="/cart" element={<CartPage />} />

      {/* Login */}
      <Route path="/login" element={<Login />} />

      {/* Full screen slide view without header & sidebar */}
      <Route path="/stock-allocation-slides" element={<StockAllocationSlideDeck />} />

      {/* Main Dashboard Layout containing all other dashboard routes */}
      <Route path="/*" element={<DashboardLayout />} />
    </Routes>
  );
}