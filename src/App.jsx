// import React, { useState, useEffect } from "react";
// import Sidebar from "./components/Layout/Sidebar.jsx";
// import Header from "./components/Layout/Header.jsx";
// import Dashboard from "./components/Dashboard/Dashboard.jsx";
// import Settings from "./components/Settings/Settings.jsx";

// // import OrderBooking from "./components/OrderBooking/OrderBooking.jsx";
// import TakeOrderImports from "./components/OrderBooking/TakeOrderImports.jsx";
// import StockAllocation from "./components/OrderBooking/StockAllocation.jsx";
// import OrderEditing from "./components/OrderBooking/OrderEditing.jsx";
// import OrderCancel from "./components/OrderBooking/OrderCancel.jsx";
// import ManualSaleOrderCreation from "./components/OrderBooking/ManualSaleOrderCreation.jsx";
// import TakeOrderFromSalesman from "./components/OrderBooking/TakeOrderFromSalesman.jsx";
// import EditOrderSaleDcode from "./components/OrderBooking/EditOrderSaleDcode.jsx";

// import ChangeProductType from "./components/SAN/ChangeProductType.jsx";
// import MoveWarehouse from "./components/SAN/MoveWarehouse.jsx";

// import GoodIssueNote from "./components/GIN-GRN/GoodIssueNote.jsx";
// import StockInquiry from "./components/StockInquiry/StockInquiry.jsx";
// import CheckDepositSlip from "./components/DepositSlip/CheckDepositSlip.jsx";
// import ChangeDeliveryDate from "./components/Delivery/ChangeDeliveryDate.jsx";
// import RouteSettlement from "./components/RouteSettlement/RouteSettlement.jsx";
// import PrintInvoice from "./components/Print/PrintInvoice.jsx";
// import PrintPicklist from "./components/Print/PrintPicklist.jsx";
// import EditDepositSlip from "./components/DepositSlip/EditDepositSlip.jsx";
// import CheckSKUPriceSaleOutlet from "./components/Price/CheckSKUPriceSaleOutlet.jsx";
// import CheckSKUPriceUnilever from "./components/Price/CheckSKUPriceUnilever.jsx";
// import HomePage from "./components/Homepage/Homepage.jsx";
// // import GoodReturnNote from "./components/GIN-GRN/GoodReturnNote.jsx";

// function App() {
//   const [sideBarCollapsed, setSideBarCollapsed] = useState(false);

//   // 1. Initialize state directly from the URL hash on initial page load
//   const [currentPage, setCurrentPage] = useState(() => {
//     const hash = window.location.hash.replace("#", "");
//     return hash || "homepage"; // Falls back to 'homepage' if no hash exists in URL
//   });

//   // 2. Listen for URL changes (e.g. back/forward buttons or hash edits)
//   useEffect(() => {
//     const handleHashChange = () => {
//       const hash = window.location.hash.replace("#", "");
//       if (hash) {
//         setCurrentPage(hash);
//       }
//     };

//     window.addEventListener("hashchange", handleHashChange);
//     return () => window.removeEventListener("hashchange", handleHashChange);
//   }, []);

//   // 3. Helper function to update both state and the URL hash
//   const handlePageChange = (page) => {
//     setCurrentPage(page);
//     window.location.hash = page;
//   };

//   return (
//     <div
//       className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 
//     dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-all duration-500"
//     >
//       <div className="flex h-screen overflow-hidden">
//         <Sidebar
//           collapsed={sideBarCollapsed}
//           onToggle={() => setSideBarCollapsed(!sideBarCollapsed)}
//           currentPage={currentPage}
//           onPageChange={handlePageChange}
//         />
//         <div className="flex-1 flex flex-col overflow-hidden">
//           <Header
//             sideBarCollapsed={sideBarCollapsed}
//             onToggleSidebar={() => setSideBarCollapsed(!sideBarCollapsed)}
//             currentPage={currentPage}
//           />

//           <main className="flex-1 overflow-y-auto bg-transparent">
//             <div className="p-6 space-y-6">
//               {currentPage === "dashboard" && <Dashboard />}
//               {currentPage === "homepage" && <HomePage />}
//               {currentPage === "settings" && <Settings />}

//               {/* Order Booking */}
//               {currentPage === "takeorderimports" && <TakeOrderImports />}
//               {currentPage === "stock-allocation" && <StockAllocation />}
//               {currentPage === "orderediting" && <OrderEditing />}
//               {currentPage === "ordercancel" && <OrderCancel />}
//               {currentPage === "manualSaleOrderCreation" && (
//                 <ManualSaleOrderCreation />
//               )}
//               {currentPage === "takeOrderFromSalesman" && (
//                 <TakeOrderFromSalesman />
//               )}
//               {currentPage === "editOrderSaleDcode" && <EditOrderSaleDcode />}

//               {/* SAN */}
//               {currentPage === "changeProductType" && <ChangeProductType />}
//               {currentPage === "moveWarehouse" && <MoveWarehouse />}

//               {/* GIN / GRN */}
//               {currentPage === "good-issue-note" && <GoodIssueNote />}
//               {/* {currentPage === "goodReturnNote" && <GoodReturnNote />} */}

//               {/* Stock Inquiry */}
//               {currentPage === "stock-inquiry" && <StockInquiry />}

//               {/* Deposit Slip */}
//               {currentPage === "checkDepositSlip" && <CheckDepositSlip />}
//               {currentPage === "editDepositSlip" && <EditDepositSlip />}

//               {/* Delivery */}
//               {currentPage === "changeDeliveryDate" && <ChangeDeliveryDate />}

//               {/* Print */}
//               {currentPage === "printInvoice" && <PrintInvoice />}
//               {currentPage === "printPicklist" && <PrintPicklist />}

//               {/* Route Settlement */}
//               {currentPage === "routeSettlement" && <RouteSettlement />}

//               {/* Price */}
//               {currentPage === "priceOutlet" && <CheckSKUPriceSaleOutlet />}
//               {currentPage === "priceUnilever" && <CheckSKUPriceUnilever />}
//             </div>
//           </main>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default App;



// // App.jsx
// import React, { useState } from "react";
// import { Routes, Route, Navigate } from "react-router-dom";

// // Layout Imports
// import Sidebar from "./components/Layout/Sidebar.jsx";
// import Header from "./components/Layout/Header.jsx";

// // Page Components
// import HomePage from "./components/Homepage/Homepage.jsx";
// import Dashboard from "./components/Dashboard/Dashboard.jsx";
// import Settings from "./components/Settings/Settings.jsx";
// import TakeOrderImports from "./components/OrderBooking/TakeOrderImports.jsx";
// import StockAllocation from "./components/OrderBooking/StockAllocation.jsx";
// import StockAllocationSlideDeck from "./components/OrderBooking/StockAllocationSlideDeck.jsx";
// import OrderEditing from "./components/OrderBooking/OrderEditing.jsx";
// import OrderCancel from "./components/OrderBooking/OrderCancel.jsx";
// import ManualSaleOrderCreation from "./components/OrderBooking/ManualSaleOrderCreation.jsx";
// import TakeOrderFromSalesman from "./components/OrderBooking/TakeOrderFromSalesman.jsx";
// import EditOrderSaleDcode from "./components/OrderBooking/EditOrderSaleDcode.jsx";
// import ChangeProductType from "./components/SAN/ChangeProductType.jsx";
// import MoveWarehouse from "./components/SAN/MoveWarehouse.jsx";
// import GoodIssueNote from "./components/GIN-GRN/GoodIssueNote.jsx";
// import StockInquiry from "./components/StockInquiry/StockInquiry.jsx";
// import CheckDepositSlip from "./components/DepositSlip/CheckDepositSlip.jsx";
// import EditDepositSlip from "./components/DepositSlip/EditDepositSlip.jsx";
// import ChangeDeliveryDate from "./components/Delivery/ChangeDeliveryDate.jsx";
// import RouteSettlement from "./components/RouteSettlement/RouteSettlement.jsx";
// import PrintInvoice from "./components/Print/PrintInvoice.jsx";
// import PrintPicklist from "./components/Print/PrintPicklist.jsx";
// import CheckSKUPriceSaleOutlet from "./components/Price/CheckSKUPriceSaleOutlet.jsx";
// import CheckSKUPriceUnilever from "./components/Price/CheckSKUPriceUnilever.jsx";

// function DashboardLayout() {
//   const [sideBarCollapsed, setSideBarCollapsed] = useState(false);

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-all duration-500">
//       <div className="flex h-screen overflow-hidden">
//         <Sidebar
//           collapsed={sideBarCollapsed}
//           onToggle={() => setSideBarCollapsed(!sideBarCollapsed)}
//         />
//         <div className="flex-1 flex flex-col overflow-hidden">
//           <Header
//             sideBarCollapsed={sideBarCollapsed}
//             onToggleSidebar={() => setSideBarCollapsed(!sideBarCollapsed)}
//           />

//           <main className="flex-1 overflow-y-auto bg-transparent">
//             <div className="p-6 space-y-6">
//               {/* Route matching for clean URLs */}
//               <Routes>
//                 <Route path="/" element={<Navigate to="/homepage" replace />} />
//                 <Route path="/homepage" element={<HomePage />} />
//                 <Route path="/dashboard" element={<Dashboard />} />
//                 <Route path="/settings" element={<Settings />} />

//                 {/* Order Booking */}
//                 <Route path="/takeorderimports" element={<TakeOrderImports />} />
//                 <Route path="/stock-allocation" element={<StockAllocation />} />
//                 <Route path="/orderediting" element={<OrderEditing />} />
//                 <Route path="/ordercancel" element={<OrderCancel />} />
//                 <Route path="/manualSaleOrderCreation" element={<ManualSaleOrderCreation />} />
//                 <Route path="/takeOrderFromSalesman" element={<TakeOrderFromSalesman />} />
//                 <Route path="/editOrderSaleDcode" element={<EditOrderSaleDcode />} />

//                 {/* SAN */}
//                 <Route path="/changeProductType" element={<ChangeProductType />} />
//                 <Route path="/moveWarehouse" element={<MoveWarehouse />} />

//                 {/* GIN / GRN */}
//                 <Route path="/good-issue-note" element={<GoodIssueNote />} />

//                 {/* Stock Inquiry */}
//                 <Route path="/stock-inquiry" element={<StockInquiry />} />

//                 {/* Deposit Slip */}
//                 <Route path="/checkDepositSlip" element={<CheckDepositSlip />} />
//                 <Route path="/editDepositSlip" element={<EditDepositSlip />} />

//                 {/* Delivery */}
//                 <Route path="/changeDeliveryDate" element={<ChangeDeliveryDate />} />

//                 {/* Print */}
//                 <Route path="/printInvoice" element={<PrintInvoice />} />
//                 <Route path="/printPicklist" element={<PrintPicklist />} />

//                 {/* Route Settlement */}
//                 <Route path="/routeSettlement" element={<RouteSettlement />} />

//                 {/* Price */}
//                 <Route path="/priceOutlet" element={<CheckSKUPriceSaleOutlet />} />
//                 <Route path="/priceUnilever" element={<CheckSKUPriceUnilever />} />
//               </Routes>
//             </div>
//           </main>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default function App() {
//   return (
//     <Routes>
//       {/* Full screen slide view without header & sidebar */}
//       <Route path="/stock-allocation-slides" element={<StockAllocationSlideDeck />} />

//       {/* Main Layout containing all other routes */}
//       <Route path="/*" element={<DashboardLayout />} />
//       <Route path="/changeProductType" element={<ChangeProductType />} />
//     </Routes>
//   );
// }



// App.jsx
import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// Layout Imports
import Sidebar from "./components/Layout/Sidebar.jsx";
import Header from "./components/Layout/Header.jsx";

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

function DashboardLayout() {
  const [sideBarCollapsed, setSideBarCollapsed] = useState(false);
  const location = useLocation();

  // Derive currentPage from the URL, e.g. "/stock-allocation" -> "stock-allocation"
  // Falls back to "homepage" for the root path.
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
              {/* Route matching for clean URLs */}
              <Routes>
                <Route path="/" element={<Navigate to="/homepage" replace />} />
                <Route path="/homepage" element={<HomePage />} />
                <Route path="/dashboard" element={<Dashboard />} />
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

                {/* Stock Inquiry */}
                <Route path="/stock-inquiry" element={<StockInquiry />} />

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
      {/* Full screen slide view without header & sidebar */}
      <Route path="/stock-allocation-slides" element={<StockAllocationSlideDeck />} />

      {/* Main Layout containing all other routes */}
      <Route path="/*" element={<DashboardLayout />} />
    </Routes>
  );
}