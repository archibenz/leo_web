'use client';

import {motion, useMotionTemplate} from 'framer-motion';
import {type ReactNode} from 'react';
import {useStackedScroll} from '../../../../hooks/useStackedScroll';

interface FooterSlideProps {
  zIndex: number;
  locale: string;
  children: ReactNode;
}

export default function FooterSlide({zIndex, locale, children}: FooterSlideProps) {
  const stack = useStackedScroll<HTMLElement>({
    shadow: true,
    edgeHighlight: true,
  });

  const boxShadow = useMotionTemplate`0 -22px 44px rgba(0, 0, 0, ${stack.shadowAlpha})`;

  const heroEyebrow = 'REINASLEO · ATELIER';
  const heroTitle = locale === 'ru' ? 'Это всё на сегодня' : "That's all for now";
  const heroSubtitle =
    locale === 'ru' ? 'Спасибо что были с нами' : 'Thank you for being here';

  return (
    <section
      ref={stack.ref}
      className="relative w-full"
      style={{
        minHeight: '100dvh',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
      }}
    >
      <motion.div
        className="sticky top-0 flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[#1a0f0a]"
        style={{
          zIndex,
          willChange: 'clip-path',
          clipPath: stack.clipPath,
          boxShadow,
        }}
      >
        {/* Brand-hero — заполняет верхнюю половину карточки */}
        <div className="flex flex-1 items-center justify-center px-6 py-12 text-center">
          <div className="max-w-[300px]">
            <span className="block font-accent text-[10px] uppercase tracking-[0.4em] text-[#D4A574]/70">
              {heroEyebrow}
            </span>
            <h2 className="mt-6 font-display text-[22px] uppercase leading-snug tracking-[0.22em] text-white">
              {heroTitle}
            </h2>
            <div aria-hidden="true" className="mx-auto mt-5 h-px w-12 bg-white/35" />
            <p className="mt-5 font-accent text-[11px] uppercase tracking-[0.28em] text-white/55">
              {heroSubtitle}
            </p>
          </div>
        </div>

        {/* Footer — нижняя часть карточки */}
        <div className="shrink-0 border-t border-[#D4A574]/10">{children}</div>

        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              'linear-gradient(to bottom, rgba(255,255,255,0.7) 0%, transparent 100%)',
            opacity: stack.edgeOpacity,
          }}
        />
      </motion.div>
    </section>
  );
}
