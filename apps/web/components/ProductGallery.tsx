'use client';

import {useState, useRef, useCallback, useEffect} from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {useTranslations} from 'next-intl';

const ProductGalleryLightbox = dynamic(
  () => import('./ProductGalleryLightbox'),
  {ssr: false},
);

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
  priority,
}: {
  image: ProductImage;
  className?: string;
  loading?: 'lazy' | 'eager';
  sizes?: string;
  priority?: boolean;
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
        <Image
          src={image.src}
          alt={image.alt}
          fill
          {...(priority ? {priority: true} : {loading})}
          sizes={sizes}
          draggable={false}
          onError={() => setErrored(true)}
          className={`object-cover transition-opacity duration-300 ${className ?? ''}`}
        />
      )}
    </>
  );
}

interface ProductGalleryProps {
  images: ProductImage[];
}

export default function ProductGallery({images}: ProductGalleryProps) {
  const t = useTranslations('common');
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [counterVisible, setCounterVisible] = useState(true);
  // dragDelta — смещение трека во время живого свайпа (в px). null = не свайпим.
  const [dragDelta, setDragDelta] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const displayIndex = previewIndex ?? activeIndex;

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

  const jumpTo = useCallback(
    (i: number) => {
      setActiveIndex(i);
    },
    [],
  );

  const active = images[displayIndex];
  const hasMultiple = images.length > 1;

  /* ── Touch swipe on main image + live drag track ── */
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
        // Лёгкое сопротивление у граничных слайдов (резиновый bounds).
        const atStart = activeIndex === 0 && dx > 0;
        const atEnd = activeIndex === images.length - 1 && dx < 0;
        const resisted = atStart || atEnd ? dx * 0.35 : dx;
        setDragDelta(resisted);
      }
    };
    const onEnd = () => {
      const threshold = el.clientWidth * 0.18; // ~18% ширины — порог для смены кадра
      if (dx > threshold) go(-1);
      else if (dx < -threshold) go(1);
      dx = 0;
      dir = null;
      setDragDelta(null);
    };

    el.addEventListener('touchstart', onStart, {passive: true});
    el.addEventListener('touchmove', onMove, {passive: false});
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [go, hasMultiple, activeIndex, images.length]);

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
                onMouseEnter={() => setPreviewIndex(i)}
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

      {/* Main image — horizontal track slider для плавного "перелистывания" */}
      <div className="order-1 lg:order-2 relative flex-1">
        <div
          ref={mainRef}
          className="relative aspect-[3/4] w-full overflow-hidden rounded-lg lg:rounded-xl select-none cursor-pointer"
          style={{touchAction: 'pan-y'}}
          onClick={() => {
            if (active?.src) setLightboxOpen(true);
          }}
        >
          {/* Track: все фото в ряд, смещается на -displayIndex*100% + drag-delta */}
          <div
            ref={trackRef}
            className="absolute inset-0 flex h-full w-full"
            style={{
              // Во время свайпа — моментальное следование за пальцем (без transition).
              // После отпускания — плавный возврат/снап к ближайшему слайду.
              transform: `translate3d(calc(${-displayIndex * 100}% + ${dragDelta ?? 0}px), 0, 0)`,
              transition: dragDelta === null ? 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
              willChange: 'transform',
            }}
          >
            {images.map((img, i) => {
              // Eager-load соседи (активный ± 1), остальные lazy.
              const isNeighbor = Math.abs(i - activeIndex) <= 1 ||
                (activeIndex === 0 && i === images.length - 1) ||
                (activeIndex === images.length - 1 && i === 0);
              return (
                <div key={img.id} className="relative h-full w-full flex-shrink-0">
                  <GalleryImage
                    image={img}
                    priority={i === 0}
                    loading={isNeighbor ? 'eager' : 'lazy'}
                    sizes="(max-width: 1024px) 100vw, 60vw"
                  />
                </div>
              );
            })}
          </div>

          {/* Image counter */}
          {hasMultiple && (
            <div
              className={`pointer-events-none absolute top-3 right-3 z-10 rounded-full bg-black/45 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md transition-opacity duration-500 sm:top-4 sm:right-4 sm:text-xs ${
                counterVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {displayIndex + 1} / {images.length}
            </div>
          )}

          {/* Prev / Next — edge tap zones */}
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                className="absolute left-0 top-0 z-10 h-full w-[20%]"
                style={{WebkitTapHighlightColor: 'transparent'}}
                aria-label={t('previousImage')}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                className="absolute right-0 top-0 z-10 h-full w-[20%]"
                style={{WebkitTapHighlightColor: 'transparent'}}
                aria-label={t('nextImage')}
              />
            </>
          )}
        </div>
      </div>

      {lightboxOpen && (
        <ProductGalleryLightbox
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          images={images}
          activeIndex={activeIndex}
          onIndexChange={jumpTo}
        />
      )}
    </div>
  );
}
