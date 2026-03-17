'use client';

import {useEffect, useState, useCallback, useRef} from 'react';

interface ScrollHintProps {
  text: string;
  /** Hero section height as vh multiplier (e.g. 1.5 for 150vh) */
  heroVh?: number;
}

export default function ScrollHint({text, heroVh = 1.5}: ScrollHintProps) {
  const [show, setShow] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({opacity: 0});
  const rafRef = useRef(0);

  const HINT_BOTTOM = 40;
  const GAP_ABOVE_BANNER = 80;
  const FADE_DISTANCE = 400;

  const update = useCallback(() => {
    const scrollY = window.scrollY;
    const vh = window.innerHeight;
    const bannerTop = vh * heroVh;
    const stopAt = bannerTop - GAP_ABOVE_BANNER;
    const hintFixedY = scrollY + vh - HINT_BOTTOM;

    if (hintFixedY < stopAt) {
      setStyle({
        position: 'fixed',
        bottom: HINT_BOTTOM,
        opacity: 1,
      });
    } else {
      const overshoot = hintFixedY - stopAt;
      const fadeOpacity = Math.max(0, 1 - overshoot / FADE_DISTANCE);
      setStyle({
        position: 'absolute',
        top: stopAt,
        opacity: fadeOpacity,
      });
    }
  }, [heroVh]);

  const onScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(update);
  }, [update]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
      update();
    }, 2500);

    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onScroll, {passive: true});

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [onScroll, update]);

  if (!show) return null;

  return (
    <div
      className="left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3 pointer-events-none"
      style={{
        ...style,
        transition: 'opacity 0.15s ease-out',
      }}
    >
      <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">
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
