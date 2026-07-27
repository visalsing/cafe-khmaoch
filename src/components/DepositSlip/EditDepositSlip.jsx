import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  ZoomIn,
  ZoomOut,
  X,
  RotateCcw,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
} from "lucide-react";

// ----------------------------------------------------------------------
// 3. Order Editing
// ----------------------------------------------------------------------
import EditDepositSlipImg1 from "../../assets/depositslip/edit-depositslip/img1.jpg";
import EditDepositSlipImg2 from "../../assets/depositslip/edit-depositslip/img2.jpg";
import EditDepositSlipImg3 from "../../assets/depositslip/edit-depositslip/img3.jpg";

// ----------------------------------------------------------------------
// Order Editing Data Array
// ----------------------------------------------------------------------
const EditDepositSlipImages = [
  {
    src: EditDepositSlipImg1,
    title: "Open Stock Module",
    caption: "Stock photo 1",
    description:
      "Navigate to the main inventory dashboard and open the stock lookup tool.",
  },
    {
    src: EditDepositSlipImg2,
    title: "Open Stock Module",
    caption: "Stock photo 1",
    description:
      "Navigate to the main inventory dashboard and open the stock lookup tool.",
  },
    {
    src: EditDepositSlipImg3,
    title: "Open Stock Module",
    caption: "Stock photo 1",
    description:
      "Navigate to the main inventory dashboard and open the stock lookup tool.",
  },
];

// ---------- Fullscreen zoom lightbox ----------
function Lightbox({ images, imageIndex, onIndexChange, onClose }) {
  const image = images[imageIndex];
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragState = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  const clampZoom = (z) => Math.min(4, Math.max(1, z));
  const zoomIn = useCallback(
    () => setZoom((z) => clampZoom(+(z + 0.5).toFixed(2))),
    [],
  );
  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const next = clampZoom(+(z - 0.5).toFixed(2));
      if (next === 1) setPos({ x: 0, y: 0 });
      return next;
    });
  }, []);
  const resetZoom = useCallback(() => {
    setZoom(1);
    setPos({ x: 0, y: 0 });
  }, []);

  const handleNext = useCallback(() => {
    resetZoom();
    onIndexChange((imageIndex + 1) % images.length);
  }, [imageIndex, onIndexChange, resetZoom]);

  const handlePrev = useCallback(() => {
    resetZoom();
    onIndexChange((imageIndex - 1 + images.length) % images.length);
  }, [imageIndex, onIndexChange, resetZoom]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-" || e.key === "_") zoomOut();
      if (e.key === "0") resetZoom();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, handleNext, handlePrev, zoomIn, zoomOut, resetZoom]);

  const onWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  };

  const onPointerDown = (e) => {
    if (zoom === 1) return;
    dragState.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
  };
  const onPointerMove = (e) => {
    if (!dragState.current.dragging) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPos({
      x: dragState.current.origX + dx,
      y: dragState.current.origY + dy,
    });
  };
  const onPointerUp = () => (dragState.current.dragging = false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="absolute top-4 right-4 flex items-center space-x-2 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={zoomOut}
          className="p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={zoomIn}
          className="p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={resetZoom}
          className="p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Reset zoom"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          onClick={onClose}
          className="p-2.5 rounded-xl bg-white/10 text-white hover:bg-red-500/80 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="absolute top-4 left-4 flex items-center space-x-2 z-20">
        <div className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm font-medium">
          {imageIndex + 1} / {images.length}
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm font-medium">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handlePrev();
        }}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white z-20 transition-all hover:scale-110"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleNext();
        }}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white z-20 transition-all hover:scale-110"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      <div
        className="w-full h-full flex items-center justify-center overflow-hidden select-none"
        onClick={(e) => e.stopPropagation()}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <img
          src={image.src}
          alt={image.title}
          draggable={false}
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})`,
            cursor: zoom > 1 ? "grab" : "zoom-in",
            transition: dragState.current.dragging
              ? "none"
              : "transform 0.15s ease-out",
          }}
          onClick={() => (zoom === 1 ? zoomIn() : null)}
          className="max-w-[85vw] max-h-[70vh] object-contain rounded-lg shadow-2xl"
        />
      </div>

      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-xl w-[90vw] p-4 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10 text-white text-center z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="font-semibold text-base text-blue-400 mb-1">
          {image.title}
        </h4>
        <p className="text-sm text-slate-300 leading-snug">
          {image.description}
        </p>
      </div>
    </div>
  );
}

// ---------- Inline slideshow viewer (main gallery, not just the lightbox) ----------
function SlideViewer({ images }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const intervalRef = useRef(null);

  const goNext = useCallback(
    () => setIndex((i) => (i + 1) % images.length),
    [],
  );
  const goPrev = useCallback(
    () => setIndex((i) => (i - 1 + images.length) % images.length),
    [],
  );

  // Autoplay
  useEffect(() => {
    if (!playing) return;
    intervalRef.current = setInterval(goNext, 2800);
    return () => clearInterval(intervalRef.current);
  }, [playing, goNext]);

  const current = images[index];

  return (
    <div>
      {/* Main slide stage — full image, nothing cropped */}
      <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950">
        <button
          onClick={() => setLightboxOpen(true)}
          className="relative w-full h-[280px] sm:h-[420px] flex items-center justify-center cursor-zoom-in group"
          aria-label="Open fullscreen zoom"
        >
          <img
            key={current.src}
            src={current.src}
            alt={current.title}
            className="max-w-full max-h-full object-contain"
          />
          <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/10 transition-colors flex items-center justify-center">
            <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-90 transition-opacity drop-shadow" />
          </div>
        </button>

        {/* Top controls */}
        <div className="absolute top-3 right-3 flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded-lg bg-slate-900/70 text-white text-xs font-medium">
            {index + 1} / {images.length}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPlaying((p) => !p);
            }}
            className="p-2 rounded-lg bg-slate-900/70 text-white hover:bg-slate-900/90 transition-colors"
            aria-label={playing ? "Pause slideshow" : "Play slideshow"}
          >
            {playing ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/70 hover:bg-slate-900/90 text-white transition-all hover:scale-110"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/70 hover:bg-slate-900/90 text-white transition-all hover:scale-110"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Progress bar (only meaningful while autoplaying) */}
        {playing && (
          <div className="h-0.5 bg-slate-300 dark:bg-white/10">
            <div
              key={index}
              className="h-full bg-blue-500"
              style={{ animation: "orderbooking-progress 2.8s linear" }}
            />
          </div>
        )}
      </div>

      {/* Caption / title / description — BELOW the image, not on top of it */}
      <div className="mt-3 px-1">
        <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
          {current.caption}
        </span>
        <h4 className="text-sm font-semibold dark:text-white text-slate-800 mt-0.5">
          {current.title}
        </h4>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {current.description}
        </p>
      </div>

      {/* Thumbnail strip — below the caption/description */}
      <div className="thumb-scroll flex gap-2 mt-4 overflow-x-auto pb-2">
        {images.map((img, i) => (
          <button
            key={img.src}
            onClick={() => setIndex(i)}
            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all
              ${i === index ? "border-blue-500" : "border-transparent opacity-60 hover:opacity-100"}`}
            aria-label={`Go to ${img.title}`}
          >
            <img
              src={img.src}
              alt={img.title}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {lightboxOpen && (
        <Lightbox
          images={images}
          imageIndex={index}
          onIndexChange={setIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      <style>{`
        @keyframes orderbooking-progress {
          from { width: 0%; }
          to { width: 100%; }
        }

        /* Custom scrollbar for the thumbnail strip */
        .thumb-scroll {
          scrollbar-width: thin; /* Firefox */
          scrollbar-color: rgb(148 163 184) transparent; /* Firefox: thumb, track */
        }
        .thumb-scroll::-webkit-scrollbar {
          height: 6px;
        }
        .thumb-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .thumb-scroll::-webkit-scrollbar-thumb {
          background-color: rgb(148 163 184 / 0.6); /* slate-400 */
          border-radius: 9999px;
        }
        .thumb-scroll::-webkit-scrollbar-thumb:hover {
          background-color: rgb(59 130 246 / 0.8); /* blue-500 on hover */
        }
        .dark .thumb-scroll {
          scrollbar-color: rgb(71 85 105) transparent; /* slate-600 for dark mode */
        }
        .dark .thumb-scroll::-webkit-scrollbar-thumb {
          background-color: rgb(71 85 105 / 0.7); /* slate-600 */
        }
        .dark .thumb-scroll::-webkit-scrollbar-thumb:hover {
          background-color: rgb(96 165 250 / 0.8); /* blue-400 on hover */
        }
      `}</style>
    </div>
  );
}

export default function EditDepositSlip() {
  return (
    <>
      {/* Section 3: Order Editing */}
      <div className="mt-6 p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="mb-8">
          <h2 className="text-2xl font-bold dark:text-white text-slate-800">
            Edit បុងជំពាក់
          </h2>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-4 mb-2">
            How to check stock in DCode
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Placeholder walkthrough — replace the images and captions in{" "}
            <code>EditDepositSlipImages</code> with your real stock-check
            screenshots.
          </p>
        </div>

        <div>
          <div className="flex items-center space-x-2 mb-3">
            <ImageIcon className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Attached Photos
            </h3>
          </div>
          <SlideViewer images={EditDepositSlipImages} />
        </div>
      </div>
    </>
  );
}
