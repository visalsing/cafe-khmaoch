import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { orderService } from "../../services/api";
import { dual } from "../../utils/currency";
import { isPricable, useOrderQuote, useShopOptions } from "../../hooks/useOrderQuote";

// short texts for the delivery choices (the names and fees come from the database)
const SHIPPING_TEXT = {
  standard: { label: "Store Pickup", sub: "Ready in 10 mins" },
  express: { sub: "20-30 minutes" },
  freight: { sub: "Scheduled, bulk orders" },
};

function Price({ value }) {
  const p = dual(value);
  return (
    <div className="flex flex-col">
      <span className="font-bold">{p.riel}</span>
      <span className="text-xs text-stone-400 font-medium">{p.usd}</span>
    </div>
  );
}

export default function CartPage() {
  const navigate = useNavigate();
  const { items: cartItems, updateQuantity, removeItem } = useCart();
  const options = useShopOptions();

  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoMsg, setPromoMsg] = useState("");
  const [shippingMethod, setShippingMethod] = useState("standard");

  const choices = (options.delivery.length ? options.delivery : [{ code: "standard", name: "Standard", fee: 0 }]).map((d) => ({
    id: d.code,
    label: SHIPPING_TEXT[d.code]?.label || d.name,
    sub: SHIPPING_TEXT[d.code]?.sub || "",
    price: d.fee,
  }));
  const choiceIds = choices.map((c) => c.id).join(",");

  // a delivery choice that was switched off in the dashboard falls back to pickup
  useEffect(() => {
    if (options.loaded && !choiceIds.split(",").includes(shippingMethod)) setShippingMethod("standard");
  }, [options.loaded, choiceIds, shippingMethod]);

  const isDelivery = shippingMethod !== "standard";
  const { quote, error: quoteError, pending } = useOrderQuote({
    items: cartItems,
    orderType: isDelivery ? "delivery" : "pickup",
    deliveryId: shippingMethod,
    promoCode: promoApplied ? promoCode : "",
  });

  // lines added before the menu moved to the database have no product id: they cannot be ordered
  const oldItems = cartItems.filter((i) => !isPricable(i));
  const canCheckout = Boolean(quote) && !pending && !quoteError && oldItems.length === 0;

  const handleApplyPromo = async (e) => {
    e.preventDefault();
    const code = promoCode.trim();
    if (!code) return;
    try {
      const res = await orderService.checkPromo(code); // the server knows the codes
      setPromoCode(res.code);
      setPromoApplied(true);
      setPromoMsg(`Promo code applied: ${res.percent}% off!`);
    } catch (err) {
      setPromoApplied(false);
      setPromoMsg(err.message || "Invalid promo code.");
    }
  };

  // until the server has answered, amounts show "…" instead of a wrong number
  const amount = (n) => (quote ? <Price value={n} /> : <span className="text-stone-400">…</span>);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors duration-300">
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-500 to-orange-600 flex items-center justify-center text-white text-xl shadow-md">☕</div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-accent-600 to-orange-600 bg-clip-text text-transparent">Café ខ្មោច</span>
          </div>
          <button
            onClick={() => navigate("/shop")}
            className="px-4 py-2 text-sm font-semibold text-accent-700 dark:text-accent-400 bg-accent-50 dark:bg-accent-950/50 hover:bg-accent-100 dark:hover:bg-accent-900/50 rounded-xl border border-accent-200 dark:border-accent-800 transition-all cursor-pointer"
          >
            &larr; Continue Ordering
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Your Order</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">Review your drinks & treats before checkout</p>
        </div>

        {oldItems.length > 0 && (
          <div role="alert" className="p-4 rounded-2xl bg-accent-50 dark:bg-accent-950/30 border border-accent-200 dark:border-accent-800 text-sm flex items-center justify-between gap-3">
            <span>
              {oldItems.length} item{oldItems.length > 1 ? "s were" : " was"} added before the menu was updated and cannot be ordered.
              Remove {oldItems.length > 1 ? "them" : "it"} and add {oldItems.length > 1 ? "them" : "it"} again from the menu.
            </span>
            <button onClick={() => oldItems.forEach((i) => removeItem(i.id))} className="font-semibold underline shrink-0 cursor-pointer">
              Remove
            </button>
          </div>
        )}

        {cartItems.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-12 text-center border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="text-5xl">🛒</div>
            <h3 className="text-xl font-bold">Your cart is empty</h3>
            <p className="text-sm text-stone-500">You haven't added any drinks yet.</p>
            <button onClick={() => navigate("/shop")} className="px-6 py-3 bg-accent-600 hover:bg-accent-700 text-white font-semibold rounded-xl shadow-md transition-all cursor-pointer">
              Browse the Menu
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item, idx) => {
                const unit = dual(quote?.lines?.[idx]?.price ?? item.price); // the server's price when it has one
                return (
                  <div key={item.id} className="bg-white dark:bg-stone-900 p-5 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center gap-5">
                    <img src={item.img} alt={item.title} className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl bg-stone-100 dark:bg-stone-800 shrink-0" />
                    <div className="flex-1 space-y-1 text-center sm:text-left">
                      <span className="text-xs font-bold uppercase tracking-wider text-accent-600 dark:text-accent-400">{item.category}</span>
                      <h3 className="font-semibold">{item.title}</h3>
                      <div className="flex flex-col sm:items-start">
                        <span className="text-lg font-bold">{unit.riel}</span>
                        <span className="text-xs text-stone-400 font-medium">{unit.usd}</span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:items-end justify-between h-full gap-4">
                      <button onClick={() => removeItem(item.id)} className="text-xs text-rose-500 hover:text-rose-700 font-semibold cursor-pointer">Remove ✕</button>
                      <div className="flex items-center border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden bg-stone-50 dark:bg-stone-950">
                        <button onClick={() => updateQuantity(item.id, -1)} className="px-3 py-1 hover:bg-stone-200 dark:hover:bg-stone-800 cursor-pointer">-</button>
                        <span className="px-3 py-1 text-sm font-semibold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="px-3 py-1 hover:bg-stone-200 dark:hover:bg-stone-800 cursor-pointer">+</button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-4">
                <h4 className="font-semibold text-sm">Pickup or Delivery</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {choices.map((m) => {
                    const fee = dual(m.price);
                    return (
                      <div
                        key={m.id}
                        onClick={() => setShippingMethod(m.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          shippingMethod === m.id ? "border-accent-600 bg-accent-50/50 dark:bg-accent-950/30" : "border-stone-200 dark:border-stone-800 hover:border-accent-400"
                        }`}
                      >
                        <div className="flex justify-between items-center font-semibold text-sm">
                          <span>{m.label}</span>
                          <span className="text-accent-600 dark:text-accent-400">{m.price === 0 ? "Free" : fee.riel}</span>
                        </div>
                        {m.price > 0 && <div className="text-right text-xs text-stone-400 font-medium">{fee.usd}</div>}
                        {m.sub && <p className="text-xs text-stone-500 mt-1">{m.sub}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 space-y-6">
              <h3 className="text-lg font-bold">Order Summary</h3>

              <div className="space-y-2">
                <form onSubmit={handleApplyPromo} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Promo Code (e.g., BLOSSOM10)"
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value);
                      setPromoApplied(false); // typing again cancels an applied code
                      setPromoMsg("");
                    }}
                    className="flex-1 px-3 py-2 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:border-accent-500"
                  />
                  <button type="submit" className="px-4 py-2 bg-stone-900 dark:bg-stone-800 text-white font-semibold text-xs rounded-xl hover:bg-stone-700 transition-colors cursor-pointer">Apply</button>
                </form>
                {promoMsg && <p className={`text-xs ${promoApplied ? "text-emerald-600" : "text-rose-500"}`}>{promoMsg}</p>}
              </div>

              <div className="space-y-3 text-sm border-t border-stone-200 dark:border-stone-800 pt-4">
                <div className="flex justify-between text-stone-500 items-center">
                  <span>Subtotal</span>
                  <div className="text-right">{amount(quote?.subtotal)}</div>
                </div>
                {quote?.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 items-center">
                    <span>Discount ({quote.discountPct}%)</span>
                    <div className="text-right">-{amount(quote.discount)}</div>
                  </div>
                )}
                <div className="flex justify-between text-stone-500 items-center">
                  <span>{isDelivery ? "Delivery" : "Pickup"}</span>
                  <div className="text-right">
                    {quote && quote.shipping === 0 ? <span className="font-medium text-stone-900 dark:text-white">Free</span> : amount(quote?.shipping)}
                  </div>
                </div>
                <div className="flex justify-between text-stone-500 items-center">
                  <span>Tax</span>
                  <div className="text-right">{amount(quote?.tax)}</div>
                </div>
                <div className="border-t border-stone-200 dark:border-stone-800 pt-3 flex justify-between text-base font-extrabold items-center">
                  <span>Total Amount</span>
                  <div className="text-right text-accent-600 dark:text-accent-400">{amount(quote?.total)}</div>
                </div>
              </div>

              {quoteError && (
                <p role="alert" className="text-xs text-rose-500">
                  {quoteError}
                </p>
              )}

              <button
                disabled={!canCheckout}
                onClick={() => navigate("/checkout", { state: { shippingMethod, promoCode: promoApplied ? promoCode : "" } })}
                className="w-full py-3.5 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-accent-500/20 transition-all text-center cursor-pointer"
              >
                {pending ? "Updating prices..." : "Proceed to Checkout"}
              </button>
              <div className="text-center"><span className="text-xs text-stone-400">🔒 Secure checkout</span></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}