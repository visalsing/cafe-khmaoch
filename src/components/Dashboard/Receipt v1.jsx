import React, { useRef } from "react";
import { Printer, X } from "lucide-react";
import logoImg from "../../assets/logo/cafe-khmaoch-rmbg.png";

const EXCHANGE_RATE = 4100; // 1$ = 4100៛

const formatUSD = (num) => {
  const val = Number(num) || 0;
  return `$${val.toFixed(2)}`;
};

const formatKHR = (num) => {
  const val = Number(num) || 0;
  return `${Math.round(val).toLocaleString()}៛`;
};

export default function ReceiptModal({ order, onClose }) {
  const ref = useRef(null);

  const print = () => {
    const w = window.open("", "_blank", "width=380,height=750");
    if (!w) return alert("Please allow pop-ups to print the receipt.");
    w.document.write(`
      <html>
        <head>
          <title>Receipt ${order?.number || ""}</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              @page { margin: 0; size: auto; }
            }
          </style>
        </head>
        <body style="margin:0; padding:0; background:#fff; display:flex; justify-content:center;">
          ${ref.current.outerHTML}
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.close();
    }, 250);
  };

  // Helper for meta data key-value rows
  const MetaRow = ({ labelKm, labelEn, value }) => (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
      <span style={{ color: "#333" }}>{labelKm} / {labelEn}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>: {value}</span>
    </div>
  );

  // Helper for summary total rows
  const SummaryRow = ({ labelKm, labelEn, valUsd, valKhr, bold, negative }) => (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontWeight: bold ? 700 : 400 }}>
      <span>{labelKm} / {labelEn}</span>
      <span>
        {negative ? "-" : ""}
        {valUsd ? formatUSD(valUsd) : formatKHR(valKhr)}
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
          <h3 className="font-bold text-sm text-stone-900 dark:text-white">Commercial Invoice</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-stone-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto p-4 bg-slate-100 dark:bg-slate-950 flex justify-center w-full flex-1">
          {/* White Paper Receipt Container */}
          <div
            ref={ref}
            style={{
              background: "#ffffff",
              color: "#000000",
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: 12,
              lineHeight: 1.35,
              width: "100%",
              maxWidth: 320,
              padding: "20px 16px 24px 16px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
              borderRadius: 8,
              boxSizing: "border-box",
              height: "fit-content", // Forces the paper container to stretch dynamically around all content
            }}
          >
            {/* Logo & Header */}
            <div style={{ textAlign: "center", marginBottom: 10 }}>
              <img
                src={logoImg}
                alt="Café ខ្មោច Logo"
                style={{
                  width: 54,
                  height: 54,
                  objectFit: "contain",
                  display: "block",
                  margin: "0 auto 6px auto",
                }}
              />
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.5 }}>
                កាហ្វេខ្មោច
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                CAFÉ KHMAOCH
              </div>
              <div style={{ fontSize: 10, color: "#444" }}>
                Phnom Penh, Kingdom of Cambodia
              </div>
              <div style={{ fontSize: 10, color: "#444" }}>+855 12 345 678</div>
            </div>

            <div style={{ textAlign: "center", margin: "10px 0 6px 0", fontWeight: 700, fontSize: 11 }}>
              វិក្កយបត្រ / COMMERCIAL INVOICE
            </div>

            <hr style={{ border: "none", borderTop: "1px dashed #000", margin: "8px 0" }} />

            {/* Order Metadata */}
            <MetaRow labelKm="សាខា" labelEn="Store" value="Phnom Penh Main" />
            <MetaRow
              labelKm="កាលបរិច្ឆេទ"
              labelEn="Date"
              value={new Date(order?.createdAt || Date.now()).toISOString().split("T")[0]}
            />
            <MetaRow
              labelKm="អ្នកគិតលុយ"
              labelEn="Cashier"
              value={order?.cashierName || "Staff"}
            />
            <MetaRow labelKm="វិក្កយបត្រ" labelEn="Invoice Number" value={order?.number || "INV0000"} />
            <MetaRow
              labelKm="ប្រភេទការកុម្ម៉ង់"
              labelEn="Order Type"
              value={
                order?.orderType === "dine-in"
                  ? `Dine-in ${order?.table ? `#${order.table}` : ""}`
                  : order?.orderType === "delivery"
                  ? "Delivery"
                  : "Takeaway"
              }
            />

            {/* Order Type Badge */}
            <div
              style={{
                textAlign: "center",
                fontWeight: 800,
                fontSize: 13,
                textTransform: "uppercase",
                marginTop: 8,
                marginBottom: 6,
                letterSpacing: 1,
              }}
            >
              {order?.orderType === "dine-in" ? "DINE-IN" : "WALK-IN / TAKEAWAY"}
            </div>

            <hr style={{ border: "none", borderTop: "1px dashed #000", margin: "8px 0" }} />

            {/* Items Table Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 50px 30px 50px",
                gap: 4,
                fontWeight: 700,
                fontSize: 11,
                marginBottom: 6,
              }}
            >
              <div>
                មុខទំនិញ<br />Item Name
              </div>
              <div style={{ textAlign: "right" }}>
                តម្លៃ<br />Price
              </div>
              <div style={{ textAlign: "center" }}>
                ចំនួន<br />QTY
              </div>
              <div style={{ textAlign: "right" }}>
                សរុប<br />Total
              </div>
            </div>

            {/* Items List */}
            {order?.items?.map((item) => {
              const titleParts = item.title?.split(" (");
              const mainTitle = titleParts ? titleParts[0] : item.title;
              const optionsText = titleParts && titleParts[1] ? titleParts[1].replace(")", "") : "";

              const priceUsd = Number(item.price) / EXCHANGE_RATE;
              const totalUsd = (Number(item.qty) * Number(item.price)) / EXCHANGE_RATE;

              return (
                <div key={item.id} style={{ marginBottom: 6 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 50px 30px 50px",
                      gap: 4,
                      fontWeight: 600,
                    }}
                  >
                    <div>{mainTitle}</div>
                    <div style={{ textAlign: "right" }}>{formatUSD(priceUsd)}</div>
                    <div style={{ textAlign: "center" }}>x{item.qty}</div>
                    <div style={{ textAlign: "right" }}>{formatUSD(totalUsd)}</div>
                  </div>

                  {/* Sub-options display */}
                  {optionsText && (
                    <div style={{ fontSize: 10, color: "#555", paddingLeft: 6, marginTop: 1 }}>
                      • {optionsText}
                    </div>
                  )}
                </div>
              );
            })}

            <hr style={{ border: "none", borderTop: "1px dashed #000", margin: "8px 0" }} />

            {/* Summary Breakdown */}
            <SummaryRow
              labelKm="សរុបរង"
              labelEn="Sub Total"
              valUsd={Number(order?.subtotal || 0) / EXCHANGE_RATE}
            />

            {Number(order?.discount) > 0 && (
              <SummaryRow
                labelKm="ការបញ្ចុះតម្លៃ"
                labelEn="Item Discount"
                valUsd={Number(order.discount) / EXCHANGE_RATE}
                negative
              />
            )}

            <hr style={{ border: "none", borderTop: "1px dashed #000", margin: "8px 0" }} />

            {/* Total Lines */}
            <SummaryRow
              labelKm="សរុប"
              labelEn="TOTAL (USD)"
              valUsd={Number(order?.total || 0) / EXCHANGE_RATE}
              bold
            />
            <SummaryRow
              labelKm="សរុប"
              labelEn="TOTAL (KHR)"
              valKhr={order?.total || 0}
              bold
            />

            {/* Payment Received */}
            <div style={{ marginTop: 6 }}>
              <SummaryRow
                labelKm="ប្រាក់ទទួលបាន"
                labelEn={`Received (${order?.paymentMethod?.toUpperCase() || "CASH"})`}
                valUsd={
                  order?.cashReceived
                    ? Number(order.cashReceived) / EXCHANGE_RATE
                    : Number(order?.total || 0) / EXCHANGE_RATE
                }
              />
              {order?.change > 0 && (
                <SummaryRow
                  labelKm="ប្រាក់អាប់"
                  labelEn="Change"
                  valUsd={Number(order.change) / EXCHANGE_RATE}
                />
              )}
            </div>

            <div style={{ fontSize: 9, textAlign: "center", color: "#555", marginTop: 8 }}>
              * តម្លៃរួមបញ្ចូលទាំងអាករ / Incl. VAT 10% *<br />
              Exchange Rate $1 = KHR {EXCHANGE_RATE}៛
            </div>

            <hr style={{ border: "none", borderTop: "1px dashed #000", margin: "12px 0 8px 0" }} />

            {/* Large Queue Ticket Number */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1 }}>
                {order?.number ? String(order.number).slice(-3) : "016"}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, marginTop: 3 }}>
                លេខរង់ចាំ / TICKET
              </div>
              <div style={{ fontSize: 10, marginTop: 6, color: "#333" }}>
                Thank you, please come back again.
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2 }}>
                Wi-Fi: CafeKhmaochFree
              </div>
              <div style={{ fontSize: 9, color: "#777", marginTop: 8 }}>
                Powered by Café ខ្មោច POS
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-3 shrink-0">
          <button
            onClick={print}
            className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-xs text-stone-700 dark:text-stone-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}