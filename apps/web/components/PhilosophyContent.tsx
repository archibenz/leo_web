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
  const [isClient, setIsClient] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setIsClient(true);
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

      // How far the container has scrolled past the viewport top
      // rect.top starts positive (below viewport), goes negative (above viewport)
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

          {/* Scroll-reveal text */}
          <p className="text-center font-accent italic text-[clamp(1.35rem,3.2vw,2.6rem)] font-light leading-[1.7] sm:leading-[1.75]">
            {!isClient || reducedMotion
              ? (
                  <span className="text-[#F2E6D8]">{text}</span>
                )
              : (
                  words.map((word, i) => {
                    const wordProgress = i / words.length;
                    const wordEnd = (i + 1) / words.length;
                    // Each word fades from 0 to 1 over its range
                    const raw = (progress - wordProgress) / (wordEnd - wordProgress);
                    const opacity = Math.max(0, Math.min(1, raw));
                    // Dim base (0.15) + revealed portion
                    const finalOpacity = 0.15 + opacity * 0.85;

                    return (
                      <span
                        key={`${word}-${i}`}
                        className="mx-[0.14em] my-[0.08em] inline-block transition-none"
                        style={{
                          color: `rgba(242, 230, 216, ${finalOpacity})`,
                        }}
                      >
                        {word}
                      </span>
                    );
                  })
                )}
          </p>
        </div>
      </div>
    </div>
  );
}
