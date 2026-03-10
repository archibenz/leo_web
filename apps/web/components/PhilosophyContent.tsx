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

          {/* Right: Editorial card */}
          <div
            ref={editorialRef}
            className="lg:sticky lg:top-32"
            style={{ opacity: 0, transform: 'translate3d(0, 40px, 0) scale(0.97)', willChange: 'opacity, transform' }}
          >
            <Link
              href={`/${locale}/about`}
              className="group relative block overflow-hidden rounded-2xl border border-[#F2E6D8]/8 p-6 pt-10 sm:p-8 sm:pt-12 transition-all duration-500 hover:border-[#D4A574]/25 hover:shadow-[0_24px_64px_rgba(0,0,0,0.4)]"
              style={{
                background: 'linear-gradient(160deg, rgba(30,18,13,0.8), rgba(43,23,17,0.55))',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
              }}
            >
              {/* Decorative large opening quote */}
              <span
                className="absolute -top-3 left-4 font-display text-[100px] leading-none text-[#D4A574]/[0.08] select-none pointer-events-none sm:left-5 sm:text-[120px]"
                aria-hidden="true"
              >
                &ldquo;
              </span>

              {/* Vertical accent line */}
              <div
                className="absolute left-0 top-8 bottom-8 w-[2px] bg-gradient-to-b from-transparent via-[#D4A574]/30 to-transparent group-hover:via-[#D4A574]/50 transition-all duration-500"
                aria-hidden="true"
              />

              {/* Pull quote */}
              <p className="relative mb-6 font-display text-[16px] italic leading-[1.65] text-[#F2E6D8]/85 sm:text-[18px] sm:mb-8">
                {editorialCard.quote}
              </p>

              {/* Thin divider */}
              <div className="mb-5 h-px w-12 bg-gradient-to-r from-[#D4A574]/30 to-transparent group-hover:w-20 transition-all duration-500 sm:mb-6" />

              {/* Label */}
              <p className="mb-2 font-display text-[10px] font-medium uppercase tracking-[0.2em] text-[#D4A574]/60 sm:mb-3">
                {editorialCard.label}
              </p>

              {/* Title */}
              <h3 className="mb-3 font-display text-[18px] uppercase tracking-[0.06em] text-[#F2E6D8] sm:text-xl sm:mb-4 group-hover:text-[#D4A574] transition-colors duration-300">
                {editorialCard.title}
              </h3>

              {/* Description */}
              <p className="mb-6 font-sans text-[13px] leading-[1.75] text-[#F2E6D8]/55 sm:text-[14px] sm:mb-8">
                {editorialCard.description}
              </p>

              {/* CTA */}
              <span className="inline-flex items-center gap-2.5 font-display text-[11px] font-medium uppercase tracking-[0.14em] text-[#D4A574]/70 group-hover:text-[#D4A574] transition-colors duration-300">
                {editorialCard.cta}
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                  className="transition-transform duration-400 group-hover:translate-x-1.5"
                >
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </span>
            </Link>

            {/* Quality marks */}
            <div
              ref={qualityRef}
              className="mt-6 flex flex-wrap gap-3 sm:mt-8"
              style={{ opacity: 0, transform: 'translate3d(0, 20px, 0)', willChange: 'opacity, transform' }}
            >
              {qualityMarks.map((mark, i) => (
                <span
                  key={i}
                  className="rounded-full border border-[#F2E6D8]/10 bg-[#F2E6D8]/[0.05] px-3.5 py-1.5 font-display text-[11px] uppercase tracking-[0.12em] text-[#F2E6D8]/55"
                >
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
