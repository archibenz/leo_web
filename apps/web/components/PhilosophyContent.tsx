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

  // Title animation: appears in first 0-15% of scroll, then stays
  const titleProgress = Math.min(1, progress / 0.15);
  const titleOpacity = reducedMotion ? 1 : 0.12 + titleProgress * 0.88;
  const titleBlur = reducedMotion ? 0 : (1 - titleProgress) * 12;
  const titleY = reducedMotion ? 0 : (1 - titleProgress) * 20;
  const titleScale = reducedMotion ? 1 : 0.95 + titleProgress * 0.05;
  // Title letter-spacing shrinks as it appears — cinematic feel
  const titleSpacing = reducedMotion ? 0.04 : 0.12 - titleProgress * 0.08;

  // Eyebrow: appears at 5-20%
  const eyebrowProgress = Math.max(0, Math.min(1, (progress - 0.05) / 0.15));
  const eyebrowOpacity = reducedMotion ? 0.5 : eyebrowProgress * 0.5;

  // Words start revealing at 20% scroll, finish at 90%
  const wordsStart = 0.20;
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
          {/* Big title — "Философия бренда" */}
          <h2
            className="mb-6 text-center font-display uppercase text-[#F2E6D8] will-change-[filter,opacity,transform]"
            style={{
              fontSize: 'clamp(2.2rem, 5.5vw, 4.5rem)',
              lineHeight: 1.15,
              letterSpacing: `${titleSpacing}em`,
              opacity: titleOpacity,
              filter: `blur(${titleBlur}px)`,
              transform: `translateY(${titleY}px) scale(${titleScale})`,
            }}
          >
            {title}
          </h2>

          {/* Thin decorative line */}
          <div
            className="mx-auto mb-6 sm:mb-8 will-change-[opacity,transform]"
            style={{
              width: `${titleProgress * 100}%`,
              maxWidth: '120px',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(212,165,116,0.4), transparent)',
              opacity: titleOpacity,
            }}
          />

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
