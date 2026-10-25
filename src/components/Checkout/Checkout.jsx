import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { orderService } from "../../services/api";
import { dual } from "../../utils/currency";
import { useOrderQuote } from "../../hooks/useOrderQuote";
import ReceiptModal from "../Dashboard/Receipt";

function Price({ value }) {
  const p = dual(value);
  return (
    <div className="flex flex-col text-right">
      <span className="font-bold">{p.riel}</span>
      <span className="text-xs text-stone-400 font-medium">{p.usd}</span>
    </div>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { items, clearCart } = useCart();
  const { currentUser } = useAuth();

  const shippingMethod = state?.shippingMethod || "standard";
  const promoCode = state?.promoCode || "";
  const isDelivery = shippingMethod !== "standard";
  const orderType = isDelivery ? "delivery" : "pickup";

  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "" });
  const [method, setMethod] = useState("cash"); // how the customer plans to pay (staff take the payment)
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [formError, setFormError] = useState("");

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // a signed-in customer does not have to type the details again
  useEffect(() => {
    if (!currentUser) return;
    setForm((f) => ({
      ...f,
      name: f.name || [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" "),
      phone: f.phone || currentUser.phone || "",
      address: f.address || currentUser.address || "",
    }));
  }, [currentUser]);

  // the SERVER prices the cart: these are the numbers the customer will pay
  const { quote, error: quoteError, pending, apiItems, priceable } = useOrderQuote({
    items,
    orderType,
    deliveryId: shippingMethod,
    promoCode,
  });

  const inputCls =
    "w-full px-4 py-2.5 text-sm rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 focus:outline-none focus:border-amber-500";

  const canPlace = Boolean(quote) && !pending && !quoteError && priceable && !placing;

  const placeOrder = async (e) => {
    e.preventDefault();
    if (!canPlace) return;
    setFormError("");
    if (!form.name.trim() || !form.phone.trim()) return setFormError("Please enter your name and phone number.");
    if (isDelivery && !form.address.trim()) return setFormError("Please enter a delivery address.");

    setPlacing(true);
    try {
      const order = await orderService.createOnline({
        items: apiItems, // ids and quantities only: the server takes the prices from the database
        orderType,
        deliveryId: isDelivery ? shippingMethod : null,
        promoCode,
        customer: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          address: isDelivery ? form.address.trim() : "",
          notes: form.notes.trim(),
        },
        paymentPreference: method,
        expectedTotal: quote.total, // the server refuses if a price changed while the customer was typing
      });
      clearCart();
      setPlaced(order); // the saved order, exactly as the shop sees it
    } catch (err) {
      console.error("Order Creation Error:", err);
      setFormError(err.message || "Could not process your order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  const payChoices = [
    { id: "cash", label: isDelivery ? "Cash on delivery" : "Pay at pickup", sub: "Pay in cash when you receive your order" },
    { id: "card", label: "Card", sub: "Pay by card when you receive your order" },
    { id: "qr", label: "QR payment", sub: "Scan our QR code when you receive your order" },
  ];

  // ---------- Confirmation Screen ----------
  if (placed) {
    const total = dual(placed.total);
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm p-10 max-w-md w-full text-center space-y-4">
          <div className="text-6xl">✅</div>
          <h1 className="text-2xl font-extrabold">Thank you, {placed.customer?.name}!</h1>
          <p className="text-stone-500 dark:text-stone-400">
            Your order <span className="font-bold text-amber-600">{placed.number}</span> has been received.
          </p>
          <p className="text-sm text-stone-500">
            {placed.orderType === "delivery"
              ? "We'll deliver in about 20–30 minutes."
              : "It will be ready for pickup in about 10 minutes."}
          </p>
          <p className="text-sm font-semibold">
            Amount to pay: {total.riel} <span className="text-xs font-normal text-stone-400">{total.usd}</span>
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowReceipt(true)}
              className="flex-1 py-3 rounded-xl border border-stone-300 dark:border-stone-700 font-semibold cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              View receipt
            </button>
            <button
              onClick={() => navigate("/shop")}
              className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer transition-colors shadow-sm"
            >
              Back to menu
            </button>
          </div>
        </div>

        {showReceipt && <ReceiptModal order={placed} onClose={() => setShowReceipt(false)} />}
      </div>
    );
  }

  // ---------- Empty Cart ----------
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col items-center justify-center gap-4">
        <div className="text-5xl">🛒</div>
        <p className="font-semibold">Your cart is empty.</p>
        <button
          onClick={() => navigate("/shop")}
          className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer shadow-sm"
        >
          Browse the menu
        </button>
      </div>
    );
  }

  // ---------- Checkout Form ----------
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white text-xl shadow-sm">
              ☕
            </div>
            <span className="font-extrabold text-lg">Café ខ្មោច</span>
          </div>
          <button onClick={() => navigate("/cart")} className="text-sm font-semibold text-amber-600 cursor-pointer hover:underline">
            ← Back to cart
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold mb-8">Checkout</h1>

        {!priceable && (
          <div role="alert" className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm">
            Some items in your cart were added before the menu was updated. Please{" "}
            <Link to="/cart" className="font-semibold underline">go back to the cart</Link>, remove them and add them again.
          </div>
        )}

        <form onSubmit={placeOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4">
              <h2 className="font-bold">Your details</h2>
              {!currentUser && (
                <p className="text-xs text-stone-500">
                  Have an account?{" "}
                  <Link to="/login" className="text-amber-600 font-semibold hover:underline">Sign in</Link> to see this order in your profile.
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input className={inputCls} placeholder="Full name *" value={form.name} onChange={(e) => setField("name", e.target.value)} />
                <input className={inputCls} placeholder="Phone number *" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
              </div>
              {isDelivery && (
                <input className={inputCls} placeholder="Delivery address *" value={form.address} onChange={(e) => setField("address", e.target.value)} />
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
              <h2 className="font-bold">How will you pay?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {payChoices.map((m) => (
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
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {items.map((i, idx) => (
                <div key={i.id} className="flex justify-between items-center text-sm gap-3">
                  <span className="truncate">
                    {i.quantity} × {i.title}
                  </span>
                  <Price value={quote?.lines?.[idx]?.lineTotal ?? i.price * i.quantity} />
                </div>
              ))}
            </div>

            <div className="space-y-3 text-sm border-t border-stone-200 dark:border-stone-800 pt-4">
              {quote ? (
                <>
                  <div className="flex justify-between text-stone-500 items-center">
                    <span>Subtotal</span>
                    <Price value={quote.subtotal} />
                  </div>
                  {quote.discount > 0 && (
                    <div className="flex justify-between text-emerald-600 items-center">
                      <span>Discount ({quote.discountPct}%)</span>
                      <div className="flex items-center gap-1">
                        <span>-</span>
                        <Price value={quote.discount} />
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between text-stone-500 items-center">
                    <span>{isDelivery ? "Delivery" : "Pickup"}</span>
                    {quote.shipping ? <Price value={quote.shipping} /> : <span className="font-medium text-stone-900 dark:text-white">Free</span>}
                  </div>
                  <div className="flex justify-between text-stone-500 items-center">
                    <span>Tax</span>
                    <Price value={quote.tax} />
                  </div>
                  <div className="flex justify-between text-base font-extrabold pt-2 border-t border-stone-200 dark:border-stone-800 items-center">
                    <span>Total</span>
                    <div className="text-amber-600"><Price value={quote.total} /></div>
                  </div>
                </>
              ) : (
                <p className="text-stone-400">{quoteError ? "" : "Calculating your total..."}</p>
              )}
            </div>

            {(quoteError || formError) && (
              <p role="alert" className="text-xs text-rose-500">
                {quoteError || formError}
              </p>
            )}

            <button
              type="submit"
              disabled={!canPlace}
              className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold shadow-lg cursor-pointer flex items-center justify-center gap-2 transition-all"
            >
              <span>{placing ? "Placing order..." : pending ? "Updating prices..." : "Place order ·"}</span>
              {!placing && !pending && quote && (
                <div className="text-left leading-tight">
                  <span className="block font-bold">{dual(quote.total).riel}</span>
                  <span className="block text-[10px] text-amber-200 font-normal">{dual(quote.total).usd}</span>
                </div>
              )}
            </button>
          </aside>
        </form>
      </main>
    </div>
  );
}