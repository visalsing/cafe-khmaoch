import React, { useState } from "react";
import Sidebar from "./components/Layout/Sidebar.jsx";
import Header from "./components/Layout/Header.jsx";
import Dashboard from "./components/Dashboard/Dashboard.jsx";
import Settings from "./components/Settings/Settings.jsx";

// import OrderBooking from "./components/OrderBooking/OrderBooking.jsx";
import TakeOrderImports from "./components/OrderBooking/TakeOrderImports.jsx";
import CheckStock from "./components/OrderBooking/CheckStock.jsx";
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
import ChangeDeliveryDate from "./components/Delivery/ChangeDeliveryDate.jsx";
import RouteSettlement from "./components/RouteSettlement/RouteSettlement.jsx";
import PrintInvoice from "./components/Print/PrintInvoice.jsx";
import PrintPicklist from "./components/Print/PrintPicklist.jsx";
import EditDepositSlip from "./components/DepositSlip/EditDepositSlip.jsx";
import CheckSKUPriceSaleOutlet from "./components/Price/CheckSKUPriceSaleOutlet.jsx";
import CheckSKUPriceUnilever from "./components/Price/CheckSKUPriceUnilever.jsx";
import HomePage from "./components/Homepage/Homepage.jsx";
// import GoodReturnNote from "./components/GIN-GRN/GoodReturnNote.jsx";

function App() {
  const [sideBarCollapsed, setSideBarCollapsed] = useState(false);
  // const [currentPage, setCurrentPage] = useState("dashboard");
  const [currentPage, setCurrentPage] = useState("homepage");

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 
    dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-all duration-500"
    >
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          collapsed={sideBarCollapsed}
          onToggle={() => setSideBarCollapsed(!sideBarCollapsed)}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* <Header 
          sideBarCollapsed={sideBarCollapsed} 
          onToggleSidebar={() => setSideBarCollapsed(!sideBarCollapsed)}
          /> */}
          <Header
            sideBarCollapsed={sideBarCollapsed}
            onToggleSidebar={() => setSideBarCollapsed(!sideBarCollapsed)}
            currentPage={currentPage} // <--- Add this line
          />

          <main className="flex-1 overflow-y-auto bg-transparent">
            <div className="p-6 space-y-6">
              {currentPage === "dashboard" && <Dashboard />}
              {currentPage === "homepage" && <HomePage />}
              {currentPage === "settings" && <Settings />}
              {/* {currentPage === "orderbooking" && <OrderBooking />} */}
              {currentPage === "takeorderimports" && <TakeOrderImports />}
              {currentPage === "checkstock" && <CheckStock />}
              {currentPage === "orderediting" && <OrderEditing />}
              {currentPage === "ordercancel" && <OrderCancel />}
              {currentPage === "manualSaleOrderCreation" && (
                <ManualSaleOrderCreation />
              )}
              {currentPage === "takeOrderFromSalesman" && (
                <TakeOrderFromSalesman />
              )}
              {currentPage === "editOrderSaleDcode" && <EditOrderSaleDcode />}\
              {currentPage === "changeProductType" && <ChangeProductType />}
              {currentPage === "moveWarehouse" && <MoveWarehouse />}
              {currentPage === "goodIssueNote" && <GoodIssueNote />}
              {/* {currentPage === "goodReturnNote" && <GoodReturnNote />} */}
              {currentPage === "stockInquiry" && <StockInquiry />}
              {currentPage === "checkDepositSlip" && <CheckDepositSlip />}
              {currentPage === "editDepositSlip" && <EditDepositSlip />}
              {currentPage === "changeDeliveryDate" && <ChangeDeliveryDate />}
              {currentPage === "printInvoice" && <PrintInvoice />}
              {currentPage === "printPicklist" && <PrintPicklist />}
              {currentPage === "routeSettlement" && <RouteSettlement />}
              {currentPage === "priceOutlet" && <CheckSKUPriceSaleOutlet />}
              {currentPage === "priceUnilever" && <CheckSKUPriceUnilever />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
