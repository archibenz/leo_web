'use client';

import {useRef, useState, useEffect, useCallback} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import BlurReveal from './BlurReveal';

/* ── Types ── */

interface CategoryItem {
  key: string;
  label: string;
  description: string;
}

interface PopularItem {
  slug: string;
  label: string;
  description: string;
}

interface HomeSectionsProps {
  locale: string;
  shopHeroTitle: string;
  shopHeroSubtitle: string;
  categoriesTitle: string;
  categories: CategoryItem[];
  popularTitle: string;
  popularItems: PopularItem[];
}

/* ── Gradient palettes ── */

const CATEGORY_GRADIENTS: Record<string, string> = {
  dresses: 'from-[#3b1a2e] to-[#6b3a5e]',
  coats: 'from-[#2e2e2e] to-[#5a5a5a]',
  knitwear: 'from-[#7a6a5a] to-[#b8a898]',
  skirts: 'from-[#1a1a2e] to-[#4a3a5e]',
  blouses: 'from-[#8a7a5a] to-[#d4c9a8]',
  trousers: 'from-[#3a3a3a] to-[#5e5e5e]',
  blazers: 'from-[#3b1a2e] to-[#5a2a4e]',
  accessories: 'from-[#2e2e2e] to-[#4a4a4a]',
};

const POPULAR_GRADIENTS = [
  'from-[#3b1a2e] to-[#6b3a5e]',
  'from-[#7a6a5a] to-[#b8a898]',
  'from-[#2e2e2e] to-[#5a5a5a]',
  'from-[#1a1a2e] to-[#4a3a5e]',
];

const SHOP_HERO_IMAGE = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&h=600&fit=crop&q=80';

const CATEGORY_IMAGES: Record<string, string> = {
  dresses: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&h=670&fit=crop&q=80',
  coats: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=500&h=670&fit=crop&q=80',
  knitwear: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500&h=670&fit=crop&q=80',
  skirts: 'https://images.unsplash.com/photo-1577900232427-18219b9166a0?w=500&h=670&fit=crop&q=80',
  blouses: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=500&h=670&fit=crop&q=80',
  trousers: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=500&h=670&fit=crop&q=80',
  blazers: 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=500&h=670&fit=crop&q=80',
  accessories: 'https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=500&h=670&fit=crop&q=80',
};

const POPULAR_IMAGES = [
  'https://images.unsplash.com/photo-1551803091-e20673f15770?w=500&h=670&fit=crop&q=80',
  'https://images.unsplash.com/photo-1562572159-4efc207f5aff?w=500&h=670&fit=crop&q=80',
  'https://images.unsplash.com/photo-1549062572-544a64fb0c56?w=500&h=670&fit=crop&q=80',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=500&h=670&fit=crop&q=80',
];

/* ── Arrow icon ── */

function ArrowIcon({direction}: {direction: 'left' | 'right'}) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {direction === 'left' ? (
        <polyline points="15 18 9 12 15 6" />
      ) : (
        <polyline points="9 18 15 12 9 6" />
      )}
    </svg>
  );
}

/* ── Horizontal scroll row with arrows ── */

function ScrollRow({children}: {children: React.ReactNode}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, {passive: true});
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  const scroll = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({left: dir * 300, behavior: 'smooth'});
  };

  return (
    <div className="relative group/scroll -mx-2 -my-4">
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto px-2 py-4 scrollbar-none sm:gap-5"
        style={{WebkitOverflowScrolling: 'touch'}}
      >
        {children}
      </div>

      {/* Left fade — only when there's content scrolled out left */}
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 z-[5] w-12 transition-opacity duration-300 sm:w-16 ${
          canScrollLeft ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'linear-gradient(to right, rgba(43,23,17,0.85), rgba(43,23,17,0))',
        }}
        aria-hidden="true"
      />

      {/* Right fade — primary mobile affordance for "more content" */}
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 z-[5] w-12 transition-opacity duration-300 sm:w-16 ${
          canScrollRight ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'linear-gradient(to left, rgba(43,23,17,0.85), rgba(43,23,17,0))',
        }}
        aria-hidden="true"
      />

      {/* Desktop arrows — hidden on touch, shown on hover */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden h-10 w-10 items-center justify-center rounded-full bg-[var(--paper-base)]/80 text-[var(--ink)] opacity-0 backdrop-blur-sm transition-opacity duration-200 hover:bg-[var(--paper-base)] group-hover/scroll:opacity-100 md:flex"
          aria-label="Scroll left"
        >
          <ArrowIcon direction="left" />
        </button>
      )}

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden h-10 w-10 items-center justify-center rounded-full bg-[var(--paper-base)]/80 text-[var(--ink)] opacity-0 backdrop-blur-sm transition-opacity duration-200 hover:bg-[var(--paper-base)] group-hover/scroll:opacity-100 md:flex"
          aria-label="Scroll right"
        >
          <ArrowIcon direction="right" />
        </button>
      )}
    </div>
  );
}

/* ── Section heading with accent line ── */

function SectionHeading({title}: {title: string}) {
  return (
    <div className="mb-7 flex items-center gap-5 sm:mb-9">
      <div className="h-px w-10 bg-[#D4A574]/40 sm:w-14" />
      <h2 className="font-display text-lg uppercase tracking-[0.06em] sm:tracking-[0.12em] text-[#F2E6D8] sm:text-xl lg:text-2xl">
        {title}
      </h2>
    </div>
  );
}

/* ── Shop hero — animated gradient, bigger aspect ── */

function ShopHeroCard({title, subtitle, locale}: {title: string; subtitle: string; locale: string}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  return (
    <Link
      href={`/${locale}/shop`}
      className="relative block w-full overflow-hidden aspect-[5/2] sm:aspect-[16/5] lg:aspect-[21/7]"
      onMouseEnter={() => { if (overlayRef.current) overlayRef.current.style.opacity = '1'; }}
      onMouseLeave={() => { if (overlayRef.current) overlayRef.current.style.opacity = '0'; }}
    >
      {/* Gradient fallback */}
      <div
        className="absolute inset-[-10%] showcase-hero-animate"
        style={{
          background: 'linear-gradient(135deg, #2B1711 0%, #1a2e1a 25%, #2e3a1a 50%, #1a2a2e 75%, #2B1711 100%)'
        }}
      />

      {/* Photo */}
      <Image
        src={SHOP_HERO_IMAGE}
        alt="Shop collection"
        className="absolute inset-0 h-full w-full object-cover"
        width={1200}
        height={800}
        loading="lazy"
        sizes="100vw"
        draggable={false}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20" />

      {/* Desktop: hover overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 z-[2] hidden items-center justify-center bg-black/30 md:flex"
        style={{opacity: 0, transition: 'opacity 500ms ease'}}
      >
        <div className="text-center px-6">
          <p className="font-accent text-[14px] uppercase tracking-[0.2em] text-[#F2E6D8]/70 lg:text-[16px]">
            {subtitle}
          </p>
          <h3 className="mt-3 font-display text-3xl uppercase tracking-[0.08em] text-[#F2E6D8] sm:text-4xl lg:text-5xl">
            {title}
          </h3>
        </div>
      </div>

      {/* Mobile: always visible */}
      <div className="absolute inset-x-0 bottom-0 z-[2] p-5 md:hidden">
        <p className="font-accent text-[12px] uppercase tracking-[0.2em] text-[#F2E6D8]/60">{subtitle}</p>
        <h3 className="mt-1 font-display text-xl uppercase tracking-[0.06em] text-[#F2E6D8]">{title}</h3>
      </div>
    </Link>
  );
}

/* ── Main component ── */

export default function HomeSections({
  locale,
  shopHeroTitle,
  shopHeroSubtitle,
  categoriesTitle,
  categories,
  popularTitle,
  popularItems,
}: HomeSectionsProps) {
  return (
    <div className="relative">
      {/* Mobile: fully opaque background — hides fixed shader bleed-through */}
      <div
        className="absolute inset-0 z-[0] pointer-events-none sm:hidden"
        style={{background: '#2B1711'}}
        aria-hidden="true"
      />
      {/* Desktop: smooth gradient fade from transparent shader → solid ink */}
      <div
        className="absolute inset-0 z-[0] pointer-events-none hidden sm:block"
        style={{
          background: 'linear-gradient(to bottom, rgba(43,23,17,0.45) 0%, rgba(43,23,17,0.55) 10%, rgba(43,23,17,0.6) 50%, rgba(43,23,17,0.8) 85%, #2B1711 100%)'
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-[2]">
        {/* ── Categories ── */}
        <section className="px-6 pt-12 pb-8 sm:px-10 sm:pt-16 sm:pb-10 lg:px-16">
          <BlurReveal>
            <SectionHeading title={categoriesTitle} />
          </BlurReveal>
          <ScrollRow>
            {categories.map((cat, i) => (
              <BlurReveal key={cat.key} mode="scroll" blur={10} translateY={16} className="flex-shrink-0 w-36 sm:w-56 lg:w-72">
                <Link
                  href={`/${locale}/shop?category=${cat.key}`}
                  className="group block hover:z-20 relative"
                >
                  <div
                    className={`aspect-[3/4] w-full overflow-hidden rounded-lg bg-gradient-to-br transition-transform duration-300 group-hover:scale-[1.04] ${
                      CATEGORY_GRADIENTS[cat.key] ?? 'from-[#4a4a4a] to-[#7a7a7a]'
                    }`}
                  >
                    {CATEGORY_IMAGES[cat.key] && (
                      <Image src={CATEGORY_IMAGES[cat.key]} alt={cat.label} className="h-full w-full object-cover" width={600} height={900} loading="lazy" sizes="(max-width: 640px) 144px, (max-width: 1024px) 224px, 288px" draggable={false} />
                    )}
                  </div>
                  <div className="mt-3 space-y-1">
                    <h3 className="text-sm font-medium text-[#F2E6D8] truncate sm:text-base">
                      {cat.label}
                    </h3>
                    <p className="text-[13px] tracking-[0.04em] sm:tracking-[0.1em] text-[#F2E6D8]/50 sm:text-[14px] line-clamp-2">
                      {cat.description}
                    </p>
                  </div>
                </Link>
              </BlurReveal>
            ))}
          </ScrollRow>
        </section>

        {/* ── Shop hero divider ── */}
        <BlurReveal duration={1000} blur={14}>
          <ShopHeroCard title={shopHeroTitle} subtitle={shopHeroSubtitle} locale={locale} />
        </BlurReveal>

        {/* ── Popular ── */}
        <section className="px-6 pt-12 pb-14 sm:px-10 sm:pt-16 sm:pb-20 lg:px-16">
          <BlurReveal>
            <SectionHeading title={popularTitle} />
          </BlurReveal>
          <ScrollRow>
            {popularItems.slice(0, 4).map((item, i) => (
              <BlurReveal key={item.slug} mode="scroll" blur={10} translateY={16} className="flex-shrink-0 w-36 sm:w-56 lg:w-72">
                <Link
                  href={`/${locale}/product/${item.slug}`}
                  className="group block hover:z-20 relative"
                >
                  <div
                    className={`aspect-[3/4] w-full overflow-hidden rounded-lg bg-gradient-to-br transition-transform duration-300 group-hover:scale-[1.04] ${
                      POPULAR_GRADIENTS[i] ?? 'from-[#4a4a4a] to-[#7a7a7a]'
                    }`}
                  >
                    {POPULAR_IMAGES[i] && (
                      <Image src={POPULAR_IMAGES[i]} alt={item.label} className="h-full w-full object-cover" width={600} height={900} loading="lazy" sizes="(max-width: 640px) 144px, (max-width: 1024px) 224px, 288px" draggable={false} />
                    )}
                  </div>
                  <div className="mt-3 space-y-1">
                    <h3 className="text-sm font-medium text-[#F2E6D8] truncate sm:text-base">
                      {item.label}
                    </h3>
                    <p className="text-[13px] tracking-[0.04em] sm:tracking-[0.1em] text-[#F2E6D8]/50 sm:text-[14px] line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </Link>
              </BlurReveal>
            ))}
          </ScrollRow>
        </section>
      </div>
    </div>
  );
}
