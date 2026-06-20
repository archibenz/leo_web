import {INK, SIGNAL} from './wv-palette';

// Shared White icon helpers. The brand heart/cart assets in /public/icons are
// filled with the gradient's cream (#F2E6D8) and would be invisible on white, so
// every White surface renders them as a CSS mask filled with a chosen colour
// (default: currentColor). One source of truth keeps the heart/cart shapes
// identical across header, card, PDP and empty states — and matching the
// gradient site, which uses the same /icons/*.svg assets.

function maskStyle(src: string) {
  return {
    WebkitMaskImage: `url(${src})`,
    maskImage: `url(${src})`,
    WebkitMaskRepeat: 'no-repeat' as const,
    maskRepeat: 'no-repeat' as const,
    WebkitMaskPosition: 'center' as const,
    maskPosition: 'center' as const,
    WebkitMaskSize: 'contain' as const,
    maskSize: 'contain' as const,
  };
}

export function MaskIcon({src, className, color}: {src: string; className?: string; color?: string}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block ${className ?? ''}`}
      style={{backgroundColor: color ?? 'currentColor', ...maskStyle(src)}}
    />
  );
}

// Favourite toggle heart: faceted brand outline (ink) when not saved, solid
// brand heart (signal) when saved — same two assets the gradient favourite uses.
// Opacity/dim is left to the calling button (which already owns the not-saved
// dim + hover-brighten). Static fill swap; nothing for reduced-motion to suppress.
export function WhiteFavHeart({filled, size = 18}: {filled: boolean; size?: number}) {
  return (
    <span
      aria-hidden="true"
      className="inline-block"
      style={{
        width: size,
        height: size,
        backgroundColor: filled ? SIGNAL : INK,
        ...maskStyle(filled ? '/icons/heart-filled.svg' : '/icons/heart.svg'),
      }}
    />
  );
}
