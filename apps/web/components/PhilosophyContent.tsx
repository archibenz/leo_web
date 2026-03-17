'use client';

import { useRef, useEffect, useState } from 'react';

interface PhilosophyContentProps {
  locale: string;
  title: string;
  eyebrow: string;
  text: string;
}

export default function PhilosophyContent({
  title,
  eyebrow,
  text,
}: PhilosophyContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReducedMotion(prefersReduced);
    if (prefersReduced) {
      setProgress(1);
      return;
    }

    let running = true;

    const tick = () => {
      if (!running || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const containerHeight = rect.height;
      const viewportHeight = window.innerHeight;

      const scrolled = -rect.top;
      const scrollRange = containerHeight - viewportHeight;

      if (scrollRange > 0) {
        const raw = scrolled / scrollRange;
        setProgress(Math.max(0, Math.min(1, raw)));
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
    return () => { running = false; };
  }, []);

  const words = text.split(' ');
  const totalWords = words.length;

  // === Title: golden shimmer sweep (0% → 20% scroll) ===
  // A golden light sweeps left-to-right across the text
  const titleProgress = Math.min(1, progress / 0.20);
  // Background position: starts at 200% (shimmer off-screen right), sweeps to -100% (off-screen left)
  // Then text stays revealed in gold
  const shimmerPos = reducedMotion ? -100 : 200 - titleProgress * 300;
  // Title opacity: fades in during first 8%
  const titleFadeIn = Math.min(1, progress / 0.08);
  const titleOpacity = reducedMotion ? 1 : titleFadeIn;

  // Decorative line: grows (8% - 22%)
  const lineProgress = Math.max(0, Math.min(1, (progress - 0.08) / 0.14));

  // Eyebrow: fades in (12% - 24%)
  const eyebrowProgress = Math.max(0, Math.min(1, (progress - 0.12) / 0.12));
  const eyebrowOpacity = reducedMotion ? 0.5 : eyebrowProgress * 0.5;

  // Words start revealing at 25% scroll, finish at 90%
  const wordsStart = 0.25;
  const wordsEnd = 0.90;

  return (
    <div ref={containerRef} className="relative" style={{ height: '250vh' }}>
      {/* Sticky centered container */}
      <div className="sticky top-0 flex h-screen items-center justify-center">
        {/* Spotlight glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[70vh] max-w-[1000px]"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(212,165,116,0.07) 0%, transparent 65%)',
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-4xl px-6 sm:px-10 lg:px-12">
          {/* Big title — golden shimmer sweep */}
          <h2
            className="mb-6 text-center font-display uppercase will-change-[opacity]"
            style={{
              fontSize: 'clamp(2.2rem, 5.5vw, 4.5rem)',
              lineHeight: 1.15,
              letterSpacing: '0.06em',
              opacity: titleOpacity,
              // Golden shimmer gradient sweeping across text
              background: `linear-gradient(
                90deg,
                rgba(242, 230, 216, 0.25) 0%,
                rgba(212, 165, 116, 0.9) ${shimmerPos - 15}%,
                rgba(255, 245, 230, 1) ${shimmerPos}%,
                rgba(212, 165, 116, 0.9) ${shimmerPos + 15}%,
                rgba(242, 230, 216, ${0.25 + titleProgress * 0.75}) 100%
              )`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {title}
          </h2>

          {/* Thin decorative line — grows from center */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <div
              className="will-change-[width,opacity]"
              style={{
                width: `${lineProgress * 120}px`,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(212,165,116,0.5), transparent)',
                opacity: lineProgress,
              }}
            />
          </div>

          {/* Eyebrow */}
          <p
            className="mb-8 text-center font-accent text-[13px] font-medium uppercase tracking-[0.25em] sm:mb-10 sm:text-[14px] will-change-[opacity]"
            style={{
              color: `rgba(212, 165, 116, ${eyebrowOpacity})`,
            }}
          >
            {eyebrow}
          </p>

          {/* Scroll-reveal text — per word with blur */}
          <p className="text-center font-accent italic text-[clamp(1.35rem,3.2vw,2.6rem)] font-light leading-[1.7] sm:leading-[1.75] flex flex-wrap justify-center gap-x-[0.3em] gap-y-0">
            {reducedMotion
              ? <span className="text-[#F2E6D8]">{text}</span>
              : words.map((word, i) => {
                  const wordStart = wordsStart + (i / totalWords) * (wordsEnd - wordsStart);
                  const wordEnd = wordsStart + ((i + 1) / totalWords) * (wordsEnd - wordsStart);
                  const raw = (progress - wordStart) / (wordEnd - wordStart);
                  const t = Math.max(0, Math.min(1, raw));

                  const opacity = 0.12 + t * 0.88;
                  const blur = (1 - t) * 8;
                  const translateY = (1 - t) * 6;

                  return (
                    <span
                      key={i}
                      className="inline-block text-[#F2E6D8] will-change-[filter,opacity,transform]"
                      style={{
                        opacity,
                        filter: `blur(${blur}px)`,
                        transform: `translateY(${translateY}px)`,
                      }}
                    >
                      {word}
                    </span>
                  );
                })}
          </p>
        </div>
      </div>
    </div>
  );
}
