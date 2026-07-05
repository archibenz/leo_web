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


// Bag glyph for the header: the house cart icon as ever; with items in the
// bag a small ink count sits inside the body.
export function WhiteBagGlyph({count, size = 18}: {count: number; size?: number}) {
  return (
    <span aria-hidden="true" className="relative inline-flex items-center justify-center" style={{width: size, height: size}}>
      <span style={{width: size, height: size, backgroundColor: INK, ...maskStyle('/icons/cart.svg')}} />
      {count > 0 && (
        <span className="absolute left-1/2 top-[60%] -translate-x-1/2 -translate-y-1/2 font-display text-[8px] font-medium leading-none tabular-nums" style={{color: INK}}>
          {count > 9 ? '9+' : count}
        </span>
      )}
    </span>
  );
}
