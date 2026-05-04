'use client';

import CollectionBadge from './CollectionBadge';
import type {MobileShopItem} from './types';

interface SlideOverlayProps {
  product: MobileShopItem;
  index: number;
  total: number;
  locale: string;
  primaryImage?: string;
}

export default function SlideOverlay({product, locale}: SlideOverlayProps) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/45 to-transparent pt-28"
      style={{paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))'}}
    >
      <div className="flex flex-col gap-1.5 px-5">
        {product.badge ? <CollectionBadge variant={product.badge} locale={locale} /> : null}
        <h2 className="font-sans text-[16px] font-normal leading-tight tracking-[0.01em] text-[var(--ink)]">
          {product.title}
        </h2>
      </div>
    </div>
  );
}
