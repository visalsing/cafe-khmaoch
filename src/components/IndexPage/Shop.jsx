import React, { useCallback, useEffect, useId, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { usePageLoading } from "../../context/PageLoadingContext.jsx";
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

function SizeChips({ options, active, onPick, t, compact = false }) {
  return (
    <div className={`flex flex-wrap ${compact ? "gap-1 pt-0.5" : "gap-1.5 pt-1"}`}>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onPick(option.key)}
          className={`${compact ? "!px-2 !py-0.5 !text-[10px] !leading-tight !min-h-0 !h-auto !rounded-md" : "px-3 py-1 text-xs rounded-lg"} font-semibold border transition-colors cursor-pointer ${
            active === option.key
              ? "bg-accent-600 border-accent-600 text-white"
              : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-accent-500"
          }`}
          style={compact ? { padding: "3px 8px", fontSize: "10px", lineHeight: 1.2, minHeight: 0, height: "auto" } : undefined}
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
  const { registerLoading, finishLoading } = usePageLoading();
  const menuRequestId = useRef(0);

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
    const taskKey = `shop-menu-data-${++menuRequestId.current}`;

    registerLoading(taskKey);
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
      finishLoading(taskKey);
    }
  }, [registerLoading, finishLoading]);

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
                          ? "border-accent-500 bg-accent-50 dark:bg-accent-950/30"
                          : "border-stone-200 dark:border-stone-700 hover:border-accent-400"
                      }`
                    : "text-xs hover:text-accent-600"
                }`}
              >
                <input
                  type="radio"
                  name={`${isModal ? "modal-" : ""}${field}-${product.id}`}
                  checked={checked}
                  onChange={() =>
                    handleCustomizationChange(product.id, field, level)
                  }
                  className="accent-accent-600 cursor-pointer"
                />

                <span className="flex-1">{translateJson(level.name)}</span>

                {field === "coffee" && extra > 0 && (
                  <span
                    className={`font-semibold text-accent-600 ${
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
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-accent-600 to-accent-300 bg-clip-text text-transparent">
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
            className="w-full px-4 py-2 text-sm bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:border-accent-500"
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
                ? "bg-accent-600 text-white shadow-md"
                : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-accent-500"
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
        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
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
              <React.Fragment key={product.id}>
                {/* Compact horizontal product card for phones and small tablets */}
                <article className="lg:hidden group flex min-w-0 items-stretch overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm transition-shadow hover:shadow-md">
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(product)}
                    aria-label={`View ${translateJson(product.name)} details`}
                    className="relative w-[34%] min-w-[100px] sm:w-36 md:w-40 shrink-0 self-stretch overflow-hidden bg-stone-100 dark:bg-stone-800 text-left"
                  >
                    {img ? (
                      <img src={img} alt={translateJson(product.name)} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-4xl">☕</span>
                    )}
                    <span className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10 pointer-events-none" />
                    <span className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-1">
                      {discount > 0 && (
                        <span className="rounded-md bg-rose-600/95 px-2 py-1 text-[10px] font-bold leading-tight text-white">-{discount}%</span>
                      )}
                      {translateJson(product.badge).trim() && (
                        <span className="max-w-full break-words rounded-md bg-black/65 px-2 py-1 text-[10px] font-bold leading-tight text-white">{translateJson(product.badge)}</span>
                      )}
                    </span>
                  </button>

                  <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5 p-2 sm:p-2.5">
                    {catName.get(Number(product.category_id)) && (
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-accent-600 dark:text-accent-400">{catName.get(Number(product.category_id))}</span>
                    )}
                    <div className="w-full min-w-0">
                      <h3 className="break-words text-xs sm:text-sm font-bold leading-snug text-stone-900 dark:text-white">{translateJson(product.name)}</h3>
                      {translateJson(product.description).trim() && (
                        <p className="mt-0.5 break-words whitespace-pre-line line-clamp-2 text-[10px] sm:text-[11px] leading-snug text-stone-500 dark:text-stone-400">{translateJson(product.description)}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                      <Stars value={rating} className="h-3 w-3" t={t} />
                      <span className="text-[10px] font-semibold text-stone-700 dark:text-stone-300">{rating.toFixed(1)}</span>
                      <span className="text-[10px]">({reviews})</span>
                    </div>
                    {options.length > 1 && (
                      <div className="w-full min-w-0">
                        <SizeChips options={options} active={option.key} t={t} compact onPick={(key) => setPicked((previous) => ({ ...previous, [product.id]: key }))} />
                      </div>
                    )}
                    <div className="mt-auto flex w-full min-w-0 flex-wrap items-end justify-between gap-2 pt-1">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="text-xs sm:text-sm font-extrabold text-stone-900 dark:text-white">{formatPriceWithUSD(currentDisplayPrice).riel}</span>
                          {discount > 0 && <span className="text-[10px] line-through text-stone-400">{formatPriceWithUSD(currentBasePrice).riel}</span>}
                        </div>
                        <div className="text-[10px] font-medium text-stone-400 dark:text-stone-500">{formatPriceWithUSD(currentDisplayPrice).usd}</div>
                      </div>
                      <button type="button" onClick={() => setSelectedProduct(product)} className="shrink-0 !m-0 !min-h-0 !h-auto !w-auto !border-0 !bg-transparent !px-0 !py-0 !text-[10px] sm:!text-[11px] !font-medium !leading-tight text-accent-600 dark:text-accent-400 underline underline-offset-2 decoration-accent-500/70 hover:text-accent-700 dark:hover:text-accent-300 transition-colors focus:outline-none focus:ring-1 focus:ring-accent-500 rounded" style={{ padding: 0, margin: 0, minHeight: 0, height: "auto", width: "auto", fontSize: "10px", lineHeight: 1.2, background: "transparent", border: 0 }}>
                        {t("see_more") && t("see_more") !== "see_more" ? t("see_more") : "See more"}
                      </button>
                    </div>
                  </div>
                </article>

                {/* Original desktop product card */}
                <div
                className="hidden lg:flex group relative bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 hover:shadow-xl hover:border-accent-500/50 transition-all duration-300 flex-col justify-between overflow-hidden"
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
                    <span className="text-xs font-bold uppercase tracking-wider text-accent-600 dark:text-accent-400">
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
                          className="w-full flex items-center justify-between text-xs font-semibold text-accent-600 dark:text-accent-400 py-1.5 px-3 rounded-lg bg-accent-50 dark:bg-accent-950/30 hover:bg-accent-100 transition-colors cursor-pointer"
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
                            : "bg-accent-600 hover:bg-accent-700"
                      }`}
                      title={!canAdd ? t("complete_required_levels") : ""}
                    >
                      {addedId === product.id ? t("added") : t("add_to_order")}
                    </button>
                  )}
                </div>
              </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* ================= PRODUCT DETAIL MODAL ================= */}
        {selectedProduct &&
          (() => {
            const product = selectedProduct;
            const options = sizeOptions(product);
            const option = chosenOption(product);
            const discount = Number(product.discount_percent || 0);
            const img = assetUrl(product.img || product.thumbnail);
            const cust = customizations[product.id] || {};

            const availSugar = availableLevels(1, sugarLevels, product);
            const availIce = availableLevels(2, iceLevels, product);
            const availCoffee = availableLevels(3, coffeeLevels, product);

            const extraCoffeePrice = Number(cust.coffee?.price || 0);
            const displayPrice = option.unit + extraCoffeePrice;
            const basePrice = option.base + extraCoffeePrice;
            const canAdd = isCompleteCustomization(product);

            const renderLevels = (titleKey, field, levels) => {
              if (!levels.length) return null;

              return (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                    {t(titleKey)}
                    <span className="ml-1 text-rose-500">*</span>
                  </h4>

                  <div className="space-y-2">
                    {levels.map((level) => {
                      const extra =
                        field === "coffee" ? Number(level.price || 0) : 0;

                      return (
                        <label
                          key={level.id}
                          className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-accent-500 transition-colors cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={`modal-${field}-${product.id}`}
                            checked={cust[field]?.id === level.id}
                            onChange={() =>
                              handleCustomizationChange(
                                product.id,
                                field,
                                level,
                              )
                            }
                            className="accent-accent-600"
                          />

                          <span className="flex-1 text-sm text-stone-700 dark:text-stone-300">
                            {translateJson(level.name)}
                          </span>

                          {extra > 0 && (
                            <span className="text-xs font-semibold text-accent-600">
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

            return (
              <div
                className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    setSelectedProduct(null);
                  }
                }}
              >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

                {/* Modal window */}
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label={translateJson(product.name)}
                  onMouseDown={(event) => event.stopPropagation()}
                  className="relative z-10 flex flex-col md:flex-row w-full max-w-6xl h-[90dvh] max-h-[850px] overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-stone-900 shadow-2xl"
                >
                  {/* LEFT: PRODUCT IMAGE */}
                  <div className="relative shrink-0 w-full h-[35%] min-h-[180px] md:min-h-0 md:w-1/2 md:h-full flex items-center justify-center bg-stone-100 dark:bg-stone-950">
                    {img ? (
                      <img
                        src={img}
                        alt={translateJson(product.name)}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-7xl">☕</div>
                    )}

                    {discount > 0 && (
                      <span className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-sm font-bold">
                        -{discount}%
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedProduct(null)}
                      aria-label="Close product details"
                      className="absolute top-3 right-3 md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-white/90 dark:bg-stone-900/90 text-stone-800 dark:text-white shadow-md"
                    >
                      <span className="text-2xl leading-none">&times;</span>
                    </button>
                  </div>

                  {/* RIGHT: PRODUCT INFORMATION */}
                  <div className="flex flex-col flex-1 min-w-0 min-h-0">
                    {/* Header */}
                    <div className="shrink-0 flex items-center justify-between gap-3 p-5 sm:p-6 border-b border-stone-200 dark:border-stone-800">
                      <span className="text-xs font-bold uppercase tracking-wider text-accent-600 dark:text-accent-400">
                        {catName.get(product.category_id) || ""}
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedProduct(null)}
                        aria-label="Close product details"
                        className="hidden md:flex items-center justify-center w-9 h-9 rounded-full text-stone-500 hover:text-white hover:bg-rose-500 transition-colors"
                      >
                        <span className="text-2xl leading-none">&times;</span>
                      </button>
                    </div>

                    {/* Scrollable details */}
                    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-6">
                      <div className="space-y-3">
                        <h2 className="text-2xl sm:text-3xl font-extrabold break-words text-stone-900 dark:text-white">
                          {translateJson(product.name)}
                        </h2>

                        {translateJson(product.badge).trim() && (
                          <span className="inline-flex px-3 py-1 rounded-lg bg-accent-100 dark:bg-accent-950/50 text-accent-700 dark:text-accent-300 text-xs font-bold">
                            {translateJson(product.badge)}
                          </span>
                        )}

                        <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
                          <Stars
                            value={
                              Number(product.rating) > 0
                                ? Number(product.rating)
                                : STATIC_RATING
                            }
                            t={t}
                          />

                          <span className="font-semibold text-stone-800 dark:text-stone-200">
                            {(Number(product.rating) > 0
                              ? Number(product.rating)
                              : STATIC_RATING
                            ).toFixed(1)}
                          </span>

                          <span>
                            (
                            {hasValue(product.reviews)
                              ? Number(product.reviews)
                              : STATIC_REVIEWS}{" "}
                            {Number(
                              hasValue(product.reviews)
                                ? product.reviews
                                : STATIC_REVIEWS,
                            ) === 1
                              ? t("review")
                              : t("reviews")}
                            )
                          </span>
                        </div>
                      </div>

                      {/* Optional product description */}
                      {translateJson(product.description).trim() && (
                        <p className="text-sm leading-7 whitespace-pre-line text-stone-600 dark:text-stone-300">
                          {translateJson(product.description)}
                        </p>
                      )}

                      {/* Price */}
                      <div className="p-4 rounded-xl bg-accent-50 dark:bg-accent-950/30 border border-accent-100 dark:border-accent-900/50">
                        <div className="flex flex-wrap items-baseline gap-3">
                          <span className="text-2xl font-extrabold text-stone-900 dark:text-white">
                            {formatPriceWithUSD(displayPrice).riel}
                          </span>

                          {discount > 0 && (
                            <span className="text-sm line-through text-stone-400">
                              {formatPriceWithUSD(basePrice).riel}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                          {formatPriceWithUSD(displayPrice).usd}
                        </p>
                      </div>

                      {/* Size choices */}
                      {options.length > 1 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                            {t("size") || "Size"}
                          </h4>

                          <SizeChips
                            options={options}
                            active={option.key}
                            t={t}
                            onPick={(key) =>
                              setPicked((prev) => ({
                                ...prev,
                                [product.id]: key,
                              }))
                            }
                          />
                        </div>
                      )}

                      {/* Drink customizations */}
                      {(availSugar.length > 0 ||
                        availIce.length > 0 ||
                        availCoffee.length > 0) && (
                        <div className="space-y-5">
                          <h3 className="text-lg font-bold text-stone-900 dark:text-white">
                            {t("show_more_options")}
                          </h3>

                          {renderLevels("sugar_level", "sugar", availSugar)}
                          {renderLevels("ice_level", "ice", availIce)}
                          {renderLevels("coffee_level", "coffee", availCoffee)}
                        </div>
                      )}

                      <div className="h-1" />
                    </div>

                    {/* Fixed bottom action */}
                    <div className="shrink-0 p-4 sm:p-6 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
                      {currentUser ? (
                        <button
                          type="button"
                          disabled={!canAdd}
                          onClick={() => {
                            if (!isCompleteCustomization(product)) return;

                            handleAdd(product);
                            setSelectedProduct(null);
                          }}
                          className={`w-full py-3.5 px-5 rounded-xl text-sm font-bold text-white transition-colors ${
                            !canAdd
                              ? "bg-stone-300 dark:bg-stone-700 text-stone-500 cursor-not-allowed"
                              : "bg-accent-600 hover:bg-accent-700"
                          }`}
                          title={!canAdd ? t("complete_required_levels") : ""}
                        >
                          {t("add_to_order")}
                        </button>
                      ) : (
                        <p className="text-center text-sm text-stone-500 dark:text-stone-400">
                          {t("login_to_order") ||
                            "Please log in to add items to your order."}
                        </p>
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
          className="px-6 py-3 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-xl shadow-lg transition-all cursor-pointer"
        >
          {t("see_full_menu")}
        </button>
      </div>
    </section>
  );
}
