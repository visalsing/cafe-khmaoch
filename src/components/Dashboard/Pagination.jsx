import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import CustomSelect from "./CustomSelect";

const SIZES = [10, 20, 30, 40, 50, 100];

// 1 … 4 5 [6] 7 8 … 20
function pageList(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const wanted = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => wanted.add(n));
  if (page >= totalPages - 2) [totalPages - 1, totalPages - 2, totalPages - 3].forEach((n) => wanted.add(n));
  const sorted = [...wanted].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push(`gap-${n}`);
    out.push(n);
  });
  return out;
}

export default function Pagination({ page, pageSize, total, onPage, onPageSize, pageSizes = SIZES }) {
  const isAll = pageSize === "all";
  
  // If "All" is selected, the effective size is the total count (or 1 if total is 0)
  const effectivePageSize = isAll ? Math.max(1, total) : Number(pageSize) || 10;

  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(total / effectivePageSize));
  const from = total === 0 ? 0 : (isAll ? 1 : (page - 1) * effectivePageSize + 1);
  const to = total === 0 ? 0 : (isAll ? total : Math.min(page * effectivePageSize, total));

  // Check if current pageSize is outside preset options and not "all"
  const isCustomSize = !isAll && !pageSizes.includes(Number(pageSize));
  const [customInput, setCustomInput] = useState(isCustomSize ? String(pageSize) : "");

  useEffect(() => {
    if (isCustomSize) {
      setCustomInput(String(pageSize));
    }
  }, [pageSize, isCustomSize]);

  const handleCustomChange = (e) => {
    const val = e.target.value;
    setCustomInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      onPageSize(num);
    }
  };

  const navBtn =
    "h-9 min-w-9 px-2 rounded-lg border text-sm font-medium flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-slate-500">
        <span>
          Showing <b className="text-slate-700 dark:text-slate-200">{from}-{to}</b> of{" "}
          <b className="text-slate-700 dark:text-slate-200">{total}</b>
        </span>
        
        {/* Limits Dropdown & Custom Input */}
        <div className="flex items-center gap-2">
          <span>Limits</span>
          <div className="w-24">
            <CustomSelect
              className=""
              dropUp
              value={isAll ? "all" : (isCustomSize ? "custom" : pageSize)}
              onChange={(v) => {
                if (v === "all") {
                  onPageSize("all");
                  onPage(1); // Jump back to page 1
                } else if (v === "custom") {
                  onPageSize(customInput ? parseInt(customInput, 10) : 15);
                } else {
                  onPageSize(Number(v));
                  onPage(1);
                }
              }}
              options={[
                ...pageSizes.map((n) => ({ value: n, label: String(n) })),
                { value: "custom", label: "Custom" },
                { value: "all", label: "All" }
              ]}
            />
          </div>

          {/* Inline input if Custom is selected or active */}
          {isCustomSize && (
            <input
              type="number"
              min="1"
              max="1000"
              value={customInput}
              onChange={handleCustomChange}
              placeholder="Qty"
              className="w-16 px-2 py-1.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-amber-500 text-center"
            />
          )}
        </div>
      </div>

      <nav className="flex items-center gap-1" aria-label="Pagination">
        {/* Super Previous */}
        <button
          type="button"
          aria-label="First page"
          disabled={page <= 1 || isAll}
          onClick={() => onPage(1)}
          className={`${navBtn} border-slate-200 dark:border-slate-700 hover:border-amber-500`}
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1 || isAll}
          onClick={() => onPage(page - 1)}
          className={`${navBtn} border-slate-200 dark:border-slate-700 hover:border-amber-500`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {!isAll && pageList(page, totalPages).map((n) =>
          typeof n === "string" ? (
            <span key={n} className="px-1 text-slate-400">…</span>
          ) : (
            <button
              key={n}
              type="button"
              aria-current={n === page ? "page" : undefined}
              onClick={() => onPage(n)}
              className={`${navBtn} ${
                n === page
                  ? "bg-amber-600 border-amber-600 text-white"
                  : "border-slate-200 dark:border-slate-700 hover:border-amber-500"
              }`}
            >
              {n}
            </button>
          )
        )}

        {/* If 'All' is selected, you can show a simple '1' active indicator button */}
        {isAll && (
          <button
            type="button"
            className={`${navBtn} bg-amber-600 border-amber-600 text-white`}
          >
            1
          </button>
        )}

        <button
          type="button"
          aria-label="Next page"
          disabled={page >= totalPages || isAll}
          onClick={() => onPage(page + 1)}
          className={`${navBtn} border-slate-200 dark:border-slate-700 hover:border-amber-500`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Super Next */}
        <button
          type="button"
          aria-label="Last page"
          disabled={page >= totalPages || isAll}
          onClick={() => onPage(totalPages)}
          className={`${navBtn} border-slate-200 dark:border-slate-700 hover:border-amber-500`}
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </nav>
    </div>
  );
}