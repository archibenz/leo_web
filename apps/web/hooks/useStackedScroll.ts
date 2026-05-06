'use client';

import {useRef, type RefObject} from 'react';
import {
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion';

interface UseStackedScrollOptions {
  // First sheet always fully visible — bypass animation but keep ref/MotionValues
  // stable so consumer hook order never shifts.
  disabled?: boolean;
  // Drive the box-shadow alpha from scroll progress instead of a static value,
  // so the lift edge fades in as the sheet enters the viewport.
  shadow?: boolean;
}

export interface UseStackedScrollResult<T extends HTMLElement> {
  ref: RefObject<T | null>;
  reduceMotion: boolean;
  clipPath: MotionValue<string>;
  shadowAlpha: MotionValue<number>;
}

export function useStackedScroll<T extends HTMLElement = HTMLElement>(
  options: UseStackedScrollOptions = {}
): UseStackedScrollResult<T> {
  const ref = useRef<T>(null);
  const reduceMotion = useReducedMotion() ?? false;
  const disabled = Boolean(options.disabled) || reduceMotion;

  const {scrollYProgress} = useScroll({
    target: ref,
    offset: ['start end', 'start start'],
  });

  const topInset = useTransform(scrollYProgress, [0, 1], ['100%', '0%']);
  const animatedClip = useMotionTemplate`inset(${topInset} 0% 0% 0%)`;
  const animatedShadow = useTransform(scrollYProgress, [0, 0.75], [0.2, 0.55]);

  const staticClip = useMotionValue('inset(0% 0% 0% 0%)');
  const staticShadow = useMotionValue(options.shadow ? 0.4 : 0);

  return {
    ref,
    reduceMotion,
    clipPath: disabled ? staticClip : animatedClip,
    shadowAlpha: disabled
      ? staticShadow
      : options.shadow
        ? animatedShadow
        : staticShadow,
  };
}
