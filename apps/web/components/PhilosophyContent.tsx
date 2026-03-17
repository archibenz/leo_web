'use client';

import { useRef, useEffect, useState } from 'react';

interface PhilosophyContentProps {
  locale: string;
  eyebrow: string;
  text: string;
}

export default function PhilosophyContent({
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

  return (
    <div ref={containerRef} className="relative" style={{ height: '200vh' }}>
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
          {/* Eyebrow */}
          <p className="mb-8 text-center font-accent text-[13px] font-medium uppercase tracking-[0.25em] text-[#D4A574]/50 sm:mb-10 sm:text-[14px]">
            {eyebrow}
          </p>

          {/* Scroll-reveal text — per word with blur */}
          <p className="text-center font-accent italic text-[clamp(1.35rem,3.2vw,2.6rem)] font-light leading-[1.7] sm:leading-[1.75] flex flex-wrap justify-center gap-x-[0.3em] gap-y-0">
            {reducedMotion
              ? <span className="text-[#F2E6D8]">{text}</span>
              : words.map((word, i) => {
                  // Each word reveals over a portion of total scroll
                  const wordStart = i / totalWords;
                  const wordEnd = (i + 1) / totalWords;
                  // Compress to 85% so last words finish before end of scroll
                  const mappedProgress = progress / 0.85;
                  const raw = (mappedProgress - wordStart) / (wordEnd - wordStart);
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
