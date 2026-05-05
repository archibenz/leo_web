'use client';

import CollectionBadge from './CollectionBadge';
import type {MobileShopItem} from './types';

interface SlideOverlayProps {
  product: MobileShopItem;
  locale: string;
}

export default function SlideOverlay({product, locale}: SlideOverlayProps) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-40 bg-gradient-to-b from-black/55 via-black/20 to-transparent" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center px-6"
        style={{paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4.75rem)'}}
      >
        {product.badge ? (
          <div className="mb-2.5">
            <CollectionBadge variant={product.badge} locale={locale} />
          </div>
        ) : null}
        <h2 className="text-center font-display text-[20px] font-light leading-tight tracking-[0.04em] text-[var(--ink)] drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
          {product.title}
        </h2>
      </div>
    </>
  );
}
