'use client';

import {useEffect, useRef} from 'react';

const BOUNCE_MAX = 80;
const FRICTION = 0.15;
const SPRING = 0.08;

export default function BounceScroll() {
  const offset = useRef(0);
  const velocity = useRef(0);
  const raf = useRef<number | null>(null);
  const active = useRef(false);

  useEffect(() => {
    const content = document.documentElement;

    function isAtTop() {
      return window.scrollY <= 0;
    }

    function isAtBottom() {
      return window.scrollY + window.innerHeight >= document.body.scrollHeight - 1;
    }

    function animate() {
      if (Math.abs(offset.current) < 0.5 && Math.abs(velocity.current) < 0.1) {
        offset.current = 0;
        velocity.current = 0;
        content.style.transform = '';
        active.current = false;
        raf.current = null;
        return;
      }

      velocity.current += -offset.current * SPRING;
      velocity.current *= 1 - FRICTION;
      offset.current += velocity.current;

      content.style.transform = `translateY(${offset.current}px)`;
      raf.current = requestAnimationFrame(animate);
    }

    function startAnimation() {
      if (!active.current) {
        active.current = true;
        if (raf.current) cancelAnimationFrame(raf.current);
        raf.current = requestAnimationFrame(animate);
      }
    }

    function onWheel(e: WheelEvent) {
      const delta = e.deltaY;

      if (isAtTop() && delta < 0) {
        e.preventDefault();
        offset.current = Math.max(offset.current + delta * 0.3, -BOUNCE_MAX);
        velocity.current = 0;
        content.style.transform = `translateY(${offset.current}px)`;
        startAnimation();
      } else if (isAtBottom() && delta > 0) {
        e.preventDefault();
        offset.current = Math.min(offset.current + delta * 0.3, BOUNCE_MAX);
        velocity.current = 0;
        content.style.transform = `translateY(${offset.current}px)`;
        startAnimation();
      } else if (active.current && Math.abs(offset.current) > 0.5) {
        startAnimation();
      }
    }

    window.addEventListener('wheel', onWheel, {passive: false});

    return () => {
      window.removeEventListener('wheel', onWheel);
      if (raf.current) cancelAnimationFrame(raf.current);
      content.style.transform = '';
    };
  }, []);

  return null;
}
