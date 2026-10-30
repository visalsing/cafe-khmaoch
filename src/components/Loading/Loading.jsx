import React from "react";
import { useLoadingStyle } from "../../utils/loadingStyle";

/* ---------- animations (added once to <head>, no tailwind.config change needed) ---------- */
const CSS = `
@keyframes ld-bounce { 0%, 80%, 100% { transform: translateY(0); opacity: .55; } 40% { transform: translateY(-12px); opacity: 1; } }
@keyframes ld-ring   { 0% { transform: scale(.35); opacity: .9; } 100% { transform: scale(1.5); opacity: 0; } }
@keyframes ld-spin   { to { transform: rotate(360deg); } }
@keyframes ld-wave   { 0%, 40%, 100% { transform: scaleY(.35); } 20% { transform: scaleY(1); } }
@keyframes ld-steam  { 0% { transform: translateY(8px) scaleY(.6); opacity: 0; } 35% { opacity: .85; } 100% { transform: translateY(-14px) scaleY(1.15); opacity: 0; } }
@keyframes ld-slide  { 0% { transform: translateX(-110%); } 100% { transform: translateX(260%); } }
@keyframes ld-blink  { 0%, 20% { opacity: .15; } 50% { opacity: 1; } 100% { opacity: .15; } }
@keyframes ld-fade   { 0%, 100% { opacity: .4; } 50% { opacity: 1; } }
.ld-bounce { animation: ld-bounce 1s ease-in-out infinite; }
.ld-ring   { animation: ld-ring 1.6s ease-out infinite; }
.ld-spin   { animation: ld-spin .9s linear infinite; }
.ld-orbit  { animation: ld-spin 1.2s linear infinite; }
.ld-wave   { animation: ld-wave 1.1s ease-in-out infinite; }
.ld-steam  { animation: ld-steam 1.8s ease-in-out infinite; transform-origin: bottom center; }
.ld-slide  { animation: ld-slide 1.3s ease-in-out infinite; }
.ld-blink  { animation: ld-blink 1.2s ease-in-out infinite; }
/* Flying bat */
@keyframes ld-flap {
  0%, 100% {
    transform: translateY(0) rotate(-8deg) scale(1);
  }
  50% {
    transform: translateY(-8px) rotate(8deg) scale(1.12);
  }
}

/* Floating ghost */
@keyframes ld-ghost {
  0%, 100% {
    transform: translateY(3px) rotate(-3deg);
  }
  50% {
    transform: translateY(-9px) rotate(3deg);
  }
}

/* Ghost + coffee */
@keyframes ld-ghost-coffee {
  0%, 100% {
    transform: translateY(2px);
  }
  50% {
    transform: translateY(-6px);
  }
}

/* Lightning bolt: the glow follows the chosen accent color */
@keyframes ld-lightning {
  0%, 100% {
    opacity: .65;
    transform: scale(.92) rotate(-4deg);
    filter: drop-shadow(0 0 2px rgb(var(--accent-500)));
  }
  50% {
    opacity: 1;
    transform: scale(1.12) rotate(4deg);
    filter: drop-shadow(0 0 12px rgb(var(--accent-400)));
  }
}

.ld-bat {
  display: inline-block;
  animation: ld-flap .65s ease-in-out infinite;
  transform-origin: center;
}

.ld-ghost {
  display: inline-block;
  animation: ld-ghost 1.6s ease-in-out infinite;
}

.ld-ghost-coffee {
  display: inline-block;
  animation: ld-ghost-coffee 1.5s ease-in-out infinite;
}

.ld-lightning {
  display: inline-block;
  animation: ld-lightning .8s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .ld-bat,
  .ld-ghost,
  .ld-ghost-coffee,
  .ld-lightning {
    animation: ld-fade 2s ease-in-out infinite !important;
  }
}
/* people who asked their system for less motion get a gentle fade instead */
@media (prefers-reduced-motion: reduce) {
  .ld-bounce, .ld-ring, .ld-spin, .ld-orbit, .ld-wave, .ld-steam, .ld-slide, .ld-blink {
    animation: ld-fade 2s ease-in-out infinite !important;
  }
}
`;

if (typeof document !== "undefined") {
  const el =
    document.getElementById("app-loader-styles") ||
    Object.assign(document.createElement("style"), { id: "app-loader-styles" });
  el.textContent = CSS;
  if (!el.parentNode) document.head.appendChild(el);
}

/* ---------- the looks (all colors follow the accent chosen in Settings) ---------- */
function Dots() {
  return (
    <div className="flex items-center gap-2 h-10">
      {[0, 0.15, 0.3].map((d) => (
        <span
          key={d}
          className="ld-bounce w-3 h-3 rounded-full bg-accent-500"
          style={{ animationDelay: `${d}s` }}
        />
      ))}
    </div>
  );
}

function Pulse() {
  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <span className="ld-ring absolute inset-0 rounded-full border-2 border-accent-500" />
      <span
        className="ld-ring absolute inset-0 rounded-full border-2 border-accent-400"
        style={{ animationDelay: "0.8s" }}
      />
      <span className="w-3.5 h-3.5 rounded-full bg-accent-600" />
    </div>
  );
}

function Spinner() {
  return (
    <div className="ld-spin w-11 h-11 rounded-full border-4 border-accent-500/20 border-t-accent-500" />
  );
}

function Orbit() {
  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <span className="absolute inset-0 rounded-full border-2 border-accent-500/25" />
      <span className="w-5 h-5 rounded-full bg-accent-600" />
      <span className="ld-orbit absolute inset-0">
        <span className="absolute left-1/2 -top-[5px] -ml-[5px] w-2.5 h-2.5 rounded-full bg-accent-400 shadow" />
      </span>
    </div>
  );
}

function Bars() {
  return (
    <div className="flex items-center gap-1.5 h-10">
      {[0, 0.12, 0.24, 0.36, 0.48].map((d) => (
        <span
          key={d}
          className="ld-wave w-1.5 h-9 rounded-full bg-accent-500"
          style={{ animationDelay: `${d}s` }}
        />
      ))}
    </div>
  );
}

function Coffee() {
  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-2 h-6 items-end mb-1">
        {[0, 0.35, 0.7].map((d) => (
          <span
            key={d}
            className="ld-steam w-1.5 h-5 rounded-full bg-accent-400/70"
            style={{ animationDelay: `${d}s` }}
          />
        ))}
      </div>
      <div className="relative">
        <div className="w-14 h-9 rounded-t-md rounded-b-[1.75rem] bg-accent-600" />
        <div className="absolute -right-3.5 top-1.5 w-5 h-5 rounded-full border-4 border-accent-600" />
      </div>
      <div className="w-20 h-1.5 mt-0.5 rounded-full bg-accent-700/60" />
    </div>
  );
}

function Progress() {
  return (
    <div className="w-44 h-1.5 rounded-full bg-accent-500/20 overflow-hidden">
      <span className="ld-slide block h-full w-2/5 rounded-full bg-accent-500" />
    </div>
  );
}

function TextLoader({ label }) {
  return (
    <p className="text-base font-medium text-slate-500 dark:text-slate-400">
      {label.replace(/[.…]+$/, "")}
      {[0, 0.2, 0.4].map((d) => (
        <span key={d} className="ld-blink" style={{ animationDelay: `${d}s` }}>
          .
        </span>
      ))}
    </p>
  );
}

function Bat() {
  return (
    <div className="flex items-center justify-center w-16 h-16">
      <span className="ld-bat text-5xl" role="img" aria-label="Flying bat">
        🦇
      </span>
    </div>
  );
}

function Ghost() {
  return (
    <div className="flex items-center justify-center w-16 h-16">
      <span
        className="ld-ghost text-5xl"
        role="img"
        aria-label="Floating ghost"
      >
        👻
      </span>
    </div>
  );
}

function GhostCoffee() {
  return (
    <div className="flex items-center justify-center gap-1 w-28 h-16">
      <span className="ld-ghost-coffee text-4xl" role="img" aria-label="Ghost">
        👻
      </span>

      <span className="text-3xl" role="img" aria-label="Coffee">
        ☕
      </span>
    </div>
  );
}

function Lightning() {
  return (
    <div className="flex items-center justify-center w-16 h-16">
      <span
        className="ld-lightning text-5xl text-accent-500"
        role="img"
        aria-label="Lightning bolt"
      >
        ⚡
      </span>
    </div>
  );
}

const LOADERS = {
  dots: Dots,
  pulse: Pulse,
  spinner: Spinner,
  orbit: Orbit,
  bars: Bars,
  coffee: Coffee,
  progress: Progress,
  bat: Bat,
  ghost: Ghost,
  ghostCoffee: GhostCoffee,
  lightning: Lightning,
};

/**
 * The animation only (no full-screen box). Use it anywhere:  <Loader />  <Loader type="bars" className="scale-75" />
 *   type       force one style; leave it out to use the style chosen in Settings
 *   label      read by screen readers (and shown by the "Classic Text" style)
 *   decorative true = hidden from screen readers (used for the previews in Settings)
 */
export function Loader({
  type,
  label = "Loading...",
  decorative = false,
  className = "",
}) {
  const [saved] = useLoadingStyle();
  const kind = type || saved;
  const Visual = LOADERS[kind];
  const a11y = decorative
    ? { "aria-hidden": true }
    : { role: "status", "aria-live": "polite" };

  return (
    <div
      className={`inline-flex flex-col items-center justify-center ${className}`}
      {...a11y}
    >
      {Visual ? <Visual /> : <TextLoader label={label} />}
      {!decorative && <span className="sr-only">{label}</span>}
    </div>
  );
}

/** A whole-page loading state: <LoadingScreen />  (set fullScreen={false} for a smaller area) */
export default function LoadingScreen({
  label = "Loading...",
  type,
  fullScreen = true,
  showLabel = true,
}) {
  const [saved] = useLoadingStyle();
  const kind = type || saved;

  return (
    <div
      className={`${
        fullScreen ? "min-h-screen" : "min-h-[16rem]"
      } flex flex-col items-center justify-center gap-4 bg-stone-50 dark:bg-stone-950`}
    >
      <Loader type={kind} label={label} />
      {showLabel && kind !== "text" && (
        <p
          className="text-sm text-stone-500 dark:text-stone-400"
          aria-hidden="true"
        >
          {label}
        </p>
      )}
    </div>
  );
}