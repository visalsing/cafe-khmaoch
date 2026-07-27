import React, { useState } from "react";
import Sidebar from "./components/Layout/Sidebar.jsx";
import Header from "./components/Layout/Header.jsx";
import Dashboard from "./components/Dashboard/Dashboard.jsx";
import Settings from "./components/Settings/Settings.jsx";

// Import your other components here as you build them:
// import Analytics from "./components/Analytics/Analytics.jsx";
// import Users from "./components/Users/Users.jsx";

function App() {
  const [sideBarCollapsed, setSideBarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");

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
              {/* --- DYNAMIC PAGE CONTENT --- */}

              {currentPage === "dashboard" && <Dashboard />}

              {/* {currentPage === "analytics" && (
                <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <h2 className="text-2xl font-bold dark:text-white">Analytics Page</h2>
                  <p className="text-slate-500">Charts and data insights will live here.</p>
                </div>
              )}

              {currentPage === "users" && (
                <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <h2 className="text-2xl font-bold dark:text-white">User Management</h2>
                  <p className="text-slate-500">User table and roles will live here.</p>
                </div>
              )} */}

              {currentPage === "reports" && (
                <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <h2 className="text-2xl font-bold dark:text-white">
                    Reports
                  </h2>
                  <p className="text-slate-500">
                    System preferences and profile settings.
                  </p>
                </div>
              )}

              {currentPage === "settings" && <Settings />}

              {/* --- END DYNAMIC CONTENT --- */}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
