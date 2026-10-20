import React, { useState, useEffect } from "react";
import { User, Shield, ShoppingBag, LogOut, ChevronRight, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { assetUrl } from "../services/api";

export default function Profile() {
  const { currentUser, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview"); // Default page is profile view
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Protect route: Redirect to /login if user is not authenticated
  useEffect(() => {
    // Wait until auth is done loading to avoid premature redirects
    if (!loading && !currentUser) {
      navigate("/login", { replace: true });
    }
  }, [currentUser, loading, navigate]);

  // Show a loading screen or nothing while checking auth status
  if (loading || !currentUser) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-500">
        <p>Loading profile...</p>
      </div>
    );
  }

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutModal(false);
    navigate("/");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Profile Information</h2>
              <p className="text-sm text-slate-500">View your personal account details.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                {currentUser?.avatar ? (
                  <img
                    src={assetUrl(currentUser.avatar)}
                    alt=""
                    className="w-16 h-16 rounded-full object-cover bg-slate-100 dark:bg-slate-800 border"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-amber-600 text-white font-bold text-xl flex items-center justify-center">
                    {currentUser?.firstName?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {currentUser?.firstName} {currentUser?.lastName}
                  </h3>
                  <p className="text-sm text-slate-500 capitalize">{currentUser?.role || "Customer"}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1">Email Address</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{currentUser?.email || "—"}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1">Phone Number</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{currentUser?.phone || "—"}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1">Account Status</span>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                    {currentUser?.status || "Active"}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1">Member Since</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString() : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      case "security":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Security & Password</h2>
              <p className="text-sm text-slate-500">Manage your password and security credentials.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-slate-600 dark:text-slate-400">Password change settings can be integrated here.</p>
            </div>
          </div>
        );
      case "orders":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Order History</h2>
              <p className="text-sm text-slate-500">Track and review your past orders.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-slate-600 dark:text-slate-400">No orders found yet.</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="w-full md:w-64 shrink-0 space-y-1">
            {/* Back to Home Button */}
            <button
              onClick={() => navigate("/")}
              className="w-full flex items-center gap-2 px-4 py-2.5 mb-3 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </button>

            <div className="p-4 mb-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
              {currentUser?.avatar ? (
                <img src={assetUrl(currentUser.avatar)} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-sm">
                  {currentUser?.firstName?.[0]?.toUpperCase() || "U"}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate text-slate-900 dark:text-white">
                  {currentUser?.firstName}
                </div>
                <div className="text-xs text-slate-500 truncate">{currentUser?.email}</div>
              </div>
            </div>

            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-colors cursor-pointer ${
                activeTab === "overview"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <User className="w-4 h-4" />
                <span>Profile View</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-60" />
            </button>

            <button
              onClick={() => setActiveTab("security")}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-colors cursor-pointer ${
                activeTab === "security"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4" />
                <span>Security</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-60" />
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-colors cursor-pointer ${
                activeTab === "orders"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4" />
                <span>Orders</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-60" />
            </button>

            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowLogoutModal(true)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">{renderContent()}</div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
          >
            <h3 className="text-lg font-bold">Confirm Logout</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure to log out?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors shadow-sm cursor-pointer"
              >
                Yes, Log out!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}