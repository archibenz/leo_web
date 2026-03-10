'use client';

import {useEffect, useRef, useState} from 'react';
import PosterGradient from './PosterGradient';

// Module-level cache: loaded once, reused across mounts
let ShaderComponent: typeof import('./HeroShaderBackground').default | null = null;

export default function HeroShaderBackgroundClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ShaderLoaded, setShaderLoaded] = useState<typeof ShaderComponent>(null);
  const [isVisible, setIsVisible] = useState(true);

  // Load shader module once and cache at module level
  useEffect(() => {
    if (!ShaderComponent) {
      import('./HeroShaderBackground').then((mod) => {
        ShaderComponent = mod.default;
        setShaderLoaded(() => mod.default);
      });
    } else {
      setShaderLoaded(() => ShaderComponent);
    }
  }, []);

  // Pause shader when tab is hidden (Page Visibility API)
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0">
      {/* PosterGradient: always mounted, never swapped — stable base layer */}
      <PosterGradient animated />

      {/* Shader overlay: mounted once loaded, never unmounted */}
      {ShaderLoaded && <ShaderLoaded isActive={isVisible} />}
    </div>
  );
}
