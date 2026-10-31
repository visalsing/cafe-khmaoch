import React, { useEffect, useState } from "react";

import Navbar from "./IndexPage/Navbar";
import MobileMenu from "./IndexPage/MobileMenu";
import Hero from "./IndexPage/Hero";
import Stats from "./IndexPage/Stats";
import Shop from "./IndexPage/Shop";
import About from "./IndexPage/About";
import LocationSection from "./IndexPage/Map";
import Footer from "./IndexPage/Footer";
import Gallery from "./IndexPage/Gallery";

import { useCart } from "../context/CartContext";
import { useMenu } from "../context/MenuContext";
import {
  PageLoadingProvider,
  usePageLoading,
} from "../context/PageLoadingContext";
import LoadingScreen from "./Loading/Loading";
import BackgroundEffect from "../../src/components/Dashboard/BackgroundEffect";

const STATS = [
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

function IndexPageContent() {
  const {
    availableItems: products = [],
    categories = [],
    loading: menuLoading,
  } = useMenu();

  const { addItem } = useCart();
  const { isPageLoading } = usePageLoading();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [componentsMounted, setComponentsMounted] = useState(false);

  useEffect(() => {
    // Allow child components to mount and register their loading tasks.
    const frame = requestAnimationFrame(() => {
      setComponentsMounted(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  const isLoading = menuLoading || !componentsMounted || isPageLoading;

  const filteredProducts = products
    .filter((item) => {
      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;

      const matchesSearch = (item.title || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      return matchesCategory && matchesSearch;
    })
    .slice(0, 6);

  return (
    <>
      {isLoading && <LoadingScreen />}

      <div
        className={
          isLoading
            ? "invisible h-0 overflow-hidden"
            : "min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors duration-300"
        }
      >
        <BackgroundEffect />
        <div className="relative z-10">
          <Navbar setMobileMenuOpen={setMobileMenuOpen} />

          <MobileMenu
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
          />

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 py-10">
            <Hero />
            <Stats stats={STATS} />

            <Shop
              categories={categories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filteredProducts={filteredProducts}
              onAddToCart={addItem}
            />

            <Gallery />
            <About />
            <LocationSection />
          </main>

          <Footer />
        </div>
      </div>
    </>
  );
}

export default function IndexPage() {
  return (
    <PageLoadingProvider>
      <IndexPageContent />
    </PageLoadingProvider>
  );
}
