import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Rows3,
} from "lucide-react";

// ----------------------------------------------------------------------
// Slide images (exported deck, 12 slides)
// ----------------------------------------------------------------------
import slide1 from "../../assets/slides/stock-allocation/1.png";
import slide2 from "../../assets/slides/stock-allocation/2.png";
import slide3 from "../../assets/slides/stock-allocation/3.png";
import slide4 from "../../assets/slides/stock-allocation/4.png";
import slide5 from "../../assets/slides/stock-allocation/5.png";
import slide6 from "../../assets/slides/stock-allocation/6.png";
import slide7 from "../../assets/slides/stock-allocation/7.png";
import slide8 from "../../assets/slides/stock-allocation/8.png";
import slide9 from "../../assets/slides/stock-allocation/9.png";
import slide10 from "../../assets/slides/stock-allocation/10.png";
import slide11 from "../../assets/slides/stock-allocation/11.png";
import slide12 from "../../assets/slides/stock-allocation/12.png";

const SLIDES = [
  slide1, slide2, slide3, slide4, slide5, slide6,
  slide7, slide8, slide9, slide10, slide11, slide12,
];

export default function StockAllocationSlideDeck() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [filmstripOpen, setFilmstripOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const stageRef = useRef(null);
  const thumbRefs = useRef([]);

  const total = SLIDES.length;

  const goNext = useCallback(
    () => setIndex((i) => Math.min(i + 1, total - 1)),
    [total],
  );
  const goPrev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      stageRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  // Keep isFullscreen state in sync with the browser
  useEffect(() => {
    const onChange = () =>
      setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "f" || e.key === "F") toggleFullscreen();
      else if (e.key === "Escape" && !document.fullscreenElement) {
        navigate(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, toggleFullscreen, navigate]);

  // Keep the active thumbnail scrolled into view
  useEffect(() => {
    thumbRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [index]);

  const progressPct = ((index + 1) / total) * 100;

  return (
    <div
      ref={stageRef}
      className="fixed inset-0 z-50 flex flex-col bg-[#0B0D12]"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
          aria-label="Back to Stock Allocation"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Stock Allocation</span>
        </button>

        <span className="text-white/40 text-xs font-medium tracking-wide uppercase">
          Slide deck
        </span>
      </div>

      {/* Stage */}
      <div className="relative flex-1 flex items-center justify-center px-4 sm:px-10 overflow-hidden">
        <button
          onClick={goPrev}
          disabled={index === 0}
          className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white/5 text-white hover:bg-white/15 disabled:opacity-20 disabled:hover:bg-white/5 transition-colors"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <img
          key={SLIDES[index]}
          src={SLIDES[index]}
          alt={`Slide ${index + 1} of ${total}`}
          className="max-w-full max-h-full object-contain rounded-md shadow-[0_0_60px_rgba(245,166,35,0.06)]"
        />

        <button
          onClick={goNext}
          disabled={index === total - 1}
          className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white/5 text-white hover:bg-white/15 disabled:opacity-20 disabled:hover:bg-white/5 transition-colors"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Filmstrip (toggleable) */}
      {filmstripOpen && (
        <div className="border-t border-white/10 bg-black/40 px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {SLIDES.map((src, i) => (
              <button
                key={src}
                ref={(el) => (thumbRefs.current[i] = el)}
                onClick={() => setIndex(i)}
                className={`flex-shrink-0 w-20 h-12 rounded-md overflow-hidden border-2 transition-all ${
                  i === index
                    ? "border-[#F5A623] shadow-[0_0_0_2px_rgba(245,166,35,0.25)]"
                    : "border-transparent opacity-50 hover:opacity-90"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              >
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom control bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-white/10">
        <span className="text-white/70 text-sm font-medium tabular-nums">
          {index + 1} / {total}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilmstripOpen((o) => !o)}
            className={`p-2.5 rounded-xl transition-colors ${
              filmstripOpen
                ? "bg-[#F5A623]/20 text-[#F5A623]"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
            aria-label="Toggle filmstrip"
          >
            <Rows3 className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 transition-colors"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Progress beam */}
      <div className="h-0.5 bg-white/5">
        <div
          className="h-full bg-[#F5A623] transition-all duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}