import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  {
    tag: "Café & Drinks",
    title: "Bean & Blossom ☕",
    text: "Freshly roasted coffee, handcrafted in a cozy corner of the city.",
    img: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1600&q=80",
    cta: "Order Drinks",
    link: "#shop",
  },
  {
    tag: "Signature Latte",
    title: "Sip Something Special",
    text: "Silky espresso, steamed milk and house-made caramel in every cup.",
    img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1600&q=80",
    cta: "View Coffee Menu",
    link: "#shop",
  },
  {
    tag: "Fresh Bakery",
    title: "Baked Every Morning",
    text: "Warm croissants and pastries, the perfect partner for your brew.",
    img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1600&q=80",
    cta: "See Pastries",
    link: "#shop",
  },
  {
    tag: "Book a Table",
    title: "Gather. Relax. Enjoy.",
    text: "Reserve a table for meetups, study sessions or a quiet afternoon.",
    img: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1600&q=80",
    cta: "Reserve a Table",
    link: "/consultation",
    route: true,
  },
];

export default function Hero() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);

  const next = () => setCurrent((c) => (c + 1) % slides.length);
  const prev = () => setCurrent((c) => (c - 1 + slides.length) % slides.length);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [paused]);

  const onTouchStart = (e) => (touchStartX.current = e.touches[0].clientX);
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
    touchStartX.current = null;
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
      {/* Slides track */}
      <div
        className="flex h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((s, i) => (
          <div key={i} className="relative min-w-full h-full">
            <img src={s.img} alt={s.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-stone-950/80 via-stone-900/50 to-transparent" />
            <div className="relative z-10 h-full flex items-center px-8 sm:px-16">
              <div className="max-w-xl space-y-5">
                <span className="inline-block px-3.5 py-1 text-xs font-semibold uppercase tracking-wider bg-amber-500/90 rounded-full">
                  {s.tag}
                </span>
                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">{s.title}</h1>
                <p className="text-amber-50/90 text-base sm:text-lg leading-relaxed">{s.text}</p>
                <div className="pt-2 flex flex-wrap gap-3">
                  {s.route ? (
                    <button
                      onClick={() => navigate(s.link)}
                      className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-lg transition-all"
                    >
                      {s.cta}
                    </button>
                  ) : (
                    <a
                      href={s.link}
                      className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-lg transition-all"
                    >
                      {s.cta}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Arrows */}
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

      {/* Pagination */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center space-x-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
              i === current ? "w-8 bg-amber-400" : "w-2.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </section>
  );
}