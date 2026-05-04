'use client';

import BlurReveal from '../../../../components/BlurReveal';
import CollectionBadge from './CollectionBadge';
import type {MobileShopItem} from './types';

interface SlideOverlayProps {
  product: MobileShopItem;
  index: number;
  total: number;
  locale: string;
  primaryImage?: string;
}

export default function SlideOverlay({product, index, total, locale}: SlideOverlayProps) {
  void locale;
  const counter = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/45 to-transparent pt-28"
      style={{paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))'}}
    >
      <div className="flex items-end justify-between gap-3 px-5">
        <BlurReveal mode="appear" delay={120} duration={650} blur={6} translateY={10} className="flex max-w-[78%] flex-col gap-1.5">
          {product.badge ? <CollectionBadge variant={product.badge} locale={locale} /> : null}
          <h2 className="font-sans text-[16px] font-normal leading-tight tracking-[0.01em] text-[var(--ink)]">
            {product.title}
          </h2>
        </BlurReveal>
        <span className="font-sans text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-soft)]">
          {counter}
        </span>
      </div>
    </div>
  );
}
