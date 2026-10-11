import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Minus, X, Banknote, CreditCard, QrCode, Pause, Play, Bell, RotateCcw } from "lucide-react";
import { categoryService, productService, orderService, assetUrl } from "../../services/api";
import { calcTotals, promoPercent, round2, money } from "../../utils/orderCalc";
import { tr, asList, bySort } from "./Shared.jsx";
import ReceiptModal from "./Receipt";

const HELD_KEY = "bb_held_v1";
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

export default function POS() {
  const navigate = useNavigate();

  // menu from the database
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // menu browsing
  const [category, setCategory] = useState("all"); // "all" | category id
  const [search, setSearch] = useState("");
  const [sizePick, setSizePick] = useState(null); // product waiting for a size choice

  // current order
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState("dine-in");
  const [table, setTable] = useState("");
  const [deliveryId, setDeliveryId] = useState("express");
  const [customer, setCustomer] = useState(emptyCustomer);
  const [note, setNote] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoMsg, setPromoMsg] = useState("");
  const [manualPct, setManualPct] = useState(0);

  // held orders + online orders waiting
  const [held, setHeld] = useState(readHeld);
  const [pendingOnline, setPendingOnline] = useState(0);

  // payment
  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const loadMenu = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [prods, cs] = await Promise.all([productService.list(), categoryService.list()]);
      setProducts(asList(prods));
      setCats(asList(cs));
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

  // category tabs: only active categories that have something to sell
  const categoryTabs = useMemo(() => {
    const used = new Set(availableItems.map((p) => p.category_id));
    return cats.filter((c) => Number(c.status) === 1 && used.has(c.id)).sort(bySort);
  }, [cats, availableItems]);

  // the chosen category disappeared (hidden / emptied) -> back to All
  useEffect(() => {
    if (category !== "all" && !categoryTabs.some((c) => c.id === category)) setCategory("all");
  }, [categoryTabs, category]);

  const visible = useMemo(
    () =>
      availableItems.filter(
        (p) =>
          (category === "all" || p.category_id === category) &&
          Object.values(p.name || {}).join(" ").toLowerCase().includes(search.toLowerCase())
      ),
    [availableItems, category, search]
  );

  // ---- cart actions ----
  // one cart line per product + size, so "Iced Latte (Big)" and "Iced Latte (Small)" stay separate
  const addToCart = (product, option) => {
    const lineId = `${product.id}:${option.key}`;
    const options = sizeOptions(product);
    const showSize = options.length > 1 || option.key !== "price";
    const title = showSize ? `${tr(product.name)} (${option.label})` : tr(product.name);
    setCart((prev) => {
      const found = prev.find((l) => l.id === lineId);
      return found
        ? prev.map((l) => (l.id === lineId ? { ...l, qty: l.qty + 1 } : l))
        : [
            ...prev,
            {
              id: lineId,
              productId: product.id,
              size: option.key,
              title,
              price: option.unit, // price after the product discount: totals below use this
              basePrice: option.base,
              discountPercent: Number(product.discount_percent || 0),
              taxPercent: hasValue(product.tax_percent) ? Number(product.tax_percent) : null,
              qty: 1,
            },
          ];
    });
  };
  // tap on a product: one way to sell it -> add it, several sizes -> ask which one
  const pickProduct = (product) => {
    const options = sizeOptions(product);
    if (options.length === 1) addToCart(product, options[0]);
    else setSizePick(product);
  };
  const changeQty = (id, d) =>
    setCart((prev) => prev.map((l) => (l.id === id ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0));
  const removeLine = (id) => setCart((prev) => prev.filter((l) => l.id !== id));

  const resetOrder = () => {
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
    resetOrder();
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

        <div className="flex flex-wrap gap-2">
          {[{ id: "all", name: { en: "All" } }, ...categoryTabs].map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                category === c.id ? "bg-amber-600 text-white shadow" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-500"
              }`}
            >
              {tr(c.name)}
            </button>
          ))}
        </div>

        {loadError && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-sm flex items-center justify-between">
            {loadError}
            <button onClick={loadMenu} className="font-semibold underline">Retry</button>
          </div>
        )}

        {loading && products.length === 0 ? (
          <p className="text-slate-500">Loading menu...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {visible.map((item) => {
              const options = sizeOptions(item);
              const lowest = options.reduce((a, b) => (b.unit < a.unit ? b : a));
              const discount = Number(item.discount_percent || 0);
              const img = assetUrl(item.thumbnail || item.img);
              return (
                <button
                  key={item.id}
                  onClick={() => pickProduct(item)}
                  className="text-left bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:border-amber-500 hover:shadow-lg active:scale-[0.98] transition-all"
                >
                  <div className="relative">
                    {img ? (
                      <img src={img} alt={tr(item.name)} className="h-28 w-full object-cover" />
                    ) : (
                      <div className="h-28 w-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-xs text-slate-400">No image</div>
                    )}
                    {discount > 0 && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-bold">
                        -{discount}%
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm line-clamp-1">{tr(item.name)}</p>
                    <p className="text-amber-600 dark:text-amber-400 font-bold">
                      {options.length > 1 && <span className="text-xs font-medium text-slate-500">from </span>}
                      {money(lowest.unit)}
                      {discount > 0 && <span className="ml-1.5 text-xs font-normal line-through text-slate-400">{money(lowest.base)}</span>}
                    </p>
                  </div>
                </button>
              );
            })}
            {!loading && !loadError && visible.length === 0 && <p className="col-span-full text-slate-500">No items found.</p>}
          </div>
        )}
      </div>

      {/* RIGHT: current order */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 xl:sticky xl:top-0 xl:max-h-[calc(100vh-7rem)] overflow-y-auto">
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
          {cart.length === 0 && <p className="text-sm text-slate-500 py-6 text-center">Tap an item to add it.</p>}
          {cart.map((l) => (
            <div key={l.id} className="flex items-center gap-2 text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{l.title}</p>
                <p className="text-xs text-slate-500">
                  {money(l.price)}
                  {l.discountPercent > 0 && (
                    <span className="ml-1.5 line-through text-slate-400">{money(l.basePrice)}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg">
                <button onClick={() => changeQty(l.id, -1)} className="p-1.5"><Minus className="w-3.5 h-3.5" /></button>
                <span className="px-2 font-semibold">{l.qty}</span>
                <button onClick={() => changeQty(l.id, 1)} className="p-1.5"><Plus className="w-3.5 h-3.5" /></button>
              </div>
              <span className="w-14 text-right font-semibold">{money(l.price * l.qty)}</span>
              <button onClick={() => removeLine(l.id)} className="p-1 text-rose-500" title="Remove"><X className="w-4 h-4" /></button>
            </div>
          ))}
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
          <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{money(subtotal)}</span></div>
          {discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount ({discountPct}%)</span><span>-{money(discount)}</span></div>}
          {shipping > 0 && <div className="flex justify-between text-slate-500"><span>Delivery</span><span>{money(shipping)}</span></div>}
          <div className="flex justify-between text-slate-500"><span>Tax (8%)</span><span>{money(tax)}</span></div>
          <div className="flex justify-between text-lg font-extrabold pt-1"><span>Total</span><span className="text-amber-600 dark:text-amber-400">{money(total)}</span></div>
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
            Charge {money(total)}
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
                    addToCart(sizePick, o);
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