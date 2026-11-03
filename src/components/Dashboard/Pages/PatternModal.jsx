import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { X, ChevronLeft, ChevronRight, Minus, Plus, RotateCcw } from "lucide-react";

import aboutKh from "../../../assets/about/about-kh.png";
import aboutEn from "../../../assets/about/about-en.png";

const patterns = [
  { src: aboutKh, label: "Khmer", title: "Khmer Pattern" },
  { src: aboutEn, label: "English", title: "English Pattern" },
];

const MIN_ZOOM = 25;
const MAX_ZOOM = 400;
const ZOOM_STEP = 25;

const clampZoom = (value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

export default function PatternModal({ isOpen, onClose }) {
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [showCustomZoom, setShowCustomZoom] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 }); // size of the image viewport
  const [natural, setNatural] = useState(null); // natural size of the current image

  const viewportRef = useRef(null);
  const zoomAreaRef = useRef(null);
  const anchorRef = useRef(null); // keeps the centre of the view steady while zooming
  const keyRef = useRef(null); // always holds the latest key handler
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  const currentPattern = patterns[page];

  /* ---------- sizes ----------
     The image is drawn at an exact pixel size: "fit to the viewport" x zoom.
     The stage around it is never smaller than the viewport, so the image is centred
     when small and fully scrollable (left/top included) when zoomed in. */
  const scale = zoom / 100;
  const fit =
    natural && box.w > 0 && box.h > 0
      ? Math.min(box.w / natural.w, box.h / natural.h)
      : 0;
  const imgW = natural ? natural.w * fit * scale : 0;
  const imgH = natural ? natural.h * fit * scale : 0;
  const stageW = Math.max(imgW, box.w);
  const stageH = Math.max(imgH, box.h);
  const canPan = imgW > box.w + 1 || imgH > box.h + 1;

  /* ---------- zoom ---------- */
  const applyZoom = useCallback((next) => {
    const viewport = viewportRef.current;
    if (viewport && viewport.scrollWidth > 0 && viewport.scrollHeight > 0) {
      anchorRef.current = {
        x: (viewport.scrollLeft + viewport.clientWidth / 2) / viewport.scrollWidth,
        y: (viewport.scrollTop + viewport.clientHeight / 2) / viewport.scrollHeight,
      };
    }
    setZoom((current) => clampZoom(typeof next === "function" ? next(current) : next));
  }, []);

  const zoomIn = () => applyZoom((z) => z + ZOOM_STEP);
  const zoomOut = () => applyZoom((z) => z - ZOOM_STEP);

  const resetZoom = () => {
    anchorRef.current = null;
    setZoom(100);
    setShowCustomZoom(false);
  };

  // after the size changed, scroll so the same centre point stays in the middle
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const viewport = viewportRef.current;
    if (!anchor || !viewport) return;
    viewport.scrollLeft = anchor.x * viewport.scrollWidth - viewport.clientWidth / 2;
    viewport.scrollTop = anchor.y * viewport.scrollHeight - viewport.clientHeight / 2;
    anchorRef.current = null;
  }, [zoom, box.w, box.h]);

  /* ---------- pages ---------- */
  const stopDrag = () => {
    dragRef.current.active = false;
    setIsDragging(false);
  };

  const changePage = useCallback((next) => {
    setPage(next);
    setZoom(100);
    setShowCustomZoom(false);
    setNatural(null); // measured again when the new image loads
    anchorRef.current = null;
    dragRef.current.active = false;
    setIsDragging(false);
    viewportRef.current?.scrollTo(0, 0);
  }, []);

  const step = (direction) =>
    changePage((page + direction + patterns.length) % patterns.length);

  /* ---------- drag to pan ---------- */
  const handlePointerDown = (e) => {
    if (!canPan || e.button !== 0) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    e.preventDefault();
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    };
    viewport.setPointerCapture(e.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current.active) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollLeft = dragRef.current.scrollLeft - (e.clientX - dragRef.current.startX);
    viewport.scrollTop = dragRef.current.scrollTop - (e.clientY - dragRef.current.startY);
  };

  const handlePointerUp = (e) => {
    stopDrag();
    const viewport = viewportRef.current;
    if (viewport?.hasPointerCapture(e.pointerId)) {
      viewport.releasePointerCapture(e.pointerId);
    }
  };

  /* ---------- keyboard (one listener, always up to date) ---------- */
  keyRef.current = (e) => {
    if (e.key === "Escape") {
      if (showCustomZoom) setShowCustomZoom(false);
      else onClose();
      return;
    }

    // arrow keys belong to the zoom slider while it is focused
    const tag = e.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === "+" || e.key === "=") zoomIn();
    else if (e.key === "-") zoomOut();
    else if (e.key === "0") resetZoom();
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => keyRef.current?.(e);
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  /* ---------- lock the page behind the modal ---------- */
  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  /* ---------- close the zoom panel when clicking outside it ---------- */
  useEffect(() => {
    if (!showCustomZoom) return undefined;
    const onMouseDown = (event) => {
      if (zoomAreaRef.current && !zoomAreaRef.current.contains(event.target)) {
        setShowCustomZoom(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [showCustomZoom]);

  /* ---------- start clean every time the modal opens ---------- */
  useLayoutEffect(() => {
    if (!isOpen) return;
    setPage(0);
    setZoom(100);
    setShowCustomZoom(false);
    setNatural(null);
    anchorRef.current = null;
    dragRef.current.active = false;
    setIsDragging(false);
  }, [isOpen]);

  /* ---------- measure the viewport ---------- */
  useEffect(() => {
    if (!isOpen) return undefined;
    const element = viewportRef.current;
    if (!element) return undefined;

    const measure = () =>
      setBox({ w: element.clientWidth, h: element.clientHeight });
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [isOpen]);

  if (!isOpen) return null;

  const iconBtn =
    "rounded-full p-1.5 text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 sm:p-5"
      // mouse DOWN on the dark backdrop only: releasing a drag outside the window must not close it
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={currentPattern.title}
        className="flex h-[min(720px,94dvh)] w-full max-w-[960px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        {/* HEADER */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white sm:text-xl">
              Pattern
            </h2>
            <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
              {currentPattern.title}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X size={22} />
          </button>
        </div>

        {/* PREVIEW */}
        <div className="relative flex min-h-0 flex-1 bg-slate-100 p-2 dark:bg-slate-950 sm:p-4">
          <div
            ref={viewportRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`pattern-scrollbar-hide relative min-h-0 w-full flex-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 ${
              canPan ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
            }`}
            style={{ userSelect: "none", touchAction: canPan ? "none" : "auto" }}
          >
            <div
              className="flex items-center justify-center"
              style={{ width: stageW || "100%", height: stageH || "100%" }}
            >
              <img
                key={currentPattern.src}
                src={currentPattern.src}
                alt={currentPattern.title}
                draggable="false"
                onLoad={(e) =>
                  setNatural({
                    w: e.currentTarget.naturalWidth,
                    h: e.currentTarget.naturalHeight,
                  })
                }
                className="select-none"
                style={
                  natural
                    ? { width: imgW, height: imgH, maxWidth: "none", pointerEvents: "none" }
                    : { maxWidth: "100%", maxHeight: "100%", opacity: 0, pointerEvents: "none" }
                }
              />
            </div>
          </div>

          {patterns.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous pattern"
                className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-800 shadow-md transition hover:bg-white dark:border-slate-600 dark:bg-slate-800/95 dark:text-white dark:hover:bg-slate-700 sm:left-6"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next pattern"
                className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-800 shadow-md transition hover:bg-white dark:border-slate-600 dark:bg-slate-800/95 dark:text-white dark:hover:bg-slate-700 sm:right-6"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="relative flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 sm:px-6">
          {/* page indicator */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tabular-nums text-slate-500 dark:text-slate-400">
              {page + 1} / {patterns.length}
            </span>
            <div className="flex items-center gap-1.5">
              {patterns.map((pattern, index) => (
                <button
                  key={pattern.label}
                  type="button"
                  onClick={() => changePage(index)}
                  aria-label={`Show ${pattern.label} pattern`}
                  aria-current={page === index}
                  className={`h-2.5 rounded-full transition-all duration-200 ${
                    page === index
                      ? "w-7 bg-accent-500"
                      : "w-2.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* zoom controls (the panel is positioned against the footer, so it never leaves the screen) */}
          <div ref={zoomAreaRef} className="flex items-center gap-1">
            <button
              type="button"
              onClick={zoomOut}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Zoom out"
              title="Zoom out"
              className={iconBtn}
            >
              <Minus size={19} />
            </button>

            <button
              type="button"
              onClick={() => setShowCustomZoom((open) => !open)}
              aria-expanded={showCustomZoom}
              title="Custom zoom"
              className="min-w-[52px] rounded-md px-1.5 py-1 text-sm font-semibold tabular-nums text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {zoom}%
            </button>

            <button
              type="button"
              onClick={zoomIn}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Zoom in"
              title="Zoom in"
              className={iconBtn}
            >
              <Plus size={19} />
            </button>

            <button
              type="button"
              onClick={resetZoom}
              disabled={zoom === 100}
              aria-label="Reset zoom"
              title="Reset to 100%"
              className="rounded-full p-1.5 text-accent-600 transition hover:bg-accent-50 disabled:cursor-not-allowed disabled:opacity-30 dark:text-accent-400 dark:hover:bg-accent-950/30"
            >
              <RotateCcw size={19} />
            </button>

            {showCustomZoom && (
              <div className="absolute bottom-full right-3 z-50 mb-3 w-[min(340px,calc(100%-1.5rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-800 sm:right-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-medium text-slate-800 dark:text-white">
                    Custom zoom
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowCustomZoom(false)}
                    aria-label="Close custom zoom"
                    className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {MIN_ZOOM}%
                  </span>
                  <input
                    type="range"
                    min={MIN_ZOOM}
                    max={MAX_ZOOM}
                    step={5}
                    value={zoom}
                    onChange={(e) => applyZoom(Number(e.target.value))}
                    aria-label="Zoom percentage"
                    className="h-2 min-w-0 flex-1 cursor-pointer accent-accent-500"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {MAX_ZOOM}%
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <span className="text-lg font-semibold tabular-nums text-accent-600 dark:text-accent-400">
                    {zoom}%
                  </span>
                  <button
                    type="button"
                    onClick={resetZoom}
                    className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                  >
                    Reset to 100%
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .pattern-scrollbar-hide {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .pattern-scrollbar-hide::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>
    </div>
  );
}