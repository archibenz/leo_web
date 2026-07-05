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
// dim + hover-brighten). Saving pops the heart once (reduced-motion kills it).
export function WhiteFavHeart({filled, size = 18, fillColor = SIGNAL}: {filled: boolean; size?: number; fillColor?: string}) {
  return (
    <span
      // Remount on save so the pop keyframe replays for every new save.
      key={filled ? 'saved' : 'idle'}
      aria-hidden="true"
      className={`inline-block ${filled ? 'wv-pop' : ''}`}
      style={{
        width: size,
        height: size,
        backgroundColor: filled ? fillColor : INK,
        ...maskStyle(filled ? '/icons/heart-filled.svg' : '/icons/heart.svg'),
      }}
    />
  );
}


// Bag glyph for the header: an outline while empty; with items it fills ink
// and carries a white count inside the body (the handle stays a stroke).
export function WhiteBagGlyph({count, size = 19}: {count: number; size?: number}) {
  const filled = count > 0;
  return (
    <span aria-hidden="true" className="relative inline-flex items-center justify-center" style={{width: size, height: size}}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="square">
        <path d="M8.2 8.2V7a3.8 3.8 0 0 1 7.6 0v1.2" />
        <path d="M4.8 8.2h14.4l1.1 12.2H3.7Z" fill={filled ? INK : 'none'} />
      </svg>
      {filled && (
        <span className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 text-[9px] font-medium leading-none text-white tabular-nums">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </span>
  );
}