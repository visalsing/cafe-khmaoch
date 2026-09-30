import React, { useState } from "react";

// Import Sections
import Navbar from "./IndexPage/Navbar";
import MobileMenu from "./IndexPage/MobileMenu";
import Hero from "./IndexPage/Hero";
import Stats from "./IndexPage/Stats";
import Shop from "./IndexPage/Shop";
import About from "./IndexPage/About";
import Footer from "./IndexPage/Footer";

export default function IndexPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(3);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
      <Navbar
        cartCount={cartCount}
        setMobileMenuOpen={setMobileMenuOpen}
        isLoggedIn={isLoggedIn}
      />

      {/* Render the Mobile Menu Drawer */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        isLoggedIn={isLoggedIn}
        setIsLoggedIn={setIsLoggedIn}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 py-10">
        <Hero />
        <Stats stats={stats} />
        <Shop
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filteredProducts={filteredProducts}
          setCartCount={setCartCount}
        />
        <About />
      </main>

      <Footer />
    </div>
  );
}
