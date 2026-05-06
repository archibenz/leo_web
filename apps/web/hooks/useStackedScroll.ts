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
  // First sheet always fully visible — the lift animation is bypassed but the
  // ref/MotionValues are still produced so the consumer's hook order is stable.
  disabled?: boolean;
  // Scroll-driven shadow alpha (0 → 0.55) — gives the lift weight.
  shadow?: boolean;
  // Scroll-driven rotateX (4° → 0°) — paper-sheet "lifting off" feel. Only
  // visible if the parent has `perspective: <px>`.
  perspective?: boolean;
  // Scroll-driven 1px top-edge gradient opacity (1 → 0) — sells the paper edge.
  edgeHighlight?: boolean;
}

export interface UseStackedScrollResult<T extends HTMLElement> {
  ref: RefObject<T | null>;
  reduceMotion: boolean;
  disabled: boolean;
  clipPath: MotionValue<string>;
  shadowAlpha: MotionValue<number>;
  rotateX: MotionValue<number>;
  edgeOpacity: MotionValue<number>;
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
  const animatedShadow = useTransform(scrollYProgress, [0, 0.7], [0, 0.55]);
  const animatedRotate = useTransform(scrollYProgress, [0, 1], [4, 0]);
  const animatedEdge = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  // Stable static fallbacks. Order-locked so the hook is safe to call from any
  // component regardless of disabled state.
  const staticClip = useMotionValue('inset(0% 0% 0% 0%)');
  const staticShadow = useMotionValue(options.shadow ? 0.4 : 0);
  const staticZero = useMotionValue(0);

  return {
    ref,
    reduceMotion,
    disabled,
    clipPath: disabled ? staticClip : animatedClip,
    shadowAlpha: disabled
      ? staticShadow
      : options.shadow
        ? animatedShadow
        : staticZero,
    rotateX: disabled || !options.perspective ? staticZero : animatedRotate,
    edgeOpacity: disabled || !options.edgeHighlight ? staticZero : animatedEdge,
  };
}
