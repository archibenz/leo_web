'use client';

import {useState, useRef, useCallback, useEffect} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
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
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [counterVisible, setCounterVisible] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const [mainHover, setMainHover] = useState(false);
  const [hoverZone, setHoverZone] = useState<'left' | 'right' | null>(null);

  const displayIndex = previewIndex ?? activeIndex;

  const go = useCallback(
    (dir: -1 | 1) => {
      setDirection(dir);
      setActiveIndex((prev) => {
        const next = prev + dir;
        if (next < 0) return images.length - 1;
        if (next >= images.length) return 0;
        return next;
      });
    },
    [images.length],
  );

  const jumpTo = useCallback(
    (i: number) => {
      setDirection(i >= activeIndex ? 1 : -1);
      setActiveIndex(i);
    },
    [activeIndex],
  );

  const active = images[displayIndex];
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
                onClick={() => jumpTo(i)}
                onMouseEnter={() => {
                  setDirection(i >= activeIndex ? 1 : -1);
                  setPreviewIndex(i);
                }}
                onMouseLeave={() => setPreviewIndex(null)}
                className="relative flex-shrink-0 w-14 h-[72px] sm:w-16 sm:h-20 lg:w-full lg:h-20 rounded-md overflow-hidden transition-all duration-200 active:scale-95"
                style={{WebkitTapHighlightColor: 'transparent'}}
                aria-label={img.alt}
                aria-pressed={i === displayIndex}
              >
                <GalleryImage image={img} sizes="80px" />
                <div
                  aria-hidden="true"
                  className={`absolute inset-0 pointer-events-none transition-opacity duration-200 bg-black/45 ${
                    i === displayIndex ? 'opacity-100' : 'opacity-0'
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
          className="relative aspect-[3/4] w-full overflow-hidden rounded-lg lg:rounded-xl select-none cursor-pointer"
          style={{touchAction: 'pan-y'}}
          onMouseEnter={() => setMainHover(true)}
          onMouseLeave={() => { setMainHover(false); setHoverZone(null); }}
          onClick={() => {
            if (active?.src) setLightboxOpen(true);
          }}
        >
          <AnimatePresence initial={false} mode="wait" custom={direction}>
            {active && (
              <motion.div
                key={active.id}
                custom={direction}
                variants={{
                  enter: (d: number) => ({opacity: 0, x: 40 * d}),
                  center: {opacity: 1, x: 0},
                  exit: (d: number) => ({opacity: 0, x: -40 * d}),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{duration: 0.4, ease: [0.22, 1, 0.36, 1]}}
                className="absolute inset-0"
              >
                <GalleryImage
                  image={active}
                  loading="eager"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Image counter — only when multiple, auto-fades after 2.5s */}
          {hasMultiple && (
            <div
              className={`pointer-events-none absolute top-3 right-3 z-10 rounded-full bg-black/45 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md transition-opacity duration-500 sm:top-4 sm:right-4 sm:text-xs ${
                counterVisible || mainHover ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {displayIndex + 1} / {images.length}
            </div>
          )}

          {/* Prev / Next — tap zones with hover gradient + arrows (desktop) */}
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                onMouseEnter={() => setHoverZone('left')}
                onMouseLeave={() => setHoverZone(null)}
                className="absolute left-0 top-0 z-10 flex h-full w-[20%] items-center justify-center"
                style={{WebkitTapHighlightColor: 'transparent'}}
                aria-label="Previous image"
              >
                <div
                  className={`pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-black/25 to-transparent transition-opacity duration-200 lg:block ${
                    hoverZone === 'left' ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <svg
                  className={`pointer-events-none relative hidden h-5 w-5 text-white drop-shadow-lg transition-opacity duration-200 lg:block ${
                    mainHover ? (hoverZone === 'left' ? 'opacity-100' : 'opacity-60') : 'opacity-0'
                  }`}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <polygon points="16 4 8 12 16 20" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                onMouseEnter={() => setHoverZone('right')}
                onMouseLeave={() => setHoverZone(null)}
                className="absolute right-0 top-0 z-10 flex h-full w-[20%] items-center justify-center"
                style={{WebkitTapHighlightColor: 'transparent'}}
                aria-label="Next image"
              >
                <div
                  className={`pointer-events-none absolute inset-0 hidden bg-gradient-to-l from-black/25 to-transparent transition-opacity duration-200 lg:block ${
                    hoverZone === 'right' ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <svg
                  className={`pointer-events-none relative hidden h-5 w-5 text-white drop-shadow-lg transition-opacity duration-200 lg:block ${
                    mainHover ? (hoverZone === 'right' ? 'opacity-100' : 'opacity-60') : 'opacity-0'
                  }`}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <polygon points="8 4 16 12 8 20" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Fullscreen lightbox — brand-themed premium viewer with pinch-zoom */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={images.map((img) => ({src: img.src, alt: img.alt}))}
        index={activeIndex}
        on={{view: ({index: i}) => jumpTo(i)}}
        plugins={[Zoom]}
        zoom={{
          maxZoomPixelRatio: 3,
          scrollToZoom: true,
          doubleTapDelay: 300,
          doubleClickDelay: 300,
          zoomInMultiplier: 1.6,
          wheelZoomDistanceFactor: 80,
          pinchZoomDistanceFactor: 80,
        }}
        animation={{
          fade: 500,
          swipe: 450,
          easing: {
            fade: 'cubic-bezier(0.22, 1, 0.36, 1)',
            swipe: 'cubic-bezier(0.22, 1, 0.36, 1)',
            navigation: 'cubic-bezier(0.22, 1, 0.36, 1)',
          },
        }}
        carousel={{
          padding: '32px',
          spacing: '32px',
          imageFit: 'contain',
          finite: images.length < 2,
          preload: 2,
        }}
        controller={{
          closeOnBackdropClick: true,
          closeOnPullUp: true,
          closeOnPullDown: true,
        }}
        toolbar={{buttons: []}}
        styles={{
          container: {
            backgroundColor: 'rgba(30, 18, 13, 0.96)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
          },
          toolbar: {display: 'none'},
          button: {color: '#f3e9da', filter: 'none'},
          icon: {color: '#f3e9da', filter: 'none'},
          navigationPrev: {color: '#f3e9da', filter: 'none'},
          navigationNext: {color: '#f3e9da', filter: 'none'},
          slide: {padding: 0},
        }}
        render={{
          iconClose: () => (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ),
          iconPrev: () => (
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          ),
          iconNext: () => (
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          ),
          slideHeader: () =>
            hasMultiple ? (
              <div className="pointer-events-none absolute left-0 right-0 top-0 flex gap-1.5 px-6 pt-6 sm:px-10 sm:pt-8">
                {images.map((_, i) => (
                  <div
                    key={i}
                    className={`h-[2px] flex-1 rounded-full transition-all duration-500 ${
                      i === activeIndex ? 'bg-[#D4A574]' : 'bg-[#f3e9da]/20'
                    }`}
                  />
                ))}
              </div>
            ) : null,
          slideFooter: () =>
            hasMultiple ? (
              <div className="pointer-events-none absolute bottom-8 left-0 right-0 flex items-center justify-center text-[11px] font-medium uppercase tracking-[0.32em] text-[#f3e9da]/75 sm:bottom-10 sm:text-xs">
                <span className="tabular-nums">
                  {String(activeIndex + 1).padStart(2, '0')}
                </span>
                <span className="mx-3 text-[#D4A574]">—</span>
                <span className="tabular-nums">
                  {String(images.length).padStart(2, '0')}
                </span>
              </div>
            ) : null,
        }}
      />
    </div>
  );
}
