"use client";

import { useState } from "react";

/** Read-only stars, e.g. for a product card or review list. `rating` can be
 *  fractional (average) - stars fill proportionally per-star via a clipped
 *  overlay, not just rounded to the nearest whole star. */
export function StarDisplay({
  rating,
  size = 14,
}: {
  rating: number;
  size?: number;
}) {
  return (
    <span className="inline-flex" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - (i - 1)));
        return (
          <span
            key={i}
            className="relative inline-block"
            style={{ width: size, height: size }}
          >
            <Star size={size} className="text-line" />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star size={size} className="text-accent" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Tappable 1-5 star picker for writing a review. */
export function StarInput({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange: (rating: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;
  return (
    <span className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
          aria-label={`Rate ${i} star${i > 1 ? "s" : ""}`}
          className="p-0.5"
        >
          <Star size={size} className={i <= shown ? "text-accent" : "text-line"} />
        </button>
      ))}
    </span>
  );
}

function Star({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
    </svg>
  );
}

/** Compact "★ 4.5 (12)" summary used on cards/headers. Returns null when
 *  there's nothing to show yet (no reviews). */
export function RatingSummary({
  ratingSum,
  reviewCount,
  size = 14,
}: {
  ratingSum?: number;
  reviewCount?: number;
  size?: number;
}) {
  if (!reviewCount) return null;
  const avg = ratingSum! / reviewCount;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink/70">
      <StarDisplay rating={avg} size={size} />
      <span>
        {avg.toFixed(1)} ({reviewCount})
      </span>
    </span>
  );
}
