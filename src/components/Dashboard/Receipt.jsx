import React, { useRef, useState } from "react";
import { Printer, X } from "lucide-react";
import logoImg from "../../assets/logo/cafe-khmaoch-rmbg.png";
import html2canvas from "html2canvas";

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

// YOUDING YD218: printable width 72mm x 8 dots/mm = 576 dots
const PRINT_WIDTH = 576;

// canvas -> ESC/POS raster bytes, sent in 255-row chunks (safer for printers)
const canvasToEscPos = (src) => {
  const w = PRINT_WIDTH;
  const h = Math.round(src.height * (w / src.width));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(src, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const bpr = w / 8; // 72 bytes per row
  const CHUNK = 255;
  const parts = [new Uint8Array([0x1b, 0x40])]; // init

  for (let y0 = 0; y0 < h; y0 += CHUNK) {
    const rows = Math.min(CHUNK, h - y0);
    const buf = new Uint8Array(8 + bpr * rows);
    buf.set(
      [0x1d, 0x76, 0x30, 0x00, bpr & 255, bpr >> 8, rows & 255, rows >> 8],
      0,
    );
    let p = 8;
    for (let y = y0; y < y0 + rows; y++) {
      for (let xb = 0; xb < bpr; xb++) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          const i = (y * w + xb * 8 + bit) * 4;
          const lum =
            0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          if (lum < 170) byte |= 0x80 >> bit;
        }
        buf[p++] = byte;
      }
    }
    parts.push(buf);
  }
  parts.push(new Uint8Array([0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x42, 0x00])); // feed + cut

  const total = parts.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  parts.forEach((a) => {
    out.set(a, o);
    o += a.length;
  });
  return out;
};

const toBase64 = (bytes) => {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
};

const isAndroid = /android/i.test(navigator.userAgent);

export default function ReceiptModal({ order, onClose }) {
  const ref = useRef(null);
  const [printing, setPrinting] = useState(false);

  // Extract raw ticket/order number without leading zeros (e.g., "001" -> "1", "016" -> "16")
  const rawNum =
    order?.ticketNumber || order?.dailyNumber || order?.number || "1";
  const displayTicketNo = parseInt(String(rawNum).replace(/\D/g, ""), 10) || 1;

  // Browser print dialog (PC driver, or RawBT Print Service on Android)
  const printViaBrowser = () => {
    const w = window.open("", "_blank", "width=380,height=750");
    if (!w) {
      alert("Please allow pop-ups to print the receipt.");
      return;
    }
    w.document.write(`<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <base href="${window.location.origin}/" />
          <title>Receipt ${order?.number || ""}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body {
              margin: 0; padding: 4mm; background: #fff; color: #000;
              font-family: 'Courier New', Courier, monospace, 'Noto Sans Khmer', 'Khmer OS';
              font-size: 11px; line-height: 1.3; width: 72mm;
              -webkit-print-color-adjust: exact;
            }
            img { display: block; margin: 0 auto 4px auto; width: 48px; height: 48px; object-fit: contain; }
          </style>
        </head>
        <body>${ref.current.innerHTML}</body>
      </html>`);
    w.document.close();

    // wait for the logo, then print once (window is NOT closed automatically)
    const waits = Array.from(w.document.images).map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((r) => {
            img.onload = img.onerror = r;
          }),
    );
    Promise.all(waits).then(() => {
      setTimeout(() => {
        w.focus();
        w.print();
      }, 300);
    });
  };

  // Android tablet: render receipt as an image and send to RawBT app
  const printViaRawBT = async () => {
    const el = ref.current;
    if (!el) return;

    if (document.fonts?.ready) await document.fonts.ready;

    const canvas = await html2canvas(el, {
      scale: PRINT_WIDTH / el.offsetWidth, // output is exactly 576px wide
      backgroundColor: "#ffffff",
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
      onclone: (doc) => {
        const n = doc.querySelector("[data-receipt]");
        if (n) {
          n.style.boxShadow = "none";
          n.style.borderRadius = "0";
          // pure black text prints sharper on thermal paper
          n.querySelectorAll("*").forEach((child) => {
            child.style.color = "#000";
          });
        }
      },
    });

    const bytes = canvasToEscPos(canvas);
    const b64 = toBase64(bytes);

    // very long links can be dropped by Android: warn instead of failing silently
    if (b64.length > 900000) {
      alert(
        "Receipt is too long for the RawBT link. Use the 'Print (Dialog)' button instead.",
      );
      return;
    }

    const a = document.createElement("a");
    a.href = `intent:base64,${b64}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const print = async () => {
    if (printing) return;
    setPrinting(true);
    try {
      await new Promise((r) => setTimeout(r, 50)); // let the button update first
      if (!ref.current) return;

      if (!isAndroid) {
        printViaBrowser(); // PC
      } else {
        await printViaRawBT(); // Android tablet
      }
    } catch (e) {
      console.error(e);
      alert("Print error: " + (e?.message || e));
    } finally {
      setPrinting(false);
    }
  };

  // Always use the browser print dialog (PC or tablet)
  const printDialog = () => {
    try {
      if (!ref.current) return;
      printViaBrowser();
    } catch (e) {
      console.error(e);
      alert("Print error: " + (e?.message || e));
    }
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm max-h-[92dvh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
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
            data-receipt
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
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap gap-3 shrink-0">
          <button
            type="button"
            onClick={print}
            disabled={printing}
            className="relative z-10 flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />{" "}
            {printing ? "Printing..." : "Print Receipt"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-xs text-stone-700 dark:text-stone-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>
          {isAndroid && (
            <button
              type="button"
              onClick={printDialog}
              className="w-full py-2.5 rounded-xl border border-amber-600 text-amber-700 dark:text-amber-500 font-semibold text-xs hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Print (Dialog)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}