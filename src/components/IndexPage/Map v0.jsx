import React, { useEffect, useState } from "react";
import { MapPin, Clock, Phone, Navigation, Mail } from "lucide-react";
import { mapService, assetUrl } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext.jsx";

// Fixed opening hours, phone, and email
const OPENING_HOURS = "Monday – Sunday: 7:00 AM – 9:00 PM";
const PHONE = "+855 12 345 678";
const EMAIL = "cafekhmaoch@gmail.com";

// Custom Brand Icons (SVG) to avoid missing lucide-react exports
const FacebookIcon = (props) => (
  <svg {...props} fill="currentColor" viewBox="0 0 24 24">
    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
  </svg>
);

const InstagramIcon = (props) => (
  <svg
    {...props}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const TelegramIcon = (props) => (
  <svg {...props} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
  </svg>
);

const TikTokIcon = (props) => (
  <svg {...props} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64c.29 0 .56.04.82.12V9.4a6.27 6.27 0 00-1-.08A6.34 6.34 0 003 15.66a6.34 6.34 0 0010.86 4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.04-.52z" />
  </svg>
);

const SOCIAL_LINKS = [
  {
    name: "Facebook",
    icon: FacebookIcon,
    href: "https://facebook.com",
    color: "hover:text-blue-600",
  },
  {
    name: "Instagram",
    icon: InstagramIcon,
    href: "https://instagram.com",
    color: "hover:text-pink-600",
  },
  {
    name: "Telegram",
    icon: TelegramIcon,
    href: "https://telegram.org",
    color: "hover:text-sky-500",
  },
  {
    name: "TikTok",
    icon: TikTokIcon,
    href: "https://tiktok.com",
    color: "hover:text-slate-900 dark:hover:text-white",
  },
  {
    name: "Gmail",
    icon: Mail,
    href: `mailto:${EMAIL}`,
    color: "hover:text-red-500",
  },
];

export default function LocationSection({ lang = "en" }) {
  const [shop, setShop] = useState(null);
  const { language, t } = useLanguage();
  const activeLanguage = language || "en";

  // Database fields such as name and badge are stored as multilingual JSON.
  const translateJson = useCallback(
    (value) => {
      if (value === null || value === undefined || value === "") return "";

      if (typeof value === "object" && !Array.isArray(value)) {
        return (
          value[activeLanguage] || value.en || Object.values(value)[0] || ""
        );
      }

      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return (
              parsed[activeLanguage] ||
              parsed.en ||
              Object.values(parsed)[0] ||
              ""
            );
          }
        } catch {
          // Ordinary text is returned unchanged.
        }
        return value;
      }

      return String(value);
    },
    [activeLanguage],
  );

  useEffect(() => {
    let cancelled = false;
    mapService
      .listPublic(lang)
      .then((list) => {
        if (!cancelled) setShop(Array.isArray(list) ? list[0] || null : null);
      })
      .catch(() => {
        if (!cancelled) setShop(null);
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  if (!shop) return null;

  const logo = assetUrl(shop.img);

  return (
    <section id="contact" className="scroll-mt-20 space-y-8">
      {/* Big Title & Subtitle OUTSIDE the white card */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-amber-600 to-amber-300 bg-clip-text text-transparent">
          {t("contact_us")}
        </h1>
        <p className="text-base text-stone-600 dark:text-stone-300 font-medium">
          {t("contact_subtitle")}
        </p>
      </div>

      {/* Main White Box */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            {t("find_us")}
          </span>
          {shop.title && (
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {shop.title}
            </h2>
          )}
          {(shop.subtitle || shop.description) && (
            <p className="text-stone-600 dark:text-stone-400 text-sm">
              {shop.subtitle || shop.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {/* Café Info Card */}
          <div className="space-y-6 bg-stone-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-stone-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              {logo && (
                <img
                  src={logo}
                  alt=""
                  className="w-12 h-12 rounded-xl object-contain bg-white dark:bg-slate-800 border-2 border-amber-500/30 dark:border-amber-400/30 shadow-sm"
                />
              )}
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-stone-900 dark:text-white break-words">
                  {shop.name}
                </h3>
                {shop.slogan && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    {shop.slogan}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4 text-sm text-stone-600 dark:text-stone-300">
              {/* Location / Address */}
              {shop.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-stone-900 dark:text-white">
                      {t("location")}
                    </p>
                    <p className="text-xs text-stone-500">{shop.location}</p>
                  </div>
                </div>
              )}

              {/* Operating Hours */}
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-stone-900 dark:text-white">
                    {t("opening_hours")}
                  </p>
                  <p className="text-xs text-stone-500">{OPENING_HOURS}</p>
                </div>
              </div>

              {/* Contact Phone */}
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-stone-900 dark:text-white">
                    {t("phone")}
                  </p>
                  <p className="text-xs text-stone-500">{PHONE}</p>
                </div>
              </div>

              {/* Gmail / Email */}
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-stone-900 dark:text-white">
                    {t("email")}
                  </p>
                  <p className="text-xs text-stone-500">{EMAIL}</p>
                </div>
              </div>

              {/* Social Media & Contact Links */}
              <div className="pt-2 border-t border-stone-200 dark:border-slate-700">
                <p className="font-semibold text-stone-900 dark:text-white mb-2">
                  {t("follow_connect")}
                </p>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {SOCIAL_LINKS.map((social) => {
                    const IconComponent = social.icon;
                    return (
                      <a
                        key={social.name}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-2 rounded-xl bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-stone-600 dark:text-stone-300 transition-colors shadow-sm ${social.color}`}
                        title={social.name}
                      >
                        <IconComponent className="w-4 h-4" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* External Google Maps Direction Button */}
            {shop.link && (
              <a
                href={shop.link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Navigation className="w-4 h-4" /> {t("get_directions")}
              </a>
            )}
          </div>

          {/* Google Maps Embed iframe */}
          <div className="lg:col-span-2 relative h-80 sm:h-96 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
            {shop.map ? (
              <iframe
                src={shop.map}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                title={`${shop.name} location map`}
              />
            ) : (
              <div className="w-full h-full bg-stone-100 dark:bg-slate-800 flex items-center justify-center text-sm text-stone-400">
                {t("map_coming_soon")}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
