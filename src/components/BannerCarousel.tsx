"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { watchActiveBanners } from "@/lib/data";
import type { Banner } from "@/types";

const SLIDE_MS = 4500;
const TRANSITION_MS = 600;

/** Continuous auto-sliding banner carousel for the signed-out landing page.
 *  Loops seamlessly by appending a duplicate of the first slide at the end,
 *  then snapping back to index 0 without a transition once it's reached. */
export default function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const unsub = watchActiveBanners(setBanners);
    return () => unsub();
  }, []);

  const count = banners?.length ?? 0;

  const advance = useCallback(() => {
    setAnimate(true);
    setIndex((i) => i + 1);
  }, []);

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timerRef.current = setInterval(advance, SLIDE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [count, paused, advance]);

  // Landed on the appended duplicate of slide 0 — snap back invisibly.
  useEffect(() => {
    if (count < 2 || index !== count) return;
    const t = setTimeout(() => {
      setAnimate(false);
      setIndex(0);
    }, TRANSITION_MS);
    return () => clearTimeout(t);
  }, [index, count]);

  if (!banners || banners.length === 0) return null;

  const slides = banners.length > 1 ? [...banners, banners[0]] : banners;
  const goTo = (i: number) => {
    setAnimate(true);
    setIndex(i);
  };

  return (
    <div
      className="relative w-full aspect-[5/2] overflow-hidden rounded-2xl border border-line bg-surface mb-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex h-full"
        style={{
          width: `${slides.length * 100}%`,
          transform: `translateX(-${(index * 100) / slides.length}%)`,
          transition: animate ? `transform ${TRANSITION_MS}ms ease-in-out` : "none",
        }}
      >
        {slides.map((b, i) => (
          <BannerSlide key={`${b.id}-${i}`} banner={b} widthPercent={100 / slides.length} />
        ))}
      </div>

      {banners.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous banner"
            onClick={() => goTo(index === 0 ? banners.length - 1 : index - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-ink/40 text-white flex items-center justify-center opacity-0 hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next banner"
            onClick={advance}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-ink/40 text-white flex items-center justify-center opacity-0 hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          >
            ›
          </button>

          <div className="absolute bottom-3 inset-x-0 flex justify-center gap-2">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                aria-label={`Go to banner ${i + 1}`}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all ${
                  (index % banners.length) === i ? "w-6 bg-white" : "w-1.5 bg-white/60"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BannerSlide({ banner, widthPercent }: { banner: Banner; widthPercent: number }) {
  const content = (
    <>
      {/* Blurred, scaled-up copy fills the frame behind images that don't
       *  match the carousel's wide aspect ratio, instead of leaving bare
       *  white space either side of a letterboxed object-contain image. */}
      <Image
        src={banner.imageUrl}
        alt=""
        fill
        sizes="(max-width: 768px) 100vw, 1152px"
        className="object-cover scale-110 blur-2xl"
        aria-hidden
      />
      <div className="absolute inset-0 bg-black/10" />
      <Image
        src={banner.imageUrl}
        alt=""
        fill
        sizes="(max-width: 768px) 100vw, 1152px"
        className="object-contain"
        priority
      />
    </>
  );
  return (
    <div
      className="relative h-full shrink-0 overflow-hidden"
      style={{ width: `${widthPercent}%` }}
    >
      {banner.linkUrl ? (
        <Link href={banner.linkUrl} className="block relative h-full w-full">
          {content}
        </Link>
      ) : (
        <div className="relative h-full w-full">{content}</div>
      )}
    </div>
  );
}
