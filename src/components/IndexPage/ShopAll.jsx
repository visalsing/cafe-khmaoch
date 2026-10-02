import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import MobileMenu from "./MobileMenu";
import Footer from "./Footer";
import { useMenu } from "../../context/MenuContext";
import { useCart } from "../../context/CartContext";

export default function ShopAll() {
  const { availableItems: products, categories } = useMenu();
  const { addItem } = useCart();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [addedId, setAddedId] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleAdd = (product) => {
    addItem(product);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1000);
  };

  const filteredProducts = products.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors duration-300">
      <Navbar
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <section id="shop" className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Bean & Blossom Full Menu</h1>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Handcrafted coffee, teas, cold drinks and fresh pastries
              </p>
            </div>
            <div className="w-full md:w-72">
              <input
                type="text"
                placeholder="Search drinks & pastries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 text-sm bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-amber-600 text-white shadow-md"
                    : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-amber-500"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-stone-500 dark:text-stone-400">
              <div className="text-5xl mb-3">☕</div>
              <p className="font-semibold">No items match your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="group relative bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 hover:shadow-xl hover:border-amber-500/50 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    <div className="relative h-56 overflow-hidden bg-stone-100 dark:bg-stone-800">
                      <img
                        src={product.img}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {product.badge && (
                        <span className="absolute top-3 left-3 px-3 py-1 text-xs font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white rounded-lg">
                          {product.badge}
                        </span>
                      )}
                    </div>
                    <div className="p-5 space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        {product.category}
                      </span>
                      <h3 className="font-semibold text-stone-900 dark:text-white line-clamp-1">{product.title}</h3>
                      <div className="flex items-center space-x-1 text-xs text-stone-500">
                        <span>⭐ {product.rating}</span>
                        <span>({product.reviews} reviews)</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 pt-0 flex items-center justify-between mt-auto">
                    <span className="text-xl font-extrabold text-stone-900 dark:text-white">
                      ${Number(product.price).toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleAdd(product)}
                      className={`px-4 py-2 text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer ${
                        addedId === product.id ? "bg-emerald-600" : "bg-amber-600 hover:bg-amber-700"
                      }`}
                    >
                      {addedId === product.id ? "Added ✓" : "Add to Order"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}