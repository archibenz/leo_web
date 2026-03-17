'use client';

import {useState, useMemo, useCallback, useEffect, useRef} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname, useSearchParams} from 'next/navigation';
import Spinner from './ui/Spinner';
import Link from 'next/link';

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

type FilterKey = 'occasion' | 'category' | 'color' | 'size' | 'price' | 'material';

interface Filters {
  occasion: string[];
  category: string[];
  color: string[];
  size: string[];
  price: string[];
  material: string[];
}

/* ------------------------------------------------------------------ */
/*  Filter option definitions                                          */
/* ------------------------------------------------------------------ */

const OCCASION_OPTIONS  = ['evening', 'office', 'casual', 'resort', 'ceremony'] as const;
const CATEGORY_OPTIONS  = ['dresses', 'outerwear', 'tailoring', 'knitwear', 'blouses', 'skirts', 'trousers'] as const;
const COLOR_OPTIONS     = ['neutrals', 'black', 'ivory', 'chocolate', 'burgundy'] as const;
const SIZE_OPTIONS      = ['XS', 'S', 'M', 'L'] as const;
const PRICE_OPTIONS     = ['under200', 'r200to500', 'r500to800', 'r800to1200', 'over1200'] as const;
const MATERIAL_OPTIONS  = ['silk', 'wool', 'cottonBlend', 'cashmere', 'linen'] as const;

const SORT_OPTIONS = ['newest', 'priceLow', 'priceHigh', 'themeAz'] as const;

/* ------------------------------------------------------------------ */
/*  Price range helper                                                 */
/* ------------------------------------------------------------------ */

function matchesPriceRange(price: number, range: string): boolean {
  switch (range) {
    case 'under200':   return price < 200;
    case 'r200to500':  return price >= 200 && price <= 500;
    case 'r500to800':  return price > 500 && price <= 800;
    case 'r800to1200': return price > 800 && price <= 1200;
    case 'over1200':   return price > 1200;
    default:           return false;
  }
}

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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ShopClient() {
  const t = useTranslations('shop');
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';
  const searchParams = useSearchParams();

  /* ---- state ---- */
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string>('newest');
  const [sortPanelOpen, setSortPanelOpen] = useState(false);
  const [groupByTheme, setGroupByTheme] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    occasion: [],
    category: [],
    color: [],
    size: [],
    price: [],
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
    const season = searchParams.get('season');
    if (cat) {
      setFilters(prev => ({...prev, category: [cat]}));
      setFiltersOpen(true);
    }
    if (season) {
      setSeasonFilter(season);
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
    setFilters({occasion: [], category: [], color: [], size: [], price: [], material: []});
  }, []);

  /* ---- derived data ---- */
  const filteredAndSorted = useMemo(() => {
    let result = items.filter(item => {
      if (filters.occasion.length  > 0 && (!item.occasion || !filters.occasion.includes(item.occasion)))       return false;
      if (filters.category.length  > 0 && (!item.category || !filters.category.includes(item.category)))       return false;
      if (filters.color.length     > 0 && (!item.color || !filters.color.includes(item.color)))                return false;
      if (filters.size.length      > 0 && (!item.sizes || !filters.size.some(s => item.sizes!.includes(s))))   return false;
      if (filters.material.length  > 0 && (!item.material || !filters.material.includes(item.material)))       return false;
      if (filters.price.length     > 0 && !filters.price.some(r => matchesPriceRange(item.price, r))) return false;
      return true;
    });

    switch (sortKey) {
      case 'priceLow':  result = [...result].sort((a, b) => a.price - b.price); break;
      case 'priceHigh': result = [...result].sort((a, b) => b.price - a.price); break;
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
      <details className="group border-b border-[rgba(243,233,218,0.12)] pb-3" open>
        <summary className="flex cursor-pointer items-center justify-between py-2 text-sm font-medium tracking-wide text-[var(--ink)] select-none">
          {label}
          <span className="text-[var(--ink-soft)] transition-transform group-open:rotate-180">&#9662;</span>
        </summary>
        <div className="flex flex-col gap-1.5 pt-1 pl-1">
          {options.map(opt => {
            const checked = filters[group].includes(opt);
            return (
              <label key={opt} className="flex items-center gap-2 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleFilter(group, opt)}
                  className="accent-[var(--accent)] h-3.5 w-3.5 rounded"
                />
                {t(`${translationPrefix}.${opt}`)}
              </label>
            );
          })}
        </div>
      </details>
    );
  }

  function ProductCard({item}: {item: ShopItem}) {
    // Parse first image from images JSON
    let firstImage: string | null = null;
    if (item.images) {
      try {
        const parsed = JSON.parse(item.images);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].src) {
          firstImage = parsed[0].src;
        }
      } catch { /* ignore */ }
    }
    if (!firstImage && item.image) {
      firstImage = item.image;
    }

    return (
      <Link href={`/${locale}/product/${item.id}`} className="group flex flex-col">
        <div className="relative">
          {firstImage ? (
            <div className="aspect-[3/4] w-full rounded-[4px] overflow-hidden">
              <img src={firstImage.startsWith('/') ? `${API_BASE}${firstImage}` : firstImage} alt={item.title} className="h-full w-full object-cover transition-opacity group-hover:opacity-90" />
            </div>
          ) : (
            <div
              className={`aspect-[3/4] w-full rounded-[4px] bg-gradient-to-br transition-opacity group-hover:opacity-90 ${GRADIENTS[item.occasion ?? ''] ?? 'from-[#4a4a4a] to-[#7a7a7a]'}`}
            />
          )}
          {item.isTest && (
            <span className="absolute top-2 left-2 rounded-full bg-[var(--accent)]/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--paper-base)]">
              Demo
            </span>
          )}
        </div>
        <div className="flex flex-col gap-px pt-2 pb-1">
          <span className="text-[11px] uppercase tracking-widest text-[var(--ink-soft)] sm:text-[12px]">
            {item.occasion ? t(`occasions.${item.occasion}`) : item.category ?? ''}
          </span>
          <h3 className="text-[15px] font-normal text-[var(--ink)] leading-snug sm:text-[16px]">{item.title}</h3>
          <span className="text-[15px] font-accent text-[var(--ink-soft)] sm:text-[16px]">&euro;{item.price.toLocaleString()}</span>
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
      <div className="relative z-20 flex flex-wrap items-end justify-between gap-4 border-b border-[rgba(243,233,218,0.08)] pb-5">
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
          <aside className="w-full shrink-0 sm:w-56 lg:w-64 sm:sticky sm:top-4 sm:self-start sm:max-h-[calc(100vh-2rem)] sm:overflow-y-auto scrollbar-none">
            <div className="lux-control flex flex-col gap-2 p-5">
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
              <FilterSection label={t('filters.price')}     group="price"     options={PRICE_OPTIONS}     translationPrefix="priceRanges" />
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
            <div className="flex flex-col gap-10">
              {[...grouped.entries()].map(([occasion, groupItems]) => (
                <div key={occasion}>
                  <h2 className="mb-4 text-lg font-medium tracking-wide text-[var(--ink)]">
                    {t(`occasions.${occasion}`)}
                  </h2>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-6 lg:grid-cols-3">
                    {groupItems.map(item => <ProductCard key={item.id} item={item} />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-6 lg:grid-cols-3">
              {filteredAndSorted.map(item => <ProductCard key={item.id} item={item} />)}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
