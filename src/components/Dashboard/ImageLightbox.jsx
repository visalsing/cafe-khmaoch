
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

const clamp = (n) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(n)));

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
  const [showSlider, setShowSlider] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [broken, setBroken] = useState(false);

  const drag = useRef(null);
  const imgRef = useRef(null);
  const sliderRef = useRef(null);

  const applyZoom = useCallback((value) => {
    const nextZoom = clamp(value);
    setZoom(nextZoom);

    if (nextZoom <= 100) {
      setPos({ x: 0, y: 0 });
    }
  }, []);

  const resetView = useCallback(() => {
    setZoom(100);
    setPos({ x: 0, y: 0 });
  }, []);

  // Lock background scrolling while the lightbox is open.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Keyboard controls.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();

        if (showInfo) setShowInfo(false);
        else if (showTools) setShowTools(false);
        else if (showSlider) setShowSlider(false);
        else onClose();

        return;
      }

      if (event.key === "+" || event.key === "=") {
        applyZoom(zoom + STEP);
      } else if (event.key === "-") {
        applyZoom(zoom - STEP);
      } else if (event.key === "0") {
        resetView();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [
    zoom,
    showInfo,
    showTools,
    showSlider,
    onClose,
    applyZoom,
    resetView,
  ]);

  // Close the zoom slider when clicking outside it.
  useEffect(() => {
    if (!showSlider) return;

    const handlePointerDown = (event) => {
      if (!sliderRef.current?.contains(event.target)) {
        setShowSlider(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [showSlider]);

  // Dragging support.
  const onPointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.currentTarget.setPointerCapture?.(event.pointerId);

    drag.current = {
      x: event.clientX,
      y: event.clientY,
      ox: pos.x,
      oy: pos.y,
      moved: false,
    };

    setDragging(true);
  };

  const onPointerMove = (event) => {
    const currentDrag = drag.current;
    if (!currentDrag) return;

    const dx = event.clientX - currentDrag.x;
    const dy = event.clientY - currentDrag.y;

    if (Math.abs(dx) + Math.abs(dy) > 4) {
      currentDrag.moved = true;
    }

    if (currentDrag.moved) {
      setPos({
        x: currentDrag.ox + dx,
        y: currentDrag.oy + dy,
      });
    }
  };

  const onPointerUp = (event) => {
    const currentDrag = drag.current;

    drag.current = null;
    setDragging(false);

    if (!currentDrag || currentDrag.moved) return;

    const rect = imgRef.current?.getBoundingClientRect();

    const clickedImage =
      rect &&
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (!clickedImage) onClose();
  };

  const onPointerCancel = () => {
    drag.current = null;
    setDragging(false);
  };

  // Theme-aware shared styles.
  const iconBtn =
    "rounded-full p-2 transition " +
    "text-stone-700 hover:bg-stone-200 " +
    "dark:text-neutral-200 dark:hover:bg-neutral-800";

  const sheetBtn =
    "flex flex-col items-center justify-center gap-1.5 " +
    "rounded-xl border p-3 text-xs transition " +
    "border-stone-200 bg-white text-stone-700 hover:bg-stone-100 " +
    "dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 " +
    "dark:hover:bg-neutral-700";

  const popup =
    "rounded-xl border shadow-2xl " +
    "border-stone-200 bg-white text-stone-800 " +
    "dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

  const smallButton =
    "rounded-lg px-3 py-2 text-xs font-medium transition " +
    "bg-stone-100 text-stone-700 hover:bg-stone-200 " +
    "dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700";

  const mutedText = "text-stone-500 dark:text-neutral-400";

  const slider = (
    <input
      type="range"
      min={MIN_ZOOM}
      max={MAX_ZOOM}
      step={5}
      value={zoom}
      onChange={(event) => applyZoom(Number(event.target.value))}
      aria-label="Custom zoom level"
      className="h-2 w-full cursor-pointer appearance-none rounded-full
        bg-stone-200 accent-amber-500
        dark:bg-neutral-700"
    />
  );

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || alt || "Image viewer"}
      className="fixed inset-0 z-[100] flex flex-col select-none
        bg-stone-100/95 text-stone-900
        dark:bg-neutral-950/95 dark:text-neutral-100"
      onClick={(event) => event.stopPropagation()}
    >
      {/* Top toolbar */}
      <div
        className="relative z-20 flex shrink-0 items-center justify-between
          gap-3 border-b px-4 py-3 sm:px-6
          border-stone-200 bg-white/95
          dark:border-neutral-800 dark:bg-neutral-900/95"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="shrink-0 rounded-lg px-3 py-1 text-xs font-mono font-semibold
              bg-stone-100 text-stone-700
              dark:bg-neutral-800 dark:text-neutral-200"
          >
            {zoom}%
          </div>

          {title && (
            <span className="truncate text-sm font-medium text-stone-700 dark:text-neutral-200">
              {title}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Desktop toolbar controls */}
          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={() => applyZoom(zoom - STEP)}
              className={iconBtn}
              title="Zoom out (-)"
              aria-label="Zoom out"
              disabled={zoom <= MIN_ZOOM}
            >
              <Minus className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => applyZoom(zoom + STEP)}
              className={iconBtn}
              title="Zoom in (+)"
              aria-label="Zoom in"
              disabled={zoom >= MAX_ZOOM}
            >
              <Plus className="h-5 w-5" />
            </button>

            {/* Custom zoom slider */}
            <div className="relative" ref={sliderRef}>
              <button
                type="button"
                onClick={() => setShowSlider((value) => !value)}
                className={`${iconBtn} ${
                  showSlider
                    ? "bg-stone-200 dark:bg-neutral-800"
                    : ""
                }`}
                title="Custom zoom"
                aria-label="Custom zoom slider"
                aria-expanded={showSlider}
              >
                <SlidersHorizontal className="h-5 w-5" />
              </button>

              {showSlider && (
                <div
                  className={`absolute right-0 z-30 mt-2 w-72 space-y-4 p-5 ${popup}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Custom zoom
                    </span>

                    <button
                      type="button"
                      onClick={() => setShowSlider(false)}
                      className={iconBtn}
                      aria-label="Close zoom controls"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-mono ${mutedText}`}>
                      {MIN_ZOOM}%
                    </span>

                    {slider}

                    <span className={`text-xs font-mono ${mutedText}`}>
                      {MAX_ZOOM}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t pt-3
                    border-stone-200 dark:border-neutral-700"
                  >
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      {zoom}%
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        resetView();
                        setShowSlider(false);
                      }}
                      className={smallButton}
                    >
                      Reset to 100%
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={resetView}
              className={iconBtn}
              title="Reset (0)"
              aria-label="Reset view"
            >
              <RotateCcw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </button>

            {info && (
              <button
                type="button"
                onClick={() => setShowInfo(true)}
                className={iconBtn}
                title="Details"
                aria-label="Show details"
              >
                <Info className="h-5 w-5" />
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
              <Download className="h-5 w-5" />
            </a>
          </div>

          {/* Mobile toolbar */}
          <button
            type="button"
            onClick={() => setShowTools(true)}
            className="flex items-center gap-2 rounded-xl border px-3.5 py-2
              text-xs font-semibold transition md:hidden
              border-stone-200 bg-white text-stone-700 hover:bg-stone-100
              dark:border-neutral-700 dark:bg-neutral-800
              dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Tools
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition
              bg-stone-200 text-stone-800 hover:bg-stone-300
              dark:bg-neutral-800 dark:text-neutral-100
              dark:hover:bg-neutral-700"
            title="Close (Esc)"
            aria-label="Close image viewer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main image area */}
      <div
        className={`relative flex flex-1 touch-none items-center justify-center overflow-hidden ${
          dragging
            ? "cursor-grabbing"
            : zoom > 100
              ? "cursor-grab"
              : "cursor-zoom-in"
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onWheel={(event) =>
          applyZoom(zoom + (event.deltaY < 0 ? 10 : -10))
        }
        onDoubleClick={() =>
          zoom === 100 ? applyZoom(200) : resetView()
        }
      >
        {broken ? (
          <p className={`text-sm ${mutedText}`}>
            This image could not be loaded.
          </p>
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
            className="pointer-events-none max-h-[80vh] max-w-[90vw]
              select-none rounded-lg object-contain shadow-2xl"
          />
        )}

        <p
          className={`pointer-events-none absolute bottom-3 left-1/2 hidden
            -translate-x-1/2 text-center text-[11px] sm:block ${mutedText}`}
        >
          Scroll to zoom · drag to move · double-click to zoom or reset · Esc to close
        </p>
      </div>

      {/* Mobile tools sheet */}
      {showTools && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center
            bg-stone-950/40 p-4 backdrop-blur-sm dark:bg-black/60"
          onClick={() => setShowTools(false)}
        >
          <div
            className={`w-full max-w-sm space-y-4 rounded-2xl border p-5 shadow-2xl ${popup}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3
              border-stone-200 dark:border-neutral-800"
            >
              <h3 className="text-sm font-bold tracking-wide">
                Image controls
              </h3>

              <button
                type="button"
                onClick={() => setShowTools(false)}
                className={iconBtn}
                aria-label="Close image controls"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 rounded-xl border p-4
              border-stone-200 bg-stone-50
              dark:border-neutral-700 dark:bg-neutral-800/60"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">
                  Custom zoom
                </span>

                <span className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400">
                  {zoom}%
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-mono ${mutedText}`}>
                  {MIN_ZOOM}%
                </span>

                {slider}

                <span className={`text-[10px] font-mono ${mutedText}`}>
                  {MAX_ZOOM}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => applyZoom(zoom + STEP)}
                disabled={zoom >= MAX_ZOOM}
                className={sheetBtn}
              >
                <Plus className="h-5 w-5" />
                Zoom in
              </button>

              <button
                type="button"
                onClick={() => applyZoom(zoom - STEP)}
                disabled={zoom <= MIN_ZOOM}
                className={sheetBtn}
              >
                <Minus className="h-5 w-5" />
                Zoom out
              </button>

              <button
                type="button"
                onClick={resetView}
                className={sheetBtn}
              >
                <RotateCcw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Reset
              </button>

              {info && (
                <button
                  type="button"
                  onClick={() => {
                    setShowTools(false);
                    setShowInfo(true);
                  }}
                  className={sheetBtn}
                >
                  <Info className="h-5 w-5" />
                  Info
                </button>
              )}

              <a
                href={src}
                download={downloadName || true}
                target="_blank"
                rel="noreferrer"
                onClick={() => setShowTools(false)}
                className={`${sheetBtn} ${
                  info ? "col-span-2" : "col-span-3"
                }`}
              >
                <Download className="h-5 w-5" />
                Save image
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Image information popup */}
      {showInfo && info && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center
            bg-stone-950/40 p-4 backdrop-blur-sm dark:bg-black/60"
          onClick={() => setShowInfo(false)}
        >
          <div
            className={`max-h-[85vh] w-full max-w-md space-y-4 overflow-y-auto
              rounded-2xl border p-6 shadow-2xl ${popup}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3
              border-stone-200 dark:border-neutral-800"
            >
              <h3 className="flex items-center gap-2 text-base font-bold tracking-wide">
                <Info className="h-5 w-5" />
                {infoTitle}
              </h3>

              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className={iconBtn}
                aria-label="Close information"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {info}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className={smallButton}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
