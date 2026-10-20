import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext.jsx";
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
const HOME_LIMIT = 6; // maximum products shown on the home page
const bySort = (a, b) => a.sort_num - b.sort_num || a.id - b.id;
const asList = (d) =>
  Array.isArray(d) ? d : d?.items || d?.rows || d?.data || [];

const STATIC_RATING = 4.5;
const STATIC_REVIEWS = 120;

const SIZE_DEFS = [
  { key: "price", labelKey: "regular", field: "price" },
  { key: "big", labelKey: "big", field: "big_size_price" },
  { key: "small", labelKey: "small", field: "small_size_price" },
];
const hasValue = (v) => v !== null && v !== undefined && v !== "";
const unitPrice = (base, pct) =>
  Math.round(
    (Math.round(Number(base) * 100) * (100 - Number(pct || 0))) / 100,
  ) / 100;
const sizeOptions = (p) =>
  SIZE_DEFS.filter((s) => hasValue(p[s.field])).map((s) => ({
    key: s.key,
    labelKey: s.labelKey,
    base: Number(p[s.field]),
    unit: unitPrice(p[s.field], p.discount_percent),
  }));

/* ---------- 5 stars component ---------- */
const STAR_PATH =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";
function Stars({ value = 0, className = "w-4 h-4", t }) {
  const uid = useId().replace(/:/g, "");
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`${v.toFixed(1)} ${t("out_of_5_stars")}`}
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

function SizeChips({ options, active, onPick, t }) {
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
          {t(o.labelKey)}
        </button>
      ))}
    </div>
  );
}

// ----------------- Unit Price ------------------------
const EXCHANGE_RATE = 4100; // 1$ = 4100៛
const formatPriceWithUSD = (rielValue) => {
  const usd = rielValue / EXCHANGE_RATE;
  const usdFormatted =
    usd % 1 === 0 ? `$${usd.toFixed(0)}` : `$${usd.toFixed(2)}`;
  return {
    riel: `${Math.round(rielValue).toLocaleString()}៛`,
    usd: `≈ ${usdFormatted}`,
  };
};

export default function Shop({
  selectedCategory,
  setSelectedCategory,
  searchTerm,
  setSearchTerm,
  onAddToCart,
}) {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const activeLanguage = language || "en";

  // Database fields such as name and badge are stored as multilingual JSON.
  const translateJson = useCallback(
    (value) => {
      if (value === null || value === undefined || value === "") return "";

      if (typeof value === "object" && !Array.isArray(value)) {
        return value[activeLanguage] || value.en || Object.values(value)[0] || "";
      }

      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed[activeLanguage] || parsed.en || Object.values(parsed)[0] || "";
          }
        } catch {
          // Ordinary text is returned unchanged.
        }
        return value;
      }

      return String(value);
    },
    [activeLanguage],
  );

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
      setLoadError(err.message || "could_not_load_menu_options");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
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
    () => new Map(cats.map((c) => [Number(c.id), translateJson(c.name)])),
    [cats, translateJson],
  );

  const tabs = useMemo(() => {
    const used = new Set(items.map((p) => Number(p.category_id)));
    return cats
      .filter((c) => Number(c.status) === 1 && used.has(Number(c.id)))
      .sort(bySort);
  }, [cats, items]);

  useEffect(() => {
    if (
      selectedCategory !== "All" &&
      !tabs.some((c) => Number(c.id) === Number(selectedCategory))
    )
      setSelectedCategory("All");
  }, [tabs, selectedCategory, setSelectedCategory]);

  const filteredProducts = items
    .filter((p) => {
      const matchesCategory =
        selectedCategory === "All" ||
        Number(p.category_id) === Number(selectedCategory);
      const matchesSearch = Object.values(p.name || {})
        .join(" ")
        .toLowerCase()
        .includes((searchTerm || "").toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .slice(0, HOME_LIMIT);

  const chosenOption = (p) => {
    const options = sizeOptions(p);
    return options.find((o) => o.key === picked[p.id]) || options[0];
  };

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
    });

    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1000);
  };

  return (
    <section id="shop" className="space-y-8">
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
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 text-sm bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[{ id: "All" }, ...tabs].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              (selectedCategory === "All" && cat.id === "All") ||
              Number(selectedCategory) === Number(cat.id)
                ? "bg-amber-600 text-white shadow-md"
                : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-amber-500"
            }`}
          >
            {cat.id === "All" ? t("all") : translateJson(cat.name)}
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
            {t("retry")}
          </button>
        </div>
      )}

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
                  <div className="relative h-56 overflow-hidden bg-stone-100 dark:bg-stone-800">
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
                  <div className="p-5 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      {catName.get(product.category_id)}
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
                    {options.length > 1 && (
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
                          <span>{t("show_more_options")}</span>
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
                                  {t("sugar_level")} 
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
                                        checked={prodCust.sugar?.id === sug.id}
                                        onChange={() =>
                                          handleCustomizationChange(
                                            product.id,
                                            "sugar",
                                            sug,
                                          )
                                        }
                                        className="accent-amber-600 cursor-pointer"
                                      />
                                      <span>{translateJson(sug.name)}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Ice Level */}
                            {availIce.length > 0 && (
                              <div>
                                <span className="font-bold text-stone-700 dark:text-stone-300 block mb-1.5">
                                  {t("ice_level")} 
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
                                        checked={prodCust.ice?.id === ice.id}
                                        onChange={() =>
                                          handleCustomizationChange(
                                            product.id,
                                            "ice",
                                            ice,
                                          )
                                        }
                                        className="accent-amber-600 cursor-pointer"
                                      />
                                      <span>{translateJson(ice.name)}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Coffee Level */}
                            {availCoffee.length > 0 && (
                              <div>
                                <span className="font-bold text-stone-700 dark:text-stone-300 block mb-1.5">
                                  {t("coffee_level")} 
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
                                          {translateJson(cof.name)}
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
                        ? t("complete_required_levels")
                        : ""
                    }
                  >
                    {addedId === product.id ? t("added") : t("add_to_order")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="text-center">
        <button
          onClick={() => navigate("/shop")}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-lg transition-all cursor-pointer"
        >
          {t("see_full_menu")}
        </button>
      </div>
    </section>
  );
}