'use client';

import {useState, useRef, useCallback, useEffect} from 'react';

export interface ProductImage {
  id: string;
  src: string;
  alt: string;
  gradient: string;
}

/* ── Smart image with graceful fallback to gradient ── */
function GalleryImage({
  image,
  className,
  loading = 'lazy',
  sizes,
}: {
  image: ProductImage;
  className?: string;
  loading?: 'lazy' | 'eager';
  sizes?: string;
}) {
  const [errored, setErrored] = useState(false);
  const hasSrc = Boolean(image.src) && !errored;

  return (
    <>
      <div
        className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-300 ${image.gradient} ${
          hasSrc ? 'opacity-0' : 'opacity-100'
        }`}
      />
      {hasSrc && (
        <img
          src={image.src}
          alt={image.alt}
          loading={loading}
          sizes={sizes}
          draggable={false}
          onError={() => setErrored(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${className ?? ''}`}
        />
      )}
    </>
  );
}

interface ProductGalleryProps {
  images: ProductImage[];
}

export default function ProductGallery({images}: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

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
  const hasMultiple = images.length > 1;

  /* ── Touch swipe on main image ── */
  useEffect(() => {
    const el = mainRef.current;
    if (!el || !hasMultiple) return;

    let startX = 0;
    let startY = 0;
    let dx = 0;
    let dir: 'h' | 'v' | null = null;

    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      dx = 0;
      dir = null;
    };
    const onMove = (e: TouchEvent) => {
      const cdx = e.touches[0].clientX - startX;
      const cdy = e.touches[0].clientY - startY;
      if (!dir && (Math.abs(cdx) > 8 || Math.abs(cdy) > 8)) {
        dir = Math.abs(cdx) > Math.abs(cdy) ? 'h' : 'v';
      }
      if (dir === 'h') {
        e.preventDefault();
        dx = cdx;
      }
    };
    const onEnd = () => {
      if (dx > 40) go(-1);
      else if (dx < -40) go(1);
      dx = 0;
      dir = null;
    };

    el.addEventListener('touchstart', onStart, {passive: true});
    el.addEventListener('touchmove', onMove, {passive: false});
    el.addEventListener('touchend', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, [go, hasMultiple]);

  /* ── Auto-scroll thumbnails on mobile to keep active visible ── */
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const activeBtn = container.querySelector<HTMLButtonElement>(`[data-thumb-idx="${activeIndex}"]`);
    if (activeBtn) {
      activeBtn.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'center'});
    }
  }, [activeIndex]);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
      {/* Thumbnails — horizontal on mobile, vertical on desktop */}
      {hasMultiple && (
        <div className="order-2 lg:order-1 lg:flex lg:flex-col lg:gap-2 lg:w-[72px] lg:flex-shrink-0">
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto scrollbar-none lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:max-h-[520px]"
            style={{WebkitOverflowScrolling: 'touch'}}
          >
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                data-thumb-idx={i}
                onClick={() => setActiveIndex(i)}
                className={`relative flex-shrink-0 w-14 h-[72px] sm:w-16 sm:h-20 lg:w-full lg:h-20 rounded-md overflow-hidden transition-all duration-200 active:scale-95 ${
                  i === activeIndex
                    ? 'opacity-100 brightness-110 ring-2 ring-[#D4A574]/60 ring-offset-1 ring-offset-[var(--paper-base)]'
                    : 'opacity-55 hover:opacity-85'
                }`}
                style={{WebkitTapHighlightColor: 'transparent'}}
                aria-label={img.alt}
                aria-pressed={i === activeIndex}
              >
                <GalleryImage image={img} sizes="80px" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main image */}
      <div className="order-1 lg:order-2 relative flex-1">
        <div
          ref={mainRef}
          className="relative aspect-[3/4] w-full overflow-hidden rounded-lg lg:rounded-xl select-none"
          style={{touchAction: 'pan-y'}}
        >
          {active && (
            <GalleryImage
              image={active}
              loading="eager"
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
          )}

          {/* Image counter — only when multiple */}
          {hasMultiple && (
            <div className="absolute top-3 right-3 z-10 rounded-full bg-black/45 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md sm:top-4 sm:right-4 sm:text-xs">
              {activeIndex + 1} / {images.length}
            </div>
          )}

          {/* Prev / Next — only when multiple, WCAG AA touch targets, hidden on touch but shown for click affordance */}
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-10 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-[var(--paper-base)]/75 text-[var(--ink)] backdrop-blur-md transition-all duration-200 hover:bg-[var(--paper-base)] active:scale-90"
                style={{WebkitTapHighlightColor: 'transparent'}}
                aria-label="Previous image"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-10 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-[var(--paper-base)]/75 text-[var(--ink)] backdrop-blur-md transition-all duration-200 hover:bg-[var(--paper-base)] active:scale-90"
                style={{WebkitTapHighlightColor: 'transparent'}}
                aria-label="Next image"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
