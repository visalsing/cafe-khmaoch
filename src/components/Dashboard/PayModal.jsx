import React, { useEffect, useState } from "react";
import { Banknote, CreditCard, QrCode, X } from "lucide-react";
import { orderService } from "../../services/api";
import { dual } from "../../utils/currency";
import { inputCls } from "./Shared.jsx";

/* ---------- take the payment of an unpaid (online) order ---------- */
export default function PayModal({ order, onClose, onPaid }) {
  const [method, setMethod] = useState(order.paymentPreference || "cash");
  const [cash, setCash] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const total = Number(order.total) || 0;
  const received = Number(cash) || 0;
  const change = method === "cash" ? Math.max(0, Math.round((received - total) * 100) / 100) : 0;
  const canPay = method !== "cash" || received >= total;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      onPaid(
        await orderService.addPayment(order.id, {
          method,
          cashReceived: method === "cash" ? received : null,
        }),
      );
    } catch (err) {
      setError(err.message || "The payment could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Take payment"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Payment · {order.orderNumber}</h3>
          <button onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-3xl font-extrabold text-center text-accent-600 dark:text-accent-400">
          {dual(total).riel}
          <span className="block text-sm font-medium text-accent-500/70">{dual(total).usd}</span>
        </p>

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
                method === id
                  ? "border-accent-600 bg-accent-50 dark:bg-accent-950/30 text-accent-700 dark:text-accent-300"
                  : "border-slate-200 dark:border-slate-700"
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
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              placeholder="Cash received (៛)"
              className={inputCls}
            />
            <div className="flex gap-2">
              <button onClick={() => setCash(String(total))} className="flex-1 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold">
                Exact
              </button>
              {[10000, 20000, 50000, 100000].map((v) => (
                <button key={v} onClick={() => setCash(String(v))} className="flex-1 px-1 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold">
                  {v.toLocaleString()}៛
                </button>
              ))}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Change</span>
              <span className="font-bold">{dual(change).riel}</span>
            </div>
          </div>
        )}
        {method === "card" && <p className="text-sm text-slate-500 text-center">Tap or insert the card on the terminal, then confirm.</p>}
        {method === "qr" && <p className="text-sm text-slate-500 text-center">Show the QR code to the customer, then confirm once paid.</p>}

        {error && (
          <p role="alert" className="text-sm text-rose-500 text-center">
            {error}
          </p>
        )}
        <button
          disabled={!canPay || busy}
          onClick={submit}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold"
        >
          {busy ? "Processing..." : "Confirm Payment"}
        </button>
      </div>
    </div>
  );
}