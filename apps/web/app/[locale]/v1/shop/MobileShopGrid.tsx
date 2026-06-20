'use client';

import {useMemo, useState, useRef, useEffect, useCallback} from 'react';
import {useSearchParams} from 'next/navigation';
import {useTranslations} from 'next-intl';
import Link from 'next/link';
import {formatPrice} from '../../../../lib/formatPrice';
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
  const tr = (en: string, ru: string) => (locale === 'ru' ? ru : en);

  const filterParam = searchParams.get('filter');
  const categoryParam = searchParams.get('category');
  const sortParam = searchParams.get('sort');

  const items = useMemo(() => {
    const filtered = products.filter((p) => {
      if (filterParam === 'new' && p.badge !== 'new') return false;
      if (filterParam === 'popular' && p.badge !== 'popular') return false;
      if (categoryParam && p.category !== categoryParam) return false;
      return true;
    });
    if (sortParam === 'price-asc') return [...filtered].sort((a, b) => a.price - b.price);
    if (sortParam === 'price-desc') return [...filtered].sort((a, b) => b.price - a.price);
    return filtered;
  }, [products, filterParam, categoryParam, sortParam]);

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

      {/* 2-column product grid. */}
      {items.length === 0 ? (
        <p className="mt-16 text-center text-[14px] text-inkSoft/55">{tr('Nothing here yet.', 'Здесь пока пусто.')}</p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-7">
          {items.map((p) => {
            const img = firstImage(p);
            return (
              <Link key={p.id} href={`/${locale}/product/${p.id}`} className="group block">
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-[var(--paper-muted)]">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element -- catalog images come from arbitrary hosts/uploads; next/image remotePatterns can't cover them all
                    <img
                      src={img}
                      alt={p.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transform-none"
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
            );
          })}
        </div>
      )}
    </div>
  );
}
