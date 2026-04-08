'use client';

import {useState, useRef, useCallback, useEffect} from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';

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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [counterVisible, setCounterVisible] = useState(true);
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
      if (dx > 60) go(-1);
      else if (dx < -60) go(1);
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

  /* ── Auto-hide image counter after 2.5s of inactivity, reappear on slide change ── */
  useEffect(() => {
    setCounterVisible(true);
    const t = setTimeout(() => setCounterVisible(false), 2500);
    return () => clearTimeout(t);
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
                className="relative flex-shrink-0 w-14 h-[72px] sm:w-16 sm:h-20 lg:w-full lg:h-20 rounded-md overflow-hidden transition-all duration-200 active:scale-95"
                style={{WebkitTapHighlightColor: 'transparent'}}
                aria-label={img.alt}
                aria-pressed={i === activeIndex}
              >
                <GalleryImage image={img} sizes="80px" />
                <div
                  aria-hidden="true"
                  className={`absolute inset-0 pointer-events-none transition-opacity duration-200 bg-black/45 ${
                    i === activeIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main image */}
      <div className="order-1 lg:order-2 relative flex-1">
        <div
          ref={mainRef}
          className="relative aspect-[3/4] w-full overflow-hidden rounded-lg lg:rounded-xl select-none cursor-zoom-in"
          style={{touchAction: 'pan-y'}}
          onClick={() => {
            if (active?.src) setLightboxOpen(true);
          }}
        >
          {active && (
            <GalleryImage
              image={active}
              loading="eager"
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
          )}

          {/* Image counter — only when multiple, auto-fades after 2.5s */}
          {hasMultiple && (
            <div
              className={`pointer-events-none absolute top-3 right-3 z-10 rounded-full bg-black/45 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md transition-opacity duration-500 sm:top-4 sm:right-4 sm:text-xs ${
                counterVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {activeIndex + 1} / {images.length}
            </div>
          )}

          {/* Prev / Next — Telegram-style edge tap zones; wide invisible hit area, small chevron hint */}
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                className="group absolute left-0 top-0 z-10 flex h-full w-[15%] items-center justify-start pl-2 sm:pl-3"
                style={{WebkitTapHighlightColor: 'transparent'}}
                aria-label="Previous image"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/25 text-white/80 backdrop-blur-sm transition-all duration-200 group-hover:bg-black/45 group-hover:text-white group-active:scale-90">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                className="group absolute right-0 top-0 z-10 flex h-full w-[15%] items-center justify-end pr-2 sm:pr-3"
                style={{WebkitTapHighlightColor: 'transparent'}}
                aria-label="Next image"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/25 text-white/80 backdrop-blur-sm transition-all duration-200 group-hover:bg-black/45 group-hover:text-white group-active:scale-90">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Fullscreen lightbox with pinch-zoom */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={images.map((img) => ({src: img.src, alt: img.alt}))}
        index={activeIndex}
        on={{view: ({index: i}) => setActiveIndex(i)}}
        plugins={[Zoom]}
        zoom={{maxZoomPixelRatio: 3, scrollToZoom: true}}
        styles={{container: {backgroundColor: 'rgba(10, 10, 10, 0.94)'}}}
        controller={{closeOnBackdropClick: true}}
      />
    </div>
  );
}
