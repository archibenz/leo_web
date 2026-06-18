'use client';

import {useEffect, useRef, useState} from 'react';
import dynamic from 'next/dynamic';
import PosterGradient from './PosterGradient';

const HeroShaderBackground = dynamic(
  () => import('./HeroShaderBackground'),
  {ssr: false, loading: () => null}
);

export default function HeroShaderBackgroundClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [shaderReady, setShaderReady] = useState(false);

  // Defer the heavy three.js / @shadergradient chunk (~265KB) until the browser
  // is idle (post-LCP) or the first interaction. PosterGradient covers the hero
  // in the meantime, so there is no visual gap — this just keeps WebGL off the
  // critical path. Reduced-motion users never load the chunk at all.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cancelled = false;
    const reveal = () => {
      if (!cancelled) setShaderReady(true);
    };

    const hasIdle = typeof window.requestIdleCallback === 'function';
    const idleId = hasIdle ? window.requestIdleCallback(reveal, {timeout: 2500}) : 0;
    const timerId = hasIdle ? 0 : window.setTimeout(reveal, 1200);

    window.addEventListener('scroll', reveal, {once: true, passive: true});
    window.addEventListener('pointerdown', reveal, {once: true});

    return () => {
      cancelled = true;
      if (hasIdle) window.cancelIdleCallback(idleId);
      else window.clearTimeout(timerId);
      window.removeEventListener('scroll', reveal);
      window.removeEventListener('pointerdown', reveal);
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <PosterGradient animated />
      {shaderReady && <HeroShaderBackground isActive={isVisible} />}
    </div>
  );
}
