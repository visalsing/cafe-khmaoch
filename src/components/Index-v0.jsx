import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import logoImg from "../../src/assets/logo/sm-solar-plus-logo.jpg";

export default function IndexPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(3);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Simulated authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // SM Solar Plus Product Categories & Inventory
  const categories = [
    "All",
    "Solar Panels",
    "Inverters",
    "Energy Storage",
    "Smart Controllers",
  ];

  const products = [
    {
      id: 1,
      title: "SM Solar Plus Apex Pro 540W Monocrystalline Panel",
      category: "Solar Panels",
      price: "$289.00",
      rating: 4.9,
      reviews: 128,
      img: "https://images.unsplash.com/photo-1509391365360-86929bf4f1e5?auto=format&fit=crop&w=600&q=80",
      badge: "Best Seller",
    },
    {
      id: 2,
      title: "SM GridSync Hybrid Inverter 10kW",
      category: "Inverters",
      price: "$1,250.00",
      rating: 4.8,
      reviews: 94,
      img: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=600&q=80",
      badge: "High Efficiency",
    },
    {
      id: 3,
      title: "SM PowerVault Lithium Battery 5kWh",
      category: "Energy Storage",
      price: "$2,199.00",
      rating: 5.0,
      reviews: 62,
      img: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=600&q=80",
      badge: "New Release",
    },
    {
      id: 4,
      title: "SM EcoVolt MPPT Solar Charge Controller 60A",
      category: "Smart Controllers",
      price: "$145.00",
      rating: 4.7,
      reviews: 215,
      img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80",
      badge: "Popular",
    },
    {
      id: 5,
      title: "SM Solar Titan Bifacial 600W Panel",
      category: "Solar Panels",
      price: "$340.00",
      rating: 4.9,
      reviews: 43,
      img: "https://images.unsplash.com/photo-1592839704584-93b79935f0d2?auto=format&fit=crop&w=600&q=80",
      badge: "Commercial Grade",
    },
    {
      id: 6,
      title: "SM SmartHome Energy Gateway Hub",
      category: "Smart Controllers",
      price: "$210.00",
      rating: 4.6,
      reviews: 88,
      img: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=600&q=80",
      badge: "IoT Connected",
    },
  ];

  const stats = [
    {
      label: "Active Installations",
      value: "45,000+",
      change: "+18%",
      positive: true,
    },
    {
      label: "Clean Energy Generated",
      value: "1.2 GW",
      change: "+24%",
      positive: true,
    },
    {
      label: "Customer Satisfaction",
      value: "99.2%",
      change: "+0.5%",
      positive: true,
    },
    {
      label: "Global Tech Hubs",
      value: "14",
      change: "Active",
      positive: true,
    },
  ];

  const filteredProducts = products.filter((item) => {
    const matchesCategory =
      selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = item.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* ================= NAVBAR SECTION ================= */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md overflow-hidden">
              <img
                src={logoImg}
                alt="SM Solar Plus Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              SM Solar Plus
            </span>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a
              href="#hero"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Home
            </a>
            <a
              href="#shop"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Products
            </a>
            <a
              href="#about"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Technology
            </a>
            <a
              href="#stats"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Impact
            </a>
            {/* Add Settings Link */}
            <button
              onClick={() => navigate("/settings-page")}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
            >
              Settings
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
            >
              Dashboard
            </button>
          </div>

          {/* Right Action: Cart, Auth & Mobile Menu */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/cart")}
              className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-colors"
              title="Shopping Cart"
            >
              🛒
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white font-bold text-xs rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {isLoggedIn ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="hidden sm:inline-block px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all"
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="hidden sm:inline-block px-4 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl border border-blue-200 dark:border-blue-800 transition-all"
              >
                Sign In
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              ☰
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Modal */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col justify-between p-6 md:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                ⚡
              </div>
              <span className="font-extrabold text-base tracking-tight text-white">
                SM Solar Plus
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-slate-800 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col items-center justify-center space-y-6 text-center my-auto">
            <a
              href="#hero"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-medium text-blue-400"
            >
              Home
            </a>
            <a
              href="#shop"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-medium text-slate-300"
            >
              Products
            </a>
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-medium text-slate-300"
            >
              Technology
            </a>
            <a
              href="#stats"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-medium text-slate-300"
            >
              Impact
            </a>
            {/* Add Settings Link for Mobile */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/settings");
              }}
              className="text-lg font-medium text-slate-300 hover:text-white transition-colors"
            >
              Settings
            </button>
          </div>

          <div className="pb-4 flex justify-center">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/login");
              }}
              className="w-full max-w-xs px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-full border border-slate-700 hover:border-blue-500 transition-all text-center"
            >
              Sign In / Register
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 py-10">
        {/* ================= HERO SECTION ================= */}
        <section
          id="hero"
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 text-white shadow-2xl p-8 sm:p-14"
        >
          <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-6">
            <span className="inline-block px-3.5 py-1 text-xs font-semibold uppercase tracking-wider bg-white/20 backdrop-blur-md rounded-full">
              Next-Gen Clean Energy Hardware
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              SM Solar Plus ☀️
            </h1>
            <div className="flex flex-col text-blue-100 text-base sm:text-lg leading-relaxed space-y-1">
              <span>មានលក់អំពូលសូឡា និងគ្រឿងអេឡិចត្រូនិចគ្រប់ប្រភេទ</span>
              <span>ទីតាំង៖ ផ្ទះG32 ផ្លូវលេខ 08 បុរីឡាយគង់ ចោមចៅ</span>
              <span>តេឡេក្រាម៖ 017 877 656</span>
            </div>
            <div className="pt-2 flex flex-wrap gap-3">
              <a
                href="#shop"
                className="px-6 py-3 bg-white text-blue-700 font-semibold rounded-xl shadow-lg hover:bg-blue-50 transition-all duration-200"
              >
                Shop Solar Devices
              </a>
              <button
                onClick={() => navigate("/consultation")}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl backdrop-blur-md border border-white/20 transition-all duration-200"
              >
                Request System Design
              </button>
            </div>
          </div>
        </section>

        {/* ================= STATS SECTION ================= */}
        <section
          id="stats"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
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
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                  {stat.change}
                </span>
              </div>
            </div>
          ))}
        </section>

        {/* ================= SHOPPING CATALOG SECTION ================= */}
        <section id="shop" className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                SM Solar Plus Hardware Store
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Browse certified solar electronics and smart power equipment
              </p>
            </div>

            {/* Search Input Bar */}
            <div className="w-full md:w-72">
              <input
                type="text"
                placeholder="Search solar devices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-blue-500"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="group relative bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:border-blue-500/50 transition-all duration-300 flex flex-col justify-between overflow-hidden"
              >
                <div>
                  <div className="relative h-56 overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={product.img}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-3 left-3 px-3 py-1 text-xs font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white rounded-lg">
                      {product.badge}
                    </span>
                  </div>
                  <div className="p-5 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      {product.category}
                    </span>
                    <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                      {product.title}
                    </h3>
                    <div className="flex items-center space-x-1 text-xs text-slate-500">
                      <span>⭐ {product.rating}</span>
                      <span>({product.reviews} reviews)</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0 flex items-center justify-between mt-auto">
                  <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {product.price}
                  </span>
                  <button
                    onClick={() => {
                      setCartCount((prev) => prev + 1);
                      alert(`Added ${product.title} to your cart!`);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= ABOUT SECTION ================= */}
        <section
          id="about"
          className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
        >
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              SM Solar Plus Technology
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Engineered for Extreme Weather & Maximum Output
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Every SM Solar Plus device incorporates advanced thermal
              regulation, smart IoT power balancing modules, and weatherproof
              encasing to deliver consistent energy generation under any climate
              condition.
            </p>
            <div className="flex gap-4 pt-2">
              <div className="border-l-4 border-blue-600 pl-4">
                <h4 className="font-bold text-lg">25 Years</h4>
                <p className="text-xs text-slate-500">
                  Hardware Performance Warranty
                </p>
              </div>
              <div className="border-l-4 border-indigo-600 pl-4">
                <h4 className="font-bold text-lg">98.6%</h4>
                <p className="text-xs text-slate-500">
                  Inverter Peak Conversion
                </p>
              </div>
            </div>
          </div>
          <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden shadow-inner">
            <img
              src="https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80"
              alt="Solar Panels Farm"
              className="w-full h-full object-cover"
            />
          </div>
        </section>
      </main>

      {/* ================= FOOTER SECTION ================= */}
      <footer className="mt-20 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-900 dark:text-white">
              SM Solar Plus E-Commerce Hub
            </span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="flex space-x-6">
            <a
              href="#hero"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Warranty Policy
            </a>
            <a
              href="#hero"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Support & Guides
            </a>
            <a
              href="#hero"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Dealer Portal
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
