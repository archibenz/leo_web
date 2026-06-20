'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useTranslations} from 'next-intl';
import {useWhitePortal} from '../../../../hooks/useWhitePortal';
import {useWhiteBag} from '../../../../hooks/useWhiteBag';
import {useWhiteFavourites} from '../../../../hooks/useWhiteFavourites';
import WhiteHeader from '../WhiteHeader';
import WhiteHeaderActions from '../WhiteHeaderActions';
import WhiteFooter from '../WhiteFooter';
import WhiteProductCard from '../WhiteProductCard';
import {INK, MUTED, HAIR} from '../wv-palette';
import {whiteItemNoun} from '../wv-i18n';
import {WHITE_PRODUCTS as ITEMS, whiteCatLabel, type WhiteProduct as Item, type WhiteCat as Cat, type WhiteColor as Colour} from '../products';

// Distinct colours across the catalog, in first-seen order — the swatch filter.
const COLOURS: Colour[] = (() => {
  const map = new Map<string, Colour>();
  ITEMS.forEach((i) => i.colors.forEach((c) => map.set(c.key, c)));
  return [...map.values()];
})();

// Variant 2 "White" — shop / catalog grid with filters + sort. Same portal
// technique as the landing/PDP. Catalog lives in ../products (shared with the
// PDP so a card opens that product). Placeholder imagery (Higgsfield later).

type Sort = 'new' | 'asc' | 'desc';

export default function WhiteShopShowcase({locale, initialCat = 'all', initialQuery = '', initialSort = 'new', initialColour = 'all', focusSearch = false}: {locale: string; initialCat?: Cat | 'all'; initialQuery?: string; initialSort?: Sort; initialColour?: string; focusSearch?: boolean}) {
  const mounted = useWhitePortal();
  const {count} = useWhiteBag();
  const {count: favCount} = useWhiteFavourites();
  const ru = locale === 'ru';
  const [cat, setCat] = useState<Cat | 'all'>(initialCat);
  const [sort, setSort] = useState<Sort>(initialSort);
  const [colour, setColour] = useState<string>(() => (COLOURS.some((c) => c.key === initialColour) ? initialColour : 'all'));
  const [query, setQuery] = useState(initialQuery);
  const searchRef = useRef<HTMLInputElement>(null);
  const t = useTranslations('white.shop');

  // Deep-link intent (?focus=search, e.g. from the landing "Search" link):
  // the portal mounts client-side, so focus the field once it has painted.
  useEffect(() => {
    if (focusSearch && mounted) searchRef.current?.focus();
  }, [focusSearch, mounted]);

  // Keep the URL in sync with the active filters so a view can be shared or
  // bookmarked (history.replaceState — no navigation, no reload).
  const syncParam = (key: string, val: string | null) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (val) url.searchParams.set(key, val);
    else url.searchParams.delete(key);
    window.history.replaceState(null, '', url);
  };
  const pickCat = (c: Cat | 'all') => {
    setCat(c);
    syncParam('cat', c === 'all' ? null : c);
  };
  const pickQuery = (q: string) => {
    setQuery(q);
    syncParam('q', q.trim() || null);
  };
  const pickSort = (s: Sort) => {
    setSort(s);
    // 'new' is the default — keep it out of the URL so shared links stay clean.
    syncParam('sort', s === 'new' ? null : s);
  };
  const pickColour = (c: string) => {
    setColour(c);
    syncParam('colour', c === 'all' ? null : c);
  };

  const hasFilters = cat !== 'all' || colour !== 'all' || query.trim() !== '' || sort !== 'new';
  const clearFilters = () => {
    setCat('all');
    setColour('all');
    setQuery('');
    setSort('new');
    if (typeof window !== 'undefined') window.history.replaceState(null, '', `/${locale}/white/shop`);
  };

  // 'all' chip reads "All/Все"; real categories use the shared whiteCatLabel
  // (same source as the server-side title — no drift).
  const catLabel = (c: Cat | 'all') => (c === 'all' ? t('all') : whiteCatLabel(c, locale));

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = cat === 'all' ? ITEMS : ITEMS.filter((i) => i.cat === cat);
    // Free-text match against both locales so "dress" and "платье" both work.
    if (q) filtered = filtered.filter((i) => `${i.en} ${i.ru}`.toLowerCase().includes(q));
    if (colour !== 'all') filtered = filtered.filter((i) => i.colors.some((c) => c.key === colour));
    const price = (i: Item) => i.sale ?? i.price;
    if (sort === 'asc') return [...filtered].sort((a, b) => price(a) - price(b));
    if (sort === 'desc') return [...filtered].sort((a, b) => price(b) - price(a));
    return filtered;
  }, [cat, sort, colour, query]);

  // Edge-fade affordance for the mobile category carousel (sm: it wraps, no
  // scroll → edge stays 'none', no mask). Keyed off scroll position so it never
  // shows a false 'more' cue. Fades into the white DNA bg; static — nothing for
  // reduced-motion to suppress.
  const catRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState<'none' | 'right' | 'both' | 'left'>('none');
  const syncEdge = useCallback(() => {
    const el = catRef.current;
    if (!el) return;
    const canLeft = el.scrollLeft > 4;
    const canRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setEdge(canLeft && canRight ? 'both' : canRight ? 'right' : canLeft ? 'left' : 'none');
  }, []);
  useEffect(() => {
    syncEdge();
    // The Jost UI font loads after first paint; once it applies the chips widen
    // and may start to overflow, so re-measure when fonts settle (syncEdge no-ops
    // if the ref is gone, so it is safe after unmount).
    if (typeof document !== 'undefined' && document.fonts) document.fonts.ready.then(syncEdge);
    window.addEventListener('resize', syncEdge);
    return () => window.removeEventListener('resize', syncEdge);
  }, [syncEdge, cat, shown.length, mounted]);
  const FADE = 28;
  const edgeMask =
    edge === 'right'
      ? `linear-gradient(to right, #000 calc(100% - ${FADE}px), transparent)`
      : edge === 'left'
        ? `linear-gradient(to right, transparent, #000 ${FADE}px)`
        : edge === 'both'
          ? `linear-gradient(to right, transparent, #000 ${FADE}px, #000 calc(100% - ${FADE}px), transparent)`
          : undefined;

  if (!mounted) return null;

  const cats: (Cat | 'all')[] = ['all', 'dresses', 'outerwear', 'knitwear', 'tailoring', 'skirts'];

  return createPortal(
    <div className="wv-root fixed inset-0 z-[1000] overflow-y-auto bg-white font-sans antialiased" style={{color: INK}}>
      {/* Header */}
      <WhiteHeader
        locale={locale}
        activeCat={cat}
        left={
          <a href={`/${locale}/white`} className="text-[12px] uppercase tracking-[0.18em] transition-opacity hover:opacity-60" style={{color: MUTED}}>
            ← {t('home')}
          </a>
        }
        right={<WhiteHeaderActions locale={locale} favCount={favCount} count={count} />}
      />

      <main id="wv-main" tabIndex={-1} style={{outline: 'none'}} className="mx-auto max-w-[1400px] px-6 sm:px-10">
        {/* Title */}
        <div className="flex items-baseline justify-between pt-12 pb-6">
          <h1 className="font-display text-[34px] font-light tracking-tight sm:text-[44px]">{t('shop')}</h1>
          <span aria-live="polite" aria-atomic="true" className="shrink-0 text-[12px] uppercase tracking-[0.16em] tabular-nums" style={{color: MUTED}}>
            {shown.length} {whiteItemNoun(shown.length, locale)}
          </span>
        </div>

        {/* Search — free-text filter by product name (en+ru). Hairline underline, square. */}
        <div className="pb-6">
          <label htmlFor="wv-shop-search" className="sr-only">{t('searchProducts')}</label>
          <div className="relative">
            <input
              ref={searchRef}
              id="wv-shop-search"
              type="search"
              value={query}
              onChange={(e) => pickQuery(e.target.value)}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
              placeholder={t('searchCollection')}
              className="w-full border-b bg-transparent pb-2 pr-10 text-[15px] outline-none placeholder:text-[#8c837a] [&::-webkit-search-cancel-button]:hidden"
              style={{borderColor: HAIR, color: INK}}
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  pickQuery('');
                  searchRef.current?.focus();
                }}
                aria-label={t('clearSearch')}
                className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-[16px] leading-none transition-opacity hover:opacity-60"
                style={{color: MUTED}}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col gap-4 border-y py-4 sm:flex-row sm:items-center sm:justify-between" style={{borderColor: HAIR}}>
          <div
            ref={catRef}
            onScroll={syncEdge}
            className="-mx-1 flex gap-1 overflow-x-auto sm:mx-0 sm:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={edgeMask ? {maskImage: edgeMask, WebkitMaskImage: edgeMask} : undefined}
          >
            {cats.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => pickCat(c)}
                aria-pressed={cat === c}
                className="inline-flex min-h-11 shrink-0 items-center px-3.5 text-[12px] uppercase tracking-[0.14em] transition-colors"
                style={{
                  color: cat === c ? '#fff' : INK,
                  background: cat === c ? INK : 'transparent',
                  border: `1px solid ${cat === c ? INK : HAIR}`,
                }}
              >
                {catLabel(c)}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em]" style={{color: MUTED}}>
            {t('sort')}
            <select
              value={sort}
              onChange={(e) => pickSort(e.target.value as Sort)}
              className="cursor-pointer border-b bg-transparent py-1 text-[12px] uppercase tracking-[0.14em] outline-none"
              style={{color: INK, borderColor: MUTED}}
            >
              <option value="new">{t('sortNewest')}</option>
              <option value="asc">{t('sortAsc')}</option>
              <option value="desc">{t('sortDesc')}</option>
            </select>
          </label>
        </div>

        {/* Colour filter — square swatches (White square-geometry; colour shown
            only as the product's own swatch). Ink ring marks the active colour;
            a hairline inset keeps light colours visible on white. Static. */}
        <div
          role="group"
          aria-label={t('colour')}
          className="-mx-1 flex items-center gap-1.5 overflow-x-auto pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <button
            type="button"
            onClick={() => pickColour('all')}
            aria-pressed={colour === 'all'}
            className="inline-flex min-h-11 shrink-0 items-center px-3.5 text-[12px] uppercase tracking-[0.14em] transition-colors"
            style={{
              color: colour === 'all' ? '#fff' : INK,
              background: colour === 'all' ? INK : 'transparent',
              border: `1px solid ${colour === 'all' ? INK : HAIR}`,
            }}
          >
            {t('allColours')}
          </button>
          {COLOURS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => pickColour(c.key)}
              aria-pressed={colour === c.key}
              aria-label={ru ? c.ru : c.en}
              className="flex h-11 w-11 shrink-0 items-center justify-center"
            >
              <span
                className="h-6 w-6"
                style={{
                  background: c.hex,
                  boxShadow: colour === c.key ? `0 0 0 1.5px #fff, 0 0 0 2.5px ${INK}` : `inset 0 0 0 1px ${HAIR}`,
                }}
              />
            </button>
          ))}
        </div>

        {/* Clear filters — shown when any filter is active, so a refined search
            is one tap to undo (no need to reset each chip). */}
        {hasFilters && (
          <div className="pt-4">
            <button
              type="button"
              onClick={clearFilters}
              className="text-[12px] uppercase tracking-[0.16em] underline underline-offset-4 transition-opacity hover:opacity-60"
              style={{color: INK}}
            >
              {t('clearFilters')} ×
            </button>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-12 py-12 sm:gap-x-6 lg:grid-cols-3">
          {shown.map((p, i) => (
            <WhiteProductCard key={p.key} locale={locale} product={p} index={i} quickAdd rise />
          ))}
        </div>

        {shown.length === 0 && (
          <div className="flex flex-col items-center py-24 text-center">
            <p className="max-w-sm text-[14px] leading-relaxed" style={{color: MUTED}}>
              {query.trim() ? t('nothingFound', {query: query.trim()}) : hasFilters ? t('noMatch') : t('nothingHere')}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="wv-btn mt-8 inline-flex items-center justify-center px-9 py-4 text-[12px] uppercase tracking-[0.2em]"
              >
                {t('clearFilters')}
              </button>
            )}
          </div>
        )}
      </main>

      <WhiteFooter locale={locale} />
    </div>,
    document.body,
  );
}
