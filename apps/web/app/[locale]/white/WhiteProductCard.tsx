'use client';

import {useEffect, useRef, useState} from 'react';
import {useWhiteBag} from '../../../hooks/useWhiteBag';
import {WHITE_SIZES, type WhiteProduct} from './products';
import {MUTED, SIGNAL} from './wv-palette';

// Variant 2 "White" — shared product card for the landing edit, the shop grid
// and the PDP "related" rail. Single source so the three never drift.
//
// Quick Add is honest: it opens a size panel and adds the chosen size to the
// bag (useWhiteBag) — it never adds a null size, and it never pretends to add
// while only navigating. The whole card still links to the PDP; the Quick Add
// control lives OUTSIDE the anchor (a button nested in <a> is invalid markup
// and breaks the link). CSS-only reveal, reduced-motion safe (see globals.css).

type Translate = (_en: string, _ru: string) => string;

export default function WhiteProductCard({
  locale,
  product,
  t,
  index = 0,
  quickAdd = false,
  rise = false,
}: {
  locale: string;
  product: WhiteProduct;
  t: Translate;
  index?: number;
  quickAdd?: boolean;
  rise?: boolean;
}) {
  const {add} = useWhiteBag();
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const fmt = (n: number) => `${n.toLocaleString('ru-RU')} ₽`;
  const name = t(product.en, product.ru);
  const href = `/${locale}/white/product?p=${product.key}`;

  // ESC closes the panel; a click outside closes it. Focus returns to the
  // trigger so keyboard users are never stranded inside a collapsed panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  const openPanel = () => {
    setOpen(true);
    // Move focus into the panel once it has painted.
    window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLButtonElement>('button[data-size]')?.focus();
    });
  };

  const pick = (size: string) => {
    add({key: product.key, en: product.en, ru: product.ru, price: product.price, size});
    setOpen(false);
    setAdded(true);
    // Return focus after the trigger re-renders, then clear the confirmation.
    window.requestAnimationFrame(() => triggerRef.current?.focus());
    window.setTimeout(() => setAdded(false), 1600);
  };

  const riseCls = rise ? `wv-rise wv-delay-${(index % 3) + 1}` : '';

  return (
    <div className={`wv-card group relative block ${riseCls}`}>
      {/* The trigger's aria-label is a stable function name ("Quick add {name}"),
          so its visible "Added ✓" swap isn't announced — this polite status is. */}
      <span role="status" aria-live="polite" className="sr-only">
        {added ? t(`${name} added to bag`, `${name} — добавлено в корзину`) : ''}
      </span>
      <div className="wv-ph relative aspect-[2/3] w-full overflow-hidden">
        {/* Image is its own link so Quick Add can sit outside the anchor. */}
        <a href={href} aria-label={name} className="absolute inset-0 z-0" />

        {product.sale && (
          <span className="pointer-events-none absolute left-3 top-3 z-10 text-[10px] uppercase tracking-[0.16em]" style={{color: SIGNAL}}>
            {t('Sale', 'Скидка')}
          </span>
        )}

        {quickAdd && !open && (
          <button
            ref={triggerRef}
            type="button"
            onClick={openPanel}
            aria-haspopup="true"
            aria-expanded={open}
            aria-label={t(`Quick add ${name}`, `Быстро добавить: ${name}`)}
            className="wv-quickadd absolute inset-x-0 bottom-0 z-10 flex h-11 items-center justify-center bg-white/90 text-[11px] uppercase tracking-[0.2em] backdrop-blur-sm"
          >
            {added ? t('Added ✓', 'Добавлено ✓') : t('Quick add', 'В корзину')}
          </button>
        )}

        {quickAdd && open && (
          <div
            ref={panelRef}
            role="group"
            aria-label={t(`Select a size for ${name}`, `Выберите размер: ${name}`)}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/95 px-3"
          >
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              aria-label={t('Close', 'Закрыть')}
              className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center text-[15px] leading-none transition-opacity hover:opacity-60"
              style={{color: MUTED}}
            >
              ×
            </button>
            <p className="text-[11px] uppercase tracking-[0.2em]" style={{color: MUTED}}>
              {t('Select size', 'Размер')}
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {WHITE_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  data-size={s}
                  onClick={() => pick(s)}
                  className="h-11 min-w-11 border border-[#e7e2db] px-2 text-[13px] tracking-wide text-[#1c1714] transition-colors hover:border-[#1c1714] hover:bg-[#1c1714] hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Name + price — a second link to the same PDP. */}
      <a href={href} className="mt-4 block text-center">
        <p className="text-[14px] tracking-wide transition-opacity group-hover:opacity-60">{name}</p>
        <p className="mt-1 text-[13px]" style={{color: product.sale ? SIGNAL : MUTED}}>
          {product.sale ? (
            <>
              <s className="mr-2 line-through" style={{color: MUTED}}>
                <span className="sr-only">{t('Regular price', 'Обычная цена')}: </span>
                {fmt(product.price)}
              </s>
              <span>
                <span className="sr-only">{t('Sale price', 'Цена со скидкой')}: </span>
                {fmt(product.sale)}
              </span>
            </>
          ) : (
            fmt(product.price)
          )}
        </p>
      </a>
    </div>
  );
}
