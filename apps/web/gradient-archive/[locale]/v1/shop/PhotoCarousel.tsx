'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';

interface PhotoCarouselProps {
  images: string[];
  alt: string;
  fallbackGradient: string;
  productHref: string;
  priorityFirst?: boolean;
}

export default function PhotoCarousel({
  images,
  alt,
  fallbackGradient,
  productHref,
  priorityFirst,
}: PhotoCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [errored, setErrored] = useState<Set<number>>(new Set());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let raf = 0;
    let mounted = true;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!mounted) return;
        const w = container.clientWidth;
        if (w > 0) {
          const idx = Math.round(container.scrollLeft / w);
          setActiveIndex(idx);
        }
      });
    };
    container.addEventListener('scroll', onScroll, {passive: true});
    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
      container.removeEventListener('scroll', onScroll);
    };
  }, []);

  const markErr = (i: number) => () =>
    setErrored((prev) => {
      const next = new Set(prev);
      next.add(i);
      return next;
    });

  if (images.length === 0) {
    return (
      <Link
        href={productHref}
        prefetch={false}
        aria-label={alt}
        className={`absolute inset-0 block bg-gradient-to-br ${fallbackGradient}`}
      >
        <span className="sr-only">{alt}</span>
      </Link>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="absolute inset-0 flex overflow-x-auto overflow-y-hidden scrollbar-none"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x',
          overscrollBehaviorX: 'contain',
        }}
      >
        {images.map((src, i) => (
          <div
            key={i}
            className="relative h-full w-full flex-shrink-0"
            style={{scrollSnapAlign: 'start', scrollSnapStop: 'always'}}
          >
            <Link
              href={productHref}
              prefetch={false}
              aria-label={alt}
              className={`absolute inset-0 block bg-gradient-to-br ${fallbackGradient}`}
            >
              {!errored.has(i) ? (
                <Image
                  src={src}
                  alt={alt}
                  fill
                  sizes="100vw"
                  priority={priorityFirst && i === 0}
                  loading={priorityFirst && i === 0 ? undefined : 'lazy'}
                  onError={markErr(i)}
                  className="object-cover"
                  style={{objectPosition: 'center 38%'}}
                  draggable={false}
                />
              ) : null}
            </Link>
          </div>
        ))}
      </div>
      {images.length > 1 ? (
        <div
          className="pointer-events-none absolute inset-x-0 z-30 flex items-center justify-center gap-1.5"
          style={{bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)'}}
        >
          {images.map((_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="block h-[5px] rounded-full bg-ink shadow-[0_1px_4px_rgba(0,0,0,0.5)] transition-all duration-300"
              style={{
                width: i === activeIndex ? '18px' : '5px',
                opacity: i === activeIndex ? 0.95 : 0.5,
              }}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
