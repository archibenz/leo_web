'use client';

import { useEffect, useRef } from 'react';

interface PhilosophyContentProps {
  locale: string;
  eyebrow: string;
  title: string;
  statements: string[];
}

export default function PhilosophyContent({
  locale,
  eyebrow,
  title,
  statements,
}: PhilosophyContentProps) {
  const firstRef = useRef<HTMLSpanElement>(null);
  const secondRef = useRef<HTMLSpanElement>(null);
  const statementsRef = useRef<(HTMLDivElement | null)[]>([]);
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
      [eyebrowRef, titleContainerRef].forEach(r => showAll(r.current));
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
        style={{ background: 'radial-gradient(ellipse at center, rgba(212,165,116,0.08) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-5xl">
        {/* Eyebrow */}
        <p
          ref={eyebrowRef}
          className="mb-10 text-center font-accent text-[11px] font-medium uppercase tracking-[0.25em] text-[#F2E6D8]/60 sm:mb-14 sm:text-[12px]"
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

        {/* Centered statements */}
        <div className="mx-auto max-w-3xl text-center space-y-12 sm:space-y-14">
          {statements.map((statement, index) => (
            <div
              key={index}
              ref={(el) => { statementsRef.current[index] = el; }}
              style={{ opacity: 0, transform: 'translate3d(0, 25px, 0)', willChange: 'opacity, transform' }}
            >
              <p className="font-accent italic text-[18px] font-light leading-[1.8] tracking-[0.005em] text-[#F2E6D8] sm:text-[20px] sm:leading-[1.85] lg:text-[22px]">
                {statement}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
