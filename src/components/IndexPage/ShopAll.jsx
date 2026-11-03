import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import Navbar from "./Navbar";
import MobileMenu from "./MobileMenu";
import Footer from "./Footer";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext.jsx";
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
const tr = (obj, lang = "en") => {
  if (obj == null) return "";
  if (typeof obj === "object" && !Array.isArray(obj)) {
    return obj[lang] || obj.en || Object.values(obj)[0] || "";
  }
  if (typeof obj === "string") {
    try {
      const parsed = JSON.parse(obj);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed[lang] || parsed.en || Object.values(parsed)[0] || "";
      }
    } catch {
      // Plain text from the database is already displayable.
    }
    return obj;
  }
  return String(obj);
};
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

// ----------------- Unite Price ------------------------
const EXCHANGE_RATE = 4100; // 1$ = 4100៛
const formatPriceWithUSD = (rielValue) => {
  const usd = rielValue / EXCHANGE_RATE;
  // Omit decimals if it's a whole dollar amount, otherwise show 2 decimals
  const usdFormatted =
    usd % 1 === 0 ? `$${usd.toFixed(0)}` : `$${usd.toFixed(2)}`;
  return {
    riel: `${Math.round(rielValue).toLocaleString()}៛`,
    usd: `≈ ${usdFormatted}`,
  };
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-stone-900";

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

/* ---------- size picker (segmented control) ---------- */
function SizeSegment({
  options,
  active,
  onPick,
  t,
  withPrice = false,
  large = false,
}) {
  return (
    <div
      role="radiogroup"
      aria-label={t("size") !== "size" ? t("size") : "Size"}
      className={`inline-flex max-w-full rounded-xl bg-stone-100 p-1 dark:bg-stone-800 ${
        large ? "w-full" : ""
      }`}
    >
      {options.map((option) => {
        const isActive = active === option.key;
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onPick(option.key)}
            className={`min-w-0 cursor-pointer rounded-lg font-semibold transition-colors ${focusRing} ${
              large
                ? "flex flex-1 flex-col items-center px-3 py-2 text-sm"
                : "px-2.5 py-1 text-[11px]"
            } ${
              isActive
                ? "bg-white text-accent-700 shadow-sm dark:bg-stone-700 dark:text-accent-300"
                : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
            }`}
          >
            <span className="truncate">{t(option.labelKey)}</span>
            {withPrice && (
              <span
                className={`mt-0.5 text-xs font-medium ${
                  isActive
                    ? "text-accent-600 dark:text-accent-400"
                    : "text-stone-400"
                }`}
              >
                {formatPriceWithUSD(option.unit).riel}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- one group of choices in the modal (sugar / ice / coffee) ---------- */
function ChoiceGroup({
  title,
  requiredLabel,
  levels,
  selectedId,
  onPick,
  name,
  translate,
  showExtra = false,
}) {
  const selected = levels.find((level) => level.id === selectedId);

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-bold text-stone-900 dark:text-white">
          {title}
          <span className="ml-1 text-rose-500" aria-hidden="true">
            *
          </span>
        </h4>
        <span
          className={`truncate text-xs font-semibold ${
            selected
              ? "text-accent-600 dark:text-accent-400"
              : "text-stone-400 dark:text-stone-500"
          }`}
        >
          {selected ? translate(selected.name) : requiredLabel}
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label={title}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      >
        {levels.map((level) => {
          const checked = level.id === selectedId;
          const extra = showExtra ? Number(level.price || 0) : 0;
          return (
            <label key={level.id} className="relative block cursor-pointer">
              <input
                type="radio"
                name={name}
                checked={checked}
                onChange={() => onPick(level)}
                className="peer sr-only"
              />
              <span
                className={`flex h-full min-h-[44px] items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent-500 ${
                  checked
                    ? "border-accent-600 bg-accent-50 font-semibold text-accent-800 dark:border-accent-500 dark:bg-accent-950/40 dark:text-accent-200"
                    : "border-stone-200 bg-white text-stone-700 hover:border-accent-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
                }`}
              >
                <span className="min-w-0 break-words leading-snug">
                  {translate(level.name)}
                  {extra > 0 && (
                    <span className="mt-0.5 block text-[11px] font-medium text-accent-600 dark:text-accent-400">
                      +{formatPriceWithUSD(extra).riel}
                    </span>
                  )}
                </span>
                {checked && (
                  <Check className="h-4 w-4 shrink-0 text-accent-600 dark:text-accent-400" />
                )}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- product card (row on phones, tile from sm up) ---------- */
function ProductCard({
  img,
  name,
  description,
  categoryName,
  badge,
  discount,
  rating,
  reviews,
  options,
  option,
  onPick,
  price,
  basePrice,
  canAdd,
  added,
  loggedIn,
  onOpen,
  onAdd,
  t,
}) {
  const money = formatPriceWithUSD(price);
  const wasMoney = formatPriceWithUSD(basePrice);
  const moreLabel =
    t("show_more_options") !== "show_more_options"
      ? t("show_more_options")
      : "More options";

  return (
    <article className="group flex min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:border-accent-400/60 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 sm:flex-col">
      {/* photo */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={name}
        className={`relative w-28 shrink-0 self-stretch overflow-hidden bg-stone-100 dark:bg-stone-800 sm:aspect-[4/3] sm:w-full sm:self-auto ${focusRing}`}
      >
        {img ? (
          <img
            src={img}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent-50 to-stone-100 text-4xl dark:from-accent-950/40 dark:to-stone-800">
            ☕
          </span>
        )}
        {(discount > 0 || badge) && (
          <span className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-1">
            {discount > 0 && (
              <span className="rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold leading-tight text-white shadow-sm sm:px-2 sm:py-1 sm:text-xs">
                -{discount}%
              </span>
            )}
            {badge && (
              <span className="max-w-full break-words rounded-md bg-stone-900/75 px-1.5 py-0.5 text-[10px] font-bold leading-tight text-white backdrop-blur-sm sm:px-2 sm:py-1 sm:text-xs">
                {badge}
              </span>
            )}
          </span>
        )}
      </button>

      {/* details */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-4">
        <div className="min-w-0">
          {categoryName && (
            <p className="mb-0.5 truncate text-[11px] font-semibold text-accent-600 dark:text-accent-400">
              {categoryName}
            </p>
          )}
          <button
            type="button"
            onClick={onOpen}
            className={`block w-full rounded text-left ${focusRing}`}
          >
            <h3 className="line-clamp-2 break-words text-sm font-bold leading-snug text-stone-900 dark:text-white sm:text-base">
              {name}
            </h3>
          </button>
          {description && (
            <p className="mt-1 line-clamp-2 break-words text-[11px] leading-relaxed text-stone-500 dark:text-stone-400 sm:text-xs">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
          <Star
            className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
            aria-hidden="true"
          />
          <span className="font-semibold text-stone-700 dark:text-stone-200">
            {rating.toFixed(1)}
          </span>
          <span>({reviews})</span>
        </div>

        {options.length > 1 && (
          <SizeSegment
            options={options}
            active={option.key}
            onPick={onPick}
            t={t}
          />
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-base font-extrabold leading-none text-stone-900 dark:text-white sm:text-lg">
                {money.riel}
              </span>
              {discount > 0 && (
                <span className="text-[11px] text-stone-400 line-through">
                  {wasMoney.riel}
                </span>
              )}
            </div>
            <span className="mt-1 block text-[11px] font-medium text-stone-400 dark:text-stone-500">
              {money.usd}
            </span>
          </div>

          {loggedIn ? (
            canAdd ? (
              <button
                type="button"
                onClick={onAdd}
                aria-label={t("add_to_order")}
                title={t("add_to_order")}
                className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-white shadow-sm transition-colors ${focusRing} ${
                  added ? "bg-emerald-600" : "bg-accent-600 hover:bg-accent-700"
                }`}
              >
                {added ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Plus className="h-5 w-5" />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpen}
                aria-label={moreLabel}
                title={moreLabel}
                className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-accent-600 bg-accent-50 text-accent-700 transition-colors hover:bg-accent-100 dark:bg-accent-950/40 dark:text-accent-300 ${focusRing}`}
              >
                <SlidersHorizontal className="h-[18px] w-[18px]" />
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={onOpen}
              className={`shrink-0 cursor-pointer rounded px-1 py-1 text-xs font-semibold text-accent-600 underline decoration-accent-500/60 underline-offset-4 transition-colors hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300 ${focusRing}`}
            >
              {t("see_more") !== "see_more" ? t("see_more") : "See more"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function MenuSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5"
      aria-hidden="true"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="flex animate-pulse overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 sm:flex-col"
        >
          <div className="h-32 w-28 shrink-0 bg-stone-200 dark:bg-stone-800 sm:aspect-[4/3] sm:h-auto sm:w-full" />
          <div className="flex-1 space-y-3 p-4">
            <div className="h-3 w-1/3 rounded bg-stone-200 dark:bg-stone-800" />
            <div className="h-4 w-2/3 rounded bg-stone-200 dark:bg-stone-800" />
            <div className="h-3 w-full rounded bg-stone-100 dark:bg-stone-800/70" />
            <div className="h-6 w-1/2 rounded bg-stone-200 dark:bg-stone-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ShopAll() {
  const { addItem } = useCart();
  const { currentUser } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const activeLanguage = language || "en";

  // translation with an English fallback for texts that have no key yet
  const tt = (key, fallback) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };

  // Database text is stored as multilingual JSON; show the active language.
  const translateJson = useCallback(
    (value) => tr(value, activeLanguage),
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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [addedId, setAddedId] = useState(null);
  const [picked, setPicked] = useState({});
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
    () => new Map(cats.map((c) => [c.id, translateJson(c.name)])),
    [cats, translateJson],
  );

  const tabs = useMemo(() => {
    const used = new Set(items.map((p) => p.category_id));
    return cats
      .filter((c) => Number(c.status) === 1 && used.has(c.id))
      .sort(bySort);
  }, [cats, items]);

  const countByCategory = useMemo(() => {
    const counts = new Map();
    items.forEach((p) =>
      counts.set(p.category_id, (counts.get(p.category_id) || 0) + 1),
    );
    return counts;
  }, [items]);

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
      .concat([translateJson(p.name)])
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.trim().toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // "All" without a search reads like a printed menu: one section per category
  const grouped = selectedCategory === "All" && !searchTerm.trim();
  const sections = useMemo(() => {
    if (!grouped) return [];
    const result = tabs
      .map((cat) => ({
        key: cat.id,
        cat,
        list: filteredProducts.filter((p) => p.category_id === cat.id),
      }))
      .filter((section) => section.list.length > 0);
    const known = new Set(tabs.map((c) => c.id));
    const rest = filteredProducts.filter((p) => !known.has(p.category_id));
    if (rest.length) result.push({ key: "rest", cat: null, list: rest });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grouped, tabs, items, searchTerm, selectedCategory]);

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

    addItem({
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
      category: catName.get(product.category_id) || "",

      sugarLevelId: sugarObj?.id || null,
      iceLevelId: iceObj?.id || null,
      coffeeLevelId: coffeeObj?.id || null,
    });

    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1200);
  };

  // ------------------ Item Modal ----------------------
  const [selectedProduct, setSelectedProduct] = useState(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!selectedProduct) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedProduct(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedProduct]);

  /* ---------- one product card, wired to this page's state ---------- */
  const renderCard = (product) => {
    const options = sizeOptions(product);
    const option = chosenOption(product);
    const discount = Number(product.discount_percent || 0);
    const rating =
      Number(product.rating) > 0 ? Number(product.rating) : STATIC_RATING;
    const reviews = hasValue(product.reviews)
      ? Number(product.reviews)
      : STATIC_REVIEWS;
    const cust = customizations[product.id] || {};
    const extraCoffeePrice = Number(cust.coffee?.price || 0);

    return (
      <ProductCard
        key={product.id}
        img={assetUrl(product.img || product.thumbnail)}
        name={translateJson(product.name)}
        description={translateJson(product.description).trim()}
        categoryName={grouped ? "" : catName.get(product.category_id) || ""}
        badge={translateJson(product.badge).trim()}
        discount={discount}
        rating={rating}
        reviews={reviews}
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

  const gridCls =
    "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5";

  /* ================= PRODUCT DETAIL MODAL =================
     Phones and small tablets (below md): a full-screen page. The photo is the first
     thing in the scrolling area, so the choices get all the room.
     md and up: a centred window with the photo on the left. */
  const renderModal = () => {
    if (!selectedProduct) return null;

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
    const money = formatPriceWithUSD(displayPrice);
    const wasMoney = formatPriceWithUSD(basePrice);
    const canAdd = isCompleteCustomization(product);

    const rating =
      Number(product.rating) > 0 ? Number(product.rating) : STATIC_RATING;
    const reviews = hasValue(product.reviews)
      ? Number(product.reviews)
      : STATIC_REVIEWS;

    const groups = [
      {
        field: "sugar",
        title: tt("sugar_levels", "Sugar level"),
        levels: availSugar,
        extra: false,
      },
      {
        field: "ice",
        title: tt("ice_levels", "Ice level"),
        levels: availIce,
        extra: false,
      },
      {
        field: "coffee",
        title: tt("coffee_levels", "Coffee level"),
        levels: availCoffee,
        extra: true,
      },
    ].filter((group) => group.levels.length > 0);

    const missing = groups.filter((group) => !cust[group.field]);
    const productName = translateJson(product.name);
    const description = translateJson(product.description).trim();
    const badge = translateJson(product.badge).trim();
    const categoryLabel = catName.get(product.category_id) || "";
    const closeLabel = tt("close", "Close");
    const completeHint = tt(
      "complete_required_levels",
      "Choose all required options first",
    );

    // The photo sits on a blurred copy of itself, so product shots (often on white,
    // often tall) are shown whole instead of being cropped.
    const photo = (
      <div className="relative h-full w-full overflow-hidden bg-stone-100 dark:bg-stone-950">
        {img ? (
          <>
            <img
              src={img}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-2xl dark:opacity-40"
            />
            <img
              src={img}
              alt={productName}
              className="relative h-full w-full object-contain p-3 sm:p-5"
            />
          </>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent-50 to-stone-100 text-7xl dark:from-accent-950/40 dark:to-stone-900">
            ☕
          </span>
        )}

        {(discount > 0 || badge) && (
          <span className="absolute left-4 top-4 flex flex-wrap gap-2">
            {discount > 0 && (
              <span className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-bold text-white shadow-sm">
                -{discount}%
              </span>
            )}
            {badge && (
              <span className="rounded-lg bg-stone-900/75 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
                {badge}
              </span>
            )}
          </span>
        )}
      </div>
    );

    return (
      <div
        className="fixed inset-0 z-[100] flex md:items-center md:justify-center md:p-6"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedProduct(null);
        }}
      >
        {/* backdrop (only visible around the centred window) */}
        <div className="menu-fade-in absolute inset-0 bg-stone-950/70 backdrop-blur-sm" />

        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={productName}
          onMouseDown={(event) => event.stopPropagation()}
          className="menu-sheet-in relative z-10 flex h-dvh w-full flex-col overflow-hidden bg-white outline-none dark:bg-stone-900 md:h-[88dvh] md:max-h-[780px] md:max-w-5xl md:flex-row md:rounded-3xl md:shadow-2xl"
        >
          {/* photo pane (md and up) */}
          <div className="relative hidden shrink-0 md:block md:w-5/12">
            {photo}
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* page bar (below md): back button + category */}
            <div className="flex shrink-0 items-center gap-1 border-b border-stone-200 bg-white px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] dark:border-stone-800 dark:bg-stone-900 md:hidden">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                aria-label={closeLabel}
                className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-stone-700 transition-colors hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800 ${focusRing}`}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <span className="min-w-0 truncate text-sm font-semibold text-accent-600 dark:text-accent-400">
                {categoryLabel}
              </span>
            </div>

            {/* window header (md and up) */}
            <div className="hidden shrink-0 items-center justify-between gap-3 border-b border-stone-100 px-6 py-4 dark:border-stone-800 md:flex">
              <span className="truncate text-sm font-semibold text-accent-600 dark:text-accent-400">
                {categoryLabel}
              </span>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                aria-label={closeLabel}
                className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-white ${focusRing}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* everything scrolls together: photo first on small screens */}
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="relative h-[min(20rem,40dvh)] md:hidden">
                {photo}
              </div>

              <div className="space-y-6 p-5 sm:p-6">
                <div className="space-y-3">
                  <h2 className="break-words text-2xl font-extrabold leading-tight text-stone-900 dark:text-white sm:text-3xl">
                    {productName}
                  </h2>

                  <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
                    <Stars value={rating} t={t} />
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      {rating.toFixed(1)}
                    </span>
                    <span>
                      ({reviews} {reviews === 1 ? t("review") : t("reviews")})
                    </span>
                  </div>

                  {description && (
                    <p className="whitespace-pre-line text-sm leading-7 text-stone-600 dark:text-stone-300">
                      {description}
                    </p>
                  )}
                </div>

                {options.length > 1 && (
                  <div className="space-y-2.5">
                    <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                      {tt("size", "Size")}
                    </h4>
                    <SizeSegment
                      options={options}
                      active={option.key}
                      t={t}
                      large
                      withPrice
                      onPick={(key) =>
                        setPicked((prev) => ({ ...prev, [product.id]: key }))
                      }
                    />
                  </div>
                )}

                {groups.length > 0 && (
                  <div className="space-y-6">
                    {groups.map((group) => (
                      <ChoiceGroup
                        key={group.field}
                        title={group.title}
                        requiredLabel={tt("required", "Required")}
                        levels={group.levels}
                        selectedId={cust[group.field]?.id}
                        name={`modal-${group.field}-${product.id}`}
                        translate={translateJson}
                        showExtra={group.extra}
                        onPick={(level) =>
                          handleCustomizationChange(
                            product.id,
                            group.field,
                            level,
                          )
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* total + add: always visible at the bottom */}
            <div className="shrink-0 space-y-3 border-t border-stone-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 dark:border-stone-800 dark:bg-stone-900 sm:px-6 md:pb-5">
              {currentUser && !canAdd && (
                <p
                  className="text-xs font-medium text-accent-700 dark:text-accent-300"
                  role="status"
                >
                  {completeHint}
                  {missing.length > 0 && (
                    <span className="font-semibold">
                      {" "}
                      ({missing.map((group) => group.title).join(", ")})
                    </span>
                  )}
                </p>
              )}

              <div className="flex items-center gap-4">
                <div className="min-w-0 shrink-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-xl font-extrabold leading-none text-stone-900 dark:text-white sm:text-2xl">
                      {money.riel}
                    </span>
                    {discount > 0 && (
                      <span className="text-xs text-stone-400 line-through">
                        {wasMoney.riel}
                      </span>
                    )}
                  </div>
                  <span className="mt-1 block text-xs font-medium text-stone-400 dark:text-stone-500">
                    {money.usd}
                  </span>
                </div>

                {currentUser ? (
                  <button
                    type="button"
                    disabled={!canAdd}
                    onClick={() => {
                      if (!isCompleteCustomization(product)) return;
                      handleAdd(product);
                      setSelectedProduct(null);
                    }}
                    title={!canAdd ? completeHint : ""}
                    className={`flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white transition-colors ${focusRing} ${
                      canAdd
                        ? "cursor-pointer bg-accent-600 hover:bg-accent-700"
                        : "cursor-not-allowed bg-stone-300 text-stone-500 dark:bg-stone-700 dark:text-stone-400"
                    }`}
                  >
                    <Plus className="h-5 w-5 shrink-0" />
                    <span className="truncate">{t("add_to_order")}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className={`flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-xl bg-accent-600 px-5 text-sm font-bold text-white transition-colors hover:bg-accent-700 ${focusRing}`}
                  >
                    <span className="truncate">
                      {tt("login_to_order", "Log in to order")}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 transition-colors duration-300 dark:bg-stone-950 dark:text-stone-100">
      <style>{`
        @keyframes menuFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes menuSheetIn {
          from { opacity: 0; transform: translateY(24px) }
          to { opacity: 1; transform: translateY(0) }
        }
        .menu-fade-in { animation: menuFadeIn .18s ease-out both }
        .menu-sheet-in { animation: menuSheetIn .24s cubic-bezier(.2,.8,.2,1) both }
        @media (prefers-reduced-motion: reduce) {
          .menu-fade-in, .menu-sheet-in { animation: none }
        }
      `}</style>

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

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pt-10">
        <section id="shop" className="scroll-mt-24">
          {/* title + search */}
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                {t("cafe_khmaoch_menu")}
              </h1>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                {t("shop_all_subtitle")}
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder={t("search_drinks_pastries")}
                aria-label={t("search_drinks_pastries")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-10 text-sm shadow-sm outline-none transition placeholder:text-stone-400 focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15 dark:border-stone-800 dark:bg-stone-900 [&::-webkit-search-cancel-button]:hidden"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label={tt("clear_search", "Clear search")}
                  className={`absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200 ${focusRing}`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* category tabs: stay visible while scrolling the menu */}
          <div className="sticky top-16 z-30 -mx-4 mt-6 border-b border-stone-200/80 bg-stone-50/90 px-4 backdrop-blur-md dark:border-stone-800 dark:bg-stone-950/90 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div
              role="tablist"
              aria-label={t("cafe_khmaoch_menu")}
              className="menu-category-scrollbar flex gap-2 overflow-x-auto overflow-y-hidden py-3"
            >
              {[{ id: "All", name: null }, ...tabs].map((cat) => {
                const active = selectedCategory === cat.id;
                const count =
                  cat.id === "All"
                    ? items.length
                    : countByCategory.get(cat.id) || 0;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${focusRing} ${
                      active
                        ? "bg-accent-600 text-white shadow-sm"
                        : "border border-stone-200 bg-white text-stone-600 hover:border-accent-500 hover:text-accent-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:text-accent-300"
                    }`}
                  >
                    {cat.id === "All" ? t("all") : translateJson(cat.name)}

                    <span
                      className={`rounded-full px-1.5 text-[11px] font-bold leading-5 ${
                        active
                          ? "bg-white/25 text-white"
                          : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {loadError && (
            <div
              role="alert"
              className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
            >
              <span className="min-w-0 break-words">
                {loadError === "could_not_load_menu_options"
                  ? t("could_not_load_menu_options")
                  : loadError}
              </span>
              <button
                type="button"
                onClick={loadMenu}
                className="shrink-0 cursor-pointer font-semibold underline"
              >
                {t("retry")}
              </button>
            </div>
          )}

          <div className="mt-6" aria-busy={loading}>
            {loading && products.length === 0 ? (
              <>
                <p className="sr-only">{t("loading_menu")}</p>
                <MenuSkeleton />
              </>
            ) : filteredProducts.length === 0 ? (
              !loadError && (
                <div className="rounded-2xl border border-dashed border-stone-300 px-6 py-16 text-center dark:border-stone-700">
                  <div className="text-5xl" aria-hidden="true">
                    ☕
                  </div>
                  <p className="mt-3 font-semibold text-stone-700 dark:text-stone-200">
                    {t("no_items_match_search")}
                  </p>
                  {(searchTerm || selectedCategory !== "All") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedCategory("All");
                      }}
                      className={`mt-4 cursor-pointer rounded-xl border border-accent-600 px-4 py-2 text-sm font-semibold text-accent-700 transition-colors hover:bg-accent-50 dark:text-accent-300 dark:hover:bg-accent-950/30 ${focusRing}`}
                    >
                      {tt("show_full_menu", "Show the full menu")}
                    </button>
                  )}
                </div>
              )
            ) : grouped ? (
              <div className="space-y-12">
                {sections.map((section) => (
                  <section
                    key={section.key}
                    aria-labelledby={`menu-${section.key}`}
                  >
                    {section.cat && (
                      <div className="mb-5">
                        <div className="flex items-center gap-4">
                          <h2
                            id={`menu-${section.key}`}
                            className="shrink-0 text-xl font-extrabold tracking-tight sm:text-2xl"
                          >
                            {translateJson(section.cat.name)}
                          </h2>
                          <span
                            className="h-px flex-1 bg-stone-200 dark:bg-stone-800"
                            aria-hidden="true"
                          />
                          <span className="shrink-0 text-sm font-semibold text-stone-400">
                            {section.list.length}
                          </span>
                        </div>
                        {translateJson(section.cat.description).trim() && (
                          <p className="mt-1.5 max-w-2xl text-sm text-stone-500 dark:text-stone-400">
                            {translateJson(section.cat.description)}
                          </p>
                        )}
                      </div>
                    )}
                    <div className={gridCls}>
                      {section.list.map(renderCard)}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className={gridCls}>{filteredProducts.map(renderCard)}</div>
            )}
          </div>
        </section>

        {renderModal()}
      </main>

      <Footer />
    </div>
  );
}
