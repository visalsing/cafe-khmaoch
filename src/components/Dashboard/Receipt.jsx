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

// Formats Dual Currency (Riel Primary + Smaller USD Secondary)
const DualPrice = ({ rielVal, align = "right" }) => {
  const numericRiel = Number(rielVal) || 0;
  const usdVal = numericRiel / EXCHANGE_RATE;

  return (
    <div style={{ textAlign: align, lineHeight: 1.15 }}>
      <div>{formatKHR(numericRiel)}</div>
      <div
        style={{ fontSize: 9, color: "#555", fontWeight: 400, marginTop: 1 }}
      >
        ≈ {formatUSD(usdVal)}
      </div>
    </div>
  );
};

export default function ReceiptModal({ order, onClose }) {
  const ref = useRef(null);

  // Extract raw ticket/order number without leading zeros (e.g., "001" -> "1", "016" -> "16")
  const rawNum =
    order?.ticketNumber || order?.dailyNumber || order?.number || "1";
  const displayTicketNo = parseInt(String(rawNum).replace(/\D/g, ""), 10) || 1;

  const print = () => {
    const printWindow = window.open("", "_blank", "width=380,height=750");
    if (!printWindow)
      return alert("Please allow pop-ups to print the receipt.");

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt ${order?.number || ""}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0mm;
            }
            body {
              margin: 0;
              padding: 4mm;
              background: #fff;
              color: #000;
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              line-height: 1.3;
              width: 72mm;
              -webkit-print-color-adjust: exact;
            }
            img {
              display: block;
              margin: 0 auto 4px auto;
              width: 48px;
              height: 48px;
              object-fit: contain;
            }
            hr {
              border: none;
              border-top: 1px dashed #000;
              margin: 6px 0;
            }
          </style>
        </head>
        <body>
          ${ref.current.innerHTML}
        </body>
      </html>
    `;

    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const MetaRow = ({ labelKm, labelEn, value }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 2,
      }}
    >
      <span style={{ color: "#222" }}>
        {labelKm} / {labelEn}
      </span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>: {value}</span>
    </div>
  );

  const SummaryRow = ({ labelKm, labelEn, valRiel, bold, negative }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 3,
        fontWeight: bold ? 700 : 400,
      }}
    >
      <span>
        {labelKm} / {labelEn}
      </span>
      <div>
        {negative ? "-" : ""}
        <DualPrice rielVal={valRiel} align="right" />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
          <h3 className="font-bold text-sm text-stone-900 dark:text-white">
            Café ខ្មោច Invoice
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-stone-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto p-4 bg-slate-100 dark:bg-slate-950 flex justify-center w-full flex-1">
          <div
            ref={ref}
            style={{
              background: "#ffffff",
              color: "#000000",
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: 12,
              lineHeight: 1.35,
              width: "100%",
              maxWidth: 300,
              padding: "16px 14px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
              borderRadius: 8,
              boxSizing: "border-box",
              height: "fit-content",
            }}
          >
            {/* Logo & Header */}
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <img
                src={logoImg}
                alt="Café ខ្មោច Logo"
                style={{
                  width: 50,
                  height: 50,
                  objectFit: "contain",
                  display: "block",
                  margin: "0 auto 4px auto",
                }}
              />
              <div
                style={{ fontSize: 17, fontWeight: 800, letterSpacing: 0.5 }}
              >
                កាហ្វេខ្មោច
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 3 }}>
                CAFÉ KHMAOCH
              </div>
              <div style={{ fontSize: 9, color: "#444" }}>
                Phnom Penh, Kingdom of Cambodia
              </div>
              <div style={{ fontSize: 9, color: "#444" }}>+855 12 345 678</div>
            </div>

            <div
              style={{
                textAlign: "center",
                margin: "8px 0 4px 0",
                fontWeight: 700,
                fontSize: 10,
              }}
            >
              វិក្កយបត្រ / COMMERCIAL INVOICE
            </div>

            <hr
              style={{
                border: "none",
                borderTop: "1px dashed #000",
                margin: "6px 0",
              }}
            />

            {/* Order Metadata */}
            {/* <MetaRow labelKm="សាខា" labelEn="Store" value="Phnom Penh Main" />
            <MetaRow
              labelKm="កាលបរិច្ឆេទ"
              labelEn="Date"
              value={new Date(order?.createdAt || Date.now()).toISOString().split("T")[0]}
            /> */}
            <MetaRow
              labelKm="កាលបរិច្ឆេទ"
              labelEn="Date"
              value={new Date(
                order?.createdAt || Date.now(),
              ).toLocaleDateString("en-CA")}
            />
            <MetaRow
              labelKm="ម៉ោង"
              labelEn="Time"
              value={new Date(
                order?.createdAt || Date.now(),
              ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            />
            <MetaRow
              labelKm="អ្នកគិតលុយ"
              labelEn="Cashier"
              // value={order?.cashierName || "Staff"}
              value={
                order?.source === "online"
                  ? "Online order"
                  : order?.cashierName || "Staff"
              }
            />
            <MetaRow
              labelKm="វិក្កយបត្រ"
              labelEn="Invoice Number"
              value={order?.number || "INV0000"}
            />
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
                fontSize: 12,
                textTransform: "uppercase",
                marginTop: 6,
                marginBottom: 4,
                letterSpacing: 1,
              }}
            >
              {/* {order?.orderType === "dine-in"
                ? "DINE-IN"
                : "WALK-IN / TAKEAWAY"} */}
              {order?.orderType === "dine-in"
                ? "DINE-IN"
                : order?.orderType === "delivery"
                  ? "DELIVERY"
                  : "TAKEAWAY"}
            </div>
            {order?.orderType === "delivery" && (
              <div
                style={{ fontSize: 10, textAlign: "center", marginBottom: 2 }}
              >
                <div>
                  {[order?.customer?.name, order?.customer?.phone]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                <div>{order?.customer?.address}</div>
              </div>
            )}

            <hr
              style={{
                border: "none",
                borderTop: "1px dashed #000",
                margin: "6px 0",
              }}
            />

            {/* Items Table Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 58px 25px 58px",
                gap: 4,
                fontWeight: 700,
                fontSize: 10,
                marginBottom: 4,
              }}
            >
              <div>
                មុខទំនិញ
                <br />
                Item Name
              </div>
              <div style={{ textAlign: "right" }}>
                តម្លៃ
                <br />
                Price
              </div>
              <div style={{ textAlign: "center" }}>
                ចំនួន
                <br />
                QTY
              </div>
              <div style={{ textAlign: "right" }}>
                សរុប
                <br />
                Total
              </div>
            </div>

            {/* Items List */}
            {order?.items?.map((item) => {
              const titleParts = item.title?.split(" (");
              const mainTitle = titleParts ? titleParts[0] : item.title;
              const optionsText =
                titleParts && titleParts[1]
                  ? titleParts[1].replace(")", "")
                  : "";

              const priceRiel = Number(item.price) || 0;
              const totalRiel = (Number(item.qty) || 1) * priceRiel;
              const discountPct = Number(item.discountPercent || 0);

              // const originalBaseRiel =
              //   discountPct > 0
              //     ? priceRiel / (1 - discountPct / 100)
              //     : priceRiel;
              const originalBaseRiel = Number(item.basePrice) || priceRiel;

              return (
                <div key={item.id} style={{ marginBottom: 6 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 58px 25px 58px",
                      gap: 4,
                      fontWeight: 600,
                      alignItems: "flex-start",
                    }}
                  >
                    <div>{mainTitle}</div>
                    <DualPrice rielVal={priceRiel} align="right" />
                    <div style={{ textAlign: "center" }}>x{item.qty}</div>
                    <DualPrice rielVal={totalRiel} align="right" />
                  </div>

                  {(optionsText || discountPct > 0) && (
                    <div
                      style={{
                        fontSize: 9.5,
                        color: "#444",
                        paddingLeft: 4,
                        marginTop: 2,
                      }}
                    >
                      {optionsText && <div>{optionsText}</div>}
                      {discountPct > 0 && (
                        <div
                          style={{
                            color: "#d97706",
                            fontWeight: 600,
                            marginTop: 1,
                          }}
                        >
                          • Original Price: {formatKHR(originalBaseRiel)} (≈{" "}
                          {formatUSD(originalBaseRiel / EXCHANGE_RATE)}) [ -
                          {discountPct}% OFF ]
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <hr
              style={{
                border: "none",
                borderTop: "1px dashed #000",
                margin: "6px 0",
              }}
            />

            {/* Summary Breakdown */}
            <SummaryRow
              labelKm="សរុបរង"
              labelEn="Sub Total"
              valRiel={Number(order?.subtotal || 0)}
            />

            {/* {Number(order?.discount) > 0 && (
              <SummaryRow
                labelKm="ការបញ្ចុះតម្លៃ"
                labelEn="Item Discount"
                valRiel={Number(order.discount)}
                negative
              />
            )} */}
            {Number(order?.discount) > 0 && (
              <SummaryRow
                labelKm="ការបញ្ចុះតម្លៃ"
                labelEn={`Discount (${Number(order?.discountPct || 0)}%)`}
                valRiel={Number(order.discount)}
                negative
              />
            )}
            {Number(order?.shipping) > 0 && (
              <SummaryRow
                labelKm="ថ្លៃដឹកជញ្ជូន"
                labelEn="Delivery"
                valRiel={Number(order.shipping)}
              />
            )}
            {Number(order?.tax) > 0 && (
              <SummaryRow
                labelKm="អាករ"
                labelEn="Tax"
                valRiel={Number(order.tax)}
              />
            )}

            <hr
              style={{
                border: "none",
                borderTop: "1px dashed #000",
                margin: "6px 0",
              }}
            />

            {/* Total Lines */}
            <SummaryRow
              labelKm="សរុប"
              labelEn="TOTAL"
              valRiel={Number(order?.total || 0)}
              bold
            />

            {/* Payment Received */}
            {/* <div style={{ marginTop: 4 }}>
              <SummaryRow
                labelKm="ប្រាក់ទទួលបាន"
                labelEn={`Received (${order?.paymentMethod?.toUpperCase() || "CASH"})`}
                valRiel={
                  order?.cashReceived
                    ? Number(order.cashReceived)
                    : Number(order?.total || 0)
                }
              />
              {order?.change > 0 && (
                <SummaryRow
                  labelKm="ប្រាក់អាប់"
                  labelEn="Change"
                  valRiel={Number(order.change)}
                />
              )}
            </div> */}
            <div style={{ marginTop: 4 }}>
              {order?.paymentStatus === "unpaid" ? (
                <div
                  style={{
                    textAlign: "center",
                    fontWeight: 800,
                    letterSpacing: 1,
                    border: "1px dashed #000",
                    padding: "4px 0",
                  }}
                >
                  មិនទាន់បង់ប្រាក់ / UNPAID
                </div>
              ) : (
                <>
                  <SummaryRow
                    labelKm="ប្រាក់ទទួលបាន"
                    labelEn={`Received (${order?.paymentMethod?.toUpperCase() || "CASH"})`}
                    valRiel={
                      order?.cashReceived
                        ? Number(order.cashReceived)
                        : Number(order?.total || 0)
                    }
                  />
                  {order?.change > 0 && (
                    <SummaryRow
                      labelKm="ប្រាក់អាប់"
                      labelEn="Change"
                      valRiel={Number(order.change)}
                    />
                  )}
                </>
              )}
            </div>

            {/* <div
              style={{
                fontSize: 8.5,
                textAlign: "center",
                color: "#555",
                marginTop: 8,
              }}
            >
              * តម្លៃរួមបញ្ចូលទាំងអាករ / Incl. VAT 10% *<br />
              Exchange Rate $1 = KHR {EXCHANGE_RATE}៛
            </div> */}
            <div
              style={{
                fontSize: 8.5,
                textAlign: "center",
                color: "#555",
                marginTop: 8,
              }}
            >
              Exchange Rate $1 = KHR {EXCHANGE_RATE}៛
            </div>

            <hr
              style={{
                border: "none",
                borderTop: "1px dashed #000",
                margin: "8px 0 6px 0",
              }}
            />

            {/* Clean Queue Ticket Number Without Leading Zeros */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1 }}>
                {displayTicketNo}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>
                លេខរង់ចាំ / TICKET
              </div>
              <div style={{ fontSize: 9, marginTop: 4, color: "#333" }}>
                Thank you, please come back again.
              </div>
              <div style={{ fontSize: 9, fontWeight: 600, marginTop: 1 }}>
                Wi-Fi: CafeKhmaochFree
              </div>
              <div style={{ fontSize: 8, color: "#777", marginTop: 6 }}>
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
