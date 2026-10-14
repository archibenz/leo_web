'use client';

import {useLayoutEffect, useRef, type HTMLAttributes} from 'react';
import {Slot} from '@radix-ui/react-slot';
import {cn} from '@/lib/utils';

type ScrollFadeProps = HTMLAttributes<HTMLElement> & {asChild?: boolean; fadeSize?: number};

export function ScrollFade({asChild = false, fadeSize = 24, children, className, ...props}: ScrollFadeProps) {
  const viewport = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    let frame = 0;
    const update = () => {
      const bottom = element.scrollHeight - element.clientHeight - element.scrollTop;
      element.style.setProperty('--wv-fade-top', `${Math.min(fadeSize, Math.max(0, element.scrollTop))}px`);
      element.style.setProperty('--wv-fade-bottom', `${Math.min(fadeSize, Math.max(0, bottom))}px`);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    element.addEventListener('scroll', schedule, {passive: true});
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener('scroll', schedule);
      observer.disconnect();
    };
  }, [children, fadeSize]);

  const Comp = asChild ? Slot : 'div';
  return <Comp ref={viewport} className={cn('wv-scroll-fade', className)} {...props}>{children}</Comp>;
}
