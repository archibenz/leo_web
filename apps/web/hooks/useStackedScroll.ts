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
  // Scroll-driven shadow alpha (0.18 → 0.6) — gives the lift weight. Baseline
  // 0.18 keeps the sheet looking grounded even before the user scrolls,
  // matching the static shadow that the previous SlideLayer used.
  shadow?: boolean;
  // Scroll-driven rotateX (10° → 0°) — paper-sheet "lifting off" feel. Only
  // visible if the parent has `perspective: <px>`.
  perspective?: boolean;
  // Scroll-driven 1px top-edge gradient opacity (1 → 0) — sells the paper edge.
  edgeHighlight?: boolean;
  // Scroll-driven scale (0.96 → 1) — sells the "rising" feel as the sheet
  // lifts off the stack. Subtle — never goes below 0.96 to avoid clipping.
  scale?: boolean;
}

export interface UseStackedScrollResult<T extends HTMLElement> {
  ref: RefObject<T | null>;
  reduceMotion: boolean;
  disabled: boolean;
  clipPath: MotionValue<string>;
  shadowAlpha: MotionValue<number>;
  rotateX: MotionValue<number>;
  edgeOpacity: MotionValue<number>;
  scale: MotionValue<number>;
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
  const animatedShadow = useTransform(scrollYProgress, [0, 0.7], [0.18, 0.6]);
  const animatedRotate = useTransform(scrollYProgress, [0, 1], [10, 0]);
  const animatedEdge = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const animatedScale = useTransform(scrollYProgress, [0, 1], [0.96, 1]);

  // Stable static fallbacks. Order-locked so the hook is safe to call from any
  // component regardless of disabled state.
  const staticClip = useMotionValue('inset(0% 0% 0% 0%)');
  const staticShadow = useMotionValue(options.shadow ? 0.45 : 0);
  const staticZero = useMotionValue(0);
  const staticOne = useMotionValue(1);

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
    scale: disabled || !options.scale ? staticOne : animatedScale,
  };
}
