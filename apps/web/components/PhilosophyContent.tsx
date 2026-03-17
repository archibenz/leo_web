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

  // === Title: curtain mask reveal (0% → 18% scroll) ===
  // A horizontal line sweeps left-to-right, revealing text behind it
  const titleProgress = Math.min(1, progress / 0.18);
  // clip-path: the revealed portion grows from left (0%) to full width (100%)
  const revealPercent = reducedMotion ? 100 : titleProgress * 100;
  // Title opacity fades in quickly in first 5%
  const titleOpacity = reducedMotion ? 1 : Math.min(1, progress / 0.05);

  // The "curtain line" position — a thin bright line at the reveal edge
  const lineX = reducedMotion ? 110 : titleProgress * 110; // goes past 100 to exit

  // Decorative divider: grows (10% - 22%)
  const dividerProgress = Math.max(0, Math.min(1, (progress - 0.10) / 0.12));

  // Eyebrow: fades in (14% - 24%)
  const eyebrowProgress = Math.max(0, Math.min(1, (progress - 0.14) / 0.10));
  const eyebrowOpacity = reducedMotion ? 0.5 : eyebrowProgress * 0.5;

  // Words start revealing at 26% scroll, finish at 90%
  const wordsStart = 0.26;
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
          {/* Big title — curtain mask reveal */}
          <div className="relative mb-6">
            {/* Revealed text — clipped from left to right */}
            <h2
              className="text-center font-display uppercase text-[#F2E6D8]"
              style={{
                fontSize: 'clamp(2.2rem, 5.5vw, 4.5rem)',
                lineHeight: 1.15,
                letterSpacing: '0.06em',
                opacity: titleOpacity,
                clipPath: `inset(0 ${100 - revealPercent}% 0 0)`,
              }}
            >
              {title}
            </h2>

            {/* Ghost text underneath — dimmed, always visible */}
            <h2
              className="absolute inset-0 text-center font-display uppercase text-[#F2E6D8]/[0.08]"
              style={{
                fontSize: 'clamp(2.2rem, 5.5vw, 4.5rem)',
                lineHeight: 1.15,
                letterSpacing: '0.06em',
              }}
              aria-hidden="true"
            >
              {title}
            </h2>

            {/* Curtain line — the bright vertical sweep */}
            {!reducedMotion && titleProgress > 0 && titleProgress < 1 && (
              <div
                className="pointer-events-none absolute top-0 h-full"
                style={{
                  left: `${lineX}%`,
                  width: '2px',
                  background: 'linear-gradient(180deg, transparent 5%, rgba(212,165,116,0.7) 30%, rgba(255,245,230,0.9) 50%, rgba(212,165,116,0.7) 70%, transparent 95%)',
                  boxShadow: '0 0 12px 3px rgba(212,165,116,0.3), 0 0 30px 6px rgba(212,165,116,0.1)',
                  transform: 'translateX(-50%)',
                }}
              />
            )}
          </div>

          {/* Thin decorative divider — grows from center */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <div
              style={{
                width: `${dividerProgress * 120}px`,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(212,165,116,0.5), transparent)',
                opacity: dividerProgress,
              }}
            />
          </div>

          {/* Eyebrow */}
          <p
            className="mb-8 text-center font-accent text-[13px] font-medium uppercase tracking-[0.25em] sm:mb-10 sm:text-[14px]"
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
