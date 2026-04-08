'use client';

import {useEffect, useRef, useState} from 'react';
import dynamic from 'next/dynamic';
import PosterGradient from './PosterGradient';

const HeroShaderBackground = dynamic(
  () => import('./HeroShaderBackground'),
  {ssr: false, loading: () => <div className="fixed inset-0 bg-[#2b1711]" />}
);

export default function HeroShaderBackgroundClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  // WebGL shader only runs on desktop post-mount. On mobile we keep PosterGradient
  // alone — it's a pure CSS gradient so no GPU/battery cost — and skip the heavy
  // WebGL waterPlane shader entirely. PosterGradient is rendered in SSR and its
  // final client state on mobile matches exactly, so there is no hydration flash.
  // The "разноцветная плашка" bleed between home sections is handled by the mobile
  // solid overlays in page.tsx, CollectionShowcase.tsx, and HomeSections.tsx.
  const [webglEnabled, setWebglEnabled] = useState(false);

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 640px)');
    const updateWebgl = (matches: boolean) => setWebglEnabled(!matches);
    updateWebgl(mobileQuery.matches);
    const handleMobileChange = (e: MediaQueryListEvent) => updateWebgl(e.matches);
    mobileQuery.addEventListener('change', handleMobileChange);

    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mobileQuery.removeEventListener('change', handleMobileChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <PosterGradient animated />
      {webglEnabled && <HeroShaderBackground isActive={isVisible} />}
    </div>
  );
}
