import React from "react";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { useDigits } from "../../utils/digitFormatter";

export default function About() {
  const { t } = useLanguage();
  const formatNum = useDigits();

  return (
    <section id="about" className="scroll-mt-20 space-y-8">
      {/* Big Title & Subtitle */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-amber-600 to-amber-300 bg-clip-text text-transparent">
          {t("about_us")}
        </h1>

        <p className="text-base text-stone-600 dark:text-stone-300 font-medium">
          {t("about_us_subtitle")}
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            {t("our_story")}
          </span>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t("about_us_text1")}
          </h2>

          <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
            {t("about_us_text2")}
          </p>

          <div className="flex gap-4 pt-2">
            <div className="border-l-4 border-amber-600 pl-4">
              <h4 className="font-bold text-lg">{formatNum(7)} AM</h4>
              <p className="text-xs text-stone-500">
                {t("about_us_text3")}
              </p>
            </div>
          </div>
        </div>

        <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden shadow-inner">
          <img
            src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80"
            alt="Café interior"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}