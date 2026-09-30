import React, { useMemo, useState } from "react";
import { Search, Plus, Minus, Trash2, Banknote, CreditCard, QrCode, X } from "lucide-react";
import { useMenu } from "../../context/MenuContext";
import { orderService } from "../../services/api";
import ReceiptModal from "./Receipt";

const TAX_RATE = 0.08;
const money = (n) => `$${Number(n).toFixed(2)}`;
const round2 = (n) => Math.round(n * 100) / 100;

export default function POS() {
  const { availableItems, categories, loading } = useMenu();

  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState("dine-in");
  const [table, setTable] = useState("");
  const [discountPct, setDiscountPct] = useState(0);

  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const visible = useMemo(
    () =>
      availableItems.filter(
        (i) =>
          (category === "All" || i.category === category) &&
          i.title.toLowerCase().includes(search.toLowerCase())
      ),
    [availableItems, category, search]
  );

  const addToCart = (item) =>
    setCart((prev) => {
      const found = prev.find((l) => l.id === item.id);
      return found
        ? prev.map((l) => (l.id === item.id ? { ...l, qty: l.qty + 1 } : l))
        : [...prev, { id: item.id, title: item.title, price: item.price, qty: 1 }];
    });

  const changeQty = (id, d) =>
    setCart((prev) => prev.map((l) => (l.id === id ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0));

  const subtotal = round2(cart.reduce((s, l) => s + l.price * l.qty, 0));
  const discount = round2(subtotal * (discountPct / 100));
  const tax = round2((subtotal - discount) * TAX_RATE);
  const total = round2(subtotal - discount + tax);

  const received = Number(cashReceived) || 0;
  const change = method === "cash" ? round2(Math.max(0, received - total)) : 0;
  const canPay = cart.length > 0 && (method !== "cash" || received >= total);

  const confirmPayment = async () => {
    setPaying(true);
    try {
      const order = await orderService.create({
        items: cart,
        orderType,
        table: orderType === "dine-in" ? table : "",
        paymentMethod: method,
        subtotal,
        discount,
        tax,
        total,
        cashReceived: method === "cash" ? received : null,
        change,
      });
      setReceipt(order);
      setPayOpen(false);
      setCart([]);
      setDiscountPct(0);
      setCashReceived("");
      setTable("");
    } finally {
      setPaying(false);
    }
  };

  const quickCash = [5, 10, 20, 50];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
      {/* LEFT: product picker */}
      <div className="xl:col-span-2 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <h1 className="text-2xl font-extrabold">Point of Sale</h1>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                category === c
                  ? "bg-amber-600 text-white shadow"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-500"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-500">Loading menu...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {visible.map((item) => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="text-left bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:border-amber-500 hover:shadow-lg active:scale-[0.98] transition-all"
              >
                <img src={item.img} alt={item.title} className="h-28 w-full object-cover" />
                <div className="p-3">
                  <p className="font-semibold text-sm line-clamp-1">{item.title}</p>
                  <p className="text-amber-600 dark:text-amber-400 font-bold">{money(item.price)}</p>
                </div>
              </button>
            ))}
            {visible.length === 0 && <p className="col-span-full text-slate-500">No items found.</p>}
          </div>
        )}
      </div>

      {/* RIGHT: current order */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 xl:sticky xl:top-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Current Order</h2>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-xs text-rose-500 font-semibold">
              Clear
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {["dine-in", "takeaway"].map((t) => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={`py-2 rounded-xl text-xs font-semibold capitalize ${
                orderType === t ? "bg-amber-600 text-white" : "bg-slate-100 dark:bg-slate-900"
              }`}
            >
              {t === "dine-in" ? "Dine-in" : "Takeaway"}
            </button>
          ))}
        </div>
        {orderType === "dine-in" && (
          <input
            value={table}
            onChange={(e) => setTable(e.target.value)}
            placeholder="Table no. (optional)"
            className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-amber-500"
          />
        )}

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {cart.length === 0 && <p className="text-sm text-slate-500 py-6 text-center">Tap an item to add it.</p>}
          {cart.map((l) => (
            <div key={l.id} className="flex items-center gap-2 text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{l.title}</p>
                <p className="text-xs text-slate-500">{money(l.price)}</p>
              </div>
              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg">
                <button onClick={() => changeQty(l.id, -1)} className="p-1.5">
                  {l.qty === 1 ? <Trash2 className="w-3.5 h-3.5 text-rose-500" /> : <Minus className="w-3.5 h-3.5" />}
                </button>
                <span className="px-2 font-semibold">{l.qty}</span>
                <button onClick={() => changeQty(l.id, 1)} className="p-1.5">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="w-16 text-right font-semibold">{money(l.price * l.qty)}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Discount</span>
          <select
            value={discountPct}
            onChange={(e) => setDiscountPct(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
          >
            {[0, 5, 10, 15, 20].map((p) => (
              <option key={p} value={p}>{p}%</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 text-sm border-t border-slate-200 dark:border-slate-700 pt-3">
          <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{money(subtotal)}</span></div>
          {discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{money(discount)}</span></div>}
          <div className="flex justify-between text-slate-500"><span>Tax (8%)</span><span>{money(tax)}</span></div>
          <div className="flex justify-between text-lg font-extrabold pt-1"><span>Total</span><span className="text-amber-600 dark:text-amber-400">{money(total)}</span></div>
        </div>

        <button
          disabled={cart.length === 0}
          onClick={() => setPayOpen(true)}
          className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold shadow-lg transition-all"
        >
          Charge {money(total)}
        </button>
      </div>

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
                <input
                  type="number"
                  min="0"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder="Cash received"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-amber-500"
                />
                <div className="flex gap-2">
                  <button onClick={() => setCashReceived(String(total))} className="flex-1 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold">Exact</button>
                  {quickCash.map((v) => (
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