import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { calcTotals, promoPercent, money } from "../../utils/orderCalc";

const SHIPPING_OPTIONS = [
  { id: "standard", label: "Store Pickup", price: "Free", sub: "Ready in 10 mins" },
  { id: "express", label: "Local Delivery", price: "$3.50", sub: "20-30 minutes" },
  { id: "freight", label: "Catering Delivery", price: "$8.00", sub: "Scheduled, bulk orders" },
];

export default function CartPage() {
  const navigate = useNavigate();
  const { items: cartItems, updateQuantity, removeItem } = useCart();

  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoMsg, setPromoMsg] = useState("");
  const [shippingMethod, setShippingMethod] = useState("standard");

  const discountPct = promoApplied ? promoPercent(promoCode) : 0;
  const { subtotal, discount, shipping: shippingCost, tax, total } = calcTotals(cartItems, {
    discountPct,
    deliveryId: shippingMethod,
  });

  const handleApplyPromo = (e) => {
    e.preventDefault();
    if (promoPercent(promoCode) > 0) {
      setPromoApplied(true);
      setPromoMsg(`Promo code applied: ${promoPercent(promoCode)}% off!`);
    } else {
      setPromoApplied(false);
      setPromoMsg("Invalid promo code. Try 'BLOSSOM10'");
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors duration-300">
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white text-xl shadow-md">☕</div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Bean & Blossom</span>
          </div>
          <button
            onClick={() => navigate("/shop")}
            className="px-4 py-2 text-sm font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-xl border border-amber-200 dark:border-amber-800 transition-all cursor-pointer"
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

        {cartItems.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-12 text-center border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="text-5xl">🛒</div>
            <h3 className="text-xl font-bold">Your cart is empty</h3>
            <p className="text-sm text-stone-500">You haven't added any drinks yet.</p>
            <button onClick={() => navigate("/shop")} className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-md transition-all cursor-pointer">
              Browse the Menu
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="bg-white dark:bg-stone-900 p-5 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center gap-5">
                  <img src={item.img} alt={item.title} className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl bg-stone-100 dark:bg-stone-800 shrink-0" />
                  <div className="flex-1 space-y-1 text-center sm:text-left">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">{item.category}</span>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-lg font-bold">{money(item.price)}</p>
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
              ))}

              <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-4">
                <h4 className="font-semibold text-sm">Pickup or Delivery</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {SHIPPING_OPTIONS.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setShippingMethod(m.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        shippingMethod === m.id ? "border-amber-600 bg-amber-50/50 dark:bg-amber-950/30" : "border-stone-200 dark:border-stone-800 hover:border-amber-400"
                      }`}
                    >
                      <div className="flex justify-between items-center font-semibold text-sm">
                        <span>{m.label}</span>
                        <span className="text-amber-600 dark:text-amber-400">{m.price}</span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1">{m.sub}</p>
                    </div>
                  ))}
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
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:border-amber-500"
                  />
                  <button type="submit" className="px-4 py-2 bg-stone-900 dark:bg-stone-800 text-white font-semibold text-xs rounded-xl hover:bg-stone-700 transition-colors cursor-pointer">Apply</button>
                </form>
                {promoMsg && <p className={`text-xs ${promoApplied ? "text-emerald-600" : "text-rose-500"}`}>{promoMsg}</p>}
              </div>

              <div className="space-y-3 text-sm border-t border-stone-200 dark:border-stone-800 pt-4">
                <div className="flex justify-between text-stone-500"><span>Subtotal</span><span className="text-stone-900 dark:text-white font-medium">{money(subtotal)}</span></div>
                {discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount ({discountPct}%)</span><span>-{money(discount)}</span></div>}
                <div className="flex justify-between text-stone-500"><span>{shippingMethod === "standard" ? "Pickup" : "Delivery"}</span><span className="text-stone-900 dark:text-white font-medium">{shippingCost === 0 ? "Free" : money(shippingCost)}</span></div>
                <div className="flex justify-between text-stone-500"><span>Estimated Tax (8%)</span><span className="text-stone-900 dark:text-white font-medium">{money(tax)}</span></div>
                <div className="border-t border-stone-200 dark:border-stone-800 pt-3 flex justify-between text-base font-extrabold"><span>Total Amount</span><span className="text-amber-600 dark:text-amber-400">{money(total)}</span></div>
              </div>

              <button
                onClick={() => navigate("/checkout", { state: { shippingMethod, promoCode: promoApplied ? promoCode : "" } })}
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/20 transition-all text-center cursor-pointer"
              >
                Proceed to Checkout
              </button>
              <div className="text-center"><span className="text-xs text-stone-400">🔒 Secure checkout</span></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}