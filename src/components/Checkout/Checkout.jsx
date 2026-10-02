import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { orderService } from "../../services/api";
import ReceiptModal from "../Dashboard/Receipt";
import { calcTotals, promoPercent, money } from "../../utils/orderCalc";

export default function Checkout() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { items, clearCart } = useCart();

  const shippingMethod = state?.shippingMethod || "standard";
  const isDelivery = shippingMethod !== "standard";

  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "" });
  const [method, setMethod] = useState("cash");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Same calculation as Cart and POS
  const discountPct = promoPercent(state?.promoCode);
  const { subtotal, discount, shipping, tax, total } = calcTotals(items, {
    discountPct,
    deliveryId: shippingMethod,
  });

  const inputCls =
    "w-full px-4 py-2.5 text-sm rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 focus:outline-none focus:border-amber-500";

  const placeOrder = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return alert("Please enter your name and phone number.");
    if (isDelivery && !form.address.trim()) return alert("Please enter a delivery address.");

    setPlacing(true);
    try {
      const order = await orderService.create({
        items: items.map((i) => ({ id: i.id, title: i.title, price: i.price, qty: i.quantity })),
        orderType: isDelivery ? "delivery" : "pickup",
        customer: { ...form },
        paymentMethod: method,
        subtotal,
        discount,
        shipping,
        tax,
        total,
        cashReceived: null,
        change: 0,
        source: "online",
        status: "pending",
      });
      clearCart();
      setPlaced(order);
    } finally {
      setPlacing(false);
    }
  };

  // ---------- Confirmation screen ----------
  if (placed) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm p-10 max-w-md w-full text-center space-y-4">
          <div className="text-6xl">✅</div>
          <h1 className="text-2xl font-extrabold">Thank you, {placed.customer.name}!</h1>
          <p className="text-stone-500 dark:text-stone-400">
            Your order <span className="font-bold text-amber-600">{placed.number}</span> has been received.
          </p>
          <p className="text-sm text-stone-500">
            {placed.orderType === "delivery"
              ? "We'll deliver in about 20–30 minutes."
              : "It will be ready for pickup in about 10 minutes."}
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowReceipt(true)}
              className="flex-1 py-3 rounded-xl border border-stone-300 dark:border-stone-700 font-semibold cursor-pointer"
            >
              View receipt
            </button>
            <button
              onClick={() => navigate("/shop")}
              className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer"
            >
              Back to menu
            </button>
          </div>
        </div>
        {showReceipt && <ReceiptModal order={placed} onClose={() => setShowReceipt(false)} />}
      </div>
    );
  }

  // ---------- Empty cart ----------
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col items-center justify-center gap-4">
        <div className="text-5xl">🛒</div>
        <p className="font-semibold">Your cart is empty.</p>
        <button
          onClick={() => navigate("/shop")}
          className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer"
        >
          Browse the menu
        </button>
      </div>
    );
  }

  // ---------- Checkout form ----------
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white text-xl">
              ☕
            </div>
            <span className="font-extrabold text-lg">Bean & Blossom</span>
          </div>
          <button onClick={() => navigate("/cart")} className="text-sm font-semibold text-amber-600 cursor-pointer">
            ← Back to cart
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold mb-8">Checkout</h1>

        <form onSubmit={placeOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4">
              <h2 className="font-bold">Your details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  className={inputCls}
                  placeholder="Full name *"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                />
                <input
                  className={inputCls}
                  placeholder="Phone number *"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                />
              </div>
              {isDelivery && (
                <input
                  className={inputCls}
                  placeholder="Delivery address *"
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                />
              )}
              <textarea
                className={inputCls}
                rows={2}
                placeholder="Notes (less sugar, no ice...)"
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
              />
              <p className="text-xs text-stone-500">
                {isDelivery ? "Delivery selected in your cart." : "Store pickup selected in your cart."}
              </p>
            </section>

            <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4">
              <h2 className="font-bold">Payment method</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: "cash", label: isDelivery ? "Cash on delivery" : "Pay at pickup", sub: "Pay when you receive" },
                  { id: "card", label: "Card", sub: "Pay now (demo)" },
                  { id: "qr", label: "QR payment", sub: "Pay now (demo)" },
                ].map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      method === m.id
                        ? "border-amber-600 bg-amber-50/50 dark:bg-amber-950/30"
                        : "border-stone-200 dark:border-stone-800 hover:border-amber-400"
                    }`}
                  >
                    <p className="font-semibold text-sm">{m.label}</p>
                    <p className="text-xs text-stone-500 mt-1">{m.sub}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 space-y-4 lg:sticky lg:top-24">
            <h2 className="text-lg font-bold">Order summary</h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {items.map((i) => (
                <div key={i.id} className="flex justify-between text-sm gap-3">
                  <span className="truncate">
                    {i.quantity} × {i.title}
                  </span>
                  <span className="font-medium">{money(i.price * i.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 text-sm border-t border-stone-200 dark:border-stone-800 pt-4">
              <div className="flex justify-between text-stone-500">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount ({discountPct}%)</span>
                  <span>-{money(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-500">
                <span>{isDelivery ? "Delivery" : "Pickup"}</span>
                <span>{shipping ? money(shipping) : "Free"}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Tax (8%)</span>
                <span>{money(tax)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold pt-2 border-t border-stone-200 dark:border-stone-800">
                <span>Total</span>
                <span className="text-amber-600">{money(total)}</span>
              </div>
            </div>
            <button
              disabled={placing}
              className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold shadow-lg cursor-pointer"
            >
              {placing ? "Placing order..." : `Place order · ${money(total)}`}
            </button>
          </aside>
        </form>
      </main>
    </div>
  );
}