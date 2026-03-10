'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface BlurRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  blur?: number;
  translateY?: number;
}

export default function BlurReveal({
  children,
  className = '',
  delay = 0,
  duration = 900,
  blur = 12,
  translateY = 24,
}: BlurRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      { threshold: 0.15 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        filter: visible ? 'blur(0px)' : `blur(${blur}px)`,
        transform: visible ? 'translateY(0)' : `translateY(${translateY}px)`,
        transition: `opacity ${duration}ms ease ${delay}ms, filter ${duration}ms ease ${delay}ms, transform ${duration}ms ease ${delay}ms`,
        willChange: 'opacity, filter, transform',
      }}
    >
      {children}
    </div>
  );
}
