'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

interface PhilosophyContentProps {
  locale: string;
  eyebrow: string;
  title: string;
  statements: string[];
  editorialCard: {
    quote: string;
    label: string;
    title: string;
    description: string;
    cta: string;
  };
  qualityMarks: string[];
}

/* ── SVG icons for value blocks ── */
const FabricIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.38 3.46L16 2 12 3.46 8 2 3.62 3.46a2 2 0 0 0-1.34 1.89v13.3a2 2 0 0 0 1.34 1.89L8 22l4-1.46L16 22l4.38-1.46a2 2 0 0 0 1.34-1.89V5.35a2 2 0 0 0-1.34-1.89z" />
    <line x1="8" y1="2" x2="8" y2="22" />
    <line x1="16" y1="2" x2="16" y2="22" />
  </svg>
);

const PrecisionIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const LimitedIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const valueIcons = [FabricIcon, PrecisionIcon, LimitedIcon];

export default function PhilosophyContent({
  locale,
  eyebrow,
  title,
  statements,
  editorialCard,
  qualityMarks,
}: PhilosophyContentProps) {
  const firstRef = useRef<HTMLSpanElement>(null);
  const secondRef = useRef<HTMLSpanElement>(null);
  const statementsRef = useRef<(HTMLDivElement | null)[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const titleContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let running = true;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      const showAll = (el: HTMLElement | null) => {
        if (!el) return;
        el.style.opacity = '1';
        el.style.transform = 'none';
      };
      [eyebrowRef, titleContainerRef, gridRef].forEach(r => showAll(r.current));
      statementsRef.current.forEach(el => showAll(el));
    }

    const tick = () => {
      if (!running) return;
      const vh = window.innerHeight;

      // Eyebrow
      if (eyebrowRef.current && !prefersReducedMotion) {
        const r = eyebrowRef.current.getBoundingClientRect();
        const center = r.top + r.height / 2;
        const raw = (vh * 0.9 - center) / (vh * 0.9 - vh * 0.6);
        const p = Math.max(0, Math.min(1, raw));
        eyebrowRef.current.style.opacity = String(p);
        eyebrowRef.current.style.transform = `translate3d(0, ${12 * (1 - p)}px, 0)`;
      }

      // Title spread
      if (firstRef.current && secondRef.current) {
        const el = firstRef.current.parentElement;
        if (el) {
          const rect = el.getBoundingClientRect();
          const titleCenter = rect.top + rect.height / 2;
          const start = vh * 0.8;
          const end = vh * 0.15;
          const raw = (start - titleCenter) / (start - end);
          const progress = Math.max(0, Math.min(1, raw));
          const spread = progress * 8;
          firstRef.current.style.transform = `translateX(-${spread}vw)`;
          secondRef.current.style.transform = `translateX(${spread}vw)`;
          if (!prefersReducedMotion && titleContainerRef.current) {
            const titleRaw = (vh * 0.85 - titleCenter) / (vh * 0.85 - vh * 0.55);
            const titleP = Math.max(0, Math.min(1, titleRaw));
            titleContainerRef.current.style.opacity = String(titleP);
          }
        }
      }

      // Content reveal
      if (!prefersReducedMotion) {
        statementsRef.current.forEach((el, i) => {
          if (!el) return;
          const r = el.getBoundingClientRect();
          const center = r.top + r.height / 2;
          const stagger = i * 0.05;
          const raw = (vh * (0.92 - stagger) - center) / (vh * (0.92 - stagger) - vh * (0.5 - stagger));
          const p = Math.max(0, Math.min(1, raw));
          const eased = 1 - Math.pow(1 - p, 3);
          el.style.opacity = String(eased);
          el.style.transform = `translate3d(0, ${25 * (1 - eased)}px, 0)`;
        });

        if (gridRef.current) {
          const r = gridRef.current.getBoundingClientRect();
          const center = r.top + r.height / 2;
          const raw = (vh * 0.95 - center) / (vh * 0.95 - vh * 0.5);
          const p = Math.max(0, Math.min(1, raw));
          const eased = 1 - Math.pow(1 - p, 3);
          gridRef.current.style.opacity = String(eased);
          gridRef.current.style.transform = `translate3d(0, ${30 * (1 - eased)}px, 0)`;
        }
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
    return () => { running = false; };
  }, []);

  const words = title.split(' ');
  const firstWord = words[0];
  const restWords = words.slice(1).join(' ');

  return (
    <div className="relative min-h-[60vh] px-5 py-16 sm:min-h-screen sm:px-6 sm:py-24 lg:px-8">
      {/* Dark backdrop for contrast */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 100% 80% at 50% 40%, rgba(17,10,7,0.85) 0%, rgba(17,10,7,0.5) 60%, transparent 100%)' }}
        aria-hidden="true"
      />
      {/* Spotlight glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[60vh] max-w-[900px]"
        style={{ background: 'radial-gradient(ellipse at center, rgba(212,165,116,0.08) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-5xl">
        {/* Eyebrow */}
        <p
          ref={eyebrowRef}
          className="mb-10 text-center font-display text-[11px] font-medium uppercase tracking-[0.25em] text-[#F2E6D8]/60 sm:mb-14 sm:text-[12px]"
          style={{ opacity: 0, transform: 'translate3d(0, 12px, 0)', willChange: 'opacity, transform' }}
        >
          {eyebrow}
        </p>

        {/* Animated split title */}
        <div
          ref={titleContainerRef}
          className="mb-14 flex flex-col items-center gap-1 sm:mb-20"
          style={{ opacity: 0, willChange: 'opacity' }}
        >
          <span
            ref={firstRef}
            className="block font-display text-[clamp(2rem,5vw,3.8rem)] uppercase tracking-[0.06em] text-[#F2E6D8] leading-[1.1] will-change-transform"
          >
            {firstWord}
          </span>
          <span
            ref={secondRef}
            className="block font-display text-[clamp(2rem,5vw,3.8rem)] uppercase tracking-[0.06em] text-[#F2E6D8] leading-[1.1] will-change-transform"
          >
            {restWords}
          </span>
        </div>

        {/* Centered statements — full width, no columns */}
        <div className="mx-auto max-w-3xl text-center space-y-12 sm:space-y-14 mb-16 sm:mb-20">
          {statements.map((statement, index) => (
            <div
              key={index}
              ref={(el) => { statementsRef.current[index] = el; }}
              style={{ opacity: 0, transform: 'translate3d(0, 25px, 0)', willChange: 'opacity, transform' }}
            >
              <p className="font-display italic text-[18px] font-light leading-[1.8] tracking-[0.005em] text-[#F2E6D8] sm:text-[20px] sm:leading-[1.85] lg:text-[22px]">
                {statement}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom grid: 3 value blocks + CTA */}
        <div
          ref={gridRef}
          className="mx-auto max-w-4xl"
          style={{ opacity: 0, transform: 'translate3d(0, 30px, 0)', willChange: 'opacity, transform' }}
        >
          {/* Value blocks */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5 mb-8">
            {qualityMarks.map((mark, i) => {
              const Icon = valueIcons[i] || PrecisionIcon;
              return (
                <div
                  key={i}
                  className="group relative flex items-center gap-4 rounded-2xl px-5 py-5 sm:flex-col sm:items-center sm:gap-3 sm:px-4 sm:py-6 sm:text-center transition-all duration-500"
                  style={{
                    background: 'linear-gradient(145deg, rgba(212,165,116,0.10) 0%, rgba(212,165,116,0.04) 100%)',
                    border: '1px solid rgba(212,165,116,0.25)',
                  }}
                >
                  {/* Hover glow */}
                  <div
                    className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{ background: 'radial-gradient(circle at 50% 50%, rgba(212,165,116,0.06) 0%, transparent 70%)' }}
                  />

                  <div className="relative flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-xl text-[#D4A574] transition-colors duration-300 group-hover:text-[#D4A574] sm:h-11 sm:w-11"
                    style={{ background: 'rgba(212,165,116,0.12)' }}
                  >
                    <Icon />
                  </div>
                  <span className="relative font-display text-[12px] font-medium uppercase tracking-[0.1em] text-[#F2E6D8]/90 transition-colors duration-300 group-hover:text-[#F2E6D8] sm:text-[11px]">
                    {mark}
                  </span>
                </div>
              );
            })}
          </div>

          {/* CTA row */}
          <div className="flex items-center justify-between gap-4 pt-4">
            {/* Quote */}
            <p className="hidden sm:block font-display text-[14px] italic font-light text-[#F2E6D8]/80 max-w-md">
              {editorialCard.quote}
            </p>

            {/* Button */}
            <Link
              href={`/${locale}/about`}
              className="group inline-flex items-center gap-3 rounded-full px-6 py-3 transition-all duration-400 hover:gap-4"
              style={{
                background: 'linear-gradient(135deg, rgba(212,165,116,0.18) 0%, rgba(212,165,116,0.08) 100%)',
                border: '1px solid rgba(212,165,116,0.35)',
              }}
            >
              <span className="font-display text-[11px] font-medium uppercase tracking-[0.12em] text-[#D4A574] group-hover:text-[#D4A574] transition-colors duration-300">
                {editorialCard.cta}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                className="text-[#D4A574] transition-all duration-300 group-hover:translate-x-0.5"
              >
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
