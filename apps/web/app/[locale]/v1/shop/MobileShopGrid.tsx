'use client';

import {useMemo, useState, useRef, useEffect, useCallback} from 'react';
import {useSearchParams} from 'next/navigation';
import {useTranslations} from 'next-intl';
import Link from 'next/link';
import {formatPrice} from '../../../../lib/formatPrice';
import {useFavorites} from '../../../../contexts';
import {BrandHeart} from '../../../../components/icons';
import type {MobileShopItem} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

function resolveAssetUrl(src: string): string {
  if (!src.startsWith('/')) return src;
  if (src.startsWith('/uploads/') || src.startsWith('/api/')) return `${API_BASE}${src}`;
  return src;
}

function firstImage(item: MobileShopItem): string | null {
  if (item.images) {
    try {
      const parsed: unknown = JSON.parse(item.images);
      if (Array.isArray(parsed)) {
        for (const img of parsed) {
          if (img && typeof img === 'object' && 'src' in img && typeof (img as {src: unknown}).src === 'string') {
            return resolveAssetUrl((img as {src: string}).src);
          }
        }
      }
    } catch {
      /* fall through */
    }
  }
  return item.image ? resolveAssetUrl(item.image) : null;
}

const CATEGORY_OPTIONS = ['dresses', 'outerwear', 'tailoring', 'knitwear', 'blouses', 'skirts', 'trousers'] as const;

type MobileShopGridProps = {
  products: MobileShopItem[];
  locale: string;
};

// Variant 1 mobile shop — a real 2-column product grid (was a full-screen
// reveal). URL-driven category chips + price sort so it is shareable and the
// back button works. Tap targets ≥44px; no scroll-lock (normal page flow).
export default function MobileShopGrid({products, locale}: MobileShopGridProps) {
  const menu = useTranslations('menu');
  const searchParams = useSearchParams();
  const {toggleItem, isFavorite} = useFavorites();
  const tr = (en: string, ru: string) => (locale === 'ru' ? ru : en);

  const filterParam = searchParams.get('filter');
  const categoryParam = searchParams.get('category');
  const sortParam = searchParams.get('sort');
  const colorParam = searchParams.get('color');
  const hasFilters = !!(filterParam || categoryParam || sortParam || colorParam);

  // Distinct colours present in the catalog (first-seen order) — drives the
  // colour chip row. The label comes from menu.colours.* with a capitalize
  // fallback so a colour the API adds later still renders (never blank).
  const colours = useMemo(
    () => [...new Set(products.map((p) => p.color).filter((c): c is string => !!c))],
    [products],
  );
  const colourLabel = (c: string) =>
    menu.has(`colours.${c}`) ? menu(`colours.${c}`) : c.charAt(0).toUpperCase() + c.slice(1);

  const items = useMemo(() => {
    const filtered = products.filter((p) => {
      if (filterParam === 'new' && p.badge !== 'new') return false;
      if (filterParam === 'popular' && p.badge !== 'popular') return false;
      if (categoryParam && p.category !== categoryParam) return false;
      if (colorParam && p.color !== colorParam) return false;
      return true;
    });
    if (sortParam === 'price-asc') return [...filtered].sort((a, b) => a.price - b.price);
    if (sortParam === 'price-desc') return [...filtered].sort((a, b) => b.price - a.price);
    return filtered;
  }, [products, filterParam, categoryParam, sortParam, colorParam]);

  // Build a /shop href that flips one param while preserving the rest.
  const hrefWith = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    return `/${locale}/shop${qs ? `?${qs}` : ''}`;
  };

  const chip = (active: boolean) =>
    `inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-[12px] uppercase tracking-[0.08em] transition-colors ${
      active ? 'border-accent text-accent' : 'border-inkSoft/20 text-inkSoft/70 hover:border-inkSoft/40'
    }`;

  const sorts = [
    {key: null, label: tr('Featured', 'По умолчанию')},
    {key: 'price-asc', label: tr('Price ↑', 'Цена ↑')},
    {key: 'price-desc', label: tr('Price ↓', 'Цена ↓')},
  ] as const;

  // Edge-fade affordance for the hidden-scrollbar category carousel: with no
  // scrollbar, a fade signals there are more chips to swipe to. Keyed off scroll
  // position so it never lies (no right-fade once you reach the end). Static
  // mask, no animation — nothing for reduced-motion to suppress.
  const catRef = useRef<HTMLElement>(null);
  const [edge, setEdge] = useState<'none' | 'right' | 'both' | 'left'>('right');
  const syncEdge = useCallback(() => {
    const el = catRef.current;
    if (!el) return;
    const canLeft = el.scrollLeft > 4;
    const canRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setEdge(canLeft && canRight ? 'both' : canRight ? 'right' : canLeft ? 'left' : 'none');
  }, []);
  useEffect(() => {
    syncEdge();
    window.addEventListener('resize', syncEdge);
    return () => window.removeEventListener('resize', syncEdge);
  }, [syncEdge, categoryParam]);
  const FADE = 28;
  const edgeMask =
    edge === 'right'
      ? `linear-gradient(to right, #000 calc(100% - ${FADE}px), transparent)`
      : edge === 'left'
        ? `linear-gradient(to right, transparent, #000 ${FADE}px)`
        : edge === 'both'
          ? `linear-gradient(to right, transparent, #000 ${FADE}px, #000 calc(100% - ${FADE}px), transparent)`
          : undefined;

  return (
    <div className="px-4 pb-20 pt-[76px]">
      {/* Category filter chips — sticky under the header. The sticky bg/blur sit
          on the wrapper so the inner scroller can carry an edge-fade mask without
          fading the bar itself. */}
      <div className="sticky top-[60px] z-10 -mx-4 bg-[var(--paper)]/85 backdrop-blur-sm">
        <nav
          ref={catRef}
          onScroll={syncEdge}
          aria-label={menu('sections.categories')}
          className="flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={edgeMask ? {maskImage: edgeMask, WebkitMaskImage: edgeMask} : undefined}
        >
          <Link href={hrefWith('category', null)} className={chip(!categoryParam)} aria-current={!categoryParam ? 'true' : undefined}>
            {tr('All', 'Все')}
          </Link>
          {CATEGORY_OPTIONS.map((key) => (
            <Link
              key={key}
              href={hrefWith('category', key)}
              className={chip(categoryParam === key)}
              aria-current={categoryParam === key ? 'true' : undefined}
            >
              {menu(`categories.${key}`)}
            </Link>
          ))}
        </nav>
      </div>

      {/* Colour filter chips — shown only when the catalog spans >1 colour.
          Same rounded-full chip language as categories; URL-driven + shareable. */}
      {colours.length > 1 && (
        <nav
          aria-label={tr('Filter by colour', 'Фильтр по цвету')}
          className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <Link href={hrefWith('color', null)} className={chip(!colorParam)} aria-current={!colorParam ? 'true' : undefined}>
            {tr('All colours', 'Все цвета')}
          </Link>
          {colours.map((c) => (
            <Link key={c} href={hrefWith('color', c)} className={chip(colorParam === c)} aria-current={colorParam === c ? 'true' : undefined}>
              {colourLabel(c)}
            </Link>
          ))}
        </nav>
      )}

      {/* Count + sort. */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[12px] uppercase tracking-[0.08em] text-inkSoft/55">
          {items.length} {tr(items.length === 1 ? 'item' : 'items', 'тов.')}
        </span>
        <div className="flex gap-2" role="group" aria-label={tr('Sort', 'Сортировка')}>
          {sorts.map((s) => {
            const active = (sortParam ?? null) === s.key;
            return (
              <Link key={s.label} href={hrefWith('sort', s.key)} className={chip(active)} aria-current={active ? 'true' : undefined}>
                {s.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Clear-filters affordance — its own row, only when something is filtering. */}
      {hasFilters && (
        <div className="mt-3">
          <Link
            href={`/${locale}/shop`}
            className="inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.08em] text-inkSoft/55 underline-offset-4 transition-colors hover:text-accent hover:underline"
          >
            {tr('Clear filters', 'Сбросить фильтры')} <span aria-hidden="true">×</span>
          </Link>
        </div>
      )}

      {/* 2-column product grid. */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <p className="max-w-xs text-[14px] leading-relaxed text-inkSoft/55">
            {hasFilters ? tr('No products match these filters.', 'Ничего не подошло по выбранным фильтрам.') : tr('Nothing here yet.', 'Здесь пока пусто.')}
          </p>
          {hasFilters && (
            <Link
              href={`/${locale}/shop`}
              className="mt-7 inline-flex h-11 items-center rounded-full border border-accent px-7 text-[12px] uppercase tracking-[0.12em] text-accent transition-colors hover:bg-accent hover:text-paper"
            >
              {tr('Clear filters', 'Сбросить фильтры')}
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-7">
          {items.map((p) => {
            const img = firstImage(p);
            const fav = isFavorite(p.id);
            return (
              <div key={p.id} className="group relative">
                <Link href={`/${locale}/product/${p.id}`} className="block">
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
