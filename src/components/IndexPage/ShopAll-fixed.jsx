import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import Navbar from "./Navbar";
import MobileMenu from "./MobileMenu";
import Footer from "./Footer";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useCart } from "../../context/CartContext";
import {
  categoryService,
  productService,
  sugarLevelService,
  iceLevelService,
  coffeeLevelService,
  levelsOptionsService,
  assetUrl,
} from "../../services/api";

/* ---------- helpers ---------- */
const LANG = "en"; // default language
const tr = (obj, lang = LANG) => (obj && (obj[lang] || obj.en)) || "";
const bySort = (a, b) => a.sort_num - b.sort_num || a.id - b.id;
const asList = (d) =>
  Array.isArray(d) ? d : d?.items || d?.rows || d?.data || [];

const STATIC_RATING = 4.5;
const STATIC_REVIEWS = 120;

const SIZE_DEFS = [
  { key: "price", label: "Regular", field: "price" },
  { key: "big", label: "Big", field: "big_size_price" },
  { key: "small", label: "Small", field: "small_size_price" },
];
const hasValue = (v) => v !== null && v !== undefined && v !== "";
const unitPrice = (base, pct) =>
  Math.round(
    (Math.round(Number(base) * 100) * (100 - Number(pct || 0))) / 100,
  ) / 100;
const sizeOptions = (p) =>
  SIZE_DEFS.filter((s) => hasValue(p[s.field])).map((s) => ({
    key: s.key,
    label: s.label,
    base: Number(p[s.field]),
    unit: unitPrice(p[s.field], p.discount_percent),
  }));

/* ---------- 5 stars component ---------- */
const STAR_PATH =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";
function Stars({ value = 0, className = "w-4 h-4" }) {
  const uid = useId().replace(/:/g, "");
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`${v.toFixed(1)} out of 5 stars`}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, v - i));
        const clipId = `${uid}-${i}`;
        return (
          <svg
            key={i}
            viewBox="0 0 24 24"
            className={className}
            aria-hidden="true"
          >
            <defs>
              <clipPath id={clipId}>
                <rect x="0" y="0" width={2 + 20 * fill} height="24" />
              </clipPath>
            </defs>
            <path
              d={STAR_PATH}
              className="fill-stone-300 dark:fill-stone-600"
            />
            {fill > 0 && (
              <path d={STAR_PATH} fill="#fbbf24" clipPath={`url(#${clipId})`} />
            )}
          </svg>
        );
      })}
    </div>
  );
}

function SizeChips({ options, active, onPick }) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onPick(o.key)}
          className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
            active === o.key
              ? "bg-amber-600 border-amber-600 text-white"
              : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-amber-500"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function ShopAll() {
  const { addItem } = useCart();

  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [sugarLevels, setSugarLevels] = useState([]);
  const [iceLevels, setIceLevels] = useState([]);
  const [coffeeLevels, setCoffeeLevels] = useState([]);
  const [levelsOptions, setLevelsOptions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [addedId, setAddedId] = useState(null);
  const [picked, setPicked] = useState({});
  const [showOptionsId, setShowOptionsId] = useState(null);
  const [customizations, setCustomizations] = useState({}); // prod.id -> { sugar, ice, coffee }

  const loadMenu = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [prods, cs, sugars, ices, coffees, levelOptions] =
        await Promise.all([
          productService.list(),
          categoryService.list(),
          sugarLevelService.list(),
          iceLevelService.list(),
          coffeeLevelService.list(),
          levelsOptionsService.list(),
        ]);

      setProducts(asList(prods));
      setCats(asList(cs));

      setLevelsOptions(
        asList(levelOptions)
          .filter((item) => Number(item.status) === 1)
          .sort(bySort),
      );

      setSugarLevels(
        asList(sugars)
          .filter((s) => Number(s.status) === 1)
          .sort(bySort),
      );
      setIceLevels(
        asList(ices)
          .filter((i) => Number(i.status) === 1)
          .sort(bySort),
      );
      setCoffeeLevels(
        asList(coffees)
          .filter((c) => Number(c.status) === 1)
          .sort(bySort),
      );
    } catch (err) {
      console.error("Failed to load menu or options:", err);
      setLoadError(err.message || "Could not load the menu options.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadMenu();
  }, [loadMenu]);

  const items = useMemo(
    () =>
      products
        .filter((p) => Number(p.status) === 1 && sizeOptions(p).length > 0)
        .sort(bySort),
    [products],
  );
  const catName = useMemo(
    () => new Map(cats.map((c) => [c.id, tr(c.name)])),
    [cats],
  );

  const tabs = useMemo(() => {
    const used = new Set(items.map((p) => p.category_id));
    return cats
      .filter((c) => Number(c.status) === 1 && used.has(c.id))
      .sort(bySort);
  }, [cats, items]);

  useEffect(() => {
    if (
      selectedCategory !== "All" &&
      !tabs.some((c) => c.id === selectedCategory)
    )
      setSelectedCategory("All");
  }, [tabs, selectedCategory]);

  const filteredProducts = items.filter((p) => {
    const matchesCategory =
      selectedCategory === "All" || p.category_id === selectedCategory;
    const matchesSearch = Object.values(p.name || {})
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const chosenOption = (p) => {
    const options = sizeOptions(p);
    return options.find((o) => o.key === picked[p.id]) || options[0];
  };

  // Empty category/type arrays mean the level is available for all products.
  const filterLevels = (levels, product) =>
    levels.filter((lvl) => {
      const categories = Array.isArray(lvl.array_categories)
        ? lvl.array_categories
        : [];
      const drinkTypes = Array.isArray(lvl.array_drinkstypes)
        ? lvl.array_drinkstypes
        : [];

      const catMatches =
        categories.length === 0 ||
        categories.map(Number).includes(Number(product.category_id));
      const typeMatches =
        drinkTypes.length === 0 ||
        drinkTypes.map(Number).includes(Number(product.type_id));

      return catMatches && typeMatches;
    });

  const matchesProduct = (option, product) => {
    const categories = option.array_categories;
    const drinkTypes = option.array_drinkstypes;

    const categoryMatches =
      !Array.isArray(categories) ||
      categories.length === 0 ||
      categories.map(Number).includes(Number(product.category_id));

    const typeMatches =
      !Array.isArray(drinkTypes) ||
      drinkTypes.length === 0 ||
      drinkTypes.map(Number).includes(Number(product.type_id));

    return categoryMatches && typeMatches;
  };

  const hasOptionGroup = (groupId, product) =>
    levelsOptions.some(
      (option) =>
        Number(option.id) === groupId &&
        Number(option.status) === 1 &&
        matchesProduct(option, product),
    );

  // A group must be enabled for this product before its levels are shown.
  // The group is identified by its own table; level rows do not need
  // a levels_options_id column.
  const availableLevels = (groupId, levels, product) =>
    hasOptionGroup(groupId, product) ? filterLevels(levels, product) : [];

  const handleCustomizationChange = (productId, field, obj) => {
    setCustomizations((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        [field]: obj,
      },
    }));
  };

  const isCompleteCustomization = (product) => {
    const availSugar = availableLevels(1, sugarLevels, product);
    const availIce = availableLevels(2, iceLevels, product);
    const availCoffee = availableLevels(3, coffeeLevels, product);

    const cust = customizations[product.id] || {};
    const needsSugar = availSugar.length > 0 ? Boolean(cust.sugar) : true;
    const needsIce = availIce.length > 0 ? Boolean(cust.ice) : true;
    const needsCoffee = availCoffee.length > 0 ? Boolean(cust.coffee) : true;

    return needsSugar && needsIce && needsCoffee;
  };

  const handleAdd = (product) => {
    if (!isCompleteCustomization(product)) return;

    const options = sizeOptions(product);
    const option = chosenOption(product);
    const cust = customizations[product.id] || {};

    const sugarObj = cust.sugar;
    const iceObj = cust.ice;
    const coffeeObj = cust.coffee;

    const extraCoffeePrice = Number(coffeeObj?.price || 0);
    const finalUnitPrice = option.unit + extraCoffeePrice;

    const chosenLabels = [
      option.label,
      sugarObj ? tr(sugarObj.name) : null,
      iceObj ? tr(iceObj.name) : null,
      coffeeObj ? tr(coffeeObj.name) : null,
    ].filter(Boolean);

    addItem({
      id: `${product.id}:${option.key}:${sugarObj?.id || 0}:${iceObj?.id || 0}:${coffeeObj?.id || 0}`,
      productId: product.id,
      size: option.key,
      title: `${tr(product.name)} (${chosenLabels.join(", ")})`,
      price: finalUnitPrice,
      basePrice: option.base + extraCoffeePrice,
      discountPercent: Number(product.discount_percent || 0),
      taxPercent: hasValue(product.tax_percent)
        ? Number(product.tax_percent)
        : null,
      img: assetUrl(product.img || product.thumbnail),
      category: catName.get(product.category_id) || "",
    });

    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1000);
  };

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
              <h1 className="text-3xl font-extrabold tracking-tight">
                Bean & Blossom Full Menu
              </h1>
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
            {[{ id: "All", name: { en: "All" } }, ...tabs].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-amber-600 text-white shadow-md"
                    : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-amber-500"
                }`}
              >
                {tr(cat.name)}
              </button>
            ))}
          </div>

          {loadError && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-sm flex items-center justify-between">
              {loadError}
              <button
                onClick={loadMenu}
                className="font-semibold underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {loading && products.length === 0 ? (
            <div className="text-center py-16 text-stone-500 dark:text-stone-400">
              Loading menu...
            </div>
          ) : filteredProducts.length === 0 ? (
            !loadError && (
              <div className="text-center py-16 text-stone-500 dark:text-stone-400">
                <div className="text-5xl mb-3">☕</div>
                <p className="font-semibold">No items match your search.</p>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => {
                const options = sizeOptions(product);
                const option = chosenOption(product);
                const discount = Number(product.discount_percent || 0);
                const rating =
                  Number(product.rating) > 0
                    ? Number(product.rating)
                    : STATIC_RATING;
                const reviews = hasValue(product.reviews)
                  ? Number(product.reviews)
                  : STATIC_REVIEWS;
                const img = assetUrl(product.img || product.thumbnail);
                const isExpanded = showOptionsId === product.id;
                const canAdd = isCompleteCustomization(product);
                const prodCust = customizations[product.id] || {};

                const availSugar = availableLevels(1, sugarLevels, product);
                const availIce = availableLevels(2, iceLevels, product);
                const availCoffee = availableLevels(3, coffeeLevels, product);
                const hasAnyOptions =
                  availSugar.length > 0 ||
                  availIce.length > 0 ||
                  availCoffee.length > 0;

                const extraCoffeePrice = Number(prodCust.coffee?.price || 0);
                const currentDisplayPrice = option.unit + extraCoffeePrice;
                const currentBasePrice = option.base + extraCoffeePrice;

                return (
                  <div
                    key={product.id}
                    className="group relative bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 hover:shadow-xl hover:border-amber-500/50 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                  >
                    <div>
                      <div className="relative h-56 overflow-hidden bg-stone-100 dark:bg-stone-800">
                        {img ? (
                          <img
                            src={img}
                            alt={tr(product.name)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-5xl">
                            ☕
                          </div>
                        )}

                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          {discount > 0 && (
                            <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-rose-600/90 backdrop-blur-md text-white rounded-lg">
                              -{discount}%
                            </span>
                          )}

                          {tr(product.badge).trim() && (
                            <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white rounded-lg">
                              {tr(product.badge)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-5 space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          {catName.get(product.category_id)}
                        </span>
                        <h3 className="font-semibold text-stone-900 dark:text-white line-clamp-1">
                          {tr(product.name)}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                          <Stars value={rating} />
                          <span className="font-semibold text-stone-700 dark:text-stone-300">
                            {rating.toFixed(1)}
                          </span>
                          <span>
                            ({reviews} {reviews === 1 ? "review" : "reviews"})
                          </span>
                        </div>
                        {options.length > 1 && (
                          <SizeChips
                            options={options}
                            active={option.key}
                            onPick={(key) =>
                              setPicked((prev) => ({
                                ...prev,
                                [product.id]: key,
                              }))
                            }
                          />
                        )}

                        {/* Show more options toggle button */}
                        {hasAnyOptions && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() =>
                                setShowOptionsId(isExpanded ? null : product.id)
                              }
                              className="w-full flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400 py-1.5 px-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 transition-colors cursor-pointer"
                            >
                              <span>Show more options</span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>

                            {/* Expandable options panel with radio buttons */}
                            {isExpanded && (
                              <div className="mt-3 p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl space-y-3 text-xs border border-stone-200 dark:border-stone-700 animate-fadeIn">
                                {/* Sugar Level */}
                                {availSugar.length > 0 && (
                                  <div>
                                    <span className="font-bold text-stone-700 dark:text-stone-300 block mb-1.5">
                                      Sugar Level{" "}
                                      <span className="text-rose-500">*</span>
                                    </span>
                                    <div className="space-y-1.5">
                                      {availSugar.map((sug) => (
                                        <label
                                          key={sug.id}
                                          className="flex items-center gap-2 cursor-pointer text-stone-700 dark:text-stone-300 hover:text-amber-600"
                                        >
                                          <input
                                            type="radio"
                                            name={`sugar-${product.id}`}
                                            checked={
                                              prodCust.sugar?.id === sug.id
                                            }
                                            onChange={() =>
                                              handleCustomizationChange(
                                                product.id,
                                                "sugar",
                                                sug,
                                              )
                                            }
                                            className="accent-amber-600 cursor-pointer"
                                          />
                                          <span>{tr(sug.name)}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Ice Level */}
                                {availIce.length > 0 && (
                                  <div>
                                    <span className="font-bold text-stone-700 dark:text-stone-300 block mb-1.5">
                                      Ice Level{" "}
                                      <span className="text-rose-500">*</span>
                                    </span>
                                    <div className="space-y-1.5">
                                      {availIce.map((ice) => (
                                        <label
                                          key={ice.id}
                                          className="flex items-center gap-2 cursor-pointer text-stone-700 dark:text-stone-300 hover:text-amber-600"
                                        >
                                          <input
                                            type="radio"
                                            name={`ice-${product.id}`}
                                            checked={
                                              prodCust.ice?.id === ice.id
                                            }
                                            onChange={() =>
                                              handleCustomizationChange(
                                                product.id,
                                                "ice",
                                                ice,
                                              )
                                            }
                                            className="accent-amber-600 cursor-pointer"
                                          />
                                          <span>{tr(ice.name)}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Coffee Level */}
                                {availCoffee.length > 0 && (
                                  <div>
                                    <span className="font-bold text-stone-700 dark:text-stone-300 block mb-1.5">
                                      Coffee Level{" "}
                                      <span className="text-rose-500">*</span>
                                    </span>
                                    <div className="space-y-1.5">
                                      {availCoffee.map((cof) => {
                                        const extra = Number(cof.price || 0);
                                        return (
                                          <label
                                            key={cof.id}
                                            className="flex items-center gap-2 cursor-pointer text-stone-700 dark:text-stone-300 hover:text-amber-600"
                                          >
                                            <input
                                              type="radio"
                                              name={`coffee-${product.id}`}
                                              checked={
                                                prodCust.coffee?.id === cof.id
                                              }
                                              onChange={() =>
                                                handleCustomizationChange(
                                                  product.id,
                                                  "coffee",
                                                  cof,
                                                )
                                              }
                                              className="accent-amber-600 cursor-pointer"
                                            />
                                            <span>
                                              {tr(cof.name)}
                                              {extra > 0 &&
                                                ` (+$${extra.toFixed(2)})`}
                                            </span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-5 pt-0 flex items-center justify-between mt-auto">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-extrabold text-stone-900 dark:text-white">
                          ${currentDisplayPrice.toFixed(2)}
                        </span>
                        {discount > 0 && (
                          <span className="text-sm line-through text-stone-400">
                            ${currentBasePrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleAdd(product)}
                        disabled={!canAdd}
                        className={`px-4 py-2 text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer ${
                          !canAdd
                            ? "bg-stone-300 dark:bg-stone-700 text-stone-500 cursor-not-allowed opacity-60"
                            : addedId === product.id
                              ? "bg-emerald-600"
                              : "bg-amber-600 hover:bg-amber-700"
                        }`}
                        title={
                          !canAdd
                            ? "Please complete all required level selections first"
                            : ""
                        }
                      >
                        {addedId === product.id ? "Added ✓" : "Add to Order"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
