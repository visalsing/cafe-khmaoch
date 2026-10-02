import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Shop({
  categories,
  selectedCategory,
  setSelectedCategory,
  searchTerm,
  setSearchTerm,
  filteredProducts,
  onAddToCart,
}) {
  const navigate = useNavigate();
  const [addedId, setAddedId] = useState(null);

  const handleAdd = (product) => {
    onAddToCart(product);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1000);
  };

  return (
    <section id="shop" className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bean & Blossom Menu</h2>
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