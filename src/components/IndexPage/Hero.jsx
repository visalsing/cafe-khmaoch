
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useHero } from "../../context/HeroContext";
import { assetUrl } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { usePageLoading } from "../../context/PageLoadingContext";

// Text from JSONB fields, with English fallback.
const getLangText = (field, lang = "en") => {
  if (!field) return "";

  if (typeof field === "string") {
    try {
      field = JSON.parse(field);
    } catch {
      return field;
    }
  }

  return (
    field[lang] ||
    (lang === "tw" ? field.zh : "") ||
    field.en ||
    Object.values(field)[0] ||
    ""
  );
};

export default function Hero() {
  const navigate = useNavigate();
  const { visibleSlides: slides = [] } = useHero();
  const { language } = useLanguage();
  const { registerLoading, finishLoading } = usePageLoading();

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const touchStartX = useRef(null);
  const imageRefs = useRef(new Map());
  const loadedImages = useRef(new Set());
  const loadingKey = "hero-images";

  const count = slides.length;

  // Track essential hero images.
  useEffect(() => {
    loadedImages.current.clear();

    if (count === 0) {
      finishLoading(loadingKey);
      return;
    }

    registerLoading(loadingKey);

    const imageUrls = slides
      .map((slide) => assetUrl(slide.img))
      .filter(Boolean);

    // No usable image URLs means there are no image requests to wait for.
    if (imageUrls.length === 0) {
      finishLoading(loadingKey);
      return;
    }

    // Handle cached images and images that loaded before this effect.
    const checkImages = () => {
      const allReady = imageUrls.every((url) => {
        const image = imageRefs.current.get(url);

        return (
          loadedImages.current.has(url) ||
          (image && image.complete)
        );
      });

      if (allReady) {
        finishLoading(loadingKey);
      }
    };

    checkImages();

    return () => {
      finishLoading(loadingKey);
    };
  }, [slides, count, registerLoading, finishLoading]);

  const handleImageLoad = (url) => {
    loadedImages.current.add(url);

    const imageUrls = slides
      .map((slide) => assetUrl(slide.img))
      .filter(Boolean);

    const allReady = imageUrls.every((imageUrl) => {
      const image = imageRefs.current.get(imageUrl);

      return (
        loadedImages.current.has(imageUrl) ||
        (image && image.complete)
      );
    });

    if (allReady) {
      finishLoading(loadingKey);
    }
  };

  const handleImageError = (url) => {
    // Failed images must not leave the page loader stuck.
    loadedImages.current.add(url);
    handleImageLoad(url);
  };

  const next = () => {
    if (count > 1) setCurrent((c) => (c + 1) % count);
  };

  const prev = () => {
    if (count > 1) setCurrent((c) => (c - 1 + count) % count);
  };

  useEffect(() => {
    if (current >= count) setCurrent(0);
  }, [count, current]);

  useEffect(() => {
    if (paused || count < 2) return;

    const timer = setInterval(
      () => setCurrent((c) => (c + 1) % count),
      5000
    );

    return () => clearInterval(timer);
  }, [paused, count]);

  if (count === 0) return null;

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;

    const diff = touchStartX.current - e.changedTouches[0].clientX;

    if (Math.abs(diff) > 50) {
      diff > 0 ? next() : prev();
    }

    touchStartX.current = null;
  };

  const goTo = (link) => {
    if (!link) return;

    if (link.startsWith("/")) {
      navigate(link);
      return;
    }

    try {
      document.querySelector(link)?.scrollIntoView({
        behavior: "smooth",
      });
    } catch {
      // Ignore invalid selectors.
    }
  };

  return (
    <section
      id="hero"
      className="relative overflow-hidden rounded-3xl shadow-2xl h-[420px] sm:h-[520px] text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="flex h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((s) => {
          const tagText = getLangText(s.tag, language);
          const titleText = getLangText(s.title, language);
          const descText = getLangText(s.text, language);
          const ctaText = getLangText(s.cta, language);
          const imageUrl = assetUrl(s.img);

          return (
            <div key={s.id} className="relative min-w-full h-full">
              {imageUrl && (
                <img
                  ref={(node) => {
                    if (node) {
                      imageRefs.current.set(imageUrl, node);

                      if (node.complete) {
                        loadedImages.current.add(imageUrl);
                      }
                    } else {
                      imageRefs.current.delete(imageUrl);
                    }
                  }}
                  src={imageUrl}
                  alt={titleText}
                  onLoad={() => handleImageLoad(imageUrl)}
                  onError={() => handleImageError(imageUrl)}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              <div className="absolute inset-0 bg-gradient-to-r from-stone-950/80 via-stone-900/50 to-transparent" />

              <div className="relative z-10 h-full flex items-center px-8 sm:px-16">
                <div className="max-w-xl space-y-5">
                  {tagText && (
                    <span className="inline-block px-3.5 py-1 text-xs font-semibold uppercase tracking-wider bg-accent-500/90 rounded-full">
                      {tagText}
                    </span>
                  )}

                  <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                    {titleText}
                  </h1>

                  {descText && (
                    <p className="text-accent-50/90 text-base sm:text-lg leading-relaxed">
                      {descText}
                    </p>
                  )}

                  {ctaText && (
                    <div className="pt-2">
                      <button
                        onClick={() => goTo(s.link)}
                        className="px-6 py-3 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-xl shadow-lg transition-all cursor-pointer"
                      >
                        {ctaText}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={next}
            aria-label="Next slide"
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center space-x-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setCurrent(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  i === current
                    ? "w-8 bg-accent-400"
                    : "w-2.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
