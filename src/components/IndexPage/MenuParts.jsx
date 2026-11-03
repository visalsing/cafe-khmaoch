import React, { useEffect, useId, useRef } from "react";
import {
  ArrowLeft,
  Check,
  Plus,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";

/* =========================================================
   Shared pieces of the coffee menu: product card, product
   modal, size switch, option tiles, skeleton and animations.
   Colours use the accent-* classes, so the accent switcher
   (amber, cherry, yellow...) recolours everything.
========================================================= */

export const STATIC_RATING = 4.5;
export const STATIC_REVIEWS = 120;

const EXCHANGE_RATE = 4100; // 1$ = 4100៛
export const formatPriceWithUSD = (rielValue) => {
  const value = Number(rielValue || 0);
  const usd = value / EXCHANGE_RATE;
  // Omit decimals if it's a whole dollar amount, otherwise show 2 decimals
  const usdFormatted =
    usd % 1 === 0 ? `$${usd.toFixed(0)}` : `$${usd.toFixed(2)}`;
  return {
    riel: `${Math.round(value).toLocaleString()}៛`,
    usd: `≈ ${usdFormatted}`,
  };
};

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-stone-900";

// translation with an English fallback for texts that have no key yet
export const translateWithFallback = (t, key, fallback) => {
  const value = t(key);
  return value && value !== key ? value : fallback;
};

/* ---------- animations (one small style block) ---------- */
export function MenuStyles() {
  return (
    <style>{`
      @keyframes menuFadeIn { from { opacity: 0 } to { opacity: 1 } }
      @keyframes menuSheetIn {
        from { opacity: 0; transform: translateY(24px) }
        to { opacity: 1; transform: translateY(0) }
      }
      .menu-fade-in { animation: menuFadeIn .18s ease-out both }
      .menu-sheet-in { animation: menuSheetIn .24s cubic-bezier(.2,.8,.2,1) both }
      @media (prefers-reduced-motion: reduce) {
        .menu-fade-in, .menu-sheet-in { animation: none }
      }
    `}</style>
  );
}

/* ---------- 5 stars ---------- */
const STAR_PATH =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

export function Stars({ value = 0, className = "w-4 h-4", t }) {
  const uid = useId().replace(/:/g, "");
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`${v.toFixed(1)} ${t("out_of_5_stars")}`}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, v - i));
        const clipId = `${uid}-${i}`;
        return (
          <svg
            key={i}
            viewBox="0 0 24 24"
            className={className}
            aria-hidden="true"
          >
            <defs>
              <clipPath id={clipId}>
                <rect x="0" y="0" width={2 + 20 * fill} height="24" />
              </clipPath>
            </defs>
            <path
              d={STAR_PATH}
              className="fill-stone-300 dark:fill-stone-600"
            />
            {fill > 0 && (
              <path d={STAR_PATH} fill="#fbbf24" clipPath={`url(#${clipId})`} />
            )}
          </svg>
        );
      })}
    </div>
  );
}

/* ---------- size picker (segmented control) ---------- */
export function SizeSegment({
  options,
  active,
  onPick,
  t,
  withPrice = false,
  large = false,
}) {
  return (
    <div
      role="radiogroup"
      aria-label={translateWithFallback(t, "size", "Size")}
      className={`inline-flex max-w-full rounded-xl bg-stone-100 p-1 dark:bg-stone-800 ${
        large ? "w-full" : ""
      }`}
    >
      {options.map((option) => {
        const isActive = active === option.key;
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onPick(option.key)}
            className={`min-w-0 cursor-pointer rounded-lg font-semibold transition-colors ${focusRing} ${
              large
                ? "flex flex-1 flex-col items-center px-3 py-2 text-sm"
                : "px-2.5 py-1 text-[11px]"
            } ${
              isActive
                ? "bg-white text-accent-700 shadow-sm dark:bg-stone-700 dark:text-accent-300"
                : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
            }`}
          >
            <span className="truncate">{t(option.labelKey)}</span>
            {withPrice && (
              <span
                className={`mt-0.5 text-xs font-medium ${
                  isActive
                    ? "text-accent-600 dark:text-accent-400"
                    : "text-stone-400"
                }`}
              >
                {formatPriceWithUSD(option.unit).riel}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- one group of choices in the modal (sugar / ice / coffee) ---------- */
export function ChoiceGroup({
  title,
  requiredLabel,
  levels,
  selectedId,
  onPick,
  name,
  translate,
  showExtra = false,
}) {
  const selected = levels.find((level) => level.id === selectedId);

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-bold text-stone-900 dark:text-white">
          {title}
          <span className="ml-1 text-rose-500" aria-hidden="true">
            *
          </span>
        </h4>
        <span
          className={`truncate text-xs font-semibold ${
            selected
              ? "text-accent-600 dark:text-accent-400"
              : "text-stone-400 dark:text-stone-500"
          }`}
        >
          {selected ? translate(selected.name) : requiredLabel}
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label={title}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      >
        {levels.map((level) => {
          const checked = level.id === selectedId;
          const extra = showExtra ? Number(level.price || 0) : 0;
          return (
            <label key={level.id} className="relative block cursor-pointer">
              <input
                type="radio"
                name={name}
                checked={checked}
                onChange={() => onPick(level)}
                className="peer sr-only"
              />
              <span
                className={`flex h-full min-h-[44px] items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent-500 ${
                  checked
                    ? "border-accent-600 bg-accent-50 font-semibold text-accent-800 dark:border-accent-500 dark:bg-accent-950/40 dark:text-accent-200"
                    : "border-stone-200 bg-white text-stone-700 hover:border-accent-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
                }`}
              >
                <span className="min-w-0 break-words leading-snug">
                  {translate(level.name)}
                  {extra > 0 && (
                    <span className="mt-0.5 block text-[11px] font-medium text-accent-600 dark:text-accent-400">
                      +{formatPriceWithUSD(extra).riel}
                    </span>
                  )}
                </span>
                {checked && (
                  <Check className="h-4 w-4 shrink-0 text-accent-600 dark:text-accent-400" />
                )}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- product card (row on phones, tile from sm up) ---------- */
export function ProductCard({
  img,
  name,
  description,
  categoryName,
  badge,
  discount,
  rating,
  reviews,
  options,
  option,
  onPick,
  price,
  basePrice,
  canAdd,
  added,
  loggedIn,
  onOpen,
  onAdd,
  t,
}) {
  const money = formatPriceWithUSD(price);
  const wasMoney = formatPriceWithUSD(basePrice);
  const moreLabel = translateWithFallback(
    t,
    "show_more_options",
    "More options",
  );

  return (
    <article className="group flex min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:border-accent-400/60 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 sm:flex-col">
      {/* photo */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={name}
        className={`relative w-28 shrink-0 self-stretch overflow-hidden bg-stone-100 dark:bg-stone-800 sm:aspect-[4/3] sm:w-full sm:self-auto ${focusRing}`}
      >
        {img ? (
          <img
            src={img}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent-50 to-stone-100 text-4xl dark:from-accent-950/40 dark:to-stone-800">
            ☕
          </span>
        )}
        {(discount > 0 || badge) && (
          <span className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-1">
            {discount > 0 && (
              <span className="rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold leading-tight text-white shadow-sm sm:px-2 sm:py-1 sm:text-xs">
                -{discount}%
              </span>
            )}
            {badge && (
              <span className="max-w-full break-words rounded-md bg-stone-900/75 px-1.5 py-0.5 text-[10px] font-bold leading-tight text-white backdrop-blur-sm sm:px-2 sm:py-1 sm:text-xs">
                {badge}
              </span>
            )}
          </span>
        )}
      </button>

      {/* details */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-4">
        <div className="min-w-0">
          {categoryName && (
            <p className="mb-0.5 truncate text-[11px] font-semibold text-accent-600 dark:text-accent-400">
              {categoryName}
            </p>
          )}
          <button
            type="button"
            onClick={onOpen}
            className={`block w-full rounded text-left ${focusRing}`}
          >
            <h3 className="line-clamp-2 break-words text-sm font-bold leading-snug text-stone-900 dark:text-white sm:text-base">
              {name}
            </h3>
          </button>
          {description && (
            <p className="mt-1 line-clamp-2 break-words text-[11px] leading-relaxed text-stone-500 dark:text-stone-400 sm:text-xs">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
          <Star
            className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
            aria-hidden="true"
          />
          <span className="font-semibold text-stone-700 dark:text-stone-200">
            {rating.toFixed(1)}
          </span>
          <span>({reviews})</span>
        </div>

        {options.length > 1 && (
          <SizeSegment
            options={options}
            active={option.key}
            onPick={onPick}
            t={t}
          />
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-base font-extrabold leading-none text-stone-900 dark:text-white sm:text-lg">
                {money.riel}
              </span>
              {discount > 0 && (
                <span className="text-[11px] text-stone-400 line-through">
                  {wasMoney.riel}
                </span>
              )}
            </div>
            <span className="mt-1 block text-[11px] font-medium text-stone-400 dark:text-stone-500">
              {money.usd}
            </span>
          </div>

          {loggedIn ? (
            canAdd ? (
              <button
                type="button"
                onClick={onAdd}
                aria-label={t("add_to_order")}
                title={t("add_to_order")}
                className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-white shadow-sm transition-colors ${focusRing} ${
                  added
                    ? "bg-emerald-600"
                    : "bg-accent-600 hover:bg-accent-700"
                }`}
              >
                {added ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Plus className="h-5 w-5" />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpen}
                aria-label={moreLabel}
                title={moreLabel}
                className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-accent-600 bg-accent-50 text-accent-700 transition-colors hover:bg-accent-100 dark:bg-accent-950/40 dark:text-accent-300 ${focusRing}`}
              >
                <SlidersHorizontal className="h-[18px] w-[18px]" />
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={onOpen}
              className={`shrink-0 cursor-pointer rounded px-1 py-1 text-xs font-semibold text-accent-600 underline decoration-accent-500/60 underline-offset-4 transition-colors hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300 ${focusRing}`}
            >
              {translateWithFallback(t, "see_more", "See more")}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function MenuSkeleton({ count = 6 }) {
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex animate-pulse overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 sm:flex-col"
        >
          <div className="h-32 w-28 shrink-0 bg-stone-200 dark:bg-stone-800 sm:aspect-[4/3] sm:h-auto sm:w-full" />
          <div className="flex-1 space-y-3 p-4">
            <div className="h-3 w-1/3 rounded bg-stone-200 dark:bg-stone-800" />
            <div className="h-4 w-2/3 rounded bg-stone-200 dark:bg-stone-800" />
            <div className="h-3 w-full rounded bg-stone-100 dark:bg-stone-800/70" />
            <div className="h-6 w-1/2 rounded bg-stone-200 dark:bg-stone-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   PRODUCT MODAL
   Below md: a full-screen page (photo first, then the choices,
   price + add button pinned at the bottom).
   md and up: a centred window with the photo on the left.
========================================================= */
export function ProductModal({
  product,
  img,
  onClose,
  t,
  translateJson,
  categoryLabel,
  loggedIn,
  onLogin,
  options,
  option,
  onPickSize,
  availSugar,
  availIce,
  availCoffee,
  customization,
  onPickLevel,
  canAdd,
  onAdd,
}) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Esc closes, the page behind stays still, focus moves into the dialog
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeRef.current();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const tt = (key, fallback) => translateWithFallback(t, key, fallback);

  const discount = Number(product.discount_percent || 0);
  const cust = customization || {};
  const extraCoffeePrice = Number(cust.coffee?.price || 0);
  const money = formatPriceWithUSD(option.unit + extraCoffeePrice);
  const wasMoney = formatPriceWithUSD(option.base + extraCoffeePrice);

  const rating =
    Number(product.rating) > 0 ? Number(product.rating) : STATIC_RATING;
  const reviews =
    product.reviews !== null &&
    product.reviews !== undefined &&
    product.reviews !== ""
      ? Number(product.reviews)
      : STATIC_REVIEWS;

  const groups = [
    {
      field: "sugar",
      title: tt("sugar_levels", "Sugar level"),
      levels: availSugar,
      extra: false,
    },
    {
      field: "ice",
      title: tt("ice_levels", "Ice level"),
      levels: availIce,
      extra: false,
    },
    {
      field: "coffee",
      title: tt("coffee_levels", "Coffee level"),
      levels: availCoffee,
      extra: true,
    },
  ].filter((group) => group.levels.length > 0);

  const missing = groups.filter((group) => !cust[group.field]);
  const productName = translateJson(product.name);
  const description = translateJson(product.description).trim();
  const badge = translateJson(product.badge).trim();
  const closeLabel = tt("close", "Close");
  const completeHint = tt(
    "complete_required_levels",
    "Choose all required options first",
  );

  // The photo sits on a blurred copy of itself, so product shots (often on white,
  // often tall) are shown whole instead of being cropped.
  const photo = (
    <div className="relative h-full w-full overflow-hidden bg-stone-100 dark:bg-stone-950">
      {img ? (
        <>
          <img
            src={img}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-2xl dark:opacity-40"
          />
          <img
            src={img}
            alt={productName}
            className="relative h-full w-full object-contain p-3 sm:p-5"
          />
        </>
      ) : (
        <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent-50 to-stone-100 text-7xl dark:from-accent-950/40 dark:to-stone-900">
          ☕
        </span>
      )}

      {(discount > 0 || badge) && (
        <span className="absolute left-4 top-4 flex flex-wrap gap-2">
          {discount > 0 && (
            <span className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-bold text-white shadow-sm">
              -{discount}%
            </span>
          )}
          {badge && (
            <span className="rounded-lg bg-stone-900/75 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
              {badge}
            </span>
          )}
        </span>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex md:items-center md:justify-center md:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {/* backdrop (only visible around the centred window) */}
      <div className="menu-fade-in absolute inset-0 bg-stone-950/70 backdrop-blur-sm" />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={productName}
        onMouseDown={(event) => event.stopPropagation()}
        className="menu-sheet-in relative z-10 flex h-dvh w-full flex-col overflow-hidden bg-white outline-none dark:bg-stone-900 md:h-[88dvh] md:max-h-[780px] md:max-w-5xl md:flex-row md:rounded-3xl md:shadow-2xl"
      >
        {/* photo pane (md and up) */}
        <div className="relative hidden shrink-0 md:block md:w-5/12">
          {photo}
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* page bar (below md): back button + category */}
          <div className="flex shrink-0 items-center gap-1 border-b border-stone-200 bg-white px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] dark:border-stone-800 dark:bg-stone-900 md:hidden">
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-stone-700 transition-colors hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800 ${focusRing}`}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="min-w-0 truncate text-sm font-semibold text-accent-600 dark:text-accent-400">
              {categoryLabel}
            </span>
          </div>

          {/* window header (md and up) */}
          <div className="hidden shrink-0 items-center justify-between gap-3 border-b border-stone-100 px-6 py-4 dark:border-stone-800 md:flex">
            <span className="truncate text-sm font-semibold text-accent-600 dark:text-accent-400">
              {categoryLabel}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-white ${focusRing}`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* everything scrolls together: photo first on small screens */}
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="relative h-[min(20rem,40dvh)] md:hidden">
              {photo}
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              <div className="space-y-3">
                <h2 className="break-words text-2xl font-extrabold leading-tight text-stone-900 dark:text-white sm:text-3xl">
                  {productName}
                </h2>

                <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
                  <Stars value={rating} t={t} />
                  <span className="font-semibold text-stone-800 dark:text-stone-200">
                    {rating.toFixed(1)}
                  </span>
                  <span>
                    ({reviews} {reviews === 1 ? t("review") : t("reviews")})
                  </span>
                </div>

                {description && (
                  <p className="whitespace-pre-line text-sm leading-7 text-stone-600 dark:text-stone-300">
                    {description}
                  </p>
                )}
              </div>

              {options.length > 1 && (
                <div className="space-y-2.5">
                  <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                    {tt("size", "Size")}
                  </h4>
                  <SizeSegment
                    options={options}
                    active={option.key}
                    t={t}
                    large
                    withPrice
                    onPick={onPickSize}
                  />
                </div>
              )}

              {groups.length > 0 && (
                <div className="space-y-6">
                  {groups.map((group) => (
                    <ChoiceGroup
                      key={group.field}
                      title={group.title}
                      requiredLabel={tt("required", "Required")}
                      levels={group.levels}
                      selectedId={cust[group.field]?.id}
                      name={`modal-${group.field}-${product.id}`}
                      translate={translateJson}
                      showExtra={group.extra}
                      onPick={(level) => onPickLevel(group.field, level)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* total + add: always visible at the bottom */}
          <div className="shrink-0 space-y-3 border-t border-stone-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 dark:border-stone-800 dark:bg-stone-900 sm:px-6 md:pb-5">
            {loggedIn && !canAdd && (
              <p
                className="text-xs font-medium text-accent-700 dark:text-accent-300"
                role="status"
              >
                {completeHint}
                {missing.length > 0 && (
                  <span className="font-semibold">
                    {" "}
                    ({missing.map((group) => group.title).join(", ")})
                  </span>
                )}
              </p>
            )}

            <div className="flex items-center gap-4">
              <div className="min-w-0 shrink-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-xl font-extrabold leading-none text-stone-900 dark:text-white sm:text-2xl">
                    {money.riel}
                  </span>
                  {discount > 0 && (
                    <span className="text-xs text-stone-400 line-through">
                      {wasMoney.riel}
                    </span>
                  )}
                </div>
                <span className="mt-1 block text-xs font-medium text-stone-400 dark:text-stone-500">
                  {money.usd}
                </span>
              </div>

              {loggedIn ? (
                <button
                  type="button"
                  disabled={!canAdd}
                  onClick={() => {
                    if (!canAdd) return;
                    onAdd();
                    onClose();
                  }}
                  title={!canAdd ? completeHint : ""}
                  className={`flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white transition-colors ${focusRing} ${
                    canAdd
                      ? "cursor-pointer bg-accent-600 hover:bg-accent-700"
                      : "cursor-not-allowed bg-stone-300 text-stone-500 dark:bg-stone-700 dark:text-stone-400"
                  }`}
                >
                  <Plus className="h-5 w-5 shrink-0" />
                  <span className="truncate">{t("add_to_order")}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onLogin}
                  className={`flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-xl bg-accent-600 px-5 text-sm font-bold text-white transition-colors hover:bg-accent-700 ${focusRing}`}
                >
                  <span className="truncate">
                    {tt("login_to_order", "Log in to order")}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}