import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
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
import {
  ProductCard,
  ProductModal,
  MenuSkeleton,
  MenuStyles,
  STATIC_RATING,
  STATIC_REVIEWS,
} from "./MenuParts.jsx";

/* ---------- Helpers ---------- */

const HOME_LIMIT = 6;

const bySort = (a, b) =>
  Number(a.sort_num || 0) - Number(b.sort_num || 0) ||
  Number(a.id || 0) - Number(b.id || 0);

const asList = (data) =>
  Array.isArray(data) ? data : data?.items || data?.rows || data?.data || [];

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

  // product ID -> { sugar, ice, coffee }
  const [customizations, setCustomizations] = useState({});

  // Product-detail modal
  const [selectedProduct, setSelectedProduct] = useState(null);

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
    }, 1200);
  };

  /* ---------- One product card, wired to this section's state ---------- */

  const renderCard = (product) => {
    const options = sizeOptions(product);
    const option = chosenOption(product);
    const customization = customizations[product.id] || {};
    const extraCoffeePrice = Number(customization.coffee?.price || 0);

    return (
      <ProductCard
        key={product.id}
        img={assetUrl(product.img || product.thumbnail)}
        name={translateJson(product.name)}
        description={translateJson(product.description).trim()}
        categoryName={catName.get(Number(product.category_id)) || ""}
        badge={translateJson(product.badge).trim()}
        discount={Number(product.discount_percent || 0)}
        rating={
          Number(product.rating) > 0 ? Number(product.rating) : STATIC_RATING
        }
        reviews={
          hasValue(product.reviews) ? Number(product.reviews) : STATIC_REVIEWS
        }
        options={options}
        option={option}
        onPick={(key) =>
          setPicked((previous) => ({ ...previous, [product.id]: key }))
        }
        price={option.unit + extraCoffeePrice}
        basePrice={option.base + extraCoffeePrice}
        canAdd={isCompleteCustomization(product)}
        added={addedId === product.id}
        loggedIn={Boolean(currentUser)}
        onOpen={() => setSelectedProduct(product)}
        onAdd={() => handleAdd(product)}
        t={t}
      />
    );
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <section id="shop" className="space-y-8 scroll-mt-24">
      <MenuStyles />

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
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-sm flex items-center justify-between"
        >
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
        <>
          <p className="sr-only">{t("loading_menu")}</p>
          <MenuSkeleton count={HOME_LIMIT} />
        </>
      ) : filteredProducts.length === 0 ? (
        !loadError && (
          <div className="text-center py-16 text-stone-500 dark:text-stone-400">
            <div className="text-5xl mb-3">☕</div>
            <p className="font-semibold">{t("no_items_match_search")}</p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5">
          {filteredProducts.map(renderCard)}
        </div>
      )}

      {/* ================= PRODUCT DETAIL MODAL ================= */}

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          img={assetUrl(selectedProduct.img || selectedProduct.thumbnail)}
          onClose={() => setSelectedProduct(null)}
          t={t}
          translateJson={translateJson}
          categoryLabel={
            catName.get(Number(selectedProduct.category_id)) || ""
          }
          loggedIn={Boolean(currentUser)}
          onLogin={() => navigate("/login")}
          options={sizeOptions(selectedProduct)}
          option={chosenOption(selectedProduct)}
          onPickSize={(key) =>
            setPicked((previous) => ({
              ...previous,
              [selectedProduct.id]: key,
            }))
          }
          availSugar={availableLevels(1, sugarLevels, selectedProduct)}
          availIce={availableLevels(2, iceLevels, selectedProduct)}
          availCoffee={availableLevels(3, coffeeLevels, selectedProduct)}
          customization={customizations[selectedProduct.id] || {}}
          onPickLevel={(field, level) =>
            handleCustomizationChange(selectedProduct.id, field, level)
          }
          canAdd={isCompleteCustomization(selectedProduct)}
          onAdd={() => handleAdd(selectedProduct)}
        />
      )}

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