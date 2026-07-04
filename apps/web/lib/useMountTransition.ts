import {useEffect, useRef, useState} from 'react';

/**
 * Keeps a portal/overlay mounted through its CSS exit transition and flips an
 * `entered` flag one frame after mount so an enter transition runs from its
 * "from" state. A framer-motion-free stand-in for <AnimatePresence> on the
 * account modals — the actual animation is pure CSS, so it stays
 * reduced-motion-safe via `motion-reduce:transition-none`.
 *
 * `mounted` is derived as `isOpen || exiting`, so a freshly-opened overlay is in
 * the DOM on the *same* render `isOpen` turns true — important so a focus trap
 * keyed on the open flag finds the node. On close the node lingers for
 * `durationMs` (which MUST match the CSS transition duration) so it can fade out
 * before it unmounts.
 *
 * Usage:
 *   const {mounted, entered} = useMountTransition(open, 200);
 *   if (!mounted) return null;
 *   <div className={`transition-opacity duration-200 ${entered ? 'opacity-100' : 'opacity-0'}`} />
 */
export function useMountTransition(
  isOpen: boolean,
  durationMs: number,
): {mounted: boolean; entered: boolean} {
  const [entered, setEntered] = useState(false);
  const [exiting, setExiting] = useState(false);
  // Tracks whether the overlay was actually open, so a component that mounts
  // already-closed doesn't briefly run the exit window on first render.
  const wasOpen = useRef(false);

  // The exit flag must flip during render, not in an effect: an effect lands a
  // commit late, and that one commit computes `mounted` as false — the node
  // unmounts for a frame, remounts already in its closed pose, and the exit
  // transition never plays.
  if (isOpen && !wasOpen.current) {
    wasOpen.current = true;
  }
  if (!isOpen && wasOpen.current) {
    wasOpen.current = false;
    setExiting(true);
  }

  useEffect(() => {
    if (isOpen) {
      setExiting(false);
      // Paint the "from" state first, then flip so the enter transition runs.
      const raf = window.requestAnimationFrame(() => setEntered(true));
      return () => window.cancelAnimationFrame(raf);
    }
    // Drop `entered` a commit after the close render: the node paints its open
    // pose once more, then transitions to the exit pose instead of snapping.
    setEntered(false);
    const timer = window.setTimeout(() => setExiting(false), durationMs);
    return () => window.clearTimeout(timer);
  }, [isOpen, durationMs]);

  return {mounted: isOpen || exiting, entered};
}
