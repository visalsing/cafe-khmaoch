import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  categoryService,
  productService,
  sugarLevelService,
  iceLevelService,
  coffeeLevelService,
  levelsOptionsService,
  assetUrl,
} from "../../services/api";

/* ---------- Helpers ---------- */

const HOME_LIMIT = 6;

const bySort = (a, b) =>
  Number(a.sort_num || 0) - Number(b.sort_num || 0) ||
  Number(a.id || 0) - Number(b.id || 0);

const asList = (data) =>
  Array.isArray(data) ? data : data?.items || data?.rows || data?.data || [];

const STATIC_RATING = 4.5;
const STATIC_REVIEWS = 120;

const SIZE_DEFS = [
  { key: "price", labelKey: "regular", field: "price" },
  { key: "big", labelKey: "big", field: "big_size_price" },
  { key: "small", labelKey: "small", field: "small_size_price" },
];

const hasValue = (value) =>
  value !== null && value !== undefined && value !== "";

const unitPrice = (base, discountPercent) =>
  Math.round(
    (Math.round(Number(base) * 100) * (100 - Number(discountPercent || 0))) /
      100,
  ) / 100;

const sizeOptions = (product) =>
  SIZE_DEFS.filter((size) => hasValue(product[size.field])).map((size) => ({
    key: size.key,
    labelKey: size.labelKey,
    base: Number(product[size.field]),
    unit: unitPrice(product[size.field], product.discount_percent),
  }));

/* ---------- Stars ---------- */

const STAR_PATH =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

function Stars({ value = 0, className = "w-4 h-4", t }) {
  const uid = useId().replace(/:/g, "");
  const rating = Math.max(0, Math.min(5, Number(value) || 0));

  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`${rating.toFixed(1)} ${t("out_of_5_stars")}`}
    >
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = Math.max(0, Math.min(1, rating - index));

        const clipId = `${uid}-${index}`;

        return (
          <svg
            key={index}
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

/* ---------- Size Chips ---------- */

function SizeChips({ options, active, onPick, t }) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onPick(option.key)}
          className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
            active === option.key
              ? "bg-amber-600 border-amber-600 text-white"
              : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-amber-500"
          }`}
        >
          {t(option.labelKey)}
        </button>
      ))}
    </div>
  );
}

/* ---------- Unit Price ---------- */

const EXCHANGE_RATE = 4100;

const formatPriceWithUSD = (rielValue) => {
  const usd = Number(rielValue || 0) / EXCHANGE_RATE;

  const usdFormatted =
    usd % 1 === 0 ? `$${usd.toFixed(0)}` : `$${usd.toFixed(2)}`;

  return {
    riel: `${Math.round(Number(rielValue || 0)).toLocaleString()}៛`,
    usd: `≈ ${usdFormatted}`,
  };
};

/* =========================================================
   SHOP
========================================================= */

export default function Shop({
  selectedCategory,
  setSelectedCategory,
  searchTerm,
  setSearchTerm,
  onAddToCart,
}) {
  const navigate = useNavigate();

  const { language, t } = useLanguage();
  const { currentUser } = useAuth();

  const activeLanguage = language || "en";

  /* ---------- Translation ---------- */

  const translateJson = useCallback(
    (value) => {
      if (value === null || value === undefined || value === "") {
        return "";
      }

      if (typeof value === "object" && !Array.isArray(value)) {
        return (
          value[activeLanguage] || value.en || Object.values(value)[0] || ""
        );
      }

      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);

          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return (
              parsed[activeLanguage] ||
              parsed.en ||
              Object.values(parsed)[0] ||
              ""
            );
          }
        } catch {
          // Return ordinary text unchanged.
        }

        return value;
      }

      return String(value);
    },
    [activeLanguage],
  );

  /* ---------- State ---------- */

  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [sugarLevels, setSugarLevels] = useState([]);
  const [iceLevels, setIceLevels] = useState([]);
  const [coffeeLevels, setCoffeeLevels] = useState([]);
  const [levelsOptions, setLevelsOptions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [addedId, setAddedId] = useState(null);
  const [picked, setPicked] = useState({});
  const [showOptionsId, setShowOptionsId] = useState(null);

  // product ID -> { sugar, ice, coffee }
  const [customizations, setCustomizations] = useState({});

  // Product-detail modal
  const [selectedProduct, setSelectedProduct] = useState(null);

  /* ---------- Modal keyboard and scroll handling ---------- */

  useEffect(() => {
    if (!selectedProduct) return;

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedProduct(null);
      }
    };

    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;

      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedProduct]);

  /* ---------- Load Menu ---------- */

  const loadMenu = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [prods, categories, sugars, ices, coffees, levelOptions] =
        await Promise.all([
          productService.list(),
          categoryService.list(),
          sugarLevelService.list(),
          iceLevelService.list(),
          coffeeLevelService.list(),
          levelsOptionsService.list(),
        ]);

      setProducts(asList(prods));
      setCats(asList(categories));

      setLevelsOptions(
        asList(levelOptions)
          .filter((item) => Number(item.status) === 1)
          .sort(bySort),
      );

      setSugarLevels(
        asList(sugars)
          .filter((item) => Number(item.status) === 1)
          .sort(bySort),
      );

      setIceLevels(
        asList(ices)
          .filter((item) => Number(item.status) === 1)
          .sort(bySort),
      );

      setCoffeeLevels(
        asList(coffees)
          .filter((item) => Number(item.status) === 1)
          .sort(bySort),
      );
    } catch (error) {
      console.error("Failed to load menu or options:", error);

      setLoadError(error.message || "could_not_load_menu_options");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  /* ---------- Active Products ---------- */

  const items = useMemo(
    () =>
      products
        .filter(
          (product) =>
            Number(product.status) === 1 && sizeOptions(product).length > 0,
        )
        .sort(bySort),
    [products],
  );

  /* ---------- Category Names ---------- */

  const catName = useMemo(
    () =>
      new Map(
        cats.map((category) => [
          Number(category.id),
          translateJson(category.name),
        ]),
      ),
    [cats, translateJson],
  );

  /* ---------- Category Tabs ---------- */

  const tabs = useMemo(() => {
    const usedCategories = new Set(
      items.map((product) => Number(product.category_id)),
    );

    return cats
      .filter(
        (category) =>
          Number(category.status) === 1 &&
          usedCategories.has(Number(category.id)),
      )
      .sort(bySort);
  }, [cats, items]);

  useEffect(() => {
    if (
      selectedCategory !== "All" &&
      !tabs.some((category) => Number(category.id) === Number(selectedCategory))
    ) {
      setSelectedCategory("All");
    }
  }, [tabs, selectedCategory, setSelectedCategory]);

  /* ---------- Search and Filter ---------- */

  const filteredProducts = items
    .filter((product) => {
      const matchesCategory =
        selectedCategory === "All" ||
        Number(product.category_id) === Number(selectedCategory);

      const productName =
        typeof product.name === "string"
          ? translateJson(product.name)
          : Object.values(product.name || {}).join(" ");

      const matchesSearch = productName
        .toLowerCase()
        .includes((searchTerm || "").toLowerCase());

      return matchesCategory && matchesSearch;
    })
    .slice(0, HOME_LIMIT);

  /* ---------- Selected Size ---------- */

  const chosenOption = (product) => {
    const options = sizeOptions(product);

    return (
      options.find((option) => option.key === picked[product.id]) || options[0]
    );
  };

  /* ---------- Customization Availability ---------- */

  const filterLevels = (levels, product) =>
    levels.filter((level) => {
      const categories = Array.isArray(level.array_categories)
        ? level.array_categories
        : [];

      const drinkTypes = Array.isArray(level.array_drinkstypes)
        ? level.array_drinkstypes
        : [];

      const categoryMatches =
        categories.length === 0 ||
        categories.map(Number).includes(Number(product.category_id));

      const typeMatches =
        drinkTypes.length === 0 ||
        drinkTypes.map(Number).includes(Number(product.type_id));

      return categoryMatches && typeMatches;
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

  const availableLevels = (groupId, levels, product) =>
    hasOptionGroup(groupId, product) ? filterLevels(levels, product) : [];

  /* ---------- Customization Changes ---------- */

  const handleCustomizationChange = (productId, field, value) => {
    setCustomizations((previous) => ({
      ...previous,
      [productId]: {
        ...(previous[productId] || {}),
        [field]: value,
      },
    }));
  };

  /* ---------- Required Customizations ---------- */

  const isCompleteCustomization = (product) => {
    const availableSugar = availableLevels(1, sugarLevels, product);

    const availableIce = availableLevels(2, iceLevels, product);

    const availableCoffee = availableLevels(3, coffeeLevels, product);

    const customization = customizations[product.id] || {};

    const sugarComplete =
      availableSugar.length === 0 || Boolean(customization.sugar);

    const iceComplete = availableIce.length === 0 || Boolean(customization.ice);

    const coffeeComplete =
      availableCoffee.length === 0 || Boolean(customization.coffee);

    return sugarComplete && iceComplete && coffeeComplete;
  };

  /* ---------- Add to Cart ---------- */

  const handleAdd = (product) => {
    if (!isCompleteCustomization(product)) return;
    if (!onAddToCart) return;

    const option = chosenOption(product);

    if (!option) return;

    const customization = customizations[product.id] || {};

    const sugarObj = customization.sugar;
    const iceObj = customization.ice;
    const coffeeObj = customization.coffee;

    const extraCoffeePrice = Number(coffeeObj?.price || 0);

    const finalUnitPrice = option.unit + extraCoffeePrice;

    const chosenLabels = [
      t(option.labelKey),
      sugarObj ? translateJson(sugarObj.name) : null,
      iceObj ? translateJson(iceObj.name) : null,
      coffeeObj ? translateJson(coffeeObj.name) : null,
    ].filter(Boolean);

    onAddToCart({
      id: `${product.id}:${option.key}:${sugarObj?.id || 0}:${iceObj?.id || 0}:${coffeeObj?.id || 0}`,
      productId: product.id,
      size: option.key,
      title: `${translateJson(product.name)} (${chosenLabels.join(", ")})`,
      price: finalUnitPrice,
      basePrice: option.base + extraCoffeePrice,
      discountPercent: Number(product.discount_percent || 0),
      taxPercent: hasValue(product.tax_percent)
        ? Number(product.tax_percent)
        : null,
      img: assetUrl(product.img || product.thumbnail),
      category: catName.get(Number(product.category_id)) || "",

      sugarLevelId: sugarObj?.id || null,
      iceLevelId: iceObj?.id || null,
      coffeeLevelId: coffeeObj?.id || null,
    });

    setAddedId(product.id);

    setTimeout(() => {
      setAddedId(null);
    }, 1000);
  };

  /* ---------- Reusable Customization Options ---------- */

  const renderLevels = (product, field, titleKey, levels, isModal = false) => {
    if (levels.length === 0) return null;

    const customization = customizations[product.id] || {};

    return (
      <div className="space-y-2">
        <span
          className={`block font-bold text-stone-700 dark:text-stone-300 ${
            isModal ? "mb-2 text-sm" : "mb-1.5 text-xs"
          }`}
        >
          {t(titleKey)}
          <span className="ml-1 text-rose-500">*</span>
        </span>

        <div
          className={
            isModal ? "grid grid-cols-1 sm:grid-cols-2 gap-2" : "space-y-1.5"
          }
        >
          {levels.map((level) => {
            const extra = Number(level.price || 0);

            const checked = customization[field]?.id === level.id;

            return (
              <label
                key={level.id}
                className={`flex items-center gap-2 cursor-pointer text-stone-700 dark:text-stone-300 transition-colors ${
                  isModal
                    ? `rounded-xl border p-3 text-sm ${
                        checked
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                          : "border-stone-200 dark:border-stone-700 hover:border-amber-400"
                      }`
                    : "text-xs hover:text-amber-600"
                }`}
              >
                <input
                  type="radio"
                  name={`${isModal ? "modal-" : ""}${field}-${product.id}`}
                  checked={checked}
                  onChange={() =>
                    handleCustomizationChange(product.id, field, level)
                  }
                  className="accent-amber-600 cursor-pointer"
                />

                <span className="flex-1">{translateJson(level.name)}</span>

                {field === "coffee" && extra > 0 && (
                  <span
                    className={`font-semibold text-amber-600 ${
                      isModal ? "text-xs" : ""
                    }`}
                  >
                    +{formatPriceWithUSD(extra).riel}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <section id="shop" className="space-y-8">
      {/* ---------- Page Heading ---------- */}

      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-amber-600 to-amber-300 bg-clip-text text-transparent">
          {t("cafe_khmaoch_menu")}
        </h1>

        <p className="text-base text-stone-600 dark:text-stone-300 font-medium">
          {t("shop_subtitle")}
        </p>
      </div>

      {/* ---------- Search ---------- */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("cafe_khmaoch_menu")}
          </h2>

          <p className="text-sm text-stone-500 dark:text-stone-400">
            {t("shop_subtitle")}
          </p>
        </div>

        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder={t("search_drinks_pastries")}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full px-4 py-2 text-sm bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* ---------- Category Filters ---------- */}

      <div className="flex flex-wrap gap-2">
        {[{ id: "All" }, ...tabs].map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              (selectedCategory === "All" && category.id === "All") ||
              Number(selectedCategory) === Number(category.id)
                ? "bg-amber-600 text-white shadow-md"
                : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-amber-500"
            }`}
          >
            {category.id === "All" ? t("all") : translateJson(category.name)}
          </button>
        ))}
      </div>

      {/* ---------- Loading Error ---------- */}

      {loadError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-sm flex items-center justify-between">
          <span>{loadError}</span>

          <button
            type="button"
            onClick={loadMenu}
            className="font-semibold underline cursor-pointer"
          >
            {t("retry")}
          </button>
        </div>
      )}

      {/* ---------- Product Grid ---------- */}

      {loading && products.length === 0 ? (
        <div className="text-center py-16 text-stone-500 dark:text-stone-400">
          {t("loading_menu")}
        </div>
      ) : filteredProducts.length === 0 ? (
        !loadError && (
          <div className="text-center py-16 text-stone-500 dark:text-stone-400">
            <div className="text-5xl mb-3">☕</div>
            <p className="font-semibold">{t("no_items_match_search")}</p>
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
                  {/* Clickable Product Image */}

                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`View ${translateJson(product.name)} details`}
                    onClick={() => setSelectedProduct(product)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedProduct(product);
                      }
                    }}
                    className="relative h-56 overflow-hidden bg-stone-100 dark:bg-stone-800 cursor-pointer"
                  >
                    {img ? (
                      <img
                        src={img}
                        alt={translateJson(product.name)}
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

                      {translateJson(product.badge).trim() && (
                        <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white rounded-lg">
                          {translateJson(product.badge)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Product Information */}

                  <div className="p-5 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      {catName.get(Number(product.category_id)) || ""}
                    </span>

                    <h3 className="font-semibold text-stone-900 dark:text-white line-clamp-1">
                      {translateJson(product.name)}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <Stars value={rating} t={t} />

                      <span className="font-semibold text-stone-700 dark:text-stone-300">
                        {rating.toFixed(1)}
                      </span>

                      <span>
                        ({reviews} {reviews === 1 ? t("review") : t("reviews")})
                      </span>
                    </div>

                    {/* Size Options */}

                    {options.length > 1 && (
                      <SizeChips
                        options={options}
                        active={option.key}
                        t={t}
                        onPick={(key) =>
                          setPicked((previous) => ({
                            ...previous,
                            [product.id]: key,
                          }))
                        }
                      />
                    )}

                    {/* Expandable Customization Options */}

                    {hasAnyOptions && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() =>
                            setShowOptionsId(isExpanded ? null : product.id)
                          }
                          className="w-full flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400 py-1.5 px-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 transition-colors cursor-pointer"
                        >
                          <span>{t("show_more_options")}</span>

                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl space-y-3 text-xs border border-stone-200 dark:border-stone-700 animate-fadeIn">
                            {renderLevels(
                              product,
                              "sugar",
                              "sugar_level",
                              availSugar,
                            )}

                            {renderLevels(
                              product,
                              "ice",
                              "ice_level",
                              availIce,
                            )}

                            {renderLevels(
                              product,
                              "coffee",
                              "coffee_level",
                              availCoffee,
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Card Footer */}

                <div className="p-5 pt-0 flex items-center justify-between mt-auto">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-extrabold text-stone-900 dark:text-white">
                        {formatPriceWithUSD(currentDisplayPrice).riel}
                      </span>

                      {discount > 0 && (
                        <span className="text-sm line-through text-stone-400">
                          {formatPriceWithUSD(currentBasePrice).riel}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500 font-medium">
                      <span>{formatPriceWithUSD(currentDisplayPrice).usd}</span>

                      {discount > 0 && (
                        <span className="line-through">
                          {formatPriceWithUSD(currentBasePrice).usd}
                        </span>
                      )}
                    </div>
                  </div>

                  {currentUser && (
                    <button
                      type="button"
                      onClick={() => handleAdd(product)}
                      disabled={!canAdd}
                      className={`px-4 py-2 text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer ${
                        !canAdd
                          ? "bg-stone-300 dark:bg-stone-700 text-stone-500 cursor-not-allowed opacity-60"
                          : addedId === product.id
                            ? "bg-emerald-600"
                            : "bg-amber-600 hover:bg-amber-700"
                      }`}
                      title={!canAdd ? t("complete_required_levels") : ""}
                    >
                      {addedId === product.id ? t("added") : t("add_to_order")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================
          PRODUCT DETAIL MODAL
          Same layout pattern as ShopAll.jsx
      ===================================================== */}

      {selectedProduct &&
        (() => {
          const product = selectedProduct;

          const options = sizeOptions(product);

          const option =
            options.find((item) => item.key === picked[product.id]) ||
            options[0];

          if (!option) return null;

          const discount = Number(product.discount_percent || 0);

          const img = assetUrl(product.img || product.thumbnail);

          const rating =
            Number(product.rating) > 0 ? Number(product.rating) : STATIC_RATING;

          const reviews = hasValue(product.reviews)
            ? Number(product.reviews)
            : STATIC_REVIEWS;

          const prodCust = customizations[product.id] || {};

          const availSugar = availableLevels(1, sugarLevels, product);

          const availIce = availableLevels(2, iceLevels, product);

          const availCoffee = availableLevels(3, coffeeLevels, product);

          const extraCoffeePrice = Number(prodCust.coffee?.price || 0);

          const currentDisplayPrice = option.unit + extraCoffeePrice;

          const currentBasePrice = option.base + extraCoffeePrice;

          const canAdd = isCompleteCustomization(product);

          const description = translateJson(product.description);

          return (
            <div
              key={product.id}
              className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
            >
              {/* Backdrop */}

              <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onMouseDown={() => setSelectedProduct(null)}
                aria-hidden="true"
              />

              {/* Modal Container */}

              <div
                role="dialog"
                aria-modal="true"
                aria-label={translateJson(product.name)}
                onMouseDown={(event) => event.stopPropagation()}
                className="relative z-10 flex flex-col md:flex-row w-full max-w-6xl h-[90dvh] max-h-[850px] overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-stone-900 shadow-2xl"
              >
                {/* Left Image Panel */}

                <div className="relative w-full h-[35%] min-h-[180px] md:min-h-0 md:w-1/2 md:h-full shrink-0 bg-stone-100 dark:bg-stone-950">
                  {img ? (
                    <img
                      src={img}
                      alt={translateJson(product.name)}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-7xl">
                      ☕
                    </div>
                  )}

                  {/* Discount and Badge */}

                  <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                    {discount > 0 && (
                      <span className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-rose-600 text-white rounded-lg shadow-sm">
                        -{discount}%
                      </span>
                    )}

                    {translateJson(product.badge).trim() && (
                      <span className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white rounded-lg">
                        {translateJson(product.badge)}
                      </span>
                    )}
                  </div>

                  {/* Close Button */}

                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    aria-label={t("close")}
                    className="absolute top-4 right-4 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-white/90 dark:bg-stone-900/90 text-stone-800 dark:text-white shadow-md hover:bg-white dark:hover:bg-stone-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Right Details Panel */}

                <div className="flex-1 min-w-0 min-h-0 flex flex-col">
                  {/* Scrollable Details */}

                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-7">
                    {/* Category */}

                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      {catName.get(Number(product.category_id)) || ""}
                    </span>

                    {/* Title */}

                    <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-white">
                      {translateJson(product.name)}
                    </h2>

                    {/* Rating */}

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                      <Stars value={rating} t={t} />

                      <span className="font-semibold text-stone-700 dark:text-stone-300">
                        {rating.toFixed(1)}
                      </span>

                      <span>
                        ({reviews} {reviews === 1 ? t("review") : t("reviews")})
                      </span>
                    </div>

                    {/* Description */}

                    {description.trim() && (
                      <p className="mt-4 text-sm leading-6 text-stone-600 dark:text-stone-300 whitespace-pre-line">
                        {description}
                      </p>
                    )}

                    {/* Price */}

                    <div className="mt-5 py-4 border-y border-stone-200 dark:border-stone-700">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-stone-900 dark:text-white">
                          {formatPriceWithUSD(currentDisplayPrice).riel}
                        </span>

                        {discount > 0 && (
                          <span className="text-sm line-through text-stone-400">
                            {formatPriceWithUSD(currentBasePrice).riel}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-400 dark:text-stone-500 font-medium">
                        <span>
                          {formatPriceWithUSD(currentDisplayPrice).usd}
                        </span>

                        {discount > 0 && (
                          <span className="line-through">
                            {formatPriceWithUSD(currentBasePrice).usd}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Size Selection */}

                    {options.length > 0 && (
                      <div className="mt-5">
                        <h3 className="mb-2 text-sm font-bold text-stone-800 dark:text-stone-200">
                          {t("size")}
                        </h3>

                        <SizeChips
                          options={options}
                          active={option.key}
                          t={t}
                          onPick={(key) =>
                            setPicked((previous) => ({
                              ...previous,
                              [product.id]: key,
                            }))
                          }
                        />
                      </div>
                    )}

                    {/* Sugar, Ice, Coffee */}

                    <div className="mt-6 space-y-5">
                      {renderLevels(
                        product,
                        "sugar",
                        "sugar_level",
                        availSugar,
                        true,
                      )}

                      {renderLevels(
                        product,
                        "ice",
                        "ice_level",
                        availIce,
                        true,
                      )}

                      {renderLevels(
                        product,
                        "coffee",
                        "coffee_level",
                        availCoffee,
                        true,
                      )}
                    </div>
                  </div>

                  {/* Fixed Bottom Action Bar */}

                  <div className="w-full shrink-0 p-4 sm:px-6 sm:py-5 border-t border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
                    {currentUser ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!canAdd) return;

                          handleAdd(product);
                          setSelectedProduct(null);
                        }}
                        disabled={!canAdd}
                        title={!canAdd ? t("complete_required_levels") : ""}
                        className={`w-full py-3.5 px-5 rounded-xl text-sm font-bold text-white shadow-sm transition-all cursor-pointer ${
                          !canAdd
                            ? "bg-stone-300 dark:bg-stone-700 text-stone-500 cursor-not-allowed opacity-60"
                            : addedId === product.id
                              ? "bg-emerald-600"
                              : "bg-amber-600 hover:bg-amber-700"
                        }`}
                      >
                        {addedId === product.id
                          ? t("added")
                          : t("add_to_order")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(null)}
                        className="w-full py-3.5 px-5 rounded-xl text-sm font-bold text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                      >
                        {t("close")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* ---------- See Full Menu ---------- */}

      <div className="text-center">
        <button
          type="button"
          onClick={() => navigate("/shop")}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-lg transition-all cursor-pointer"
        >
          {t("see_full_menu")}
        </button>
      </div>
    </section>
  );
}
