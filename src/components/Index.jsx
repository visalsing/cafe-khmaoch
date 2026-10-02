import React, { useState } from "react";

import Navbar from "./IndexPage/Navbar";
import MobileMenu from "./IndexPage/MobileMenu";
import Hero from "./IndexPage/Hero";
import Stats from "./IndexPage/Stats";
import Shop from "./IndexPage/Shop";
import About from "./IndexPage/About";
import Footer from "./IndexPage/Footer";
// import { categories, products } from "./Data/menuData";
import { useCart } from "../context/CartContext";
import { useMenu } from "../context/MenuContext";

export default function IndexPage() {
    const { availableItems: products, categories } = useMenu();
// the filteredProducts code stays the same (with .slice(0, 6))

// inside IndexPage(): delete `const [cartCount, setCartCount] = useState(3);`
const { cartCount, addItem } = useCart();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // const [cartCount, setCartCount] = useState(3);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // const categories = [
  //   "All",
  //   "Coffee",
  //   "Tea & Matcha",
  //   "Cold Drinks",
  //   "Pastries",
  // ];

  // const products = [
  //   {
  //     id: 1,
  //     title: "Signature Caramel Latte",
  //     category: "Coffee",
  //     price: "$4.50",
  //     rating: 4.9,
  //     reviews: 128,
  //     img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80",
  //     badge: "Best Seller",
  //   },
  //   {
  //     id: 2,
  //     title: "Flat White with Oat Milk",
  //     category: "Coffee",
  //     price: "$4.00",
  //     rating: 4.8,
  //     reviews: 94,
  //     img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80",
  //     badge: "Barista Pick",
  //   },
  //   {
  //     id: 3,
  //     title: "Iced Matcha Blossom",
  //     category: "Tea & Matcha",
  //     price: "$5.20",
  //     rating: 5.0,
  //     reviews: 62,
  //     img: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=600&q=80",
  //     badge: "New Release",
  //   },
  //   {
  //     id: 4,
  //     title: "Cold Brew Coconut Cooler",
  //     category: "Cold Drinks",
  //     price: "$4.80",
  //     rating: 4.7,
  //     reviews: 215,
  //     img: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80",
  //     badge: "Popular",
  //   },
  //   {
  //     id: 5,
  //     title: "Butter Croissant",
  //     category: "Pastries",
  //     price: "$3.20",
  //     rating: 4.9,
  //     reviews: 143,
  //     img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
  //     badge: "Fresh Baked",
  //   },
  //   {
  //     id: 6,
  //     title: "Strawberry Fruit Smoothie",
  //     category: "Cold Drinks",
  //     price: "$5.00",
  //     rating: 4.6,
  //     reviews: 88,
  //     img: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80",
  //     badge: "Refreshing",
  //   },
  // ];

  const stats = [
    { label: "Cups Served", value: "250,000+", change: "+18%", positive: true },
    { label: "Coffee Origins", value: "12", change: "+3", positive: true },
    {
      label: "Customer Satisfaction",
      value: "99.2%",
      change: "+0.5%",
      positive: true,
    },
    { label: "Café Locations", value: "6", change: "Open", positive: true },
  ];

  // const filteredProducts = products.filter((item) => {
  //   const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
  //   const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
  //   return matchesCategory && matchesSearch;
  // });
  const filteredProducts = products
    .filter((item) => {
      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;
      const matchesSearch = item.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .slice(0, 6); // homepage preview only

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors duration-300">
      <Navbar
        cartCount={cartCount}
        setMobileMenuOpen={setMobileMenuOpen}
        isLoggedIn={isLoggedIn}
        setIsLoggedIn={setIsLoggedIn}
      />

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
          // setCartCount={setCartCount}
          onAddToCart={addItem}
        />
        <About />
      </main>

      <Footer />
    </div>
  );
}
