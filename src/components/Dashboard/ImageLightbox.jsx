import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Minus,
  Plus,
  RotateCcw,
  Info,
  Download,
  X,
  SlidersHorizontal,
} from "lucide-react";

const MIN_ZOOM = 25;
const MAX_ZOOM = 400;
const STEP = 25;
const clamp = (n) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(n)));

/**
 * Full-screen image viewer.
 *   src            image URL (required)
 *   alt / title    accessible name, and the title shown in the top bar
 *   info           optional content (any JSX) for the "Info" popup. Without it there is no Info button
 *   infoTitle      heading of the Info popup
 *   downloadName   optional file name for the Download button
 *   onClose        called when the user closes it (X, Esc, or click on the dark area)
 *
 * Render it as a SIBLING of your modal, not inside it:  {open && <ImageLightbox ... />}
 */
export default function ImageLightbox({
  src,
  alt = "",
  title = "",
  info = null,
  infoTitle = "Details",
  downloadName,
  onClose,
}) {
  const [zoom, setZoom] = useState(100);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [showSlider, setShowSlider] = useState(false); // desktop zoom slider popover
  const [showTools, setShowTools] = useState(false); // mobile tools sheet
  const [showInfo, setShowInfo] = useState(false);
  const [broken, setBroken] = useState(false);

  const drag = useRef(null);
  const imgRef = useRef(null);
  const sliderRef = useRef(null);

  const applyZoom = useCallback((value) => {
    const z = clamp(value);
    setZoom(z);
    if (z <= 100) setPos({ x: 0, y: 0 }); // small again -> back to the middle
  }, []);

  const resetView = useCallback(() => {
    setZoom(100);
    setPos({ x: 0, y: 0 });
  }, []);

  // lock the page scroll behind the lightbox
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // keyboard: Esc closes the innermost layer first, + / - / 0 for zoom.
  // Registered in the capture phase so a parent modal's own Esc handler never sees this key.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (showInfo) setShowInfo(false);
        else if (showTools) setShowTools(false);
        else if (showSlider) setShowSlider(false);
        else onClose();
      } else if (e.key === "+" || e.key === "=") applyZoom(zoom + STEP);
      else if (e.key === "-") applyZoom(zoom - STEP);
      else if (e.key === "0") resetView();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [zoom, showInfo, showTools, showSlider, onClose, applyZoom, resetView]);

  // click outside the slider popover closes it
  useEffect(() => {
    if (!showSlider) return;
    const onDown = (e) => {
      if (!sliderRef.current?.contains(e.target)) setShowSlider(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [showSlider]);

  /* ---------- dragging (mouse, touch and pen) ---------- */
  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y, moved: false };
    setDragging(true);
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    if (d.moved) setPos({ x: d.ox + dx, y: d.oy + dy });
  };
  const onPointerUp = (e) => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d || d.moved) return;
    // a plain click on the dark area (outside the image) closes the viewer
    const r = imgRef.current?.getBoundingClientRect();
    const inside =
      r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) onClose();
  };
  const onPointerCancel = () => {
    drag.current = null;
    setDragging(false);
  };

  const iconBtn = "p-2 rounded-full hover:bg-slate-800 transition";
  const sheetBtn =
    "flex flex-col items-center justify-center gap-1.5 p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 rounded-xl text-xs transition";

  const slider = (
    <input
      type="range"
      min={MIN_ZOOM}
      max={MAX_ZOOM}
      step={5}
      value={zoom}
      onChange={(e) => applyZoom(Number(e.target.value))}
      className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-amber-500"
    />
  );

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || alt || "Image viewer"}
      className="fixed inset-0 z-[100] bg-slate-950/95 flex flex-col select-none text-white"
      onClick={(e) => e.stopPropagation()} // clicks here must never reach a parent modal
    >
      {/* ===== top bar ===== */}
      <div className="relative z-20 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-slate-900/70 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="px-3 py-1 bg-slate-800 rounded-lg text-xs font-mono font-semibold shrink-0">
            {zoom}%
          </div>
          {title && <span className="text-sm font-medium text-slate-200 truncate">{title}</span>}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* desktop tools */}
          <div className="hidden md:flex items-center gap-2">
            <button onClick={() => applyZoom(zoom - STEP)} className={iconBtn} title="Zoom out (-)" aria-label="Zoom out">
              <Minus className="w-5 h-5 text-blue-400" />
            </button>
            <button onClick={() => applyZoom(zoom + STEP)} className={iconBtn} title="Zoom in (+)" aria-label="Zoom in">
              <Plus className="w-5 h-5 text-blue-400" />
            </button>

            <div className="relative" ref={sliderRef}>
              <button
                onClick={() => setShowSlider((v) => !v)}
                className={`${iconBtn} ${showSlider ? "bg-slate-800 text-amber-500" : ""}`}
                title="Custom zoom"
                aria-label="Custom zoom slider"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
              {showSlider && (
                <div className="absolute right-0 mt-2 z-30 bg-slate-900 border border-slate-700 p-5 rounded-xl shadow-2xl w-72 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-300">Custom zoom</span>
                    <button
                      onClick={() => setShowSlider(false)}
                      className="p-1 rounded-full hover:bg-slate-700 text-slate-500 hover:text-white"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500">{MIN_ZOOM}%</span>
                    {slider}
                    <span className="text-xs font-mono text-slate-500">{MAX_ZOOM}%</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                    <span className="text-sm font-semibold text-amber-400">{zoom}%</span>
                    <button
                      onClick={() => {
                        resetView();
                        setShowSlider(false);
                      }}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs font-medium"
                    >
                      Reset to 100%
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button onClick={resetView} className={iconBtn} title="Reset (0)" aria-label="Reset view">
              <RotateCcw className="w-5 h-5 text-amber-400" />
            </button>
            {info && (
              <button
                onClick={() => setShowInfo(true)}
                className={iconBtn}
                title="Details"
                aria-label="Show details"
              >
                <Info className="w-5 h-5 text-purple-400" />
              </button>
            )}
            <a
              href={src}
              download={downloadName || true}
              target="_blank"
              rel="noreferrer"
              className={iconBtn}
              title="Download"
              aria-label="Download image"
            >
              <Download className="w-5 h-5 text-sky-400" />
            </a>
          </div>

          {/* small screens: one "Tools" button opening a sheet */}
          <button
            onClick={() => setShowTools(true)}
            className="flex md:hidden items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-300" />
            Tools
          </button>

          <button onClick={onClose} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition" title="Close (Esc)" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ===== image area ===== */}
      <div
        className={`flex-1 overflow-hidden relative flex items-center justify-center touch-none ${
          dragging ? "cursor-grabbing" : zoom > 100 ? "cursor-grab" : "cursor-zoom-in"
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onWheel={(e) => applyZoom(zoom + (e.deltaY < 0 ? 10 : -10))}
        onDoubleClick={() => (zoom === 100 ? applyZoom(200) : resetView())}
      >
        {broken ? (
          <p className="text-slate-400 text-sm">This image could not be loaded.</p>
        ) : (
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            draggable={false}
            onError={() => setBroken(true)}
            style={{
              transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom / 100})`,
              transition: dragging ? "none" : "transform 0.12s ease-out",
            }}
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg shadow-2xl pointer-events-none select-none"
          />
        )}
        <p className="hidden sm:block absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-slate-500 pointer-events-none">
          Scroll to zoom · drag to move · double-click to zoom or reset · Esc to close
        </p>
      </div>

      {/* ===== tools sheet (small screens) ===== */}
      {showTools && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm tracking-wide">Image controls</h3>
              <button
                onClick={() => setShowTools(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">Custom zoom</span>
                <span className="text-xs font-mono font-semibold text-amber-400">{zoom}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-slate-500">{MIN_ZOOM}%</span>
                {slider}
                <span className="text-[10px] font-mono text-slate-500">{MAX_ZOOM}%</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => applyZoom(zoom + STEP)} className={sheetBtn}>
                <Plus className="w-5 h-5 text-blue-400" />
                Zoom in
              </button>
              <button onClick={() => applyZoom(zoom - STEP)} className={sheetBtn}>
                <Minus className="w-5 h-5 text-blue-400" />
                Zoom out
              </button>
              <button onClick={resetView} className={sheetBtn}>
                <RotateCcw className="w-5 h-5 text-amber-400" />
                Reset
              </button>
              {info && (
                <button
                  onClick={() => {
                    setShowTools(false);
                    setShowInfo(true);
                  }}
                  className={sheetBtn}
                >
                  <Info className="w-5 h-5 text-purple-400" />
                  Info
                </button>
              )}
              <a
                href={src}
                download={downloadName || true}
                target="_blank"
                rel="noreferrer"
                onClick={() => setShowTools(false)}
                className={`${sheetBtn} ${info ? "col-span-2" : "col-span-3"}`}
              >
                <Download className="w-5 h-5 text-sky-400" />
                Save image
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ===== info popup ===== */}
      {showInfo && info && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base tracking-wide flex items-center gap-2">
                <Info className="w-5 h-5 text-purple-400" />
                {infoTitle}
              </h3>
              <button
                onClick={() => setShowInfo(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {info}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowInfo(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}