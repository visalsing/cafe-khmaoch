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
  Info,
  Download,
  SlidersHorizontal,
} from "lucide-react";

// ----------------------------------------------------------------------
// Order Editing Data Array
// ----------------------------------------------------------------------
import PriceOutletImg1 from "../../assets/price/priceoutlet/img1.jpg";

const PriceOutletImages = [
  {
    src: PriceOutletImg1,
    title: "Open Stock Module",
    caption: "Stock photo 1",
    description:
      "Navigate to the main inventory dashboard and open the stock lookup tool.",
  },
];

// ---------- Fullscreen zoom lightbox ----------
function Lightbox({
  images,
  imageIndex,
  onIndexChange,
  onClose,
  isPlaying,
  onTogglePlay,
}) {
  const image = images[imageIndex];
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [infoOpen, setInfoOpen] = useState(false);
  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const dragState = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  const clampZoom = (z) => Math.min(4, Math.max(1, z));
  const zoomIn = useCallback(
    () => setZoom((z) => clampZoom(+(z + 0.1).toFixed(2))),
    []
  );
  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const next = clampZoom(+(z - 0.1).toFixed(2));
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
    setInfoOpen(false);
    onIndexChange((imageIndex + 1) % images.length);
  }, [imageIndex, images.length, onIndexChange, resetZoom]);

  const handlePrev = useCallback(() => {
    resetZoom();
    setInfoOpen(false);
    onIndexChange((imageIndex - 1 + images.length) % images.length);
  }, [imageIndex, images.length, onIndexChange, resetZoom]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(handleNext, 2800);
    return () => clearInterval(interval);
  }, [isPlaying, handleNext]);

  const handleDownload = useCallback(async () => {
    try {
      setDownloading(true);
      const response = await fetch(image.src);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const ext = image.src.split(".").pop().split("?")[0] || "jpg";
      const filename = `${image.title.replace(/[^a-z0-9]+/gi, "_")}.${ext}`;
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  }, [image]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (toolsModalOpen) setToolsModalOpen(false);
        else if (infoOpen) setInfoOpen(false);
        else onClose();
      }
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-" || e.key === "_") zoomOut();
      if (e.key === "0") resetZoom();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    onClose,
    handleNext,
    handlePrev,
    zoomIn,
    zoomOut,
    resetZoom,
    infoOpen,
    toolsModalOpen,
  ]);

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
      {/* ---------- Desktop Toolbar (Visible on sm screens and above) ---------- */}
      <div
        className="hidden sm:flex absolute top-4 right-4 items-center space-x-2 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onTogglePlay}
          className={`p-2.5 rounded-xl transition-colors ${
            isPlaying
              ? "bg-blue-500 text-white"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
          aria-label={isPlaying ? "Pause slideshow" : "Play slideshow"}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </button>

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
          onClick={() => setInfoOpen((o) => !o)}
          className={`p-2.5 rounded-xl transition-colors ${
            infoOpen
              ? "bg-blue-500 text-white"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
          aria-label="Show photo info"
        >
          <Info className="w-5 h-5" />
        </button>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-50"
          aria-label="Download image"
        >
          <Download className="w-5 h-5" />
        </button>

        <button
          onClick={onClose}
          className="p-2.5 rounded-xl bg-white/10 text-white hover:bg-red-500/80 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ---------- Mobile Toolbar (Visible on screens smaller than sm) ---------- */}
      <div
        className="flex sm:hidden absolute top-4 right-4 items-center space-x-2 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Single "Tools" button */}
        <button
          onClick={() => setToolsModalOpen(true)}
          className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors text-xs font-medium"
          aria-label="Open controls modal"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Tools</span>
        </button>

        {/* Essential Close button */}
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-white/10 text-white hover:bg-red-500/80 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Counter / Zoom level badges */}
      <div className="absolute top-4 left-4 flex items-center space-x-2 z-20">
        <div className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs sm:text-sm font-medium">
          {imageIndex + 1} / {images.length}
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs sm:text-sm font-medium">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handlePrev();
        }}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white z-20 transition-all hover:scale-110"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleNext();
        }}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white z-20 transition-all hover:scale-110"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Image Stage */}
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
          className="max-w-[92vw] max-h-[88vh] object-contain rounded-lg shadow-2xl"
        />
      </div>

      {/* ---------- Mobile Tools Action Sheet Modal ---------- */}
      {toolsModalOpen && (
        <div
          className="absolute inset-0 z-40 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
          onClick={() => setToolsModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl p-5 text-white shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-semibold text-sm text-slate-200">
                Image Controls
              </h3>
              <button
                onClick={() => setToolsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={zoomIn}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs gap-1.5"
              >
                <ZoomIn className="w-5 h-5 text-blue-400" />
                Zoom In
              </button>

              <button
                onClick={zoomOut}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs gap-1.5"
              >
                <ZoomOut className="w-5 h-5 text-blue-400" />
                Zoom Out
              </button>

              <button
                onClick={resetZoom}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs gap-1.5"
              >
                <RotateCcw className="w-5 h-5 text-amber-400" />
                Reset
              </button>

              <button
                onClick={onTogglePlay}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs gap-1.5"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-5 h-5 text-emerald-400" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 text-emerald-400" /> Play
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setToolsModalOpen(false);
                  setInfoOpen(true);
                }}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs gap-1.5"
              >
                <Info className="w-5 h-5 text-purple-400" />
                Info
              </button>

              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs gap-1.5 disabled:opacity-50"
              >
                <Download className="w-5 h-5 text-sky-400" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {infoOpen && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
          onClick={() => setInfoOpen(false)}
        >
          <div
            className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-white/10 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-[10px] font-medium text-blue-400 uppercase tracking-wider">
                {image.caption}
              </span>
              <button
                onClick={() => setInfoOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close info"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h4 className="font-semibold text-lg mb-2">{image.title}</h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              {image.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Inline slideshow viewer ----------
function SlideViewer({ images }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const intervalRef = useRef(null);

  const goNext = useCallback(
    () => setIndex((i) => (i + 1) % images.length),
    [images.length]
  );
  const goPrev = useCallback(
    () => setIndex((i) => (i - 1 + images.length) % images.length),
    [images.length]
  );

  useEffect(() => {
    if (!playing || lightboxOpen) return;
    intervalRef.current = setInterval(goNext, 2800);
    return () => clearInterval(intervalRef.current);
  }, [playing, lightboxOpen, goNext]);

  const current = images[index];

  return (
    <div>
      {/* Main slide stage */}
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

      {/* Caption / title / description */}
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

      {/* Thumbnail strip */}
      <div className="thumb-scroll flex gap-2 mt-4 overflow-x-auto pb-2">
        {images.map((img, i) => (
          <button
            key={img.src}
            onClick={() => setIndex(i)}
            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
              i === index
                ? "border-blue-500"
                : "border-transparent opacity-60 hover:opacity-100"
            }`}
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
          isPlaying={playing}
          onTogglePlay={() => setPlaying((p) => !p)}
        />
      )}

      <style>{`
        @keyframes orderbooking-progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        .thumb-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgb(148 163 184) transparent;
        }
        .thumb-scroll::-webkit-scrollbar {
          height: 6px;
        }
        .thumb-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .thumb-scroll::-webkit-scrollbar-thumb {
          background-color: rgb(148 163 184 / 0.6);
          border-radius: 9999px;
        }
        .thumb-scroll::-webkit-scrollbar-thumb:hover {
          background-color: rgb(59 130 246 / 0.8);
        }
        .dark .thumb-scroll {
          scrollbar-color: rgb(71 85 105) transparent;
        }
        .dark .thumb-scroll::-webkit-scrollbar-thumb {
          background-color: rgb(71 85 105 / 0.7);
        }
        .dark .thumb-scroll::-webkit-scrollbar-thumb:hover {
          background-color: rgb(96 165 250 / 0.8);
        }
      `}</style>
    </div>
  );
}

export default function CheckSKUPriceSaleOutlet() {
  return (
    <div className="mt-6 p-4 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
      <div className="mb-8">
        <h2 className="text-2xl font-bold dark:text-white text-slate-800">
          Check SKU Price Sale to Outlet
        </h2>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-4 mb-2">
          Check SKU Price Sale to Outlet
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Placeholder walkthrough — replace the images and captions in{" "}
          <code>PriceOutletImages</code> with your real stock-check screenshots.
        </p>
      </div>

      <div>
        <div className="flex items-center space-x-2 mb-3">
          <ImageIcon className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Attached Photos
          </h3>
        </div>
        <SlideViewer images={PriceOutletImages} />
      </div>
    </div>
  );
}