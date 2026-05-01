'use client';

import {motion, type MotionValue, useTransform} from 'framer-motion';

interface DotsIndicatorProps {
  total: number;
  segments: number;
  scrollProgress: MotionValue<number>;
}

export default function DotsIndicator({total, segments, scrollProgress}: DotsIndicatorProps) {
  return (
    <div
      className="pointer-events-none fixed left-3 top-1/2 z-[400] flex -translate-y-1/2 flex-col items-center gap-2"
      style={{paddingLeft: 'env(safe-area-inset-left)'}}
      aria-hidden="true"
    >
      {Array.from({length: total}, (_, i) => (
        <Dot key={i} index={i} segments={segments} scrollProgress={scrollProgress} />
      ))}
    </div>
  );
}

interface DotProps {
  index: number;
  segments: number;
  scrollProgress: MotionValue<number>;
}

function Dot({index, segments, scrollProgress}: DotProps) {
  const center = index / segments;
  const half = 1 / (segments * 2);
  const opacity = useTransform(
    scrollProgress,
    [Math.max(0, center - half), center, Math.min(1, center + half)],
    [0.35, 1, 0.35],
    {clamp: true},
  );
  const scale = useTransform(
    scrollProgress,
    [Math.max(0, center - half), center, Math.min(1, center + half)],
    [1, 1.7, 1],
    {clamp: true},
  );
  return (
    <motion.span
      style={{opacity, scale}}
      className="block h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_4px_rgba(0,0,0,0.4)]"
    />
  );
}
