'use client';

import {useState, type ReactNode} from 'react';

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
  const [hovering, setHovering] = useState(false);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={
        className ??
        'relative flex h-14 w-full items-center justify-center gap-2.5 overflow-hidden rounded-full border-2 border-[#CB11AB] bg-[#CB11AB]/[0.08] text-base font-medium text-white active:scale-[0.98]'
      }
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <span
          className="block aspect-square will-change-transform"
          style={{
            width: '220%',
            position: 'relative',
            background: '#CB11AB',
            transform: `rotate(-45deg) translateY(${hovering ? '0%' : '101%'})`,
            transition: 'transform 800ms cubic-bezier(0.65, 0.05, 0.35, 1)',
          }}
        >
          {/* Front wave — leading edge of fill (top in local frame) */}
          <svg
            className="pointer-events-none absolute"
            style={{
              left: '-50%',
              top: '-9px',
              width: '200%',
              height: '12px',
              animation: 'wb-ripple 2.6s linear infinite',
            }}
            viewBox="0 0 120 12"
            preserveAspectRatio="none"
          >
            <path
              d="M0,12 L0,6 Q5,-3 10,6 Q15,15 20,6 Q25,-3 30,6 Q35,15 40,6 Q45,-3 50,6 Q55,15 60,6 Q65,-3 70,6 Q75,15 80,6 Q85,-3 90,6 Q95,15 100,6 Q105,-3 110,6 Q115,15 120,6 L120,12 Z"
              fill="#CB11AB"
            />
          </svg>
          {/* Soft echo wave (slightly offset, subtler) — adds depth */}
          <svg
            className="pointer-events-none absolute opacity-70"
            style={{
              left: '-50%',
              top: '-5px',
              width: '200%',
              height: '8px',
              animation: 'wb-ripple-back 3.4s linear infinite',
            }}
            viewBox="0 0 120 8"
            preserveAspectRatio="none"
          >
            <path
              d="M0,8 L0,4 Q4,-2 8,4 Q12,10 16,4 Q20,-2 24,4 Q28,10 32,4 Q36,-2 40,4 Q44,10 48,4 Q52,-2 56,4 Q60,10 64,4 Q68,-2 72,4 Q76,10 80,4 Q84,-2 88,4 Q92,10 96,4 Q100,-2 104,4 Q108,10 112,4 Q116,-2 120,4 L120,8 Z"
              fill="#CB11AB"
            />
          </svg>
        </span>
      </span>
      <span className="relative z-10">{children}</span>
    </a>
  );
}
