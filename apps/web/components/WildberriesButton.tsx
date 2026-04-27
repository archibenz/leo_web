'use client';

import {useCallback, useRef, useState, type ReactNode} from 'react';

type Dir = 'top' | 'right' | 'bottom' | 'left';

const OFFSET: Record<Dir, string> = {
  top: 'translate3d(0, -101%, 0)',
  right: 'translate3d(101%, 0, 0)',
  bottom: 'translate3d(0, 101%, 0)',
  left: 'translate3d(-101%, 0, 0)',
};

function getDirection(
  e: {clientX: number; clientY: number},
  el: HTMLElement
): Dir {
  const r = el.getBoundingClientRect();
  const w = r.width;
  const h = r.height;
  const x = (e.clientX - r.left - w / 2) * (w > h ? h / w : 1);
  const y = (e.clientY - r.top - h / 2) * (h > w ? w / h : 1);
  const d = (Math.round(Math.atan2(y, x) / (Math.PI / 2) + 4) % 4) as 0 | 1 | 2 | 3;
  return (['right', 'bottom', 'left', 'top'] as const)[d];
}

interface WildberriesButtonProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export default function WildberriesButton({
  href,
  children,
  className,
}: WildberriesButtonProps) {
  const [dir, setDir] = useState<Dir>('left');
  const [hovering, setHovering] = useState(false);
  const ref = useRef<HTMLAnchorElement | null>(null);

  const onEnter = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!ref.current) return;
    const next = getDirection(e, ref.current);
    setDir(next);
    requestAnimationFrame(() => setHovering(true));
  }, []);

  const onLeave = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!ref.current) return;
    setDir(getDirection(e, ref.current));
    setHovering(false);
  }, []);

  const isHorizontal = dir === 'left' || dir === 'right';
  const fillTransform = hovering ? 'translate3d(0,0,0)' : OFFSET[dir];

  return (
    <a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={
        className ??
        'relative flex h-14 w-full items-center justify-center gap-2.5 overflow-hidden rounded-full border-2 border-[#CB11AB] bg-[#CB11AB]/[0.08] text-base font-medium text-white active:scale-[0.98]'
      }
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 will-change-transform"
        style={{
          transform: fillTransform,
          transition: 'transform 650ms cubic-bezier(0.65, 0.05, 0.35, 1)',
        }}
      >
        <span className="absolute inset-0 bg-[#CB11AB]" />
        {isHorizontal ? (
          <svg
            aria-hidden
            className={`absolute top-0 h-full w-3 ${
              dir === 'left' ? 'left-full' : 'right-full -scale-x-100'
            }`}
            viewBox="0 0 12 60"
            preserveAspectRatio="none"
          >
            <path
              d="M0,0 Q14,4 6,8 Q-2,12 6,16 Q14,20 6,24 Q-2,28 6,32 Q14,36 6,40 Q-2,44 6,48 Q14,52 6,56 Q-2,60 6,60 L0,60 Z"
              fill="#CB11AB"
            />
          </svg>
        ) : (
          <svg
            aria-hidden
            className={`absolute left-0 h-3 w-full ${
              dir === 'top' ? 'top-full' : 'bottom-full -scale-y-100'
            }`}
            viewBox="0 0 60 12"
            preserveAspectRatio="none"
          >
            <path
              d="M0,0 Q4,14 8,6 Q12,-2 16,6 Q20,14 24,6 Q28,-2 32,6 Q36,14 40,6 Q44,-2 48,6 Q52,14 56,6 Q60,-2 60,6 L60,0 Z"
              fill="#CB11AB"
            />
          </svg>
        )}
      </span>
      <span className="relative z-10">{children}</span>
    </a>
  );
}
