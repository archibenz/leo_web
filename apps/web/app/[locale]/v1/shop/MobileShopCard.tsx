'use client';

import {useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {useTranslations} from 'next-intl';
import {useCart, useFavorites} from '../../../../contexts';
import {BrandHeart} from '../../../../components/icons';
import {formatPrice} from '../../../../lib/formatPrice';
import type {MobileShopItem} from './types';

// One product cell of the mobile shop grid. Carries its own Quick Add panel
// state so the grid stays a thin map. Quick Add is honest: a sized product opens
// a size panel and adds the chosen size to the cart; an unsized product adds
// directly. It never adds a null size for a sized product, and the whole card
// still links to the PDP — the Quick Add control sits OUTSIDE the anchor (a
// button nested in <a> is invalid markup). CSS-only reveal, reduced-motion safe.

type Props = {
  p: MobileShopItem;
  locale: string;
  img: string | null;
};

const cartItemId = (id: string, size?: string) => (size ? `${id}__${size}` : id);

export default function MobileShopCard({p, locale, img}: Props) {
  const menu = useTranslations('menu');
  const {addItem} = useCart();
  const {toggleItem, isFavorite} = useFavorites();
  const tr = (en: string, ru: string) => (locale === 'ru' ? ru : en);

  const fav = isFavorite(p.id);
  const sizes = (p.sizes ?? []).filter(Boolean);
  const href = `/${locale}/product/${p.id}`;

  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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

  const commit = (size?: string) => {
    addItem({id: cartItemId(p.id, size), title: p.title, price: p.price, image: img ?? undefined, size, isTest: p.isTest});
    setOpen(false);
    setAdded(true);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
    window.setTimeout(() => setAdded(false), 1600);
  };

  const onTrigger = () => {
    if (sizes.length > 0) {
      setOpen(true);
      window.requestAnimationFrame(() => {
        panelRef.current?.querySelector<HTMLButtonElement>('button[data-size]')?.focus();
      });
    } else {
      commit();
    }
  };

  return (
    <div className="group relative">
      {/* aria-live status — the trigger's label is stable so its visible
          "Added" swap isn't announced; this polite region carries it. */}
      <span role="status" aria-live="polite" className="sr-only">
        {added ? tr(`${p.title} added to bag`, `${p.title} добавлено в корзину`) : ''}
      </span>

      <Link href={href} className="block">
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-[var(--paper-muted)]">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element -- catalog images come from arbitrary hosts/uploads; next/image remotePatterns can't cover them all
            <img
              src={img}
              alt={p.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : null}
          {p.badge ? (
            <span className="absolute left-2 top-2 bg-[var(--paper)]/70 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-accent">
              {p.badge === 'new' ? menu('categories.new') : menu('categories.popular')}
            </span>
          ) : null}
        </div>
        <p className="mt-2 truncate text-[13px] text-inkSoft transition-colors group-hover:text-accent">{p.title}</p>
        <p className="mt-0.5 text-[13px] text-inkSoft/60">{formatPrice(locale, p.price)}</p>
      </Link>

      {/* Favourite — sibling of the link (a button nested in <a> is invalid);
          save straight from the grid. 44px target, BrandHeart fills when saved. */}
      <button
        type="button"
        onClick={() => toggleItem({id: p.id, title: p.title, image: img ?? undefined})}
        aria-pressed={fav}
        aria-label={fav ? tr(`Remove ${p.title} from favourites`, `Убрать ${p.title} из избранного`) : tr(`Add ${p.title} to favourites`, `Добавить ${p.title} в избранное`)}
        className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--paper)]/70 text-inkSoft backdrop-blur-sm transition hover:bg-[var(--paper)] hover:text-ink"
      >
        <BrandHeart filled={fav} size={16} />
      </button>

      {/* Quick Add trigger — a thin bar over the foot of the image. Outside the
          anchor so the tap adds rather than navigates. */}
      {!open && (
        <button
          ref={triggerRef}
          type="button"
          onClick={onTrigger}
          aria-haspopup={sizes.length > 0 ? 'true' : undefined}
          aria-expanded={sizes.length > 0 ? open : undefined}
          aria-label={tr(`Quick add ${p.title}`, `Быстро добавить ${p.title}`)}
          className="absolute inset-x-0 bottom-[52px] z-10 flex h-11 items-center justify-center bg-[var(--paper)]/85 text-[10px] uppercase tracking-[0.18em] text-accent backdrop-blur-sm transition-opacity duration-200 hover:bg-[var(--paper)]/95 sm:bottom-[56px]"
          style={{transform: 'translateY(0)'}}
        >
          {added ? tr('Added ✓', 'Добавлено ✓') : tr('Quick add', 'В корзину')}
        </button>
      )}

      {/* Size panel — opens over the image; each size adds and closes. */}
      {open && (
        <div
          ref={panelRef}
          role="group"
          aria-label={tr(`Select a size for ${p.title}`, `Выберите размер для ${p.title}`)}
          className="absolute inset-x-0 bottom-0 top-0 z-20 flex flex-col items-center justify-center gap-3 bg-[var(--paper)]/95 px-3 backdrop-blur-sm"
          style={{height: 'calc(100% - 44px)'}}
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              triggerRef.current?.focus();
            }}
            aria-label={tr('Close', 'Закрыть')}
            className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center text-[15px] leading-none text-inkSoft/70 transition-colors hover:text-accent"
          >
            ×
          </button>
          <p className="text-[10px] uppercase tracking-[0.2em] text-inkSoft/60">{tr('Size', 'Размер')}</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                data-size={s}
                onClick={() => commit(s)}
                className="flex h-11 min-w-11 items-center justify-center border border-inkSoft/25 px-2 text-[13px] uppercase tracking-[0.08em] text-inkSoft transition-colors hover:border-accent hover:bg-accent hover:text-paper"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
