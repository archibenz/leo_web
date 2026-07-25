'use client';

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

// Touch has no hover, so the tap itself plays the flood: fast fill first,
// then WB opens. Kept just under 400ms so the pause reads as feedback, not
// lag. Chromium keeps the tap's transient activation alive long enough for
// the deferred window.open; iOS Safari does not (popup blocked → null), so
// there the fallback navigates the current tab instead.
const TOUCH_FLOOD_NAV_DELAY_MS = 380;

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
  // Pointer events, not mouse events: on touch, mouseenter latched on the
  // first tap and mouseleave never fired, so the ripple kept running after
  // returning from the WB tab (WCAG 2.2.2). pointerleave also fires when a
  // transient touch pointer lifts, so the state always releases.
  const [hovering, setHovering] = useState(false);
  const [flooding, setFlooding] = useState(false);
  const lastPointerType = useRef<string | null>(null);
  const floodTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (floodTimer.current !== null) clearTimeout(floodTimer.current);
    },
    [],
  );

  const handlePointerDown = (e: PointerEvent<HTMLAnchorElement>) => {
    lastPointerType.current = e.pointerType;
  };

  // A tap that turns into a scroll/drag never clicks; without this reset a
  // later keyboard activation would read the stale 'touch' type.
  const handlePointerCancel = () => {
    lastPointerType.current = null;
  };

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const pointerType = lastPointerType.current;
    lastPointerType.current = null;

    if (flooding) {
      // Re-tap while the flood plays — the pending timer already opens WB.
      e.preventDefault();
      return;
    }
    if (pointerType !== 'touch') return;
    // Reduced-motion users get the native, undelayed navigation.
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    e.preventDefault();
    setFlooding(true);
    floodTimer.current = setTimeout(() => {
      floodTimer.current = null;
      setFlooding(false);
      // No 'noopener' feature here: with it window.open returns null even on
      // success, which would trigger the fallback and navigate twice. The
      // opener link is severed manually instead.
      const wbTab = window.open(href, '_blank');
      if (wbTab) wbTab.opener = null;
      else window.location.assign(href);
    }, TOUCH_FLOOD_NAV_DELAY_MS);
  };

  const filled = hovering || flooding;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
      onPointerDown={handlePointerDown}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
      className={
        className ??
        'relative flex h-14 w-full items-center justify-center gap-2.5 overflow-hidden rounded-full border-2 border-[#CB11AB] bg-[#CB11AB]/[0.08] text-base font-medium text-white active:scale-[0.98] motion-reduce:active:scale-100'
      }
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        {/* Rise transition + wave animations live in globals.css (.wb-*) so
            the prefers-reduced-motion block there can neutralise them; the
            wave classes apply only while hovering, so the resting (clipped)
            fill runs no animation at all. */}
        <span
          className={`wb-fill block aspect-square will-change-transform${flooding ? ' wb-fill-fast' : ''}`}
          style={{
            width: '220%',
            position: 'relative',
            background: '#CB11AB',
            transform: `rotate(-45deg) translateY(${filled ? '0%' : '101%'})`,
          }}
        >
          {/* Front wave — leading edge of fill (top in local frame) */}
          <svg
            className={`pointer-events-none absolute${filled ? ' wb-wave-front' : ''}`}
            style={{
              left: '-50%',
              top: '-9px',
              width: '200%',
              height: '12px',
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
            className={`pointer-events-none absolute opacity-70${filled ? ' wb-wave-back' : ''}`}
            style={{
              left: '-50%',
              top: '-5px',
              width: '200%',
              height: '8px',
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
      {/* During the tap-flood there is no :hover to flip the label, so the
          white colour is forced here; transition matches the fast fill. */}
      <span
        className={`relative z-10 transition-colors duration-300${flooding ? ' text-white' : ''}`}
      >
        {children}
      </span>
    </a>
  );
}
