import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CartPage() {
  const navigate = useNavigate();

  // Simulated cart items matching SM Solar products
  // const [cartItems, setCartItems] = useState([
  //   {
  //     id: 1,
  //     title: "SM Solar Apex Pro 540W Monocrystalline Panel",
  //     category: "Solar Panels",
  //     price: 289.00,
  //     quantity: 2,
  //     img: "https://images.unsplash.com/photo-1509391365360-86929bf4f1e5?auto=format&fit=crop&w=600&q=80",
  //   },
  //   {
  //     id: 2,
  //     title: "SM GridSync Hybrid Inverter 10kW",
  //     category: "Inverters",
  //     price: 1250.00,
  //     quantity: 1,
  //     img: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=600&q=80",
  //   },
  //   {
  //     id: 4,
  //     title: "SM EcoVolt MPPT Solar Charge Controller 60A",
  //     category: "Smart Controllers",
  //     price: 145.00,
  //     quantity: 1,
  //     img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80",
  //   },
  // ]);
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      title: "Signature Caramel Latte",
      category: "Coffee",
      price: 4.5,
      quantity: 2,
      img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 5,
      title: "Butter Croissant",
      category: "Pastries",
      price: 3.2,
      quantity: 2,
      img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 3,
      title: "Iced Matcha Blossom",
      category: "Tea & Matcha",
      price: 5.2,
      quantity: 1,
      img: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=600&q=80",
    },
  ]);

  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [shippingMethod, setShippingMethod] = useState("standard");

  // Quantity handlers
  const updateQuantity = (id, delta) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean),
    );
  };

  const removeItem = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Calculations
  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );
  // const shippingCost = shippingMethod === "express" ? 85.00 : shippingMethod === "freight" ? 150.00 : 0.00;
  const shippingCost =
    shippingMethod === "express" ? 3.5 : shippingMethod === "freight" ? 8.0 : 0;
  const tax = subtotal * 0.08; // 8% estimated tax
  const total = subtotal - discount + shippingCost + tax;

  // const handleApplyPromo = (e) => {
  //   e.preventDefault();
  //   if (promoCode.toUpperCase() === "SMSOLAR10") {
  //     setDiscount(subtotal * 0.1);
  //     alert("Promo code applied: 10% off!");
  //   } else {
  //     alert("Invalid promo code. Try 'SMSOLAR10'");
  //   }
  // };
  const handleApplyPromo = (e) => {
    e.preventDefault();
    if (promoCode.toUpperCase() === "BLOSSOM10") {
      setDiscount(subtotal * 0.1);
      alert("Promo code applied: 10% off!");
    } else alert("Invalid promo code. Try 'BLOSSOM10'");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* ================= NAVBAR SECTION ================= */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
              ⚡
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              SM Solar
            </span>
          </div>

          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl border border-blue-200 dark:border-blue-800 transition-all"
          >
            &larr; Continue Shopping
          </button>
        </div>
      </nav>

      {/* ================= MAIN CONTAINER ================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Shopping Cart
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Review your solar hardware order before proceeding to secure
            checkout
          </p>
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="text-5xl">🛒</div>
            <h3 className="text-xl font-bold">Your cart is empty</h3>
            <p className="text-sm text-slate-500">
              Looks like you haven't added any solar hardware to your cart yet.
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition-all"
            >
              Explore Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Column: Cart Item List */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-5"
                >
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0"
                  />
                  <div className="flex-1 space-y-1 text-center sm:text-left">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      {item.category}
                    </span>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      ${item.price.toFixed(2)}
                    </p>
                  </div>

                  {/* Quantity Controls & Remove */}
                  <div className="flex flex-col sm:items-end justify-between h-full gap-4">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-xs text-rose-500 hover:text-rose-700 font-semibold"
                    >
                      Remove ✕
                    </button>
                    <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="px-3 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                      >
                        -
                      </button>
                      <span className="px-3 py-1 text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="px-3 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Shipping Selection Options */}
              <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <h4 className="font-semibold text-sm">
                  Select Shipping Method
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    // {
                    //   id: "standard",
                    //   label: "Standard Ground",
                    //   price: "Free",
                    //   sub: "3-5 Business Days",
                    // },
                    // {
                    //   id: "express",
                    //   label: "Express Freight",
                    //   price: "$85.00",
                    //   sub: "1-2 Business Days",
                    // },
                    // {
                    //   id: "freight",
                    //   label: "Heavy Pallet Freight",
                    //   price: "$150.00",
                    //   sub: "Commercial Delivery",
                    // },
                    // shipping options
                    {
                      id: "standard",
                      label: "Store Pickup",
                      price: "Free",
                      sub: "Ready in 10 mins",
                    },
                    {
                      id: "express",
                      label: "Local Delivery",
                      price: "$3.50",
                      sub: "20-30 minutes",
                    },
                    {
                      id: "freight",
                      label: "Catering Delivery",
                      price: "$8.00",
                      sub: "Scheduled, bulk orders",
                    },
                  ].map((method) => (
                    <div
                      key={method.id}
                      onClick={() => setShippingMethod(method.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        shippingMethod === method.id
                          ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30"
                          : "border-slate-200 dark:border-slate-800 hover:border-blue-400"
                      }`}
                    >
                      <div className="flex justify-between items-center font-semibold text-sm">
                        <span>{method.label}</span>
                        <span className="text-blue-600 dark:text-blue-400">
                          {method.price}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {method.sub}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary & Checkout Card */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
              <h3 className="text-lg font-bold">Order Summary</h3>

              {/* Promo Code Input Form */}
              <form onSubmit={handleApplyPromo} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Promo Code (e.g., SMSOLAR10)"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white font-semibold text-xs rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Apply
                </button>
              </form>

              <div className="space-y-3 text-sm border-t border-slate-200 dark:border-slate-800 pt-4">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="text-slate-900 dark:text-white font-medium">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount (10%)</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>Estimated Shipping</span>
                  <span className="text-slate-900 dark:text-white font-medium">
                    {shippingCost === 0
                      ? "Free"
                      : `$${shippingCost.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Estimated Tax (8%)</span>
                  <span className="text-slate-900 dark:text-white font-medium">
                    ${tax.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-between text-base font-extrabold">
                  <span>Total Amount</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => navigate("/checkout")}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all text-center"
              >
                Proceed to Secure Checkout
              </button>

              <div className="text-center">
                <span className="text-xs text-slate-400">
                  🔒 256-Bit SSL Encrypted Solar Hardware Checkout
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
