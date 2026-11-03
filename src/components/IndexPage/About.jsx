import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { useDigits } from "../../utils/digitFormatter";
import { usePageLoading } from "../../context/PageLoadingContext.jsx";
import useAboutPage from "../../hooks/useAboutPage";
import RichText from "../RichText/RichText";
import { ABOUT_ICONS } from "../../utils/aboutIcons";
import { pickText, uploadUrl } from "../../utils/aboutContent";

// shown when the database has nothing (or cannot be reached)
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80",
].map((img) => ({ key: img, img, alt: {} }));

const FALLBACK_HIGHLIGHTS = [
  { icon: "coffee", title: { en: "Ethical Sourcing" }, text: { en: "Directly traded from sustainable farms to secure premium beans." } },
  { icon: "flame", title: { en: "Artisanal Roasting" }, text: { en: "Precision-roasted in small batches to highlight unique profiles." } },
  { icon: "sprout", title: { en: "Community First" }, text: { en: "Creating a cozy neighborhood sanctuary for great conversations." } },
];

export default function About() {
  const { t, language } = useLanguage();
  const lang = language || "en";
  const formatNum = useDigits();
  const { registerLoading, finishLoading } = usePageLoading();
  const { data, loading } = useAboutPage();

  // content from the dashboard, unless it is switched off
  const cms = data && Number(data.status) === 1 ? data : null;

  // every field: the chosen language -> English from the database -> the built-in translation
  const title = pickText(cms?.title, lang) || t("about_us");
  const subtitle = pickText(cms?.subtitle, lang) || t("about_us_subtitle");
  const label = pickText(cms?.storyLabel, lang) || t("our_story");
  const heading = pickText(cms?.storyHeading, lang) || t("about_us_text1");
  const body = pickText(cms?.storyBody, lang);
  const statValue = pickText(cms?.statValue, lang) || `${formatNum(7)} AM`;
  const statCaption = pickText(cms?.statCaption, lang) || t("about_us_text3");

  const slides = useMemo(() => (cms ? cms.images : FALLBACK_IMAGES), [cms]);
  const highlights = (cms ? cms.highlights : FALLBACK_HIGHLIGHTS).filter((h) => pickText(h.title, lang) || pickText(h.text, lang));

  const [currentIndex, setCurrentIndex] = useState(0);
  const imageRefs = useRef([]);
  const index = Math.min(currentIndex, Math.max(slides.length - 1, 0));

  // the page loader waits for the content, not for a slow picture
  useEffect(() => {
    if (!loading) return undefined;
    registerLoading("about-content");
    return () => finishLoading("about-content");
  }, [loading, registerLoading, finishLoading]);

  // ...and for the FIRST picture only (the others load while the visitor reads)
  useEffect(() => {
    if (loading || slides.length === 0) return undefined;
    const taskKey = "about-image-0";
    registerLoading(taskKey);
    const image = imageRefs.current[0];
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      finishLoading(taskKey);
    };
    if (!image || image.complete) finish();
    else {
      image.addEventListener("load", finish, { once: true });
      image.addEventListener("error", finish, { once: true });
    }
    return () => {
      image?.removeEventListener("load", finish);
      image?.removeEventListener("error", finish);
      finish();
    };
  }, [loading, slides, registerLoading, finishLoading]);

  const handlePrev = () => setCurrentIndex((i) => (i === 0 ? slides.length - 1 : i - 1));
  const handleNext = () => setCurrentIndex((i) => (i >= slides.length - 1 ? 0 : i + 1));

  return (
    <section id="about" className="scroll-mt-20 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-accent-600 to-accent-300 bg-clip-text text-transparent">
          {title}
        </h1>
        <p className="text-base text-stone-600 dark:text-stone-300 font-medium">{subtitle}</p>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 sm:p-12 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-10">
        <div className={`grid grid-cols-1 gap-8 items-center ${slides.length ? "lg:grid-cols-2" : ""}`}>
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-accent-600 dark:text-accent-400">{label}</span>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{heading}</h2>

            {body ? (
              <RichText html={body} />
            ) : (
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed">{t("about_us_text2")}</p>
            )}

            <div className="flex gap-4 pt-2">
              <div className="border-l-4 border-accent-600 pl-4">
                <h4 className="font-bold text-lg">{statValue}</h4>
                <p className="text-xs text-stone-500">{statCaption}</p>
              </div>
            </div>
          </div>

          {slides.length > 0 && (
            <div className="relative group h-64 sm:h-80 rounded-2xl overflow-hidden shadow-inner">
              {slides.map((slide, idx) => (
                <img
                  key={slide.key}
                  ref={(el) => (imageRefs.current[idx] = el)}
                  src={uploadUrl(slide.img)}
                  alt={pickText(slide.alt, lang) || `${title} ${idx + 1}`}
                  loading={idx === 0 ? "eager" : "lazy"}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                    idx === index ? "opacity-100 z-10" : "opacity-0 z-0"
                  }`}
                />
              ))}

              {slides.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    aria-label="Previous Image"
                    className="absolute left-3 top-1/2 -tranneutral-y-1/2 z-20 bg-black/40 hover:bg-black/70 text-white w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    &#10094;
                  </button>
                  <button
                    onClick={handleNext}
                    aria-label="Next Image"
                    className="absolute right-3 top-1/2 -tranneutral-y-1/2 z-20 bg-black/40 hover:bg-black/70 text-white w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    &#10095;
                  </button>

                  <div className="absolute bottom-3 left-1/2 -tranneutral-x-1/2 z-20 flex space-x-2">
                    {slides.map((slide, idx) => (
                      <button
                        key={slide.key}
                        onClick={() => setCurrentIndex(idx)}
                        aria-label={`Go to slide ${idx + 1}`}
                        className={`h-2 rounded-full transition-all ${idx === index ? "w-6 bg-white" : "w-2 bg-white/50"}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {highlights.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-neutral-100 dark:border-neutral-800">
            {highlights.map((h, i) => {
              const Icon = ABOUT_ICONS[h.icon] || ABOUT_ICONS.coffee;
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-accent-600/10 text-accent-600 dark:text-accent-400 shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-neutral-800 dark:text-neutral-200">{pickText(h.title, lang)}</h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{pickText(h.text, lang)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}