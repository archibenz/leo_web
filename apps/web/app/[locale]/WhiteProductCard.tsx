'use client';

import Link from 'next/link';
import Image from 'next/image';
import {useEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {useWhiteBag} from '../../hooks/useWhiteBag';
import {useWhiteFavourites} from '../../hooks/useWhiteFavourites';
import {WHITE_SIZES, whiteProductHref, type WhiteProduct} from './products';
import {MUTED, SIGNAL, HAIR} from './wv-palette';
import {WHITE_LQIP} from './products-lqip';
import {WhiteFavHeart} from './wv-icons';

// Variant 2 "White" — shared product card for the landing edit, the shop grid
// and the PDP "related" rail. Single source so the three never drift.
//
// Quick Add is honest: it opens a size panel and adds the chosen size to the
// bag (useWhiteBag) — it never adds a null size, and it never pretends to add
// while only navigating. The whole card still links to the PDP; the Quick Add
// control lives OUTSIDE the anchor (a button nested in <a> is invalid markup
// and breaks the link). CSS-only reveal, reduced-motion safe (see globals.css).

export default function WhiteProductCard({
  locale,
  product,
  index = 0,
  quickAdd = false,
  rise = false,
  priority = false,
  bleed = false,
  hideFav = false,
}: {
  locale: string;
  product: WhiteProduct;
  index?: number;
  quickAdd?: boolean;
  rise?: boolean;
  priority?: boolean;
  bleed?: boolean;
  hideFav?: boolean;
}) {
  const t = useTranslations('white.card');
  const {add} = useWhiteBag();
  const {has, toggle} = useWhiteFavourites();
  const favourited = has(product.key);
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const fmt = (n: number) => `${n.toLocaleString('ru-RU')} ₽`;
  const name = locale === 'ru' ? product.ru : product.en;
  const href = whiteProductHref(locale, product);

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
    // Charge the effective (sale) price the card shows — not the struck regular.
    // Quick Add has no colour UI — default to the product's primary colourway
    // (colors[0], the one the card photo shows); the PDP carries an explicit pick.
    const primary = product.colors[0];
    add({key: product.key, en: product.en, ru: product.ru, price: product.sale ?? product.price, size, colorEn: primary?.en ?? '', colorRu: primary?.ru ?? ''});
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
        {added ? t('addedToBag', {name}) : ''}
      </span>
      <div className="wv-ph wv-zoom relative aspect-[2/3] w-full overflow-hidden">
        {/* Real photo (gradient asset base). Slow zoom on hover for editorial
            feel — disabled under reduced-motion. pointer-events-none so the
            link layer above stays the click target. */}
        <Image
          src={product.image}
          alt={name}
          fill
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 460px"
          placeholder={WHITE_LQIP[product.image] ? 'blur' : 'empty'}
          blurDataURL={WHITE_LQIP[product.image]}
          className="pointer-events-none object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        {/* Second view crossfades in on hover where the product carries one —
            the same alternate-angle reveal the big retail grids use. */}
        {product.gallery?.[0] && (
          <span className="pointer-events-none absolute inset-0 hidden [@media(hover:hover)]:block">
          <Image
            src={product.gallery[0]}
            alt=""
            fill
            loading="lazy"
            sizes="(max-width: 1024px) 50vw, 460px"
            className="pointer-events-none object-cover opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 motion-reduce:transition-none motion-reduce:group-hover:opacity-0"
          />
          </span>
        )}
        {/* Image is its own link so Quick Add can sit outside the anchor. */}
        <Link href={href} aria-label={name} className="wv-card-link absolute inset-0 z-[1]" />

        {product.sale && (
          <span className="pointer-events-none absolute left-3 top-3 z-[5] text-[10px] uppercase tracking-[0.16em]" style={{color: SIGNAL}}>
            {t('sale')}
          </span>
        )}

        {/* Favourite — a sibling of the image link (a button nested in <a> is
            invalid). Always visible (mobile has no hover); 44px hit area, the
            heart fills with the signal colour when saved. Persists via the same
            store as the PDP heart, so the two stay in sync. hideFav drops it on
            tiny grids (sets' 3-up items) where the 44px target eats the photo. */}
        {!hideFav && (
          <button
            type="button"
            onClick={() => toggle(product.key)}
            aria-pressed={favourited}
            aria-label={favourited ? t('removeFavourite', {name}) : t('addFavourite', {name})}
            className="absolute right-1 top-1 z-[5] flex h-11 w-11 items-center justify-center transition-opacity hover:opacity-100"
            style={{opacity: favourited ? 1 : 0.75}}
          >
            {/* Subtle plate so the ink heart stays legible over dark editorial
                photos — same bg-white/backdrop-blur idiom as the quick-add pill.
                Near-invisible over light imagery, lifts the glyph over dark. */}
            <span className="flex h-8 w-8 items-center justify-center [filter:drop-shadow(0_1px_6px_rgba(255,255,255,0.9))]">
              <WhiteFavHeart filled={favourited} size={18} />
            </span>
          </button>
        )}

        {quickAdd && !open && (
          <button
            ref={triggerRef}
            type="button"
            onClick={openPanel}
            aria-haspopup="true"
            aria-expanded={open}
            aria-label={t('quickAddNamed', {name})}
            className="wv-quickadd absolute inset-x-0 bottom-0 z-[5] flex h-11 items-center justify-center bg-white/90 text-[11px] uppercase tracking-[0.2em] backdrop-blur-sm"
          >
            {added ? t('added') : t('quickAdd')}
          </button>
        )}

        {quickAdd && open && (
          <div
            ref={panelRef}
            role="group"
            aria-label={t('selectSizeFor', {name})}
            className="absolute inset-0 z-[6] flex flex-col items-center justify-center gap-3 bg-white/95 px-3"
          >
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              aria-label={t('close')}
              className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center text-[15px] leading-none transition-opacity hover:opacity-60"
              style={{color: MUTED}}
            >
              ×
            </button>
            <p className="text-[11px] uppercase tracking-[0.2em]" style={{color: MUTED}}>
              {t('selectSize')}
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

      {/* Name + price — a second link to the same PDP. px-1 keeps the caption
          off the physical screen edge when the photo grid runs full-bleed. */}
      <Link href={href} className={`mt-3 block text-center ${bleed ? 'px-5 sm:px-0' : 'px-1'}`}>
        <p className="text-[14px] tracking-wide transition-opacity group-hover:opacity-60">{name}</p>
        <p className="mt-1 text-[13px]" style={{color: product.sale ? SIGNAL : MUTED}}>
          {product.sale ? (
            <>
              <s className="mr-2 line-through" style={{color: MUTED}}>
                <span className="sr-only">{t('regularPrice')}: </span>
                {fmt(product.price)}
              </s>
              <span>
                <span className="sr-only">{t('salePrice')}: </span>
                {fmt(product.sale)}
              </span>
            </>
          ) : (
            fmt(product.price)
          )}
        </p>
        {product.colors.length > 1 && (
          <span className="mt-2 flex items-center justify-center gap-1.5" aria-label={t('coloursCount', {count: product.colors.length})}>
            {product.colors.slice(0, 5).map((c) => (
              <span
                key={c.key}
                aria-hidden="true"
                className="inline-block h-[7px] w-[7px] rounded-full"
                style={{background: c.hex, boxShadow: `0 0 0 1px ${HAIR}`}}
              />
            ))}
          </span>
        )}
      </Link>
    </div>
  );
}
