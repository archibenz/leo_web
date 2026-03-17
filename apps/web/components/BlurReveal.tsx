'use client';

import {useEffect, useRef, type ReactNode} from 'react';

interface BlurRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  blur?: number;
  translateY?: number;
  /** 'scroll' = progressive reveal on scroll, 'appear' = one-time timed reveal */
  mode?: 'scroll' | 'appear';
}

export default function BlurReveal({
  children,
  className = '',
  delay = 0,
  duration = 900,
  blur = 12,
  translateY = 24,
  mode,
}: BlurRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Auto-detect mode: if delay > 0, default to 'appear'; otherwise 'scroll'
  const resolvedMode = mode ?? (delay > 0 ? 'appear' : 'scroll');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.opacity = '1';
      el.style.filter = 'blur(0px)';
      el.style.transform = 'translateY(0)';
      return;
    }

    if (resolvedMode === 'appear') {
      // --- Original behavior: timed one-shot reveal ---
      el.style.opacity = '0';
      el.style.filter = `blur(${blur}px)`;
      el.style.transform = `translateY(${translateY}px)`;
      el.style.transition = `opacity ${duration}ms ease ${delay}ms, filter ${duration}ms ease ${delay}ms, transform ${duration}ms ease ${delay}ms`;
      el.style.willChange = 'opacity, filter, transform';

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            el.style.opacity = '1';
            el.style.filter = 'blur(0px)';
            el.style.transform = 'translateY(0)';
          } else {
            el.style.opacity = '0';
            el.style.filter = `blur(${blur}px)`;
            el.style.transform = `translateY(${translateY}px)`;
          }
        },
        {threshold: 0.15},
      );
      observer.observe(el);
      return () => observer.disconnect();
    }

    // --- Scroll-driven progressive reveal ---
    el.style.willChange = 'opacity, filter, transform';

    const update = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;

      // How far element has entered the viewport (0 = just entered, 1 = fully revealed)
      const revealDistance = vh * 0.45;
      const entered = vh - rect.top; // px from bottom of viewport
      const progress = Math.max(0, Math.min(1, entered / revealDistance));

      const currentOpacity = 0.15 + progress * 0.85;
      const currentBlur = blur * (1 - progress);
      const currentTranslateY = translateY * (1 - progress);

      el.style.opacity = String(currentOpacity);
      el.style.filter = `blur(${currentBlur.toFixed(1)}px)`;
      el.style.transform = `translateY(${currentTranslateY.toFixed(1)}px)`;
    };

    // Initial state
    update();

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    document.body.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onScroll, {passive: true});

    return () => {
      cancelAnimationFrame(raf);
      document.body.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [resolvedMode, blur, translateY, delay, duration]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
