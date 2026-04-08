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
  // Gate: start as "not yet mounted on desktop". SSR and first client render show
  // a solid background. Only after useEffect runs (post-mount) do we upgrade to
  // the shader stack, and only if the viewport is desktop-sized.
  // This avoids a first-paint flash where mobile users would briefly see the
  // multi-color PosterGradient/shader before JS detects the mobile breakpoint.
  const [desktopReady, setDesktopReady] = useState(false);

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 640px)');
    const updateDesktop = (matches: boolean) => setDesktopReady(!matches);
    updateDesktop(mobileQuery.matches);
    const handleMobileChange = (e: MediaQueryListEvent) => updateDesktop(e.matches);
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

  // Default (SSR + mobile): solid background only. No WebGL shader, no PosterGradient,
  // no bleed-through. On mobile this stays as the final state (saves GPU and battery).
  // On desktop this is a single-frame flash before the shader stack mounts — unnoticeable
  // since it happens after hydration.
  if (!desktopReady) {
    return <div className="absolute inset-0 bg-[#2B1711]" />;
  }

  return (
    <div ref={containerRef} className="absolute inset-0">
      <PosterGradient animated />
      <HeroShaderBackground isActive={isVisible} />
    </div>
  );
}
