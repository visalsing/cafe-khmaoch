import React, { useEffect, useState } from "react";
import { MapPin, Clock, Phone, Navigation } from "lucide-react";
import { mapService, assetUrl } from "../../services/api";

// These two are not stored in the database yet, so they stay fixed here.
const OPENING_HOURS = "Monday – Sunday: 7:00 AM – 9:00 PM";
const PHONE = "+855 12 345 678";

export default function LocationSection({ lang = "en" }) {
  const [shop, setShop] = useState(null);

  useEffect(() => {
    let cancelled = false;
    mapService
      .listPublic(lang)
      .then((list) => {
        // the API only returns Active maps; the first one is shown
        if (!cancelled) setShop(Array.isArray(list) ? list[0] || null : null);
      })
      .catch(() => {
        if (!cancelled) setShop(null);
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  // nothing saved (or hidden) in the dashboard -> hide the whole section
  if (!shop) return null;

  const logo = assetUrl(shop.img);

  return (
    <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          Find Us
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
                className="w-12 h-12 rounded-xl object-contain bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700"
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
                    Location
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
                  Opening Hours
                </p>
                <p className="text-xs text-stone-500">{OPENING_HOURS}</p>
              </div>
            </div>

            {/* Contact Phone */}
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-stone-900 dark:text-white">
                  Phone
                </p>
                <p className="text-xs text-stone-500">{PHONE}</p>
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
              <Navigation className="w-4 h-4" /> Get Directions
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
              Map coming soon
            </div>
          )}
        </div>
      </div>
    </section>
  );
}