import React, { useRef } from "react";
import { Printer, X } from "lucide-react";

const money = (n) => `$${Number(n).toFixed(2)}`;
const Row = ({ l, r, bold }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      fontWeight: bold ? 700 : 400,
    }}
  >
    <span>{l}</span>
    <span>{r}</span>
  </div>
);

export default function ReceiptModal({ order, onClose }) {
  const ref = useRef(null);

  const print = () => {
    const w = window.open("", "_blank", "width=380,height=640");
    if (!w) return alert("Please allow pop-ups to print the receipt.");
    w.document.write(
      `<html><head><title>${order.number}</title></head><body style="margin:0">${ref.current.innerHTML}</body></html>`,
    );
    w.document.close();
    w.focus();
    w.onafterprint = () => w.close();
    w.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold">Receipt</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 bg-slate-100 dark:bg-slate-950">
          {/* Inline styles so it prints correctly in the popup window */}
          <div
            ref={ref}
            style={{
              background: "#fff",
              color: "#000",
              fontFamily: "monospace",
              fontSize: 13,
              width: 280,
              margin: "0 auto",
              padding: 16,
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                Bean & Blossom
              </div>
              <div>742 Evergreen Terrace</div>
              <div>+1 (555) 839-2041</div>
            </div>
            <hr style={{ borderTop: "1px dashed #000" }} />
            <Row l="Order" r={order.number} />
            <Row l="Date" r={new Date(order.createdAt).toLocaleString()} />
            {/* <Row l="Type" r={order.orderType === "dine-in" ? `Dine-in${order.table ? ` #${order.table}` : ""}` : "Takeaway"} /> */}
            {/* // Type row: */}
            <Row
              l="Type"
              r={
                order.orderType === "dine-in"
                  ? `Dine-in${order.table ? ` #${order.table}` : ""}`
                  : order.orderType === "delivery"
                    ? "Delivery"
                    : order.orderType === "pickup"
                      ? "Pickup"
                      : "Takeaway"
              }
            />
            {/*  */}
            <hr style={{ borderTop: "1px dashed #000" }} />
            {order.items.map((l) => (
              <div key={l.id} style={{ marginBottom: 4 }}>
                <div>{l.title}</div>
                <Row
                  l={`  ${l.qty} x ${money(l.price)}`}
                  r={money(l.qty * l.price)}
                />
              </div>
            ))}
            <hr style={{ borderTop: "1px dashed #000" }} />
            <Row l="Subtotal" r={money(order.subtotal)} />
            {order.discount > 0 && (
              <Row l="Discount" r={`-${money(order.discount)}`} />
            )}
            {order.shipping > 0 && (
              <Row l="Delivery" r={money(order.shipping)} />
            )}
            <Row l="Tax (8%)" r={money(order.tax)} />
            <Row l="TOTAL" r={money(order.total)} bold />
            <hr style={{ borderTop: "1px dashed #000" }} />
            <Row l="Paid by" r={order.paymentMethod.toUpperCase()} />
            {/* {order.paymentMethod === "cash" && (
              <>
                <Row l="Cash" r={money(order.cashReceived)} />
                <Row l="Change" r={money(order.change)} />
              </>
            )} */}
            {/* // cash block: only show when cash was actually received */}
            {order.paymentMethod === "cash" && order.cashReceived != null && (
              <>
                <Row l="Cash" r={money(order.cashReceived)} />
                <Row l="Change" r={money(order.change)} />
              </>
            )}
            <div style={{ textAlign: "center", marginTop: 12 }}>
              Thank you! See you again ☕
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-3">
          <button
            onClick={print}
            className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
