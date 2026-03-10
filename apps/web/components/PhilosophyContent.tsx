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
  const editorialRef = useRef<HTMLDivElement>(null);
  const qualityRef = useRef<HTMLDivElement>(null);
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
      [eyebrowRef, titleContainerRef, editorialRef, qualityRef].forEach(r => showAll(r.current));
      statementsRef.current.forEach(el => showAll(el));
    }

    const tick = () => {
      if (!running) return;
      const vh = window.innerHeight;

      // --- Eyebrow fade ---
      if (eyebrowRef.current && !prefersReducedMotion) {
        const r = eyebrowRef.current.getBoundingClientRect();
        const center = r.top + r.height / 2;
        const raw = (vh * 0.9 - center) / (vh * 0.9 - vh * 0.6);
        const p = Math.max(0, Math.min(1, raw));
        eyebrowRef.current.style.opacity = String(p);
        eyebrowRef.current.style.transform = `translate3d(0, ${12 * (1 - p)}px, 0)`;
      }

      // --- Title spread animation ---
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

      // --- Content reveal ---
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

        // Editorial card
        if (editorialRef.current) {
          const r = editorialRef.current.getBoundingClientRect();
          const center = r.top + r.height / 2;
          const raw = (vh * 0.95 - center) / (vh * 0.95 - vh * 0.45);
          const p = Math.max(0, Math.min(1, raw));
          const eased = 1 - Math.pow(1 - p, 3);
          editorialRef.current.style.opacity = String(eased);
          editorialRef.current.style.transform = `translate3d(0, ${40 * (1 - eased)}px, 0) scale(${0.97 + 0.03 * eased})`;
        }

        // Quality marks
        if (qualityRef.current) {
          const r = qualityRef.current.getBoundingClientRect();
          const center = r.top + r.height / 2;
          const raw = (vh * 0.95 - center) / (vh * 0.95 - vh * 0.50);
          const p = Math.max(0, Math.min(1, raw));
          const eased = 1 - Math.pow(1 - p, 3);
          qualityRef.current.style.opacity = String(eased);
          qualityRef.current.style.transform = `translate3d(0, ${20 * (1 - eased)}px, 0)`;
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
      {/* Spotlight glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[60vh] max-w-[900px]"
        style={{ background: 'radial-gradient(ellipse at center, rgba(212,165,116,0.06) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl">
        {/* Eyebrow */}
        <p
          ref={eyebrowRef}
          className="mb-10 text-center font-display text-[11px] font-medium uppercase tracking-[0.25em] text-[#F2E6D8]/45 sm:mb-14 sm:text-[12px]"
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

        {/* Content */}
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-[1fr_340px] lg:gap-16 xl:gap-20 items-start">
          {/* Left: Statements as centered editorial blocks */}
          <div className="flex flex-col items-center gap-14 sm:gap-16 text-center max-w-xl mx-auto lg:mx-0 lg:max-w-none lg:items-start lg:text-left">
            {statements.map((statement, index) => (
              <div
                key={index}
                ref={(el) => { statementsRef.current[index] = el; }}
                className="relative"
                style={{
                  opacity: 0,
                  transform: 'translate3d(0, 25px, 0)',
                  willChange: 'opacity, transform',
                }}
              >
                {/* Decorative em-dash before text on desktop */}
                <div className="hidden lg:block absolute -left-8 top-[0.65em] w-4 h-px bg-[#D4A574]/30" />

                <p className="font-display italic text-[18px] font-light leading-[1.8] tracking-[0.005em] text-[#F2E6D8]/70 sm:text-[20px] sm:leading-[1.85] lg:text-[22px]">
                  {statement}
                </p>
              </div>
            ))}
          </div>

          {/* Right: Editorial panel */}
          <div
            ref={editorialRef}
            className="lg:sticky lg:top-32 flex flex-col gap-8"
            style={{ opacity: 0, transform: 'translate3d(0, 40px, 0) scale(0.97)', willChange: 'opacity, transform' }}
          >
            {/* Quote — standalone, no card */}
            <div className="relative pl-5 sm:pl-6">
              {/* Animated accent bar */}
              <div
                className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full"
                style={{
                  background: 'linear-gradient(180deg, #D4A574 0%, rgba(212,165,116,0.2) 100%)',
                }}
              />
              <p className="font-display text-[17px] italic font-light leading-[1.7] text-[#F2E6D8]/75 sm:text-[19px]">
                {editorialCard.quote}
              </p>
            </div>

            {/* Story link — modern horizontal card */}
            <Link
              href={`/${locale}/about`}
              className="group relative flex items-center gap-5 rounded-xl px-5 py-4 sm:px-6 sm:py-5 transition-all duration-500 hover:bg-[#D4A574]/[0.04]"
              style={{
                background: 'linear-gradient(135deg, rgba(212,165,116,0.03) 0%, transparent 100%)',
              }}
            >
              {/* Icon circle */}
              <div className="flex-shrink-0 flex items-center justify-center h-11 w-11 rounded-full border border-[#D4A574]/15 bg-[#D4A574]/[0.06] transition-all duration-500 group-hover:border-[#D4A574]/30 group-hover:bg-[#D4A574]/10 group-hover:scale-110">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4A574" strokeWidth="1.5" strokeLinecap="round" className="opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </div>

              {/* Text */}
              <div className="min-w-0">
                <p className="font-display text-[10px] font-medium uppercase tracking-[0.18em] text-[#D4A574]/50 mb-1 group-hover:text-[#D4A574]/70 transition-colors duration-300">
                  {editorialCard.label}
                </p>
                <h3 className="font-display text-[15px] font-semibold uppercase tracking-[0.04em] text-[#F2E6D8]/90 group-hover:text-[#D4A574] transition-colors duration-300 sm:text-[16px]">
                  {editorialCard.title}
                </h3>
                <p className="mt-1 text-[12px] leading-[1.6] text-[#F2E6D8]/40 group-hover:text-[#F2E6D8]/55 transition-colors duration-300 sm:text-[13px]">
                  {editorialCard.description}
                </p>
              </div>
            </Link>

            {/* Quality marks — horizontal line */}
            <div
              ref={qualityRef}
              className="flex flex-wrap gap-2.5 pt-2"
              style={{ opacity: 0, transform: 'translate3d(0, 20px, 0)', willChange: 'opacity, transform' }}
            >
              {qualityMarks.map((mark, i) => (
                <span
                  key={i}
                  className="px-3 py-1 font-display text-[10px] uppercase tracking-[0.14em] text-[#D4A574]/35"
                >
                  {i > 0 && <span className="mr-2.5 text-[#D4A574]/15">/</span>}
                  {mark}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
