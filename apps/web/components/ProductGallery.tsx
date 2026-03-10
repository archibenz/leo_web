'use client';

import {useState, useRef, useCallback} from 'react';

export interface ProductImage {
  id: string;
  src: string;
  alt: string;
  gradient: string;
}

interface ProductGalleryProps {
  images: ProductImage[];
}

export default function ProductGallery({images}: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (dir: -1 | 1) => {
      setActiveIndex((prev) => {
        const next = prev + dir;
        if (next < 0) return images.length - 1;
        if (next >= images.length) return 0;
        return next;
      });
    },
    [images.length],
  );

  const active = images[activeIndex];

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
      {/* Thumbnails — horizontal on mobile, vertical on desktop */}
      <div className="order-2 lg:order-1 lg:flex lg:flex-col lg:gap-2 lg:w-[72px] lg:flex-shrink-0">
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-none lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:max-h-[520px]"
        >
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActiveIndex(i)}
              className={`relative flex-shrink-0 w-16 h-20 lg:w-full lg:h-20 rounded-md overflow-hidden transition-all duration-200 ${
                i === activeIndex
                  ? 'opacity-100 brightness-110'
                  : 'opacity-50 hover:opacity-80'
              }`}
              aria-label={img.alt}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${img.gradient}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Main image */}
      <div className="order-1 lg:order-2 relative flex-1">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg lg:rounded-xl">
          <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-300 ${active?.gradient ?? ''}`} />

          {/* Prev / Next */}
          <button
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--paper-base)]/70 text-[var(--ink)] backdrop-blur-sm transition hover:bg-[var(--paper-base)]"
            aria-label="Previous image"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--paper-base)]/70 text-[var(--ink)] backdrop-blur-sm transition hover:bg-[var(--paper-base)]"
            aria-label="Next image"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

        </div>
      </div>
    </div>
  );
}
