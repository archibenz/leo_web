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
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-48 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
      <div
        className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center px-6"
        style={{bottom: 'calc(env(safe-area-inset-bottom, 0px) + 3.25rem)'}}
      >
        {product.badge ? (
          <div className="mb-2.5">
            <CollectionBadge variant={product.badge} locale={locale} />
          </div>
        ) : null}
        <h2 className="text-center font-display text-[14px] uppercase leading-tight tracking-[0.18em] text-ink drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
          {product.title}
        </h2>
        <div aria-hidden="true" className="mt-2 h-px w-12 bg-ink/55" />
      </div>
    </>
  );
}
