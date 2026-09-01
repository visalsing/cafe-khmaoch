import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function IndexPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Simulated authentication state (replace with your actual auth context or hook)
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const quickActions = [
    {
      title: "Take Order (Imports)",
      description: "Process new import orders quickly and efficiently",
      path: "/takeorderimports",
      icon: "📥",
      color: "from-blue-500 to-indigo-600",
    },
    {
      title: "Stock Allocation",
      description: "Allocate and manage inventory for active routes",
      path: "/stock-allocation",
      icon: "📊",
      color: "from-emerald-500 to-teal-600",
    },
    {
      title: "Stock Inquiry",
      description: "Check real-time warehouse inventory levels & SKU data",
      path: "/stock-inquiry",
      icon: "🔍",
      color: "from-amber-500 to-orange-600",
    },
    {
      title: "Route Settlement",
      description: "Finalize daily route collections, cash, and returns",
      path: "/routeSettlement",
      icon: "🚚",
      color: "from-purple-500 to-pink-600",
    },
    {
      title: "Manual Sale Order",
      description: "Create direct sale orders manually without friction",
      path: "/manualSaleOrderCreation",
      icon: "📝",
      color: "from-cyan-500 to-blue-600",
    },
    {
      title: "Good Issue Note (GIN)",
      description: "Manage outgoing inventory transfers and goods issues",
      path: "/good-issue-note",
      icon: "📦",
      color: "from-rose-500 to-red-600",
    },
  ];

  const stats = [
    { label: "Active Orders Today", value: "1,248", change: "+12%", positive: true },
    { label: "Stock Accuracy", value: "99.4%", change: "+0.4%", positive: true },
    { label: "Pending Approvals", value: "24", change: "-3%", positive: false },
    { label: "Route Settlements", value: "18 / 20", change: "90%", positive: true },
  ];

  const galleryImages = [
    { title: "Central Warehouse Hub", category: "Logistics", img: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80" },
    { title: "Fleet & Distribution", category: "Transport", img: "https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=600&q=80" },
    { title: "Automated Scanning", category: "Operations", img: "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=600&q=80" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* ================= NAVBAR SECTION ================= */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
              ⚡
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              EnterpriseOS
            </span>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#hero" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Home</a>
            <a href="#about" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">About</a>
            <a href="#modules" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Modules</a>
            <a href="#gallery" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Gallery</a>
          </div>

          {/* Right Action: Auth Button (Dashboard/Login) & Mobile Menu Toggle */}
          <div className="flex items-center space-x-3">
            {isLoggedIn ? (
              <button
                onClick={() => navigate("/homepage")}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all"
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl border border-blue-200 dark:border-blue-800 transition-all"
              >
                Login
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 pt-2 pb-4 space-y-2">
            <a href="#hero" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-600 dark:text-slate-300">Home</a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-600 dark:text-slate-300">About</a>
            <a href="#modules" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-600 dark:text-slate-300">Modules</a>
            <a href="#gallery" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-600 dark:text-slate-300">Gallery</a>
          </div>
        )}
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 py-10">

        {/* ================= HERO SECTION ================= */}
        <section id="hero" className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 text-white shadow-2xl p-8 sm:p-14">
          <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-6">
            <span className="inline-block px-3.5 py-1 text-xs font-semibold uppercase tracking-wider bg-white/20 backdrop-blur-md rounded-full">
              Enterprise Portal v2.4
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Welcome back, Operations Manager 👋
            </h1>
            <p className="text-blue-100 text-base sm:text-lg leading-relaxed">
              Monitor your distribution network, track stock allocation in real-time, and streamline order processing effortlessly from one central hub.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/stock-allocation")}
                className="px-6 py-3 bg-white text-blue-700 font-semibold rounded-xl shadow-lg hover:bg-blue-50 transition-all duration-200"
              >
                View Stock Allocation
              </button>
              <button
                onClick={() => navigate("/takeorderimports")}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl backdrop-blur-md border border-white/20 transition-all duration-200"
              >
                Process Import Orders
              </button>
            </div>
          </div>
        </section>

        {/* ================= STATS SECTION ================= */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all"
            >
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {stat.label}
              </p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">
                  {stat.value}
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    stat.positive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                  }`}
                >
                  {stat.change}
                </span>
              </div>
            </div>
          ))}
        </section>

        {/* ================= ABOUT SECTION ================= */}
        <section id="about" className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">About Enterprise OS</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Optimized Warehouse & Distribution Ecosystem
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Our enterprise resource management layout bridges the gap between field orders and backend supply-chain processing. Designed for scalability, high accuracy, and fast route settlements.
            </p>
            <div className="flex gap-4 pt-2">
              <div className="border-l-4 border-blue-600 pl-4">
                <h4 className="font-bold text-lg">99.4%</h4>
                <p className="text-xs text-slate-500">Inventory Precision</p>
              </div>
              <div className="border-l-4 border-indigo-600 pl-4">
                <h4 className="font-bold text-lg">24/7</h4>
                <p className="text-xs text-slate-500">Real-time Tracking</p>
              </div>
            </div>
          </div>
          <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden shadow-inner">
            <img 
              src="https://images.unsplash.com/photo-1586528116493-a02532555ca9?auto=format&fit=crop&w=800&q=80" 
              alt="Supply Chain Hub" 
              className="w-full h-full object-cover"
            />
          </div>
        </section>

        {/* ================= MODULES SECTION (QUICK ACTIONS) ================= */}
        <section id="modules" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Quick Shortcuts & Modules</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Frequent operations and shortcuts</p>
            </div>
            <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold px-3 py-1 rounded-full">
              6 Modules Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action, idx) => (
              <div
                key={idx}
                onClick={() => navigate(action.path)}
                className="group relative bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:border-blue-500/50 cursor-pointer transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-start space-x-4">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform duration-300`}
                  >
                    {action.icon}
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {action.description}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Access module &rarr;
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= GALLERY SECTION ================= */}
        <section id="gallery" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Operations Gallery</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Visual overview of network hubs and field activities</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {galleryImages.map((item, idx) => (
              <div key={idx} className="group relative overflow-hidden rounded-2xl shadow-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="h-48 overflow-hidden">
                  <img 
                    src={item.img} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4 space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">{item.category}</span>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* ================= FOOTER SECTION ================= */}
      <footer className="mt-20 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-900 dark:text-white">EnterpriseOS v2.4</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="flex space-x-6">
            <a href="#hero" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Privacy Policy</a>
            <a href="#hero" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Terms of Service</a>
            <a href="#hero" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Support Desk</a>
          </div>
        </div>
      </footer>

    </div>
  );
}