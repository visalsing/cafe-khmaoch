
import React from "react";
import {
  Coffee,
  Globe2,
  Heart,
  MapPin,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";

// All statistics are managed here.
const STATS = [
  {
    label: "Cups Served",
    value: "250,000+",
    change: "+18%",
    icon: Coffee,
    description: "Cups enjoyed by our customers.",
    trend: "up",
  },
  {
    label: "Coffee Origins",
    value: "12",
    change: "+3",
    icon: Globe2,
    description: "Coffee origins around the world.",
    trend: "up",
  },
  {
    label: "Customer Satisfaction",
    value: "99.2%",
    change: "+0.5%",
    icon: Heart,
    description: "A reflection of customer feedback.",
    trend: "up",
  },
  {
    label: "Café Locations",
    value: "6",
    change: "Open",
    icon: MapPin,
    description: "Our café locations.",
    trend: "status",
  },
];

export default function Stats() {
  return (
    <section
      id="stats"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
    >
      {STATS.map((stat) => {
        const Icon = stat.icon;

        return (
          <article
            key={stat.label}
            className="
              group relative overflow-hidden
              rounded-2xl border
              border-neutral-200 dark:border-neutral-800
              bg-white dark:bg-neutral-900
              p-6 shadow-sm
              hover:shadow-xl hover:-translate-y-1
              transition-all duration-300
            "
          >
            {/* Decorative background */}
            <div
              className="
                absolute -right-8 -top-8
                w-28 h-28 rounded-full
                bg-rose-100/70 dark:bg-rose-500/10
                blur-2xl
                group-hover:scale-150
                transition-transform duration-500
              "
            />

            <div className="relative z-10">
              {/* Icon and indicator */}
              <div className="flex items-center justify-between gap-3">
                <div
                  className="
                    flex items-center justify-center
                    w-11 h-11 rounded-xl
                    bg-rose-50 dark:bg-rose-500/10
                    text-rose-600 dark:text-rose-400
                  "
                >
                  <Icon size={21} strokeWidth={1.8} />
                </div>

                {stat.trend === "status" ? (
                  <span className="
                    rounded-full px-2.5 py-1
                    text-xs font-semibold
                    bg-emerald-50 text-emerald-700
                    dark:bg-emerald-500/10 dark:text-emerald-400
                  ">
                    {stat.change}
                  </span>
                ) : (
                  <span className="
                    inline-flex items-center gap-1
                    rounded-full px-2.5 py-1
                    text-xs font-semibold
                    bg-emerald-50 text-emerald-700
                    dark:bg-emerald-500/10 dark:text-emerald-400
                  ">
                    <TrendingUp size={13} />
                    {stat.change}
                  </span>
                )}
              </div>

              {/* Statistic */}
              <div className="mt-5">
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  {stat.label}
                </p>

                <h3 className="
                  mt-1 text-3xl sm:text-4xl
                  font-bold tracking-tight
                  text-neutral-900 dark:text-white
                ">
                  {stat.value}
                </h3>
              </div>

              {/* Description */}
              <div className="mt-4 flex items-center justify-between gap-2">
                <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {stat.description}
                </p>

                <ArrowUpRight
                  size={17}
                  className="
                    shrink-0 text-neutral-300
                    group-hover:text-rose-500
                    group-hover:translate-x-0.5
                    group-hover:-translate-y-0.5
                    transition-all
                  "
                />
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
