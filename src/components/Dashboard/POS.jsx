import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Minus, X, Banknote, CreditCard, QrCode, Pause, Play, Bell, RotateCcw, ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { categoryService, drinksTypesService, productService, orderService, sugarLevelService, iceLevelService, coffeeLevelService, levelsOptionsService, assetUrl } from "../../services/api";
import { calcTotals, promoPercent, round2, money } from "../../utils/orderCalc";
import { tr, asList, bySort } from "./Shared.jsx";
import ReceiptModal from "./Receipt";

const HELD_KEY = "bb_held_v1";
const CURRENT_ORDER_KEY = "bb_pos_current_order_v1";
const readCurrentOrder = () => {
  try { return JSON.parse(localStorage.getItem(CURRENT_ORDER_KEY)) || {}; } catch { return {}; }
};
const readHeld = () => {
  try { return JSON.parse(localStorage.getItem(HELD_KEY)) || []; } catch { return []; }
};

const ORDER_TYPES = [
  { id: "dine-in", label: "Dine-in" },
  { id: "pickup", label: "Takeaway" },
  { id: "delivery", label: "Delivery" },
];
const DELIVERY_OPTIONS = [
  { id: "express", label: "Local Delivery · $3.50" },
  { id: "freight", label: "Catering Delivery · $8.00" },
];
const emptyCustomer = { name: "", phone: "", address: "" };

// Display Khmer Riel as the main price and an approximate USD amount underneath.
// Keep POS order calculations unchanged; this helper only formats the product-card display.
const EXCHANGE_RATE = 4100; // 1 USD ≈ 4100 KHR
const formatPriceWithUSD = (rielValue) => {
  const value = Number(rielValue) || 0;
  const usd = value / EXCHANGE_RATE;
  const usdFormatted = usd % 1 === 0 ? `$${usd.toFixed(0)}` : `$${usd.toFixed(2)}`;
  return {
    riel: `${Math.round(value).toLocaleString()}៛`,
    usd: `≈ ${usdFormatted}`,
  };
};

/* ---------- products from the database ----------
   A product can be sold in up to 3 ways: its standard price, a Big size and a Small size.
   An empty (NULL) price means "not offered". The product's discount_percent applies to every size. */
const SIZE_DEFS = [
  { key: "price", label: "Regular", field: "price" },
  { key: "big", label: "Big", field: "big_size_price" },
  { key: "small", label: "Small", field: "small_size_price" },
];
const hasValue = (v) => v !== null && v !== undefined && v !== "";
// price after the product's percentage discount (rounded to cents)
const unitPrice = (base, discountPct) => round2((Number(base) * (100 - Number(discountPct || 0))) / 100);
// the ways this product can be sold: [{ key, label, base, unit }]
const sizeOptions = (p) =>
  SIZE_DEFS.filter((s) => hasValue(p[s.field])).map((s) => ({
    key: s.key,
    label: s.label,
    base: Number(p[s.field]),
    unit: unitPrice(p[s.field], p.discount_percent),
  }));

const STATIC_RATING = 4.5;
const STATIC_REVIEWS = 120;

function Stars({ value = 0 }) {
  const rating = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map((star) => (
        <span key={star} className={rating >= star + 1 ? "text-amber-400" : rating > star ? "text-amber-300" : "text-stone-300 dark:text-stone-600"}>★</span>
      ))}
    </div>
  );
}

function SizeChips({ options, active, onPick }) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onPick(option.key)}
          className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${
            active === option.key
              ? "bg-amber-600 border-amber-600 text-white"
              : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-amber-500"
          }`}
        >
          {option.label}
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
      className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active
          ? "bg-amber-600 border-amber-600 text-white"
          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-500"
      }`}
    >
      {children}
    </button>
  );
}

export default function POS() {
  const navigate = useNavigate();

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
  const [loadError, setLoadError] = useState("");

  // menu browsing
  const [catFilter, setCatFilter] = useState("all"); // "all" | category id
  const [typeFilter, setTypeFilter] = useState("all"); // "all" | drinks type id
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [sizePick, setSizePick] = useState(null); // product waiting for a size choice

  // current order
  const [initialOrder] = useState(readCurrentOrder);
  const [cart, setCart] = useState(() => Array.isArray(initialOrder.cart) ? initialOrder.cart : []);
  const [expandedDetails, setExpandedDetails] = useState({});
  const [orderType, setOrderType] = useState(() => initialOrder.orderType || "dine-in");
  const [table, setTable] = useState(() => initialOrder.table || "");
  const [deliveryId, setDeliveryId] = useState(() => initialOrder.deliveryId || "express");
  const [customer, setCustomer] = useState(() => initialOrder.customer || emptyCustomer);
  const [note, setNote] = useState(() => initialOrder.note || "");
  const [promoCode, setPromoCode] = useState(() => initialOrder.promoCode || "");
  const [promoApplied, setPromoApplied] = useState(() => Boolean(initialOrder.promoApplied));
  const [promoMsg, setPromoMsg] = useState("");
  const [manualPct, setManualPct] = useState(() => Number(initialOrder.manualPct) || 0);

  // held orders + online orders waiting
  const [held, setHeld] = useState(readHeld);
  const [pendingOnline, setPendingOnline] = useState(0);

  // payment
  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(CURRENT_ORDER_KEY, JSON.stringify({
        cart, orderType, table, deliveryId, customer, note, promoCode, promoApplied, manualPct,
      }));
    } catch (error) {
      console.error("Could not save current POS order", error);
    }
  }, [cart, orderType, table, deliveryId, customer, note, promoCode, promoApplied, manualPct]);

  const loadMenu = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [prods, cs, ts, sugars, ices, coffees, levelOptions] = await Promise.all([
        productService.list(),
        categoryService.list(),
        drinksTypesService.list(),
        sugarLevelService.list(),
        iceLevelService.list(),
        coffeeLevelService.list(),
        levelsOptionsService.list(),
      ]);
      setProducts(asList(prods));
      setCats(asList(cs));
      setTypes(asList(ts));
      setLevelsOptions(asList(levelOptions).filter((item) => Number(item.status) === 1).sort(bySort));
      setSugarLevels(asList(sugars).filter((item) => Number(item.status) === 1).sort(bySort));
      setIceLevels(asList(ices).filter((item) => Number(item.status) === 1).sort(bySort));
      setCoffeeLevels(asList(coffees).filter((item) => Number(item.status) === 1).sort(bySort));
    } catch (err) {
      console.error("Failed to load the menu:", err);
      setLoadError(err.message || "Could not load the menu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  useEffect(() => {
    const load = () =>
      orderService.list().then((o) => setPendingOnline(o.filter((x) => x.source === "online" && x.status === "pending").length));
    load();
    const onStorage = (e) => e.key === "bb_orders_v1" && load();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const saveHeld = (list) => {
    setHeld(list);
    localStorage.setItem(HELD_KEY, JSON.stringify(list));
  };

  // only products that are on the menu (managers also receive the hidden ones) and have a price
  const availableItems = useMemo(
    () => products.filter((p) => Number(p.status) === 1 && sizeOptions(p).length > 0).sort(bySort),
    [products]
  );

  // Filter panel uses Menu Manager's Categories and Drinks Types filters.
  // POS intentionally shows only available products; there is no Status filter.
  const filterCategories = useMemo(() => {
    const used = new Set(availableItems.map((p) => Number(p.category_id)));
    return cats.filter((c) => Number(c.status) === 1 && used.has(Number(c.id))).sort(bySort);
  }, [cats, availableItems]);

  const filterTypes = useMemo(() => {
    const used = new Set(availableItems.map((p) => Number(p.type_id)).filter(Number.isFinite));
    return types.filter((t) => Number(t.status) === 1 && used.has(Number(t.id))).sort(bySort);
  }, [types, availableItems]);

  useEffect(() => {
    if (catFilter !== "all" && !filterCategories.some((c) => Number(c.id) === Number(catFilter))) {
      setCatFilter("all");
    }
  }, [filterCategories, catFilter]);

  useEffect(() => {
    if (typeFilter !== "all" && !filterTypes.some((t) => Number(t.id) === Number(typeFilter))) {
      setTypeFilter("all");
    }
  }, [filterTypes, typeFilter]);

  const visible = useMemo(
    () =>
      availableItems.filter((p) =>
        (catFilter === "all" || Number(p.category_id) === Number(catFilter)) &&
        (typeFilter === "all" || Number(p.type_id) === Number(typeFilter)) &&
        Object.values(p.name || {}).join(" ").toLowerCase().includes(search.toLowerCase())
      ),
    [availableItems, catFilter, typeFilter, search]
  );

  const activeFilters = Number(catFilter !== "all") + Number(typeFilter !== "all");
  const clearFilters = () => {
    setCatFilter("all");
    setTypeFilter("all");
  };
  const countBy = (fn) => availableItems.filter(fn).length;

  const chosenOption = (product) => {
    const options = sizeOptions(product);
    return options.find((option) => option.key === picked[product.id]) || options[0];
  };

  // Empty category/type arrays mean a level is available for all products.
  const filterLevels = (levels, product) =>
    levels.filter((level) => {
      const categories = Array.isArray(level.array_categories) ? level.array_categories : [];
      const drinkTypes = Array.isArray(level.array_drinkstypes) ? level.array_drinkstypes : [];
      const categoryMatches = categories.length === 0 || categories.map(Number).includes(Number(product.category_id));
      const typeMatches = drinkTypes.length === 0 || drinkTypes.map(Number).includes(Number(product.type_id));
      return categoryMatches && typeMatches;
    });

  const matchesProduct = (option, product) => {
    const categories = option.array_categories;
    const drinkTypes = option.array_drinkstypes;
    const categoryMatches = !Array.isArray(categories) || categories.length === 0 || categories.map(Number).includes(Number(product.category_id));
    const typeMatches = !Array.isArray(drinkTypes) || drinkTypes.length === 0 || drinkTypes.map(Number).includes(Number(product.type_id));
    return categoryMatches && typeMatches;
  };

  const hasOptionGroup = (groupId, product) =>
    levelsOptions.some((option) =>
      Number(option.id) === groupId &&
      Number(option.status) === 1 &&
      matchesProduct(option, product)
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
    return (!sugar.length || Boolean(customization.sugar)) &&
      (!ice.length || Boolean(customization.ice)) &&
      (!coffee.length || Boolean(customization.coffee));
  };

  // ---- cart actions ----
  // one cart line per product + size, so "Iced Latte (Big)" and "Iced Latte (Small)" stay separate
  const addToCart = (product, option, customization = {}) => {
    const sugar = customization.sugar;
    const ice = customization.ice;
    const coffee = customization.coffee;
    const extraCoffeePrice = Number(coffee?.price || 0);
    const finalPrice = round2(option.unit + extraCoffeePrice);
    const basePrice = round2(option.base + extraCoffeePrice);
    const lineId = `${product.id}:${option.key}:${sugar?.id || 0}:${ice?.id || 0}:${coffee?.id || 0}`;
    const options = sizeOptions(product);
    const showSize = options.length > 1 || option.key !== "price";
    const labels = [
      showSize ? option.label : null,
      sugar ? tr(sugar.name) : null,
      ice ? tr(ice.name) : null,
      coffee ? tr(coffee.name) : null,
    ].filter(Boolean);
    const productTitle = tr(product.name);
    const detailTitle = labels.length ? `(${labels.join(", ")})` : "";
    // Keep the combined title for the order payload, while the Current Order UI
    // displays the product and its customizations on separate lines.
    const title = `${productTitle}${detailTitle ? ` ${detailTitle}` : ""}`;

    setCart((prev) => {
      const found = prev.find((line) => line.id === lineId);
      return found
        ? prev.map((line) => (line.id === lineId ? { ...line, qty: line.qty + 1 } : line))
        : [
            ...prev,
            {
              id: lineId,
              productId: product.id,
              size: option.key,
              title,
              productTitle,
              detailTitle,
              price: finalPrice,
              basePrice,
              discountPercent: Number(product.discount_percent || 0),
              taxPercent: hasValue(product.tax_percent) ? Number(product.tax_percent) : null,
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
  // Product cards select size directly; this handler preserves the existing modal flow if invoked.
  const pickProduct = (product) => {
    const options = sizeOptions(product);
    if (options.length === 1) {
      const customization = customizations[product.id] || {};
      if (isCompleteCustomization(product)) addToCart(product, options[0], customization);
      else setShowOptionsId(product.id);
    } else {
      setSizePick(product);
    }
  };
  const changeQty = (id, d) =>
    setCart((prev) => prev.map((l) => (l.id === id ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0));
  const removeLine = (id) => setCart((prev) => prev.filter((l) => l.id !== id));

  const resetOrder = () => {
    try { localStorage.removeItem(CURRENT_ORDER_KEY); } catch {}
    setCart([]); setOrderType("dine-in"); setTable(""); setDeliveryId("express");
    setCustomer(emptyCustomer); setNote(""); setPromoCode(""); setPromoApplied(false);
    setPromoMsg(""); setManualPct(0); setCashReceived(""); setMethod("cash");
  };

  const applyPromo = (e) => {
    e.preventDefault();
    if (promoPercent(promoCode) > 0) {
      setPromoApplied(true);
      setPromoMsg(`${promoPercent(promoCode)}% promo applied`);
    } else {
      setPromoApplied(false);
      setPromoMsg("Invalid code");
    }
  };

  // ---- hold / recall ----
  const holdOrder = () => {
    if (!cart.length) return;
    saveHeld([
      { id: Date.now(), heldAt: new Date().toISOString(), cart, orderType, table, deliveryId, customer, note, promoCode, promoApplied, manualPct },
      ...held,
    ]);
    // Keep the current order visible; it is only cleared by Clear all or successful payment.
  };
  const recallOrder = (h) => {
    if (cart.length && !window.confirm("Replace the current order with the held one?")) return;
    setCart(h.cart); setOrderType(h.orderType); setTable(h.table); setDeliveryId(h.deliveryId);
    setCustomer(h.customer); setNote(h.note); setPromoCode(h.promoCode); setPromoApplied(h.promoApplied);
    setManualPct(h.manualPct);
    saveHeld(held.filter((x) => x.id !== h.id));
  };

  // ---- totals (same rules as Cart / Checkout) ----
  const isDelivery = orderType === "delivery";
  const discountPct = Math.max(promoApplied ? promoPercent(promoCode) : 0, manualPct);
  const { subtotal, discount, shipping, tax, total } = calcTotals(cart, {
    discountPct,
    deliveryId: isDelivery ? deliveryId : "standard",
  });

  const received = Number(cashReceived) || 0;
  const change = method === "cash" ? round2(Math.max(0, received - total)) : 0;
  const deliveryOk = !isDelivery || (customer.phone.trim() && customer.address.trim());
  const canCharge = cart.length > 0 && deliveryOk;
  const canPay = canCharge && (method !== "cash" || received >= total);

  const confirmPayment = async () => {
    setPaying(true);
    try {
      const order = await orderService.create({
        items: cart,
        orderType,
        table: orderType === "dine-in" ? table : "",
        customer: { ...customer, notes: note },
        paymentMethod: method,
        subtotal, discount, shipping, tax, total,
        cashReceived: method === "cash" ? received : null,
        change,
        source: "pos",
      });
      setReceipt(order);
      setPayOpen(false);
      resetOrder();
    } finally {
      setPaying(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-amber-500";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
      {/* LEFT: menu */}
      <div className="xl:col-span-2 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold">Point of Sale</h1>
            {pendingOnline > 0 && (
              <button
                onClick={() => navigate("/dashboard/orders")}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold"
              >
                <Bell className="w-3.5 h-3.5" /> {pendingOnline} online order{pendingOnline > 1 ? "s" : ""} waiting
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search menu..." className={`${inputCls} pl-9`} />
            </div>
            <button
              onClick={loadMenu}
              disabled={loading}
              title="Reload the menu"
              aria-label="Reload the menu"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-500 disabled:opacity-60 transition-colors"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((value) => !value)}
            aria-expanded={showFilters}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-2 hover:border-amber-500 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {showFilters ? "Hide Filters" : "Show Filters"}
            {activeFilters > 0 && (
              <span className="px-1.5 rounded-full bg-amber-600 text-white text-xs leading-5">
                {activeFilters}
              </span>
            )}
          </button>
          {catFilter !== "all" && (
            <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-xs font-medium">
              Category: {tr(cats.find((c) => Number(c.id) === Number(catFilter))?.name) || "Selected"}
            </span>
          )}
          {typeFilter !== "all" && (
            <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-xs font-medium">
              Type: {tr(types.find((t) => Number(t.id) === Number(typeFilter))?.name) || "Selected"}
            </span>
          )}
        </div>

        {showFilters && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-sm">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500">Categories</div>
              <div className="flex flex-wrap gap-2">
                <FilterChip active={catFilter === "all"} onClick={() => setCatFilter("all")}>
                  All ({availableItems.length})
                </FilterChip>
                {filterCategories.map((c) => (
                  <FilterChip
                    key={c.id}
                    active={Number(catFilter) === Number(c.id)}
                    onClick={() => setCatFilter(String(c.id))}
                  >
                    {tr(c.name)} ({countBy((p) => Number(p.category_id) === Number(c.id))})
                  </FilterChip>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500">Drinks Types</div>
              <div className="flex flex-wrap gap-2">
                <FilterChip active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>
                  All ({availableItems.length})
                </FilterChip>
                {filterTypes.map((t) => (
                  <FilterChip
                    key={t.id}
                    active={Number(typeFilter) === Number(t.id)}
                    onClick={() => setTypeFilter(String(t.id))}
                  >
                    {tr(t.name)} ({countBy((p) => Number(p.type_id) === Number(t.id))})
                  </FilterChip>
                ))}
              </div>
            </div>

            {activeFilters > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-amber-600 font-medium underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {loadError && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-sm flex items-center justify-between">
            {loadError}
            <button onClick={loadMenu} className="font-semibold underline">Retry</button>
          </div>
        )}

        {loading && products.length === 0 ? (
          <p className="text-slate-500">Loading menu...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((item) => {
              const options = sizeOptions(item);
              const option = chosenOption(item);
              const discount = Number(item.discount_percent || 0);
              const rating = Number(item.rating) > 0 ? Number(item.rating) : STATIC_RATING;
              const reviews = hasValue(item.reviews) ? Number(item.reviews) : STATIC_REVIEWS;
              const img = assetUrl(item.img || item.thumbnail);
              const isExpanded = showOptionsId === item.id;
              const canAdd = isCompleteCustomization(item);
              const customization = customizations[item.id] || {};
              const availSugar = availableLevels(1, sugarLevels, item);
              const availIce = availableLevels(2, iceLevels, item);
              const availCoffee = availableLevels(3, coffeeLevels, item);
              const hasAnyOptions = availSugar.length > 0 || availIce.length > 0 || availCoffee.length > 0;
              const extraCoffeePrice = Number(customization.coffee?.price || 0);
              const currentPrice = round2(option.unit + extraCoffeePrice);
              const currentBasePrice = round2(option.base + extraCoffeePrice);

              return (
                <div
                  key={item.id}
                  className="group relative bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 hover:shadow-xl hover:border-amber-500/50 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    <div className="relative h-56 overflow-hidden bg-stone-100 dark:bg-stone-800">
                      {img ? (
                        <img src={img} alt={tr(item.name)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl">☕</div>
                      )}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        {discount > 0 && <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-rose-600/90 text-white rounded-lg">-{discount}%</span>}
                        {tr(item.badge).trim() && <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-black/60 text-white rounded-lg">{tr(item.badge)}</span>}
                      </div>
                    </div>

                    <div className="p-5 space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        {tr(cats.find((cat) => cat.id === item.category_id)?.name)}
                      </span>
                      <h3 className="font-semibold text-stone-900 dark:text-white line-clamp-1">{tr(item.name)}</h3>
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <Stars value={rating} />
                        <span className="font-semibold text-stone-700 dark:text-stone-300">{rating.toFixed(1)}</span>
                        <span>({reviews} {reviews === 1 ? "review" : "reviews"})</span>
                      </div>

                      {options.length > 1 && (
                        <SizeChips
                          options={options}
                          active={option.key}
                          onPick={(key) => setPicked((previous) => ({ ...previous, [item.id]: key }))}
                        />
                      )}

                      {hasAnyOptions && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setShowOptionsId(isExpanded ? null : item.id)}
                            className="w-full flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400 py-1.5 px-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 transition-colors"
                          >
                            <span>Show more options</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          {isExpanded && (
                            <div className="mt-3 p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl space-y-3 text-xs border border-stone-200 dark:border-stone-700">
                              {[
                                { key: "sugar", label: "Sugar Level", levels: availSugar },
                                { key: "ice", label: "Ice Level", levels: availIce },
                                { key: "coffee", label: "Coffee Level", levels: availCoffee },
                              ].map((group) => group.levels.length > 0 && (
                                <div key={group.key}>
                                  <span className="font-bold text-stone-700 dark:text-stone-300 block mb-1.5">{group.label} <span className="text-rose-500">*</span></span>
                                  <div className="space-y-1.5">
                                    {group.levels.map((level) => (
                                      <label key={level.id} className="flex items-center gap-2 cursor-pointer text-stone-700 dark:text-stone-300 hover:text-amber-600">
                                        <input
                                          type="radio"
                                          name={`${group.key}-${item.id}`}
                                          checked={customization[group.key]?.id === level.id}
                                          onChange={() => handleCustomizationChange(item.id, group.key, level)}
                                          className="accent-amber-600 cursor-pointer"
                                        />
                                        <span>
                                          {tr(level.name)}
                                          {group.key === "coffee" && Number(level.price || 0) > 0 ? ` (+${money(Number(level.price))})` : ""}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-5 pt-0 flex items-center justify-between mt-auto gap-3">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-xl font-extrabold text-stone-900 dark:text-white">{formatPriceWithUSD(currentPrice).riel}</span>
                        {discount > 0 && <span className="text-sm line-through text-stone-400">{formatPriceWithUSD(currentBasePrice).riel}</span>}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium text-stone-400 dark:text-stone-500">
                        <span>{formatPriceWithUSD(currentPrice).usd}</span>
                        {discount > 0 && <span className="line-through">{formatPriceWithUSD(currentBasePrice).usd}</span>}
                      </div>
                      {options.length > 1 && <span className="text-xs text-stone-400">Selected: {option.label}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!canAdd) {
                          setShowOptionsId(item.id);
                          return;
                        }
                        addToCart(item, option, customization);
                      }}
                      disabled={!canAdd}
                      className={`shrink-0 px-4 py-2 text-white font-semibold text-xs rounded-xl shadow-sm transition-all ${
                        !canAdd ? "bg-stone-300 dark:bg-stone-700 text-stone-500 cursor-not-allowed opacity-60" : addedId === item.id ? "bg-emerald-600" : "bg-amber-600 hover:bg-amber-700"
                      }`}
                      title={!canAdd ? "Please complete all required level selections first" : ""}
                    >
                      {addedId === item.id ? "Added ✓" : "Add to Order"}
                    </button>
                  </div>
                </div>
              );
            })}
            {!loading && !loadError && visible.length === 0 && (
              <div className="col-span-full text-center py-16 text-stone-500 dark:text-stone-400">
                <div className="text-5xl mb-3">☕</div>
                <p className="font-semibold">No items match your search.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT: current order */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 xl:sticky xl:top-0 xl:max-h-[calc(100vh-7rem)] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] dark:[scrollbar-color:#475569_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-track]:my-2 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-amber-500">
      {/* <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 xl:sticky xl:top-0 xl:max-h-[calc(100vh-7rem)] overflow-y-auto"> */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Current Order</h2>
          {cart.length > 0 && (
            <button onClick={resetOrder} className="text-xs text-rose-500 font-semibold">Clear all</button>
          )}
        </div>

        {/* held orders */}
        {held.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-500">Held orders</p>
            {held.map((h) => (
              <button
                key={h.id}
                onClick={() => recallOrder(h)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs hover:border-amber-500"
              >
                <span>
                  {h.cart.reduce((n, l) => n + l.qty, 0)} items · {new Date(h.heldAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {h.table ? ` · Table ${h.table}` : ""}
                </span>
                <Play className="w-3.5 h-3.5 text-amber-600" />
              </button>
            ))}
          </div>
        )}

        {/* order type */}
        <div className="grid grid-cols-3 gap-2">
          {ORDER_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setOrderType(t.id)}
              className={`py-2 rounded-xl text-xs font-semibold ${orderType === t.id ? "bg-amber-600 text-white" : "bg-slate-100 dark:bg-slate-900"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {orderType === "dine-in" && (
          <input value={table} onChange={(e) => setTable(e.target.value)} placeholder="Table no. (optional)" className={inputCls} />
        )}

        {isDelivery && (
          <div className="space-y-2">
            <select value={deliveryId} onChange={(e) => setDeliveryId(e.target.value)} className={inputCls}>
              {DELIVERY_OPTIONS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
            <input value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} placeholder="Delivery address *" className={inputCls} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Customer name" className={inputCls} />
          <input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder={isDelivery ? "Phone *" : "Phone"} className={inputCls} />
        </div>

        {/* lines */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {cart.length === 0 && <p className="text-sm text-slate-500 py-6 text-center">Choose the size and options, then tap Add to Order.</p>}
          {cart.map((l) => {
            const fullDetails = l.detailTitle || (l.title.includes(" (") ? `(${l.title.split(" (").slice(1).join(" (")}` : "");
            const isExpanded = Boolean(expandedDetails[l.id]);
            // Keep size + first customization visible; expand the remaining details on demand.
            const detailParts = fullDetails.replace(/^\(|\)$/g, "").split(",").map((part) => part.trim()).filter(Boolean);
            const hasMoreDetails = detailParts.length > 2;
            const shortDetails = hasMoreDetails ? `(${detailParts.slice(0, 2).join(", ")}, ` : fullDetails;
            const expandedDetailsText = hasMoreDetails ? `(${detailParts.join(", ")})` : fullDetails;
            return (
            <div key={l.id} className="flex items-center gap-2 text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-semibold whitespace-normal break-words leading-snug">
                  {l.productTitle || l.title.split(" (")[0]}
                  {fullDetails && <span className="font-normal text-slate-500 dark:text-slate-400"> {hasMoreDetails ? (isExpanded ? expandedDetailsText : shortDetails) : fullDetails}{hasMoreDetails && <button type="button" onClick={() => setExpandedDetails((prev) => ({ ...prev, [l.id]: !prev[l.id] }))} className="ml-1 text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">{isExpanded ? "see less" : "see more...)"}</button>}</span>}
                </p>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
                  <span className="text-base font-bold text-slate-800 dark:text-slate-100">{formatPriceWithUSD(l.price).riel}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{formatPriceWithUSD(l.price).usd}</span>
                  {l.discountPercent > 0 && (
                    <span className="text-[10px] text-slate-400 line-through">{formatPriceWithUSD(l.basePrice).riel} · {formatPriceWithUSD(l.basePrice).usd}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg">
                <button onClick={() => changeQty(l.id, -1)} className="p-1.5"><Minus className="w-3.5 h-3.5" /></button>
                <span className="px-2 font-semibold">{l.qty}</span>
                <button onClick={() => changeQty(l.id, 1)} className="p-1.5"><Plus className="w-3.5 h-3.5" /></button>
              </div>
              <span className="w-24 shrink-0 text-right whitespace-nowrap">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{formatPriceWithUSD(l.price * l.qty).riel}</span>{" "}
                <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">{formatPriceWithUSD(l.price * l.qty).usd}</span>
              </span>
              <button onClick={() => removeLine(l.id)} className="p-1 text-rose-500" title="Remove"><X className="w-4 h-4" /></button>
            </div>
            );
          })}
        </div>

        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Order note (less sugar, no ice...)" className={inputCls} />

        {/* promo + manual discount */}
        <form onSubmit={applyPromo} className="flex gap-2">
          <input value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="Promo code" className={inputCls} />
          <button className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white font-semibold text-xs rounded-xl">Apply</button>
        </form>
        {promoMsg && <p className={`text-xs ${promoApplied ? "text-emerald-600" : "text-rose-500"}`}>{promoMsg}</p>}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Staff discount</span>
          <select value={manualPct} onChange={(e) => setManualPct(Number(e.target.value))} className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            {[0, 5, 10, 15, 20].map((p) => <option key={p} value={p}>{p}%</option>)}
          </select>
        </div>

        {/* totals */}
        <div className="space-y-1.5 text-sm border-t border-slate-200 dark:border-slate-700 pt-3">
          <div className="flex justify-between gap-3 text-slate-500"><span>Subtotal</span><span className="text-right"><span className="block text-slate-700 dark:text-slate-200">{formatPriceWithUSD(subtotal).riel}</span><span className="block text-[10px] text-slate-400">{formatPriceWithUSD(subtotal).usd}</span></span></div>
          {discount > 0 && <div className="flex justify-between gap-3 text-emerald-600"><span>Discount ({discountPct}%)</span><span className="text-right"><span className="block">-{formatPriceWithUSD(discount).riel}</span><span className="block text-[10px] text-emerald-500/70">-{formatPriceWithUSD(discount).usd}</span></span></div>}
          {shipping > 0 && <div className="flex justify-between gap-3 text-slate-500"><span>Delivery</span><span className="text-right"><span className="block">{formatPriceWithUSD(shipping).riel}</span><span className="block text-[10px] text-slate-400">{formatPriceWithUSD(shipping).usd}</span></span></div>}
          <div className="flex justify-between gap-3 text-slate-500"><span>Tax (8%)</span><span className="text-right"><span className="block">{formatPriceWithUSD(tax).riel}</span><span className="block text-[10px] text-slate-400">{formatPriceWithUSD(tax).usd}</span></span></div>
          <div className="flex justify-between gap-3 text-lg font-extrabold pt-1"><span>Total</span><span className="text-right text-amber-600 dark:text-amber-400"><span className="block">{formatPriceWithUSD(total).riel}</span><span className="block text-xs font-medium text-amber-500/70">{formatPriceWithUSD(total).usd}</span></span></div>
        </div>

        <div className="flex gap-2">
          <button
            disabled={cart.length === 0}
            onClick={holdOrder}
            className="px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 disabled:opacity-40 flex items-center gap-1.5 text-sm font-semibold"
          >
            <Pause className="w-4 h-4" /> Hold
          </button>
          <button
            disabled={!canCharge}
            onClick={() => setPayOpen(true)}
            className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold shadow-lg transition-all"
          >
            Charge {formatPriceWithUSD(total).riel} ({formatPriceWithUSD(total).usd})
          </button>
        </div>
        {isDelivery && !deliveryOk && <p className="text-xs text-rose-500">Delivery needs a phone number and address.</p>}
      </div>

      {/* SIZE PICKER: shown when a product is sold in more than one way (Regular / Big / Small) */}
      {sizePick && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSizePick(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Choose a size"
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold truncate">{tr(sizePick.name)}</h3>
              <button onClick={() => setSizePick(null)} aria-label="Close"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2">
              {sizeOptions(sizePick).map((o) => (
                <button
                  key={o.key}
                  onClick={() => {
                    addToCart(sizePick, o, customizations[sizePick.id] || {});
                    setSizePick(null);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 font-semibold transition-colors"
                >
                  <span>{o.label}</span>
                  <span className="text-amber-600 dark:text-amber-400">
                    {money(o.unit)}
                    {Number(sizePick.discount_percent) > 0 && (
                      <span className="ml-2 text-xs font-normal line-through text-slate-400">{money(o.base)}</span>
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
              <h3 className="text-lg font-bold">Payment</h3>
              <button onClick={() => setPayOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-3xl font-extrabold text-center text-amber-600 dark:text-amber-400">{money(total)}</p>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "cash", label: "Cash", icon: Banknote },
                { id: "card", label: "Card", icon: CreditCard },
                { id: "qr", label: "QR", icon: QrCode },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setMethod(id)}
                  className={`py-3 rounded-xl border text-sm font-semibold flex flex-col items-center gap-1 ${
                    method === id ? "border-amber-600 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300" : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <Icon className="w-5 h-5" /> {label}
                </button>
              ))}
            </div>

            {method === "cash" && (
              <div className="space-y-3">
                <input type="number" min="0" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} placeholder="Cash received" className={inputCls} />
                <div className="flex gap-2">
                  <button onClick={() => setCashReceived(String(total))} className="flex-1 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold">Exact</button>
                  {[5, 10, 20, 50].map((v) => (
                    <button key={v} onClick={() => setCashReceived(String(v))} className="flex-1 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold">${v}</button>
                  ))}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Change</span>
                  <span className="font-bold">{money(change)}</span>
                </div>
              </div>
            )}
            {method === "card" && <p className="text-sm text-slate-500 text-center">Tap or insert card on the terminal, then confirm.</p>}
            {method === "qr" && <p className="text-sm text-slate-500 text-center">Show the QR code to the customer, then confirm once paid.</p>}

            <button
              disabled={!canPay || paying}
              onClick={confirmPayment}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold"
            >
              {paying ? "Processing..." : "Confirm Payment"}
            </button>
          </div>
        </div>
      )}

      {receipt && <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}