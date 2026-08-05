"use client";

import { useEffect, useState } from "react";

const SLIDES = [
  "/hero/hero-1.webp",
  "/hero/hero-2.webp",
  "/hero/hero-3.webp",
  "/hero/hero-4.webp",
];

const INTERVAL_MS = 4000;

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const [paused, setPaused] = useState(false);

  const available = SLIDES.map((_, i) => i).filter((i) => !failed[i]);

  useEffect(() => {
    if (paused || available.length < 2) return;
    const timer = setInterval(() => {
      setIndex((prev) => {
        const currentPos = available.indexOf(prev);
        const nextPos = (currentPos + 1) % available.length;
        return available[nextPos];
      });
    }, INTERVAL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, available.join(",")]);

  if (available.length === 0) return null;

  return (
    <div
      className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden mb-8 bg-gradient-to-br from-orange-200 to-rose-300"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {SLIDES.map((src, i) =>
        failed[i] ? null : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt="LA 한인 커뮤니티"
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
            style={{ opacity: index === i ? 1 : 0 }}
            onError={() => setFailed((f) => ({ ...f, [i]: true }))}
          />
        )
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
      <div className="absolute bottom-4 left-4 text-white">
        <p className="text-lg sm:text-2xl font-bold drop-shadow">마음 커넥트</p>
        <p className="text-xs sm:text-sm text-white/90 drop-shadow">
          LA 한인 커뮤니티가 믿고 추천하는 업체들
        </p>
      </div>
      {available.length > 1 && (
        <div className="absolute bottom-3 right-4 flex gap-1.5">
          {available.map((i) => (
            <button
              key={i}
              aria-label={`슬라이드 ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                index === i ? "w-5 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
