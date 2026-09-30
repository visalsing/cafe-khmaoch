import React, { useState, useEffect } from "react";
import {
  Coffee,
  Sun,
  Moon,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  Check,
  Tag,
  Truck,
  Store,
  ShieldCheck,
  Sparkles
} from "lucide-react";

export default function CartPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [notification, setNotification] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [deliveryMethod, setDeliveryMethod] = useState("pickup");

  // Toggle Dark Mode class on root html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  // Simulated coffee & pastry cart items
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      title: "Velvet Nitro Cold Brew",
      category: "Cold Brews",
      price: 5.50,
      quantity: 2,
      img: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 2,
      title: "Signature Caramel Macchiato",
      category: "Specialty Coffee",
      price: 6.00,
      quantity: 1,
      img: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 4,
      title: "Gluten-Free Almond Croissant",
      category: "Fresh Pastries",
      price: 4.75,
      quantity: 2,
      img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
    },
  ]);

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
        .filter(Boolean)
    );
  };

  const removeItem = (id, title) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    showNotification(`Removed "${title}" from cart.`);
  };

  // Calculations
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const deliveryCost = deliveryMethod === "express" ? 6.00 : deliveryMethod === "standard" ? 3.50 : 0.00;
  const tax = subtotal * 0.08; // 8% estimated tax
  const total = subtotal - discount + deliveryCost + tax;

  const handleApplyPromo = (e) => {
    e.preventDefault();
    if (promoCode.trim().toUpperCase() === "BREW10") {
      const discVal = subtotal * 0.1;
      setDiscount(discVal);
      showNotification("Promo code applied: 10% off your order! 🎉");
    } else {
      showNotification("Invalid promo code. Try 'BREW10'");
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors duration-300 font-sans">
      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-800 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 animate-bounce">
          <Coffee className="w-5 h-5 text-amber-300" />
          <span className="font-medium text-sm">{notification}</span>
        </div>
      )}

      {/* Navbar Section */}
      <nav className="sticky top-0 z-40 bg-stone-100/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => alert("Navigating back to Home / Menu")}
          >
            <div className="w-11 h-11 rounded-2xl bg-amber-800 flex items-center justify-center text-white shadow-lg shadow-amber-900/20">
              <Coffee className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-800 to-amber-600 dark:from-amber-400 dark:to-amber-200 bg-clip-text text-transparent">
                Bean & Blossom
              </span>
              <span className="block text-xs text-stone-500 dark:text-stone-400 font-medium tracking-widest uppercase">
                Artisanal Cafe & Roastery
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-xl bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700 transition"
              aria-label="Toggle Theme"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-stone-700" />}
            </button>

            <button
              onClick={() => alert("Returning to Menu")}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-sm font-semibold border border-amber-200 dark:border-amber-800 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Menu</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 text-xs font-bold uppercase tracking-widest mb-2">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Your Order Bag</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Review Your Cafe Order</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            Check your artisan brews and pastries before placing your pickup or delivery order
          </p>
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-16 text-center border border-stone-200 dark:border-stone-800 space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto text-2xl">
              ☕
            </div>
            <h3 className="text-2xl font-bold">Your cafe bag is empty</h3>
            <p className="text-sm text-stone-500 max-w-sm mx-auto">
              Looks like you haven't added any delicious nitro cold brews, specialty coffees, or fresh pastries yet.
            </p>
            <button
              onClick={() => alert("Redirecting to menu...")}
              className="px-8 py-3.5 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-2xl shadow-lg shadow-amber-900/25 transition"
            >
              Explore Menu Items
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Column: Cart Item List */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-stone-900 p-5 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center gap-5 transition hover:border-amber-800/50"
                >
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-28 h-28 object-cover rounded-2xl bg-stone-100 dark:bg-stone-800 shrink-0"
                  />
                  <div className="flex-1 space-y-1.5 text-center sm:text-left">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                      {item.category}
                    </span>
                    <h3 className="font-bold text-lg text-stone-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="text-lg font-black text-stone-900 dark:text-white">
                      ${item.price.toFixed(2)}
                    </p>
                  </div>

                  {/* Quantity Controls & Remove */}
                  <div className="flex flex-col sm:items-end justify-between h-full gap-4 w-full sm:w-auto">
                    <button
                      onClick={() => removeItem(item.id, item.title)}
                      className="text-xs text-rose-500 hover:text-rose-700 font-semibold flex items-center space-x-1 self-end sm:self-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                    <div className="flex items-center border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden bg-stone-50 dark:bg-stone-950">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="px-3 py-1.5 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 transition"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3.5 py-1.5 text-sm font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="px-3 py-1.5 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Delivery / Pickup Method Selection */}
              <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 space-y-4 shadow-sm">
                <h4 className="font-bold text-base flex items-center space-x-2">
                  <Store className="w-5 h-5 text-amber-800 dark:text-amber-400" />
                  <span>Choose Fulfillment Method</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "pickup", label: "In-Store Pickup", price: "Free", sub: "Ready in 15 mins", icon: Store },
                    { id: "standard", label: "Neighborhood Delivery", price: "$3.50", sub: "Within 30-45 mins", icon: Truck },
                    { id: "express", label: "Express Hot Courier", price: "$6.00", sub: "Priority Dispatch", icon: Sparkles },
                  ].map((method) => {
                    const IconComponent = method.icon;
                    return (
                      <div
                        key={method.id}
                        onClick={() => setDeliveryMethod(method.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          deliveryMethod === method.id
                            ? "border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 ring-1 ring-amber-800"
                            : "border-stone-200 dark:border-stone-800 hover:border-amber-400"
                        }`}
                      >
                        <div className="flex justify-between items-center font-bold text-sm mb-1">
                          <span className="flex items-center space-x-1.5">
                            <IconComponent className="w-4 h-4 text-amber-800 dark:text-amber-400" />
                            <span>{method.label}</span>
                          </span>
                          <span className="text-amber-800 dark:text-amber-400">{method.price}</span>
                        </div>
                        <p className="text-xs text-stone-500">{method.sub}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary & Checkout Card */}
            <div className="bg-white dark:bg-stone-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 space-y-6">
              <h3 className="text-xl font-bold">Order Summary</h3>

              {/* Promo Code Input Form */}
              <form onSubmit={handleApplyPromo} className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Promo Code (try 'BREW10')"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-800 font-medium"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-3 bg-stone-900 dark:bg-stone-800 text-white font-bold text-xs rounded-xl hover:bg-stone-800 transition"
                >
                  Apply
                </button>
              </form>

              <div className="space-y-3 text-sm border-t border-stone-200 dark:border-stone-800 pt-4">
                <div className="flex justify-between text-stone-500">
                  <span>Subtotal</span>
                  <span className="text-stone-900 dark:text-white font-bold">${subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount (10% Off)</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-500">
                  <span>Fulfillment Fee</span>
                  <span className="text-stone-900 dark:text-white font-bold">
                    {deliveryCost === 0 ? "Free" : `$${deliveryCost.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>Estimated Tax (8%)</span>
                  <span className="text-stone-900 dark:text-white font-bold">${tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-stone-200 dark:border-stone-800 pt-4 flex justify-between text-lg font-black">
                  <span>Total Due</span>
                  <span className="text-amber-800 dark:text-amber-400">${total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => alert("Proceeding to secure checkout for your cafe order!")}
                className="w-full py-4 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-2xl shadow-xl shadow-amber-900/30 transition text-center flex items-center justify-center space-x-2 text-base"
              >
                <span>Proceed to Checkout</span>
                <Check className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-center space-x-2 text-xs text-stone-400 pt-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Secure SSL Encrypted Cafe Checkout</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}