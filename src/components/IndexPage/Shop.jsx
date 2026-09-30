import React from "react";

import { useNavigate } from "react-router-dom";

export default function Shop({
  categories,
  selectedCategory,
  setSelectedCategory,
  searchTerm,
  setSearchTerm,
  filteredProducts,
  setCartCount,
}) {
  const navigate = useNavigate();
  return (
    <section id="shop" className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {/* <h2 className="text-2xl font-bold tracking-tight">SM Solar Plus Hardware Store</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Browse certified solar electronics and smart power equipment</p> */}
          <h2 className="text-2xl font-bold tracking-tight">
            Bean & Blossom Menu
          </h2>
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
            className="w-full px-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

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
                {/* {product.price} */}
                ${Number(product.price).toFixed(2)}
              </span>
              <button
                onClick={() => {
                  setCartCount((prev) => prev + 1);
                  // alert(`Added ${product.title} to your cart!`);
                  alert(`Added ${product.title} to your order!`);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
              >
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* <a
        href=""
        className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-lg transition-all"
      >
        See more ...
      </a> */}

      <div className="text-center">
        <button
          onClick={() => navigate("/shop")}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-lg transition-all cursor-pointer"
        >
          See full menu →
        </button>
      </div>
    </section>
  );
}
