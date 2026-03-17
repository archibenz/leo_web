'use client';

import {useEffect, useState, useCallback, useRef} from 'react';

interface ScrollHintProps {
  text: string;
  /** Hero section height as vh multiplier (e.g. 1.5 for 150vh) */
  heroVh?: number;
}

export default function ScrollHint({text, heroVh = 1.5}: ScrollHintProps) {
  const [show, setShow] = useState(false);
  const [bottom, setBottom] = useState(40);
  const [opacity, setOpacity] = useState(1);
  const rafRef = useRef(0);

  const DEFAULT_BOTTOM = 40;
  const GAP_ABOVE_BANNER = 80;
  const FADE_DISTANCE = 400;

  const update = useCallback(() => {
    const scrollY = document.body.scrollTop || window.scrollY || document.documentElement.scrollTop || 0;
    const vh = window.innerHeight;
    const bannerPageY = vh * heroVh;

    // How far the banner top is from viewport top
    const bannerViewportY = bannerPageY - scrollY;

    // How high bottom must be to keep hint 80px above the banner
    const neededBottom = vh - bannerViewportY + GAP_ABOVE_BANNER;
    const b = Math.max(DEFAULT_BOTTOM, neededBottom);
    setBottom(b);

    // Fade based on how much hint was pushed up from default position
    const pushAmount = Math.max(0, neededBottom - DEFAULT_BOTTOM);
    setOpacity(Math.max(0, 1 - pushAmount / FADE_DISTANCE));
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

    // body is the scroll container in this layout (overflow: auto on body)
    document.body.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onScroll, {passive: true});

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
      document.body.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [onScroll, update]);

  if (!show || opacity <= 0) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3 pointer-events-none"
      style={{
        bottom,
        opacity,
        transition: 'bottom 0.1s ease-out, opacity 0.15s ease-out',
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
