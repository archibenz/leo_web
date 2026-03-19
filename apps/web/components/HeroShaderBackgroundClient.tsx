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
      <HeroShaderBackground isActive={isVisible} />
    </div>
  );
}
