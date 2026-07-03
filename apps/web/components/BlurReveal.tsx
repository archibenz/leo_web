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
    // Reading getBoundingClientRect() and writing blur/opacity/transform on
    // every scroll frame is layout thrash, and the home page mounts ~13-15 of
    // these. So the rAF read/write loop is gated behind an IntersectionObserver:
    // it only runs while the element is near the viewport, and once the reveal
    // completes (progress === 1) everything tears down so a revealed element
    // costs nothing on later scrolls. The progressive-reveal math — and the
    // resulting blur→sharp + fade + translate — is unchanged.
    el.style.willChange = 'opacity, filter, transform';

    let raf = 0;
    let listening = false;
    let done = false;

    // Read current viewport position, paint the matching frame, and report how
    // far the reveal has progressed (0 = just entering, 1 = fully revealed).
    const applyProgress = (): number => {
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

      return progress;
    };

    const update = () => {
      if (applyProgress() >= 1) teardown();
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    const startListening = () => {
      if (listening || done) return;
      window.addEventListener('scroll', onScroll, {passive: true});
      window.addEventListener('resize', onScroll, {passive: true});
      listening = true;
      onScroll(); // catch up to the current scroll position
    };

    const stopListening = () => {
      if (!listening) return;
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      listening = false;
    };

    // Fully revealed: stop the loop, drop listeners, disconnect the observer,
    // and release the compositor hint. This element is finished for good.
    const teardown = () => {
      done = true;
      stopListening();
      observer.disconnect();
      el.style.willChange = '';
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (done) return;
        if (entry.isIntersecting) startListening();
        else stopListening();
      },
      // Wake a little before the element scrolls in so the reveal never lags.
      {rootMargin: '100px 0px'},
    );

    // Paint the initial frame for the element's current position; if it is
    // already past the reveal threshold (e.g. above the fold) we stop here and
    // never wire up scroll listeners at all.
    update();
    if (!done) observer.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      observer.disconnect();
    };
  }, [resolvedMode, blur, translateY, delay, duration]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
