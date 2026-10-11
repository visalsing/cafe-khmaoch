import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { inputCls } from "./Shared.jsx";

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Choose...",
  dropUp = false, // open above the button (for controls at the bottom of the page)
  className = "mt-1", // outer spacing, pass "" to remove it
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => String(o.value) === String(value));

  // close when clicking outside, or pressing Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative w-full ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`${inputCls} w-full flex items-center justify-between text-left cursor-pointer bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-amber-500 focus:outline-none transition-all ${
          open ? "border-amber-600 ring-2 ring-amber-600/20" : ""
        }`}
      >
        <span className={selected ? "text-slate-800 dark:text-slate-100" : "text-slate-400"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180 text-amber-500" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute z-50 w-full max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-1.5 space-y-0.5 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] dark:[scrollbar-color:#475569_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-track]:my-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-amber-500 ${
            dropUp ? "bottom-full mb-1" : "mt-1"
          }`}
        >
          {options.map((option) => {
            const active = String(option.value) === String(value);
            return (
              <button
                key={String(option.value)}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors flex items-center justify-between gap-1.5 ${
                  active
                    ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                    : "text-slate-700 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-amber-700 dark:hover:text-amber-400"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {active && <span className="text-amber-600 shrink-0 font-bold text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}