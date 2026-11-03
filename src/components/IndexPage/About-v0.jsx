import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { useDigits } from "../../utils/digitFormatter";
import { usePageLoading } from "../../context/PageLoadingContext.jsx";

const ABOUT_IMAGES = [
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80",
];

export default function About() {
  const { t } = useLanguage();
  const formatNum = useDigits();
  const { registerLoading, finishLoading } = usePageLoading();

  const [currentIndex, setCurrentIndex] = useState(0);
  const imageRefs = useRef([]);

  // Track all carousel images for initial page load.
  useEffect(() => {
    ABOUT_IMAGES.forEach((_, idx) => {
      const taskKey = `about-image-${idx}`;
      let cancelled = false;

      registerLoading(taskKey);

      const image = imageRefs.current[idx];

      const finish = () => {
        if (!cancelled) {
          finishLoading(taskKey);
        }
      };

      if (!image || image.complete) {
        finish();
      } else {
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
      }

      return () => {
        cancelled = true;
        image?.removeEventListener("load", finish);
        image?.removeEventListener("error", finish);
        finishLoading(taskKey);
      };
    });
  }, [registerLoading, finishLoading]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? ABOUT_IMAGES.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === ABOUT_IMAGES.length - 1 ? 0 : prev + 1));
  };

  return (
    <section id="about" className="scroll-mt-20 space-y-12">
      {/* Big Title & Subtitle */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-accent-600 to-accent-300 bg-clip-text text-transparent">
          {t("about_us")}
        </h1>

        <p className="text-base text-stone-600 dark:text-stone-300 font-medium">
          {t("about_us_subtitle")}
        </p>
      </div>

      {/* Main Card (Now containing Story, Carousel, and Values together) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800 shadow-sm space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-accent-600 dark:text-accent-400">
              {t("our_story")}
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t("about_us_text1")}
            </h2>

            <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
              {t("about_us_text2")}
            </p>

            <div className="flex gap-4 pt-2">
              <div className="border-l-4 border-accent-600 pl-4">
                <h4 className="font-bold text-lg">{formatNum(7)} AM</h4>
                <p className="text-xs text-stone-500">
                  {t("about_us_text3")}
                </p>
              </div>
            </div>
          </div>

          {/* Carousel Container */}
          <div className="relative group h-64 sm:h-80 rounded-2xl overflow-hidden shadow-inner">
            {ABOUT_IMAGES.map((src, idx) => (
              <img
                key={src}
                ref={(el) => (imageRefs.current[idx] = el)}
                src={src}
                alt={`Café interior ${idx + 1}`}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                  idx === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
              />
            ))}

            {/* Left Arrow */}
            <button
              onClick={handlePrev}
              aria-label="Previous Image"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/70 text-white w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              &#10094;
            </button>

            {/* Right Arrow */}
            <button
              onClick={handleNext}
              aria-label="Next Image"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/70 text-white w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              &#10095;
            </button>

            {/* Dots Pagination */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
              {ABOUT_IMAGES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentIndex ? "w-6 bg-white" : "w-2 bg-white/50"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Integrated Crafted Philosophy Sub-Grid inside the same main box */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-accent-600/10 text-accent-600 dark:text-accent-400 shrink-0">
              ☕
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Ethical Sourcing
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Directly traded from sustainable farms to secure premium beans.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-accent-600/10 text-accent-600 dark:text-accent-400 shrink-0">
              🔥
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Artisanal Roasting
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Precision-roasted in small batches to highlight unique profiles.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-accent-600/10 text-accent-600 dark:text-accent-400 shrink-0">
              🪴
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Community First
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Creating a cozy neighborhood sanctuary for great conversations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}