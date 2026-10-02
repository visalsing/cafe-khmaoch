import React from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { useHero } from "../../../context/HeroContext";

export default function PagesOverview() {
  const navigate = useNavigate();
  const { slides, visibleSlides } = useHero();

  const sections = [
    {
      id: "hero",
      emoji: "🖼️",
      title: "Hero Slider",
      desc: `${visibleSlides.length} of ${slides.length} slides visible on the homepage`,
      path: "/dashboard/pages/hero",
    },
    { id: "stats", emoji: "📈", title: "Highlights", desc: "Numbers shown under the hero", soon: true },
    { id: "about", emoji: "☕", title: "Our Story", desc: "About section text and photo", soon: true },
    { id: "footer", emoji: "📍", title: "Footer & Contact", desc: "Address, phone, opening hours", soon: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Pages</h1>
          <p className="text-sm text-slate-500">Edit the content shown on your public website.</p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 w-fit"
        >
          <ExternalLink className="w-4 h-4" /> View website
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {sections.map((s) => (
          <button
            key={s.id}
            disabled={s.soon}
            onClick={() => navigate(s.path)}
            className={`text-left bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-2 transition-all ${
              s.soon ? "opacity-60 cursor-not-allowed" : "hover:border-amber-500 hover:shadow-lg cursor-pointer"
            }`}
          >
            <div className="text-3xl">{s.emoji}</div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold">{s.title}</h3>
              {s.soon && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700">Soon</span>}
            </div>
            <p className="text-sm text-slate-500">{s.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}