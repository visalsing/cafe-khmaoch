import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Minus,
  X,
  Banknote,
  CreditCard,
  QrCode,
  Pause,
  Play,
  Bell,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import {
  categoryService,
  drinksTypesService,
  productService,
  orderService,
  sugarLevelService,
  iceLevelService,
  coffeeLevelService,
  levelsOptionsService,
  assetUrl,
} from "../../services/api";
import { calcTotals, round2 } from "../../utils/orderCalc";
import { asList, bySort } from "./Shared.jsx";
import ReceiptModal from "./Receipt";
import { useLanguage } from "../../context/LanguageContext.jsx";

/* ---------- database text: {"en": "...", "km": "..."} ---------- */
const pickLang = (obj, lang) =>
  obj[lang] ||
  (lang === "km" ? obj.kh : lang === "kh" ? obj.km : "") ||
  (lang === "tw" ? obj.zh : "") ||
  obj.en ||
  Object.values(obj).find(Boolean) ||
  "";

const trLang = (value, lang = "en") => {
  if (value == null) return "";
  if (typeof value === "object" && !Array.isArray(value)) {
    return pickLang(value, lang);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return pickLang(parsed, lang);
      }
    } catch {
      // plain text from the database is already displayable
    }
    return value;
  }
  return String(value);
};

/* ---------- storage ---------- */
const HELD_KEY = "bb_held_v1";
const CURRENT_ORDER_KEY = "bb_pos_current_order_v1";
const readCurrentOrder = () => {
  try {
    return JSON.parse(localStorage.getItem(CURRENT_ORDER_KEY)) || {};
  } catch {
    return {};
  }
};
const readHeld = () => {
  try {
    return JSON.parse(localStorage.getItem(HELD_KEY)) || [];
  } catch {
    return [];
  }
};

const ORDER_TYPES = [
  { id: "dine-in", labelKey: "dine_in" },
  { id: "pickup", labelKey: "takeaway" },
  { id: "delivery", labelKey: "delivery" },
];

const PAYMENT_METHODS = [
  { id: "cash", labelKey: "cash", icon: Banknote },
  { id: "card", labelKey: "card", icon: CreditCard },
  { id: "qr", labelKey: "qr", icon: QrCode },
];

const emptyCustomer = { name: "", phone: "", address: "" };

// Khmer Riel is the main price, with an approximate USD amount underneath.
const EXCHANGE_RATE = 4100; // 1 USD ≈ 4100 KHR
const formatPriceWithUSD = (rielValue) => {
  const value = Number(rielValue) || 0;
  const usd = value / EXCHANGE_RATE;
  const usdFormatted =
    usd % 1 === 0 ? `$${usd.toFixed(0)}` : `$${usd.toFixed(2)}`;
  return {
    riel: `${Math.round(value).toLocaleString()}៛`,
    usd: `≈ ${usdFormatted}`,
  };
};
const riel = (n) => formatPriceWithUSD(n).riel;

/* ---------- products from the database ----------
   A product can be sold in up to 3 ways: its standard price, a Big size and a Small size.
   An empty (NULL) price means "not offered". discount_percent applies to every size. */
const SIZE_DEFS = [
  { key: "price", labelKey: "regular", field: "price" },
  { key: "big", labelKey: "big", field: "big_size_price" },
  { key: "small", labelKey: "small", field: "small_size_price" },
];
const hasValue = (v) => v !== null && v !== undefined && v !== "";
const unitPrice = (base, discountPct) =>
  round2((Number(base) * (100 - Number(discountPct || 0))) / 100);
const sizeOptions = (p) =>
  SIZE_DEFS.filter((s) => hasValue(p[s.field])).map((s) => ({
    key: s.key,
    labelKey: s.labelKey,
    base: Number(p[s.field]),
    unit: unitPrice(p[s.field], p.discount_percent),
  }));

const STATIC_RATING = 4.5;
const STATIC_REVIEWS = 120;

function Stars({ value = 0, t }) {
  const rating = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`${rating.toFixed(1)} ${t("out_of_5_stars")}`}
    >
      {[0, 1, 2, 3, 4].map((star) => (
        <span
          key={star}
          className={
            rating >= star + 1
              ? "text-accent-400"
              : rating > star
                ? "text-accent-300"
                : "text-stone-300 dark:text-stone-600"
          }
        >
          ★
        </span>
      ))}
    </div>
  );
}

function SizeChips({ options, active, onPick, t }) {
  return (
    <div className="flex flex-wrap items-center gap-1 pt-0.5">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onPick(option.key)}
          className={`px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold rounded-md border transition-colors cursor-pointer ${
            active === option.key
              ? "bg-accent-600 border-accent-600 text-white"
              : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-accent-500"
          }`}
        >
          {t(option.labelKey)}
        </button>
      ))}
    </div>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
        active
          ? "bg-accent-600 border-accent-600 text-white"
          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-accent-500"
      }`}
    >
      {children}
    </button>
  );
}

export default function POS() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const activeLanguage = language || "en";

  // Translates database JSON ({"en": "", "km": ""}) into the active language
  const tr = useCallback(
    (value) => trLang(value, activeLanguage),
    [activeLanguage],
  );

  // menu from the database
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [types, setTypes] = useState([]);
  const [sugarLevels, setSugarLevels] = useState([]);
  const [iceLevels, setIceLevels] = useState([]);
  const [coffeeLevels, setCoffeeLevels] = useState([]);
  const [levelsOptions, setLevelsOptions] = useState([]);
  const [picked, setPicked] = useState({});
  const [showOptionsId, setShowOptionsId] = useState(null);
  const [customizations, setCustomizations] = useState({});
  const [addedId, setAddedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(""); // message, or "" / "__default__"

  // menu browsing
  const [catFilter, setCatFilter] = useState("all"); // "all" | category id
  const [typeFilter, setTypeFilter] = useState("all"); // "all" | drinks type id
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [sizePick, setSizePick] = useState(null); // product waiting for a size choice

  // current order
  const [initialOrder] = useState(readCurrentOrder);
  const [cart, setCart] = useState(() =>
    Array.isArray(initialOrder.cart) ? initialOrder.cart : [],
  );
  const [expandedDetails, setExpandedDetails] = useState({});
  const [orderType, setOrderType] = useState(
    () => initialOrder.orderType || "dine-in",
  );
  const [table, setTable] = useState(() => initialOrder.table || "");
  const [deliveryId, setDeliveryId] = useState(
    () => initialOrder.deliveryId || "express",
  );
  const [customer, setCustomer] = useState(
    () => initialOrder.customer || emptyCustomer,
  );
  const [note, setNote] = useState(() => initialOrder.note || "");
  const [promoCode, setPromoCode] = useState(
    () => initialOrder.promoCode || "",
  );
  const [promoApplied, setPromoApplied] = useState(() =>
    Boolean(initialOrder.promoApplied),
  );
  // null | { percent } (applied) | { error } (error text, "" = use the default)
  const [promoMsg, setPromoMsg] = useState(null);
  const [manualPct, setManualPct] = useState(
    () => Number(initialOrder.manualPct) || 0,
  );

  // held orders + online orders waiting
  const [held, setHeld] = useState(readHeld);
  const [pendingOnline, setPendingOnline] = useState(0);

  // payment
  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(""); // message, or "__default__"
  const [shopOptions, setShopOptions] = useState({
    delivery: [],
    maxStaffDiscountPercent: 20,
  });
  const [quote, setQuote] = useState(null); // the server's price for the current order
  const [quoteError, setQuoteError] = useState(""); // message, or "__default__"
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        CURRENT_ORDER_KEY,
        JSON.stringify({
          cart,
          orderType,
          table,
          deliveryId,
          customer,
          note,
          promoCode,
          promoApplied,
          manualPct,
        }),
      );
    } catch (error) {
      console.error("Could not save current POS order", error);
    }
  }, [
    cart,
    orderType,
    table,
    deliveryId,
    customer,
    note,
    promoCode,
    promoApplied,
    manualPct,
  ]);

  const loadMenu = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [prods, cs, ts, sugars, ices, coffees, levelOptions, shop] =
        await Promise.all([
          productService.list(),
          categoryService.list(),
          drinksTypesService.list(),
          sugarLevelService.list(),
          iceLevelService.list(),
          coffeeLevelService.list(),
          levelsOptionsService.list(),
          orderService.options().catch(() => null), // the screen still works without it
        ]);
      setProducts(asList(prods));
      setCats(asList(cs));
      setTypes(asList(ts));
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
      if (shop) setShopOptions(shop);
    } catch (err) {
      console.error("Failed to load the menu:", err);
      setLoadError(err.message || "__default__");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  useEffect(() => {
    const load = () =>
      orderService
        .list({ source: "online", status: "pending" })
        .then((o) => setPendingOnline(Array.isArray(o) ? o.length : 0))
        .catch(() => {});
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  const saveHeld = (list) => {
    setHeld(list);
    localStorage.setItem(HELD_KEY, JSON.stringify(list));
  };

  // only products that are on the menu and have a price
  const availableItems = useMemo(
    () =>
      products
        .filter((p) => Number(p.status) === 1 && sizeOptions(p).length > 0)
        .sort(bySort),
    [products],
  );

  const filterCategories = useMemo(() => {
    const used = new Set(availableItems.map((p) => Number(p.category_id)));
    return cats
      .filter((c) => Number(c.status) === 1 && used.has(Number(c.id)))
      .sort(bySort);
  }, [cats, availableItems]);

  const filterTypes = useMemo(() => {
    const used = new Set(
      availableItems.map((p) => Number(p.type_id)).filter(Number.isFinite),
    );
    return types
      .filter((dt) => Number(dt.status) === 1 && used.has(Number(dt.id)))
      .sort(bySort);
  }, [types, availableItems]);

  useEffect(() => {
    if (
      catFilter !== "all" &&
      !filterCategories.some((c) => Number(c.id) === Number(catFilter))
    ) {
      setCatFilter("all");
    }
  }, [filterCategories, catFilter]);

  useEffect(() => {
    if (
      typeFilter !== "all" &&
      !filterTypes.some((dt) => Number(dt.id) === Number(typeFilter))
    ) {
      setTypeFilter("all");
    }
  }, [filterTypes, typeFilter]);

  const visible = useMemo(() => {
    const term = search.toLowerCase();
    return availableItems.filter((p) => {
      const names =
        p.name && typeof p.name === "object" ? Object.values(p.name) : [];
      const searchable = [...names, tr(p.name)].join(" ").toLowerCase();
      return (
        (catFilter === "all" || Number(p.category_id) === Number(catFilter)) &&
        (typeFilter === "all" || Number(p.type_id) === Number(typeFilter)) &&
        searchable.includes(term)
      );
    });
  }, [availableItems, catFilter, typeFilter, search, tr]);

  const activeFilters =
    Number(catFilter !== "all") + Number(typeFilter !== "all");
  const clearFilters = () => {
    setCatFilter("all");
    setTypeFilter("all");
  };
  const countBy = (fn) => availableItems.filter(fn).length;

  const chosenOption = (product) => {
    const options = sizeOptions(product);
    return (
      options.find((option) => option.key === picked[product.id]) || options[0]
    );
  };

  // Empty category/type arrays mean a level is available for all products.
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

  const handleCustomizationChange = (productId, field, value) => {
    setCustomizations((previous) => ({
      ...previous,
      [productId]: { ...(previous[productId] || {}), [field]: value },
    }));
  };

  const isCompleteCustomization = (product) => {
    const sugar = availableLevels(1, sugarLevels, product);
    const ice = availableLevels(2, iceLevels, product);
    const coffee = availableLevels(3, coffeeLevels, product);
    const customization = customizations[product.id] || {};
    return (
      (!sugar.length || Boolean(customization.sugar)) &&
      (!ice.length || Boolean(customization.ice)) &&
      (!coffee.length || Boolean(customization.coffee))
    );
  };

  // ---- cart actions ----
  // One cart line per product + size + options. Names are stored as the raw
  // {"en","km"} objects, so they re-translate when the language changes.
  const addToCart = (product, option, customization = {}) => {
    const sugar = customization.sugar;
    const ice = customization.ice;
    const coffee = customization.coffee;
    const extraCoffeePrice = Number(coffee?.price || 0);
    const finalPrice = round2(option.unit + extraCoffeePrice);
    const basePrice = round2(option.base + extraCoffeePrice);
    const lineId = `${product.id}:${option.key}:${sugar?.id || 0}:${ice?.id || 0}:${coffee?.id || 0}`;
    const showSize = sizeOptions(product).length > 1 || option.key !== "price";

    // plain-text fallback title (used only by lines saved before this change)
    const labels = [
      showSize ? t(option.labelKey) : null,
      sugar ? tr(sugar.name) : null,
      ice ? tr(ice.name) : null,
      coffee ? tr(coffee.name) : null,
    ].filter(Boolean);
    const productTitle = tr(product.name);
    const detailTitle = labels.length ? `(${labels.join(", ")})` : "";

    setCart((prev) => {
      const found = prev.find((line) => line.id === lineId);
      return found
        ? prev.map((line) =>
            line.id === lineId ? { ...line, qty: line.qty + 1 } : line,
          )
        : [
            ...prev,
            {
              id: lineId,
              productId: product.id,
              size: option.key,
              sizeLabelKey: option.labelKey,
              showSize,
              nameObj: product.name,
              sugarName: sugar?.name ?? null,
              iceName: ice?.name ?? null,
              coffeeName: coffee?.name ?? null,
              title: `${productTitle}${detailTitle ? ` ${detailTitle}` : ""}`,
              productTitle,
              detailTitle,
              price: finalPrice,
              basePrice,
              discountPercent: Number(product.discount_percent || 0),
              taxPercent: hasValue(product.tax_percent)
                ? Number(product.tax_percent)
                : null,
              qty: 1,
              img: assetUrl(product.img || product.thumbnail),
              sugarLevelId: sugar?.id || null,
              iceLevelId: ice?.id || null,
              coffeeLevelId: coffee?.id || null,
            },
          ];
    });
    setAddedId(product.id);
    window.setTimeout(() => setAddedId(null), 1000);
  };

  // Name and option parts of a cart line, in the active language
  const lineName = (line) =>
    line.nameObj
      ? tr(line.nameObj)
      : line.productTitle || line.title.split(" (")[0];

  const lineDetailParts = (line) => {
    if (line.nameObj) {
      return [
        line.showSize && line.sizeLabelKey ? t(line.sizeLabelKey) : null,
        line.sugarName ? tr(line.sugarName) : null,
        line.iceName ? tr(line.iceName) : null,
        line.coffeeName ? tr(line.coffeeName) : null,
      ].filter(Boolean);
    }
    // lines saved before names were stored as objects
    const legacy =
      line.detailTitle ||
      (line.title.includes(" (")
        ? `(${line.title.split(" (").slice(1).join(" (")}`
        : "");
    return legacy
      .replace(/^\(|\)$/g, "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  };

  const changeQty = (id, d) =>
    setCart((prev) =>
      prev
        .map((l) => (l.id === id ? { ...l, qty: l.qty + d } : l))
        .filter((l) => l.qty > 0),
    );
  const removeLine = (id) => setCart((prev) => prev.filter((l) => l.id !== id));

  const resetOrder = () => {
    try {
      localStorage.removeItem(CURRENT_ORDER_KEY);
    } catch {
      // storage unavailable
    }
    setCart([]);
    setOrderType("dine-in");
    setTable("");
    setDeliveryId("express");
    setCustomer(emptyCustomer);
    setNote("");
    setPromoCode("");
    setPromoApplied(false);
    setPromoMsg(null);
    setManualPct(0);
    setCashReceived("");
    setMethod("cash");
  };

  const applyPromo = async (e) => {
    e.preventDefault();
    const code = promoCode.trim();
    if (!code) return;
    try {
      const res = await orderService.checkPromo(code);
      setPromoCode(res.code);
      setPromoApplied(true);
      setPromoMsg({ percent: res.percent });
    } catch (err) {
      setPromoApplied(false);
      setPromoMsg({ error: err.message || "" });
    }
  };

  // ---- hold / recall ----
  const holdOrder = () => {
    if (!cart.length) return;
    saveHeld([
      {
        id: Date.now(),
        heldAt: new Date().toISOString(),
        cart,
        orderType,
        table,
        deliveryId,
        customer,
        note,
        promoCode,
        promoApplied,
        manualPct,
      },
      ...held,
    ]);
    // The current order stays visible; it is cleared by "Clear all" or a successful payment.
  };
  const recallOrder = (h) => {
    if (cart.length && !window.confirm(t("replace_current_order_confirm")))
      return;
    setCart(h.cart);
    setOrderType(h.orderType);
    setTable(h.table);
    setDeliveryId(h.deliveryId);
    setCustomer(h.customer);
    setNote(h.note);
    setPromoCode(h.promoCode);
    setPromoApplied(h.promoApplied);
    setManualPct(h.manualPct);
    saveHeld(held.filter((x) => x.id !== h.id));
  };

  // ---- totals: the SERVER prices the order; calcTotals is a stand-in while it answers ----
  const isDelivery = orderType === "delivery";
  const apiItems = cart.map((l) => ({
    productId: l.productId,
    size: l.size,
    qty: l.qty,
    sugarLevelId: l.sugarLevelId,
    iceLevelId: l.iceLevelId,
    coffeeLevelId: l.coffeeLevelId,
  }));
  const quoteKey = JSON.stringify([
    apiItems,
    orderType,
    isDelivery ? deliveryId : null,
    promoApplied ? promoCode : "",
    manualPct,
  ]);

  useEffect(() => {
    if (cart.length === 0) {
      setQuote(null);
      setQuoteError("");
      return undefined;
    }
    let alive = true;
    const timer = setTimeout(() => {
      orderService
        .quote({
          items: apiItems,
          orderType,
          deliveryId: isDelivery ? deliveryId : null,
          promoCode: promoApplied ? promoCode : "",
          staffDiscountPct: manualPct,
        })
        .then((q) => {
          if (!alive) return;
          setQuote(q);
          setQuoteError("");
        })
        .catch((err) => {
          if (!alive) return;
          setQuote(null);
          setQuoteError(err.message || "__default__");
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey]);

  const local = calcTotals(cart, {
    discountPct: manualPct,
    deliveryId: isDelivery ? deliveryId : "standard",
  });
  const { subtotal, discount, shipping, tax, total } = quote ?? local;
  const discountPct = quote?.discountPct ?? manualPct;

  const received = Number(cashReceived) || 0;
  const change = method === "cash" ? round2(Math.max(0, received - total)) : 0;
  const deliveryOk =
    !isDelivery || (customer.phone.trim() && customer.address.trim());
  const canCharge = cart.length > 0 && deliveryOk && Boolean(quote); // only charge what the server has priced
  const canPay = canCharge && (method !== "cash" || received >= total);

  // delivery choices come from the database ("standard" is the free "no delivery")
  const deliveryChoices = shopOptions.delivery.filter(
    (d) => d.code !== "standard",
  );
  useEffect(() => {
    if (
      deliveryChoices.length &&
      !deliveryChoices.some((d) => d.code === deliveryId)
    )
      setDeliveryId(deliveryChoices[0].code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopOptions]);

  const confirmPayment = async () => {
    setPaying(true);
    setPayError("");
    try {
      const order = await orderService.create({
        items: apiItems,
        orderType,
        table: orderType === "dine-in" ? table : "",
        customer: { ...customer, notes: note },
        deliveryId: isDelivery ? deliveryId : null,
        promoCode: promoApplied ? promoCode : "",
        staffDiscountPct: manualPct,
        paymentMethod: method,
        cashReceived: method === "cash" ? received : null,
        expectedTotal: total, // the server refuses the order if its own total is different
      });
      setReceipt(order);
      setPayOpen(false);
      resetOrder();
    } catch (err) {
      setPayError(err.message || "__default__");
    } finally {
      setPaying(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-accent-500";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
      {/* LEFT: menu */}
      <div className="xl:col-span-2 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold">{t("point_of_sale")}</h1>
            {pendingOnline > 0 && (
              <button
                onClick={() => navigate("/dashboard/orders")}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-100 text-accent-700 text-xs font-bold cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" /> {pendingOnline}{" "}
                {t("online_orders_waiting")}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("search_drinks_pastries")}
                className={`${inputCls} pl-9`}
              />
            </div>
            <button
              onClick={loadMenu}
              disabled={loading}
              title={t("reload_menu")}
              aria-label={t("reload_menu")}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-accent-500 disabled:opacity-60 transition-colors cursor-pointer"
            >
              <RotateCcw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((value) => !value)}
            aria-expanded={showFilters}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-2 hover:border-accent-500 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {showFilters ? t("hide_filters") : t("show_filters")}
            {activeFilters > 0 && (
              <span className="px-1.5 rounded-full bg-accent-600 text-white text-xs leading-5">
                {activeFilters}
              </span>
            )}
          </button>
          {catFilter !== "all" && (
            <span className="px-3 py-1.5 rounded-full bg-accent-100 text-accent-800 dark:bg-accent-950/40 dark:text-accent-300 text-xs font-medium">
              {t("category")}:{" "}
              {tr(cats.find((c) => Number(c.id) === Number(catFilter))?.name) ||
                t("selected")}
            </span>
          )}
          {typeFilter !== "all" && (
            <span className="px-3 py-1.5 rounded-full bg-accent-100 text-accent-800 dark:bg-accent-950/40 dark:text-accent-300 text-xs font-medium">
              {t("type")}:{" "}
              {tr(
                types.find((dt) => Number(dt.id) === Number(typeFilter))?.name,
              ) || t("selected")}
            </span>
          )}
        </div>

        {showFilters && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-sm">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500">
                {t("categories")}
              </div>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  active={catFilter === "all"}
                  onClick={() => setCatFilter("all")}
                >
                  {t("all")} ({availableItems.length})
                </FilterChip>
                {filterCategories.map((c) => (
                  <FilterChip
                    key={c.id}
                    active={Number(catFilter) === Number(c.id)}
                    onClick={() => setCatFilter(String(c.id))}
                  >
                    {tr(c.name)} (
                    {countBy((p) => Number(p.category_id) === Number(c.id))})
                  </FilterChip>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500">
                {t("drinks_types")}
              </div>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  active={typeFilter === "all"}
                  onClick={() => setTypeFilter("all")}
                >
                  {t("all")} ({availableItems.length})
                </FilterChip>
                {filterTypes.map((dt) => (
                  <FilterChip
                    key={dt.id}
                    active={Number(typeFilter) === Number(dt.id)}
                    onClick={() => setTypeFilter(String(dt.id))}
                  >
                    {tr(dt.name)} (
                    {countBy((p) => Number(p.type_id) === Number(dt.id))})
                  </FilterChip>
                ))}
              </div>
            </div>

            {activeFilters > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-accent-600 font-medium underline cursor-pointer"
              >
                {t("clear_filters")}
              </button>
            )}
          </div>
        )}

        {loadError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-sm flex items-center justify-between">
            {loadError === "__default__"
              ? t("could_not_load_menu_options")
              : loadError}
            <button
              onClick={loadMenu}
              className="font-semibold underline cursor-pointer"
            >
              {t("retry")}
            </button>
          </div>
        )}

        {loading && products.length === 0 ? (
          <p className="text-slate-500">{t("loading_menu")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {visible.map((item) => {
              const options = sizeOptions(item);
              const option = chosenOption(item);
              const discount = Number(item.discount_percent || 0);
              const rating =
                Number(item.rating) > 0 ? Number(item.rating) : STATIC_RATING;
              const reviews = hasValue(item.reviews)
                ? Number(item.reviews)
                : STATIC_REVIEWS;
              const img = assetUrl(item.img || item.thumbnail);
              const isExpanded = showOptionsId === item.id;
              const canAdd = isCompleteCustomization(item);
              const customization = customizations[item.id] || {};
              const availSugar = availableLevels(1, sugarLevels, item);
              const availIce = availableLevels(2, iceLevels, item);
              const availCoffee = availableLevels(3, coffeeLevels, item);
              const hasAnyOptions =
                availSugar.length > 0 ||
                availIce.length > 0 ||
                availCoffee.length > 0;
              const extraCoffeePrice = Number(customization.coffee?.price || 0);
              const currentPrice = round2(option.unit + extraCoffeePrice);
              const currentBasePrice = round2(option.base + extraCoffeePrice);
              const categoryName = tr(
                cats.find((cat) => cat.id === item.category_id)?.name,
              );
              const badge = tr(item.badge).trim();
              const description = tr(item.description).trim();

              return (
                <article
                  key={item.id}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex min-w-0 items-stretch">
                    {/* Image */}
                    <div className="relative w-[34%] min-w-[112px] sm:w-36 shrink-0 self-stretch overflow-hidden bg-stone-100 dark:bg-stone-800">
                      {img ? (
                        <img
                          src={img}
                          alt={tr(item.name)}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-4xl">
                          ☕
                        </span>
                      )}
                      <span className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10 pointer-events-none" />
                      <span className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-1">
                        {discount > 0 && (
                          <span className="rounded-md bg-rose-600/95 px-2 py-1 text-[10px] font-bold leading-tight text-white">
                            -{discount}%
                          </span>
                        )}
                        {badge && (
                          <span className="max-w-full break-words rounded-md bg-black/65 px-2 py-1 text-[10px] font-bold leading-tight text-white">
                            {badge}
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5 p-2.5 sm:p-3">
                      {categoryName && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-accent-600 dark:text-accent-400">
                          {categoryName}
                        </span>
                      )}

                      <div className="w-full min-w-0">
                        <h3 className="break-words text-xs sm:text-sm font-bold leading-snug text-stone-900 dark:text-white">
                          {tr(item.name)}
                        </h3>
                        {description && (
                          <p className="mt-0.5 break-words whitespace-pre-line line-clamp-2 text-[10px] sm:text-[11px] leading-snug text-stone-500 dark:text-stone-400">
                            {description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-stone-500 dark:text-stone-400">
                        <span className="text-[11px] leading-none">
                          <Stars value={rating} t={t} />
                        </span>
                        <span className="text-[10px] font-semibold text-stone-700 dark:text-stone-300">
                          {rating.toFixed(1)}
                        </span>
                        <span className="text-[10px]">({reviews})</span>
                      </div>

                      {options.length > 1 && (
                        <SizeChips
                          options={options}
                          active={option.key}
                          t={t}
                          onPick={(key) =>
                            setPicked((previous) => ({
                              ...previous,
                              [item.id]: key,
                            }))
                          }
                        />
                      )}

                      {hasAnyOptions && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowOptionsId(isExpanded ? null : item.id)
                          }
                          aria-expanded={isExpanded}
                          className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-accent-600 dark:text-accent-400 hover:text-accent-700 transition-colors cursor-pointer"
                        >
                          {t("show_more_options")}
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      {/* Price + add */}
                      <div className="mt-auto flex w-full min-w-0 flex-wrap items-end justify-between gap-2 pt-1">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="text-xs sm:text-sm font-extrabold text-stone-900 dark:text-white">
                              {formatPriceWithUSD(currentPrice).riel}
                            </span>
                            {discount > 0 && (
                              <span className="text-[10px] line-through text-stone-400">
                                {formatPriceWithUSD(currentBasePrice).riel}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-medium text-stone-400 dark:text-stone-500">
                            {formatPriceWithUSD(currentPrice).usd}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!canAdd) {
                              setShowOptionsId(item.id); // open the required options
                              return;
                            }
                            addToCart(item, option, customization);
                          }}
                          aria-disabled={!canAdd}
                          title={!canAdd ? t("complete_required_levels") : ""}
                          className={`shrink-0 px-3 py-1.5 text-white font-semibold text-[11px] sm:text-xs rounded-lg shadow-sm transition-all cursor-pointer ${
                            !canAdd
                              ? "bg-stone-300 dark:bg-stone-700 text-stone-500 opacity-70"
                              : addedId === item.id
                                ? "bg-emerald-600"
                                : "bg-accent-600 hover:bg-accent-700"
                          }`}
                        >
                          {addedId === item.id ? t("added") : t("add_to_order")}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Options: full card width, below the compact row */}
                  {hasAnyOptions && isExpanded && (
                    <div className="border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 p-3 space-y-3 text-xs">
                      {[
                        {
                          key: "sugar",
                          label: t("sugar_level"),
                          levels: availSugar,
                        },
                        {
                          key: "ice",
                          label: t("ice_level"),
                          levels: availIce,
                        },
                        {
                          key: "coffee",
                          label: t("coffee_level"),
                          levels: availCoffee,
                        },
                      ].map(
                        (group) =>
                          group.levels.length > 0 && (
                            <div key={group.key}>
                              <span className="font-bold text-stone-700 dark:text-stone-300 block mb-1.5">
                                {group.label}{" "}
                                <span className="text-rose-500">*</span>
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {group.levels.map((level) => (
                                  <label
                                    key={level.id}
                                    className="flex items-center gap-2 cursor-pointer text-stone-700 dark:text-stone-300 hover:text-accent-600"
                                  >
                                    <input
                                      type="radio"
                                      name={`${group.key}-${item.id}`}
                                      checked={
                                        customization[group.key]?.id ===
                                        level.id
                                      }
                                      onChange={() =>
                                        handleCustomizationChange(
                                          item.id,
                                          group.key,
                                          level,
                                        )
                                      }
                                      className="accent-accent-600 cursor-pointer"
                                    />
                                    <span>
                                      {tr(level.name)}
                                      {group.key === "coffee" &&
                                      Number(level.price || 0) > 0
                                        ? ` (+${riel(level.price)})`
                                        : ""}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ),
                      )}
                    </div>
                  )}
                </article>
              );
            })}

            {!loading && !loadError && visible.length === 0 && (
              <div className="col-span-full text-center py-16 text-stone-500 dark:text-stone-400">
                <div className="text-5xl mb-3">☕</div>
                <p className="font-semibold">{t("no_items_match_search")}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT: current order */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 xl:sticky xl:top-0 xl:max-h-[calc(100vh-7rem)] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] dark:[scrollbar-color:#475569_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-track]:my-2 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-accent-500">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{t("current_order")}</h2>
          {cart.length > 0 && (
            <button
              onClick={resetOrder}
              className="text-xs text-rose-500 font-semibold cursor-pointer"
            >
              {t("clear_all")}
            </button>
          )}
        </div>

        {/* held orders */}
        {held.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-500">
              {t("held_orders")}
            </p>
            {held.map((h) => (
              <button
                key={h.id}
                onClick={() => recallOrder(h)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs hover:border-accent-500 cursor-pointer"
              >
                <span>
                  {h.cart.reduce((n, l) => n + l.qty, 0)} {t("items")} ·{" "}
                  {new Date(h.heldAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {h.table ? ` · ${t("table")} ${h.table}` : ""}
                </span>
                <Play className="w-3.5 h-3.5 text-accent-600" />
              </button>
            ))}
          </div>
        )}

        {/* order type */}
        <div className="grid grid-cols-3 gap-2">
          {ORDER_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setOrderType(type.id)}
              className={`py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                orderType === type.id
                  ? "bg-accent-600 text-white"
                  : "bg-slate-100 dark:bg-slate-900"
              }`}
            >
              {t(type.labelKey)}
            </button>
          ))}
        </div>

        {orderType === "dine-in" && (
          <input
            value={table}
            onChange={(e) => setTable(e.target.value)}
            placeholder={t("table_no_optional")}
            className={inputCls}
          />
        )}

        {isDelivery && (
          <div className="space-y-2">
            <select
              value={deliveryId}
              onChange={(e) => setDeliveryId(e.target.value)}
              className={inputCls}
            >
              {deliveryChoices.map((d) => (
                <option key={d.code} value={d.code}>
                  {tr(d.name)} · {riel(d.fee)}
                </option>
              ))}
            </select>
            <input
              value={customer.address}
              onChange={(e) =>
                setCustomer({ ...customer, address: e.target.value })
              }
              placeholder={`${t("delivery_address")} *`}
              className={inputCls}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <input
            value={customer.name}
            onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
            placeholder={t("customer_name")}
            className={inputCls}
          />
          <input
            value={customer.phone}
            onChange={(e) =>
              setCustomer({ ...customer, phone: e.target.value })
            }
            placeholder={isDelivery ? `${t("phone")} *` : t("phone")}
            className={inputCls}
          />
        </div>

        {/* lines */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {cart.length === 0 && (
            <p className="text-sm text-slate-500 py-6 text-center">
              {t("pos_empty_hint")}
            </p>
          )}
          {cart.map((l) => {
            const parts = lineDetailParts(l);
            const isExpanded = Boolean(expandedDetails[l.id]);
            // Show size + first option; the rest expands on demand.
            const hasMoreDetails = parts.length > 2;

            return (
              <div key={l.id} className="flex items-center gap-2 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold whitespace-normal break-words leading-snug">
                    {lineName(l)}
                    {parts.length > 0 && (
                      <span className="font-normal text-slate-500 dark:text-slate-400">
                        {" "}
                        {hasMoreDetails ? (
                          <>
                            {isExpanded
                              ? `(${parts.join(", ")})`
                              : `(${parts.slice(0, 2).join(", ")}, `}
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedDetails((prev) => ({
                                  ...prev,
                                  [l.id]: !prev[l.id],
                                }))
                              }
                              className="ml-1 text-accent-600 dark:text-accent-400 font-medium whitespace-nowrap cursor-pointer"
                            >
                              {isExpanded
                                ? t("see_less")
                                : `${t("see_more")}...`}
                            </button>
                            {!isExpanded && ")"}
                          </>
                        ) : (
                          `(${parts.join(", ")})`
                        )}
                      </span>
                    )}
                  </p>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
                    <span className="text-base font-bold text-slate-800 dark:text-slate-100">
                      {formatPriceWithUSD(l.price).riel}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {formatPriceWithUSD(l.price).usd}
                    </span>
                    {l.discountPercent > 0 && (
                      <span className="text-[10px] text-slate-400 line-through">
                        {formatPriceWithUSD(l.basePrice).riel} ·{" "}
                        {formatPriceWithUSD(l.basePrice).usd}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg">
                  <button
                    onClick={() => changeQty(l.id, -1)}
                    className="p-1.5 cursor-pointer"
                    aria-label={t("decrease")}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 font-semibold">{l.qty}</span>
                  <button
                    onClick={() => changeQty(l.id, 1)}
                    className="p-1.5 cursor-pointer"
                    aria-label={t("increase")}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="w-24 shrink-0 text-right whitespace-nowrap">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {formatPriceWithUSD(l.price * l.qty).riel}
                  </span>{" "}
                  <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                    {formatPriceWithUSD(l.price * l.qty).usd}
                  </span>
                </span>
                <button
                  onClick={() => removeLine(l.id)}
                  className="p-1 text-rose-500 cursor-pointer"
                  title={t("remove")}
                  aria-label={t("remove")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder={t("order_note_placeholder")}
          className={inputCls}
        />

        {/* promo + manual discount */}
        <form onSubmit={applyPromo} className="flex gap-2">
          <input
            value={promoCode}
            onChange={(e) => {
              setPromoCode(e.target.value);
              setPromoApplied(false);
              setPromoMsg(null);
            }}
            placeholder={t("promo_code")}
            className={inputCls}
          />
          <button className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white font-semibold text-xs rounded-xl cursor-pointer">
            {t("apply")}
          </button>
        </form>
        {promoMsg && (
          <p
            className={`text-xs ${
              promoMsg.error !== undefined
                ? "text-rose-500"
                : "text-emerald-600"
            }`}
          >
            {promoMsg.error !== undefined
              ? promoMsg.error || t("invalid_code")
              : `${promoMsg.percent}% ${t("promo_applied")}`}
          </p>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">{t("staff_discount")}</span>
          <select
            value={manualPct}
            onChange={(e) => setManualPct(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
          >
            {[0, 5, 10, 15, 20]
              .filter((p) => p <= shopOptions.maxStaffDiscountPercent)
              .map((p) => (
                <option key={p} value={p}>
                  {p}%
                </option>
              ))}
          </select>
        </div>

        {/* totals */}
        <div className="space-y-1.5 text-sm border-t border-slate-200 dark:border-slate-700 pt-3">
          <div className="flex justify-between gap-3 text-slate-500">
            <span>{t("subtotal")}</span>
            <span className="text-right">
              <span className="block text-slate-700 dark:text-slate-200">
                {formatPriceWithUSD(subtotal).riel}
              </span>
              <span className="block text-[10px] text-slate-400">
                {formatPriceWithUSD(subtotal).usd}
              </span>
            </span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between gap-3 text-emerald-600">
              <span>
                {t("discount")} ({discountPct}%)
              </span>
              <span className="text-right">
                <span className="block">
                  -{formatPriceWithUSD(discount).riel}
                </span>
                <span className="block text-[10px] text-emerald-500/70">
                  -{formatPriceWithUSD(discount).usd}
                </span>
              </span>
            </div>
          )}
          {shipping > 0 && (
            <div className="flex justify-between gap-3 text-slate-500">
              <span>{t("delivery")}</span>
              <span className="text-right">
                <span className="block">
                  {formatPriceWithUSD(shipping).riel}
                </span>
                <span className="block text-[10px] text-slate-400">
                  {formatPriceWithUSD(shipping).usd}
                </span>
              </span>
            </div>
          )}
          <div className="flex justify-between gap-3 text-slate-500">
            <span>{t("tax")}</span>
            <span className="text-right">
              <span className="block">{formatPriceWithUSD(tax).riel}</span>
              <span className="block text-[10px] text-slate-400">
                {formatPriceWithUSD(tax).usd}
              </span>
            </span>
          </div>
          <div className="flex justify-between gap-3 text-lg font-extrabold pt-1">
            <span>{t("total")}</span>
            <span className="text-right text-accent-600 dark:text-accent-400">
              <span className="block">{formatPriceWithUSD(total).riel}</span>
              <span className="block text-xs font-medium text-accent-500/70">
                {formatPriceWithUSD(total).usd}
              </span>
            </span>
          </div>
        </div>

        {quoteError && (
          <p role="alert" className="text-xs text-rose-500">
            {quoteError === "__default__"
              ? t("could_not_price_order")
              : quoteError}
          </p>
        )}

        <div className="flex gap-2">
          <button
            disabled={cart.length === 0}
            onClick={holdOrder}
            className="px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 disabled:opacity-40 flex items-center gap-1.5 text-sm font-semibold cursor-pointer"
          >
            <Pause className="w-4 h-4" /> {t("hold")}
          </button>
          <button
            disabled={!canCharge}
            onClick={() => setPayOpen(true)}
            className="flex-1 py-3 rounded-xl bg-accent-600 hover:bg-accent-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold shadow-lg transition-all cursor-pointer"
          >
            {t("charge")} {formatPriceWithUSD(total).riel} (
            {formatPriceWithUSD(total).usd})
          </button>
        </div>
        {isDelivery && !deliveryOk && (
          <p className="text-xs text-rose-500">
            {t("delivery_needs_phone_address")}
          </p>
        )}
      </div>

      {/* SIZE PICKER: shown when a product is sold in more than one way */}
      {sizePick && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSizePick(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("choose_a_size")}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold truncate">
                {tr(sizePick.name)}
              </h3>
              <button
                onClick={() => setSizePick(null)}
                aria-label={t("close")}
                className="cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {sizeOptions(sizePick).map((o) => (
                <button
                  key={o.key}
                  onClick={() => {
                    addToCart(sizePick, o, customizations[sizePick.id] || {});
                    setSizePick(null);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-accent-500 hover:bg-accent-50 dark:hover:bg-accent-950/20 font-semibold transition-colors cursor-pointer"
                >
                  <span>{t(o.labelKey)}</span>
                  <span className="text-accent-600 dark:text-accent-400">
                    {riel(o.unit)}
                    {Number(sizePick.discount_percent) > 0 && (
                      <span className="ml-2 text-xs font-normal line-through text-slate-400">
                        {riel(o.base)}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {payOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{t("payment")}</h3>
              <button
                onClick={() => setPayOpen(false)}
                aria-label={t("close")}
                className="cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-3xl font-extrabold text-center text-accent-600 dark:text-accent-400">
              {formatPriceWithUSD(total).riel}
              <span className="block text-sm font-medium text-accent-500/70">
                {formatPriceWithUSD(total).usd}
              </span>
            </p>

            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(({ id, labelKey, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setMethod(id)}
                  className={`py-3 rounded-xl border text-sm font-semibold flex flex-col items-center gap-1 cursor-pointer ${
                    method === id
                      ? "border-accent-600 bg-accent-50 dark:bg-accent-950/30 text-accent-700 dark:text-accent-300"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <Icon className="w-5 h-5" /> {t(labelKey)}
                </button>
              ))}
            </div>

            {method === "cash" && (
              <div className="space-y-3">
                <input
                  type="number"
                  min="0"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder={`${t("cash_received")} (៛)`}
                  className={inputCls}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setCashReceived(String(total))}
                    className="flex-1 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
                  >
                    {t("exact")}
                  </button>
                  {[10000, 20000, 50000, 100000].map((v) => (
                    <button
                      key={v}
                      onClick={() => setCashReceived(String(v))}
                      className="flex-1 px-1 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
                    >
                      {v.toLocaleString()}៛
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{t("change")}</span>
                  <span className="font-bold">{riel(change)}</span>
                </div>
              </div>
            )}
            {method === "card" && (
              <p className="text-sm text-slate-500 text-center">
                {t("pay_card_hint")}
              </p>
            )}
            {method === "qr" && (
              <p className="text-sm text-slate-500 text-center">
                {t("pay_qr_hint")}
              </p>
            )}

            {payError && (
              <p role="alert" className="text-sm text-rose-500 text-center">
                {payError === "__default__"
                  ? t("order_could_not_be_saved")
                  : payError}
              </p>
            )}
            <button
              disabled={!canPay || paying}
              onClick={confirmPayment}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold cursor-pointer"
            >
              {paying ? t("processing") : t("confirm_payment")}
            </button>
          </div>
        </div>
      )}

      {receipt && (
        <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />
      )}
    </div>
  );
}