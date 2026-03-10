'use client';

import {useEffect, useRef, useState} from 'react';
import {ShaderGradient, ShaderGradientCanvas} from '@shadergradient/react';

type HeroShaderBackgroundProps = {
  className?: string;
  isActive?: boolean;
};

export default function HeroShaderBackground({className = '', isActive = true}: HeroShaderBackgroundProps) {
  const webglChecked = useRef(false);
  const [webglSupported, setWebglSupported] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (webglChecked.current) return;
    webglChecked.current = true;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(motionQuery.matches);
    const handleMotionChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    motionQuery.addEventListener('change', handleMotionChange);

    const mobileQuery = window.matchMedia('(max-width: 768px)');
    setIsMobile(mobileQuery.matches);
    const handleMobileChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mobileQuery.addEventListener('change', handleMobileChange);

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setWebglSupported(false);
    } catch {
      setWebglSupported(false);
    }

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
      mobileQuery.removeEventListener('change', handleMobileChange);
    };
  }, []);

  // No WebGL or reduced motion — PosterGradient in parent handles fallback
  if (!webglSupported || prefersReducedMotion) return null;

  return (
    <div className={`absolute inset-0 ${className}`} style={{zIndex: 1}}>
      <ShaderGradientCanvas
        className="absolute inset-0"
        pixelDensity={1}
        fov={45}
        pointerEvents="none"
        style={{zIndex: 0}}
      >
        <ShaderGradient
          animate={isActive ? 'on' : 'off'}
          brightness={0.9}
          cAzimuthAngle={180}
          cDistance={2.8}
          cPolarAngle={80}
          cameraZoom={isMobile ? 6.5 : 9.1}
          color1="#2B1711"
          color2="#AA000D"
          color3="#212121"
          envPreset="city"
          grain="on"
          lightType="3d"
          positionX={0}
          positionY={0}
          positionZ={0}
          range="disabled"
          rangeEnd={40}
          rangeStart={0}
          reflection={isMobile ? 0 : 0.1}
          rotationX={50}
          rotationY={0}
          rotationZ={-60}
          shader="defaults"
          type="waterPlane"
          uAmplitude={0}
          uDensity={isMobile ? 1.5 : 1.2}
          uFrequency={0}
          uSpeed={isActive ? 0.25 : 0}
          uStrength={1.5}
          uTime={8}
          wireframe={false}
          {...({
            axesHelper: 'off',
            bgColor1: '#000000',
            bgColor2: '#000000',
            destination: 'onCanvas',
            embedMode: 'off',
            format: 'gif',
            frameRate: 10,
            gizmoHelper: 'hide'
          } as any)}
        />
      </ShaderGradientCanvas>

      {/* Subtle radial vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0, 0, 0, 0.12) 100%)'
        }}
        aria-hidden="true"
      />
    </div>
  );
}
