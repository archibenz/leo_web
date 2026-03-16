'use client';

import {useRef} from 'react';
import Link from 'next/link';
import BlurReveal from './BlurReveal';
import {Carousel} from './ui/carousel';

interface ShowcaseItem {
  slug: string;
  label: string;
  description: string;
}

interface CollectionShowcaseProps {
  locale: string;
  heroTitle: string;
  heroSubtitle: string;
  heroSeason: string;
  items: ShowcaseItem[];
}

const HERO_IMAGE = 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1600&h=700&fit=crop&crop=top&q=80';

const ITEM_IMAGES = [
  'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=800&h=800&fit=crop&q=80',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&h=800&fit=crop&q=80',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&h=800&fit=crop&q=80',
  'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&h=800&fit=crop&q=80',
  'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=800&h=800&fit=crop&q=80',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=800&fit=crop&q=80',
  'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=800&h=800&fit=crop&q=80',
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&h=800&fit=crop&q=80',
];

/* ── Hero — muted red gradient, always animated, title on hover ── */

function HeroCard({title, subtitle, locale, season}: {title: string; subtitle: string; locale: string; season: string}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  return (
    <Link
      href={`/${locale}/shop?season=${season}`}
      className="relative block w-full overflow-hidden aspect-[4/3] sm:aspect-[16/7] lg:aspect-[21/9]"
      onMouseEnter={() => { if (overlayRef.current) overlayRef.current.style.opacity = '1'; }}
      onMouseLeave={() => { if (overlayRef.current) overlayRef.current.style.opacity = '0'; }}
    >
      {/* Background gradient fallback */}
      <div
        className="absolute inset-[-10%] showcase-hero-animate"
        style={{
          background: 'linear-gradient(135deg, #2B1711 0%, #3d1a18 20%, #5a1a15 45%, #3b1510 65%, #2B1711 100%)'
        }}
      />

      {/* Photo */}
      <img
        src={HERO_IMAGE}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        draggable="false"
      />

      {/* Top blend: soft fade into card */}
      <div
        className="absolute inset-x-0 top-0 z-[1] h-[30%] pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(43,23,17,0.5) 0%, rgba(43,23,17,0.2) 50%, transparent 100%)'
        }}
      />

      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      {/* Desktop: hover overlay with title */}
      <div
        ref={overlayRef}
        className="absolute inset-0 z-[2] hidden items-center justify-center bg-black/30 md:flex"
        style={{opacity: 0, transition: 'opacity 500ms ease'}}
      >
        <div className="text-center px-6">
          <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-[#F2E6D8]/70 sm:text-xs lg:text-sm">
            {subtitle}
          </p>
          <h3 className="mt-2 font-display text-2xl uppercase tracking-[0.08em] text-[#F2E6D8] sm:text-4xl lg:text-5xl">
            {title}
          </h3>
        </div>
      </div>

      {/* Mobile: always-visible label */}
      <div className="absolute inset-x-0 bottom-0 z-[2] p-4 md:hidden">
        <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-[#F2E6D8]/60">{subtitle}</p>
        <h3 className="mt-0.5 font-display text-lg uppercase tracking-[0.06em] text-[#F2E6D8]">{title}</h3>
      </div>
    </Link>
  );
}

/* ── Main showcase ── */

export default function CollectionShowcase({locale, heroTitle, heroSubtitle, heroSeason, items}: CollectionShowcaseProps) {
  const slides = items.map((item, i) => ({
    title: item.label,
    button: item.description,
    src: ITEM_IMAGES[i] ?? '',
    href: `/${locale}/product/${item.slug}`,
  }));

  return (
    <section className="relative">
      {/* Single smooth overlay gradient — no seams */}
      <div
        className="absolute inset-0 z-[0] pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(43,23,17,0.85) 0%, rgba(43,23,17,0.6) 15%, rgba(43,23,17,0.55) 50%, rgba(43,23,17,0.5) 85%, rgba(43,23,17,0.45) 100%)'
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-[2]">
        {/* Hero — full bleed */}
        <BlurReveal duration={1000} blur={14}>
          <HeroCard title={heroTitle} subtitle={heroSubtitle} locale={locale} season={heroSeason} />
        </BlurReveal>

        {/* 3D Carousel — product items */}
        <BlurReveal duration={1000} blur={12} translateY={30}>
          <div className="relative w-full py-10 sm:py-14 lg:py-16">
            <Carousel slides={slides} />
          </div>
        </BlurReveal>
      </div>
    </section>
  );
}
