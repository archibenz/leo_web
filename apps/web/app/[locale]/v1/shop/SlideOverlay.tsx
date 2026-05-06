'use client';

import CollectionBadge from './CollectionBadge';
import type {MobileShopItem} from './types';

interface SlideOverlayProps {
  product: MobileShopItem;
  locale: string;
  index: number;
  total: number;
}

const PRICE_RU = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});
const PRICE_EN = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function formatPrice(price: number, locale: string): string {
  return locale === 'ru' ? PRICE_RU.format(price) : PRICE_EN.format(price);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export default function SlideOverlay({product, locale, index, total}: SlideOverlayProps) {
  const counter = `${pad2(index + 1)} / ${pad2(total)}`;

  const meta: string[] = [];
  if (product.material) meta.push(product.material);
  if (product.sizes && product.sizes.length > 0) {
    meta.push(product.sizes.slice(0, 5).join(' · '));
  }

  return (
    <>
      {/* Top veil — shades counter + badge into the photo */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-black/55 via-black/20 to-transparent" />
      {/* Bottom veil — shades title + price block */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-64 bg-gradient-to-t from-black/80 via-black/45 to-transparent" />

      {/* Top-left counter */}
      <div
        className="pointer-events-none absolute left-5 z-20 font-mono text-[11px] uppercase tracking-[0.18em] text-white/85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]"
        style={{top: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)'}}
      >
        {counter}
      </div>

      {/* Top-right badge (если есть) */}
      {product.badge ? (
        <div
          className="pointer-events-none absolute right-5 z-20"
          style={{top: 'calc(env(safe-area-inset-top, 0px) + 1.05rem)'}}
        >
          <CollectionBadge variant={product.badge} locale={locale} />
        </div>
      ) : null}

      {/* Bottom block: title + price + meta, центрировано, ярко-белое */}
      <div
        className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center px-6 text-center"
        style={{bottom: 'calc(env(safe-area-inset-bottom, 0px) + 2.75rem)'}}
      >
        <h2 className="font-display text-[16px] uppercase leading-tight tracking-[0.22em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.75)]">
          {product.title}
        </h2>
        <div aria-hidden="true" className="mt-2.5 h-px w-10 bg-white/55" />
        <div className="mt-3 font-display text-[15px] tracking-[0.08em] text-white/95 drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]">
          {formatPrice(product.price, locale)}
        </div>
        {meta.length > 0 ? (
          <p className="mt-2.5 max-w-[260px] font-accent text-[10px] uppercase leading-relaxed tracking-[0.22em] text-white/55">
            {meta.join(' · ')}
          </p>
        ) : null}
      </div>
    </>
  );
}
