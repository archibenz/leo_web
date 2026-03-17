'use client';

import { useRef, useEffect, useState, FC, ReactNode } from 'react';
import { motion, MotionValue, useScroll, useTransform } from 'framer-motion';

interface PhilosophyContentProps {
  locale: string;
  eyebrow: string;
  text: string;
}

interface WordProps {
  children: ReactNode;
  progress: MotionValue<number>;
  range: [number, number];
}

const Word: FC<WordProps> = ({ children, progress, range }) => {
  const opacity = useTransform(progress, range, [0, 1]);
  return (
    <span className="relative mx-[0.14em] my-[0.08em] inline-block">
      <span className="text-[#F2E6D8]/[0.15]">{children}</span>
      <motion.span
        style={{ opacity }}
        className="absolute inset-0 text-[#F2E6D8]"
      >
        {children}
      </motion.span>
    </span>
  );
};

export default function PhilosophyContent({
  eyebrow,
  text,
}: PhilosophyContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 0.6', 'end 0.4'],
  });

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
                    const start = i / words.length;
                    const end = start + 1 / words.length;
                    return (
                      <Word
                        key={`${word}-${i}`}
                        progress={scrollYProgress}
                        range={[start, end]}
                      >
                        {word}
                      </Word>
                    );
                  })
                )}
          </p>
        </div>
      </div>
    </div>
  );
}
