'use client';

import {useState, useMemo, useCallback, useEffect, useRef} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname, useSearchParams} from 'next/navigation';
import Spinner from './ui/Spinner';
import Link from 'next/link';
import {useFavorites} from '../contexts/FavoritesContext';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ShopItem {
  id: string;
  title: string;
  subtitle: string | null;
  occasion: string | null;
  category: string | null;
  color: string | null;
  sizes: string[] | null;
  price: number;
  material: string | null;
  image: string | null;
  images: string | null;
  isTest: boolean;
  inStock: boolean;
  collectionName: string | null;
}

type FilterKey = 'occasion' | 'category' | 'color' | 'size' | 'season' | 'material';

interface Filters {
  occasion: string[];
  category: string[];
  color: string[];
  size: string[];
  season: string[];
  material: string[];
}

/* ------------------------------------------------------------------ */
/*  Filter option definitions                                          */
/* ------------------------------------------------------------------ */

const OCCASION_OPTIONS  = ['evening', 'office', 'casual', 'resort', 'ceremony'] as const;
const CATEGORY_OPTIONS  = ['dresses', 'outerwear', 'tailoring', 'knitwear', 'blouses', 'skirts', 'trousers'] as const;
const COLOR_OPTIONS     = ['neutrals', 'black', 'ivory', 'chocolate', 'burgundy'] as const;
const SIZE_OPTIONS      = ['XS', 'S', 'M', 'L'] as const;
const SEASON_OPTIONS    = ['spring2026', 'summer2026', 'autumn2025', 'winter2025', 'spring2025', 'summer2025', 'autumn2024', 'winter2024'] as const;
const MATERIAL_OPTIONS  = ['silk', 'wool', 'cottonBlend', 'cashmere', 'linen'] as const;

const SORT_OPTIONS = ['newest', 'themeAz'] as const;

/* ------------------------------------------------------------------ */
/*  Gradient palette                                                   */
/* ------------------------------------------------------------------ */

const GRADIENTS: Record<string, string> = {
  evening:  'from-[#3b1a2e] to-[#6b3a5e]',
  office:   'from-[#2e2e2e] to-[#5a5a5a]',
  casual:   'from-[#7a6a5a] to-[#b8a898]',
  resort:   'from-[#8a7a5a] to-[#d4c9a8]',
  ceremony: 'from-[#1a1a2e] to-[#4a3a5e]',
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ShopClient({initialProducts}: {initialProducts?: ShopItem[]}) {
  const t = useTranslations('shop');
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';
  const searchParams = useSearchParams();

  /* ---- state ---- */
  const [items, setItems] = useState<ShopItem[]>(initialProducts ?? []);
  const [loading, setLoading] = useState(!initialProducts?.length);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string>('newest');
  const [sortPanelOpen, setSortPanelOpen] = useState(false);
  const [groupByTheme, setGroupByTheme] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    occasion: [],
    category: [],
    color: [],
    size: [],
    season: [],
    material: [],
  });

  /* ---- fetch products from API ---- */
  useEffect(() => {
    fetch(`${API_BASE}/api/catalog/products`)
      .then(res => res.json())
      .then((data: ShopItem[]) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  /* ---- season from URL ---- */
  const [seasonFilter, setSeasonFilter] = useState<string | null>(null);

  /* ---- apply URL params on mount ---- */
  useEffect(() => {
    const cat = searchParams.get('category');
    const occasion = searchParams.get('occasion');
    const season = searchParams.get('season');
    const sort = searchParams.get('sort');
    if (cat) {
      setFilters(prev => ({...prev, category: [cat]}));
      setFiltersOpen(true);
      setSortPanelOpen(true);
    }
    if (occasion) {
      setFilters(prev => ({...prev, occasion: [occasion]}));
      setFiltersOpen(true);
      setSortPanelOpen(true);
    }
    if (season) {
      setSeasonFilter(season);
    }
    if (sort && (SORT_OPTIONS as readonly string[]).includes(sort)) {
      setSortKey(sort);
      setSortPanelOpen(true);
    }
  }, [searchParams]);

  /* ---- filter toggle helper ---- */
  const toggleFilter = useCallback((group: FilterKey, value: string) => {
    setFilters(prev => {
      const current = prev[group];
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return {...prev, [group]: next};
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({occasion: [], category: [], color: [], size: [], season: [], material: []});
  }, []);

  /* ---- derived data ---- */
  const filteredAndSorted = useMemo(() => {
    let result = items.filter(item => {
      if (filters.occasion.length  > 0 && (!item.occasion || !filters.occasion.includes(item.occasion)))       return false;
      if (filters.category.length  > 0 && (!item.category || !filters.category.includes(item.category)))       return false;
      if (filters.color.length     > 0 && (!item.color || !filters.color.includes(item.color)))                return false;
      if (filters.size.length      > 0 && (!item.sizes || !filters.size.some(s => item.sizes!.includes(s))))   return false;
      if (filters.material.length  > 0 && (!item.material || !filters.material.includes(item.material)))       return false;
      if (filters.season.length    > 0 && (!item.collectionName || !filters.season.includes(item.collectionName))) return false;
      return true;
    });

    switch (sortKey) {
      case 'themeAz':   result = [...result].sort((a, b) => (a.occasion ?? '').localeCompare(b.occasion ?? '')); break;
      default: break;
    }

    return result;
  }, [items, filters, sortKey]);

  const grouped = useMemo(() => {
    if (!groupByTheme) return null;
    const map = new Map<string, ShopItem[]>();
    for (const item of filteredAndSorted) {
      const key = item.occasion ?? 'other';
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [groupByTheme, filteredAndSorted]);

  const activeFilterCount = Object.values(filters).reduce((sum, arr) => sum + arr.length, 0);

  /* ---- sort panel ---- */
  const handleSortSelect = (key: string) => {
    setSortKey(key);
    setSortPanelOpen(false);
  };

  /* ---- sub-components ---- */

  function FilterSection({
    label, group, options, translationPrefix,
  }: {
    label: string; group: FilterKey; options: readonly string[]; translationPrefix: string;
  }) {
    return (
      <div className="border-b border-[rgba(243,233,218,0.12)] pb-2.5">
        <p className="py-1.5 text-xs font-medium uppercase tracking-wide text-[var(--ink)]">
          {label}
        </p>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-0.5">
          {options.map(opt => {
            const checked = filters[group].includes(opt);
            return (
              <label key={opt} className="flex items-center gap-1.5 text-[13px] text-[var(--ink-soft)] hover:text-[var(--ink)] cursor-pointer leading-tight">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleFilter(group, opt)}
                  className="accent-[var(--accent)] h-3 w-3 rounded shrink-0"
                />
                {t(`${translationPrefix}.${opt}`)}
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  function ProductCard({item, idx}: {item: ShopItem; idx: number}) {
    const [hoverIndex, setHoverIndex] = useState(0);
    const [hovering, setHovering] = useState(false);
    const imgRef = useRef<HTMLDivElement>(null);
    const {isFavorite, toggleItem} = useFavorites();
    const fav = isFavorite(item.id);

    const allImages: string[] = useMemo(() => {
      const imgs: string[] = [];
      if (item.images) {
        try {
          const parsed = JSON.parse(item.images);
          if (Array.isArray(parsed)) {
            for (const img of parsed) {
              if (img && typeof img === 'object' && typeof img.src === 'string') {
                imgs.push(img.src.startsWith('/') ? `${API_BASE}${img.src}` : img.src);
              }
            }
          }
        } catch { /* ignore */ }
      }
      if (imgs.length === 0 && item.image) {
        imgs.push(item.image.startsWith('/') ? `${API_BASE}${item.image}` : item.image);
      }
      return imgs;
    }, [item.images, item.image]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
      if (allImages.length <= 1 || !imgRef.current) return;
      const rect = imgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const nextIdx = Math.min(Math.floor((x / rect.width) * allImages.length), allImages.length - 1);
      if (nextIdx !== hoverIndex) setHoverIndex(nextIdx);
    }, [allImages.length, hoverIndex]);

    const shownImage = hovering ? (allImages[hoverIndex] ?? allImages[0]) : allImages[0];
    const isEven = idx % 2 === 0;
    const badgeSide = isEven
      ? 'right-[-8px] sm:right-[-10px] -rotate-2'
      : 'left-[-8px] sm:left-[-10px] rotate-2';

    const onToggleFav = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggleItem({
        id: item.id,
        title: item.title,
        image: shownImage,
      });
    };

    return (
      <Link
        href={`/${locale}/product/${item.id}`}
        className={`group flex flex-col ${
          isEven ? 'self-start' : 'self-end'
        } w-[85%] sm:w-full sm:self-auto`}
      >
        <div className="relative w-full">
          {/* Scotch tape — декоративная бумажная лента сверху */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 -top-2 z-10 h-3.5 w-16 -translate-x-1/2 -rotate-[4deg] rounded-[2px] shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
            style={{
              background:
                'linear-gradient(120deg, rgba(212,165,116,0.35), rgba(168,122,72,0.25))',
            }}
          />

          {/* Фото */}
          <div
            ref={imgRef}
            className="relative overflow-hidden rounded-[4px] shadow-[0_18px_40px_rgba(0,0,0,0.4)]"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => {
              setHovering(false);
              setHoverIndex(0);
            }}
          >
            {allImages.length > 0 ? (
              <div className="aspect-[3/4] w-full">
                <img
                  src={shownImage}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div
                className={`aspect-[3/4] w-full bg-gradient-to-br ${
                  GRADIENTS[item.occasion ?? ''] ?? 'from-[#4a4a4a] to-[#7a7a7a]'
                }`}
              />
            )}

            {/* hover-gallery bar с индикатором кадра */}
            {allImages.length > 1 && hovering && (
              <div className="absolute bottom-2 left-2 right-2 flex gap-1">
                {allImages.map((_, i) => (
                  <div
                    key={i}
                    className={`h-[2px] flex-1 rounded-full transition-colors duration-150 ${
                      i === hoverIndex ? 'bg-white' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            )}

            {item.isTest && (
              <span className="absolute left-2 top-2 rounded-full bg-[var(--accent)]/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--paper-base)]">
                Demo
              </span>
            )}

            {/* Heart: visible on touch, fades-in on hover for pointer devices */}
            <button
              type="button"
              onClick={onToggleFav}
              aria-label={fav ? 'Убрать из избранного' : 'Добавить в избранное'}
              aria-pressed={fav}
              className={[
                'absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full',
                'border border-[rgba(243,233,218,0.1)] backdrop-blur',
                'transition-[opacity,transform] duration-300',
                'opacity-100',
                '[@media(hover:hover)]:opacity-0',
                '[@media(hover:hover)]:group-hover:opacity-100',
                '[@media(hover:hover)]:group-focus-within:opacity-100',
                'focus-visible:opacity-100 focus:outline-none',
                fav
                  ? 'bg-[rgba(212,165,116,0.18)] text-[var(--accent)]'
                  : 'bg-[rgba(30,18,13,0.6)] text-[var(--ink)]',
              ].join(' ')}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill={fav ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>

          {/* Отваливающийся badge c номером / названием / ценой */}
          <div
            className={`absolute bottom-[-16px] z-10 rounded-[2px] border px-3.5 py-2 backdrop-blur-md transition-transform duration-300 group-hover:-translate-y-0.5 ${badgeSide}`}
            style={{
              background: 'rgba(30,18,13,0.92)',
              borderColor: 'rgba(212,165,116,0.3)',
            }}
          >
            <div className="mb-0.5 text-[9px] uppercase tracking-[0.2em] text-[var(--accent)]">
              No.&nbsp;{String(idx + 1).padStart(2, '0')}
            </div>
            <div className="font-display text-[15px] leading-none text-[var(--ink)]">
              {item.title}
            </div>
            <div className="mt-0.5 font-accent text-[12px] italic text-[var(--ink-soft)]">
              €{item.price.toLocaleString()}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 pt-28 pb-10 sm:px-6 lg:px-8">
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-center">
            <Spinner size="lg" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-28 pb-10 sm:px-6 lg:px-8">
      {/* ---- tag ---- */}
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
        {t('tag')}
      </p>

      {/* ---- toolbar ---- */}
      <div className="relative z-20 flex flex-wrap items-end gap-6 sm:gap-8 border-b border-[rgba(243,233,218,0.08)] pb-5">
        <h1 className="text-2xl font-light tracking-tight text-[var(--ink)] sm:text-3xl">
          {t('title')}
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          {/* group-by toggle */}
          <label className="lux-control flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--ink-soft)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={groupByTheme}
              onChange={() => setGroupByTheme(prev => !prev)}
              className="accent-[var(--accent)] h-3.5 w-3.5 rounded"
            />
            <span className="tracking-wide">{t('groupByTheme')}</span>
          </label>

          {/* sort button */}
          <button
            onClick={() => setSortPanelOpen(prev => !prev)}
            className="lux-control flex items-center gap-2 px-4 py-2 text-sm tracking-wide text-[var(--ink)]"
          >
            {t('sortBy')}: {t(`sort.${sortKey}`)}
            <svg width="12" height="12" viewBox="0 0 12 12" className={`transition-transform duration-200 ${sortPanelOpen ? 'rotate-180' : ''}`}>
              <path d="M3 5l3 3 3-3" stroke="var(--accent)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            </svg>
          </button>

          {/* filter toggle */}
          <button
            onClick={() => setFiltersOpen(prev => !prev)}
            className="lux-btn-secondary !py-2 !px-4 !text-xs"
          >
            {filtersOpen ? t('hideFilters') : t('showFilters')}
            {activeFilterCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-[var(--paper-base)]">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ---- sort panel overlay ---- */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          sortPanelOpen ? 'max-h-48 opacity-100 mt-4 mb-2' : 'max-h-0 opacity-0 mt-0 mb-0'
        }`}
      >
        <div className="lux-control flex flex-wrap gap-2 p-4">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => handleSortSelect(opt)}
              className={`rounded-full px-5 py-2.5 text-sm tracking-wide transition-all duration-200 ${
                sortKey === opt
                  ? 'bg-[var(--accent)] text-[var(--paper-base)]'
                  : 'bg-transparent text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--ink)]/5'
              }`}
            >
              {t(`sort.${opt}`)}
            </button>
          ))}
        </div>
      </div>

      {/* ---- main area ---- */}
      <div className="mt-6 flex flex-col gap-8 sm:flex-row">
        {/* ---- filter sidebar (independent scroll) ---- */}
        {filtersOpen && (
          <aside className="w-full shrink-0 sm:w-64 lg:w-80 sm:sticky sm:top-24 sm:self-start">
            <div className="lux-control flex flex-col gap-1.5 p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--ink-soft)]">
                  {t('showFilters')}
                </span>
                {activeFilterCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-[var(--accent)] underline underline-offset-2 hover:no-underline"
                  >
                    {t('resetFilters')}
                  </button>
                )}
              </div>

              <FilterSection label={t('filters.occasion')}  group="occasion"  options={OCCASION_OPTIONS}  translationPrefix="occasions" />
              <FilterSection label={t('filters.category')}  group="category"  options={CATEGORY_OPTIONS}  translationPrefix="categories" />
              <FilterSection label={t('filters.color')}     group="color"     options={COLOR_OPTIONS}     translationPrefix="colors" />
              <FilterSection label={t('filters.size')}      group="size"      options={SIZE_OPTIONS}      translationPrefix="sizes" />
              <FilterSection label={t('filters.season')}    group="season"    options={SEASON_OPTIONS}    translationPrefix="seasons" />
              <FilterSection label={t('filters.material')}  group="material"  options={MATERIAL_OPTIONS}  translationPrefix="materials" />
            </div>
          </aside>
        )}

        {/* ---- grid (independent scroll) ---- */}
        <div className="min-w-0 flex-1">
          {filteredAndSorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <p className="text-lg text-[var(--ink-soft)]">{t('noResults')}</p>
              <button onClick={resetFilters} className="lux-btn-secondary">{t('resetFilters')}</button>
            </div>
          ) : groupByTheme && grouped ? (
            <div className="flex flex-col gap-14">
              {[...grouped.entries()].map(([occasion, groupItems]) => (
                <div key={occasion}>
                  <h2 className="mb-6 text-lg font-medium tracking-wide text-[var(--ink)]">
                    {t(`occasions.${occasion}`)}
                  </h2>
                  <div className="flex flex-col gap-y-14 sm:grid sm:grid-cols-2 sm:gap-x-4 sm:gap-y-14 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-16">
                    {groupItems.map((item, idx) => <ProductCard key={item.id} item={item} idx={idx} />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-y-14 sm:grid sm:grid-cols-2 sm:gap-x-4 sm:gap-y-14 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-16">
              {filteredAndSorted.map((item, idx) => <ProductCard key={item.id} item={item} idx={idx} />)}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
