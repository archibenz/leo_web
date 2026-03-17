'use client';

import {useEffect, useRef} from 'react';

interface ScrollHintProps {
  text: string;
  heroVh?: number;
}

export default function ScrollHint({text, heroVh = 1.5}: ScrollHintProps) {
  const ref = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    const textEl = textRef.current;
    if (!el || !textEl) return;

    const DEFAULT_BOTTOM = 40;
    const GAP = 80;
    const FADE = 400;
    const TEXT_SHOW_SCROLL = 50; // px of scroll before text appears

    // Initially: container hidden, text hidden separately
    el.style.opacity = '0';
    el.style.bottom = `${DEFAULT_BOTTOM}px`;
    textEl.style.opacity = '0';
    textEl.style.transform = 'translateY(8px)';
    textEl.style.transition = 'opacity 0.6s ease, transform 0.6s ease';

    const update = () => {
      const scrollY = document.body.scrollTop || window.scrollY || 0;
      const vh = window.innerHeight;
      const bannerY = vh * heroVh;
      const needed = vh - (bannerY - scrollY) + GAP;
      const b = Math.max(DEFAULT_BOTTOM, needed);
      const push = Math.max(0, needed - DEFAULT_BOTTOM);
      const o = Math.max(0, 1 - push / FADE);

      el.style.bottom = `${b}px`;
      el.style.opacity = String(o);

      // Show text after scrolling a bit
      if (scrollY > TEXT_SHOW_SCROLL) {
        textEl.style.opacity = '1';
        textEl.style.transform = 'translateY(0)';
      } else {
        textEl.style.opacity = '0';
        textEl.style.transform = 'translateY(8px)';
      }
    };

    const timer = setTimeout(() => {
      el.style.opacity = '1';
      el.style.transition = 'opacity 0.8s ease-out';
      setTimeout(() => {
        el.style.transition = '';
        update();
      }, 900);
    }, 2500);

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    document.body.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onScroll, {passive: true});

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      document.body.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [heroVh]);

  return (
    <div
      ref={ref}
      className="fixed left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3 pointer-events-none"
    >
      <span
        ref={textRef}
        className="text-[10px] uppercase tracking-[0.3em] text-white/40"
      >
        {text}
      </span>
      <svg
        className="h-4 w-4 text-white/30 animate-scroll-bounce"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}
