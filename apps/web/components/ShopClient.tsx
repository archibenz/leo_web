'use client';

import {useState, useMemo, useCallback, useEffect, useRef} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname, useSearchParams} from 'next/navigation';
import BrandLoader from './BrandLoader';
import Link from 'next/link';
import Image from 'next/image';

import { API_BASE } from '../lib/api';
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

type Translator = ReturnType<typeof useTranslations>;

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

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

// Paths served by the Spring Boot API (uploads) get API_BASE prepended on SSR.
// Paths served by Next.js static (public/images) stay relative so both SSR and
// browser hit the same origin on port 3000.
function resolveAssetUrl(src: string): string {
  if (!src.startsWith('/')) return src;
  if (src.startsWith('/uploads/') || src.startsWith('/api/')) return `${API_BASE}${src}`;
  return src;
}

function useProductImages(item: ShopItem): string[] {
  return useMemo(() => {
    const imgs: string[] = [];
    if (item.images) {
      try {
        const parsed = JSON.parse(item.images);
        if (Array.isArray(parsed)) {
          for (const img of parsed) {
            if (img && typeof img === 'object' && typeof img.src === 'string') {
              imgs.push(resolveAssetUrl(img.src));
            }
          }
        }
      } catch { /* ignore */ }
    }
    if (imgs.length === 0 && item.image) {
      imgs.push(resolveAssetUrl(item.image));
    }
    return imgs;
  }, [item.images, item.image]);
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

interface FilterSectionProps {
  label: string;
  group: FilterKey;
  options: readonly string[];
  translationPrefix: string;
  filters: Filters;
  toggleFilter: (group: FilterKey, value: string) => void;
  t: Translator;
}

function FilterSection({
  label, group, options, translationPrefix, filters, toggleFilter, t,
}: FilterSectionProps) {
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

interface HeroCardProps {
  item: ShopItem;
  idx: number;
  locale: string;
  t: Translator;
  tLook: Translator;
}

function HeroCard({item, idx, locale, t, tLook}: HeroCardProps) {
  const images = useProductImages(item);
  const img = images[0];
  const [heroError, setHeroError] = useState(false);

  return (
    <Link
      href={`/${locale}/product/${item.id}`}
      className="group relative mb-14 block w-full overflow-hidden rounded-[4px] sm:mb-20"
    >
      <div className="relative aspect-[3/4] w-full sm:aspect-[16/10] lg:aspect-[21/10]">
        {img && !heroError ? (
          <Image
            src={img}
            alt={item.title}
            fill
            sizes="100vw"
            priority
            onError={() => setHeroError(true)}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
          />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${
            GRADIENTS[item.occasion ?? ''] ?? 'from-[#3a2018] to-[#8a5a3a]'
          } relative`}>
            <BrandWatermark />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(13,7,5,0.85)] via-[rgba(13,7,5,0.35)] to-transparent" />
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 px-5 pb-7 sm:px-10 sm:pb-10 lg:px-14 lg:pb-14">
        <div className="font-accent text-[10px] uppercase tracking-[0.25em] text-[var(--accent)] sm:text-[11px]">
          {tLook('lookNumber')} {String(idx + 1).padStart(2, '0')}
          <span className="mx-2 opacity-50">·</span>
          {item.occasion ? t(`occasions.${item.occasion}`) : tLook('author')}
        </div>
        <h2 className="font-display text-[32px] font-light leading-[1.05] tracking-tight text-[var(--ink)] sm:text-[44px] lg:text-[56px]">
          {item.title}
        </h2>
        <div className="flex items-end justify-between gap-4">
          <span className="font-accent text-[16px] italic text-[var(--ink-soft)] sm:text-[18px]">
            €{item.price.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--ink-soft)] transition-colors duration-200 group-hover:text-[var(--accent)] sm:text-[11px]">
            {tLook('openLook')}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:translate-x-1">
              <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>

      {item.isTest && (
        <span className="absolute left-4 top-4 rounded-full bg-[var(--accent)]/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--paper-base)] sm:left-8 sm:top-8">
          Demo
        </span>
      )}
    </Link>
  );
}

interface ListCardProps {
  item: ShopItem;
  idx: number;
  locale: string;
  t: Translator;
}

function ListCard({item, idx, locale, t}: ListCardProps) {
  const [hoverIndex, setHoverIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [imgError, setImgError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  const images = useProductImages(item);
  const multi = images.length > 1;

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!multi || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const next = Math.min(Math.floor((x / rect.width) * images.length), images.length - 1);
    if (next !== hoverIndex) setHoverIndex(next);
  }, [multi, images.length, hoverIndex]);

  // For single-image products keep src stable (no hover swap → no re-render).
  // For multi-image: only swap when actually hovering AND index differs from 0.
  const shown = multi && hovering ? (images[hoverIndex] ?? images[0]) : images[0];

  // Above-the-fold eager-load (hero=idx 0 already priority; first row after it = 1,2,3).
  const eager = idx <= 3;

  return (
    <Link href={`/${locale}/product/${item.id}`} className="group flex flex-col">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-accent text-[15px] italic text-[var(--accent)] sm:text-[17px]">
          № {String(idx + 1).padStart(2, '0')}
        </span>
        <span className="h-px flex-1 bg-[rgba(212,165,116,0.22)]" />
        <span className="text-[9px] uppercase tracking-[0.22em] text-[var(--ink-soft)]/60 sm:text-[10px]">
          {item.occasion ? t(`occasions.${item.occasion}`) : item.category ?? ''}
        </span>
      </div>

      <div
        ref={imgRef}
        className="relative overflow-hidden rounded-[4px]"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => { setHovering(false); setHoverIndex(0); }}
      >
        {images.length > 0 && !imgError ? (
          <div className="relative aspect-[3/4] w-full bg-[var(--ink)]/5">
            <Image
              src={shown}
              alt={item.title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              priority={eager}
              loading={eager ? 'eager' : 'lazy'}
              onError={() => setImgError(true)}
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
            />
            {multi && images.slice(1, 4).map((src, i) => (
              // Preload next few hover-images invisibly so the first hover swap is instant.
              // Using <link rel="preload"> would be cleaner but needs next/head inside client component.
              // Plain <img width=0 height=0> triggers the same browser fetch + cache.
              <img
                key={src}
                src={src}
                alt=""
                aria-hidden
                width={0}
                height={0}
                style={{position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none'}}
                loading="lazy"
              />
            ))}
          </div>
        ) : (
          <BrandFallback title={item.title} occasion={item.occasion} />
        )}

        {images.length > 1 && hovering && (
          <div className="absolute bottom-2 left-2 right-2 flex gap-1">
            {images.map((_, i) => (
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
      </div>

      <div className="mt-4 flex items-start justify-between gap-4">
        <h3 className="font-display text-[18px] font-normal leading-tight text-[var(--ink)] sm:text-[20px]">
          {item.title}
        </h3>
        <span className="whitespace-nowrap font-accent text-[16px] italic text-[var(--ink-soft)] sm:text-[18px]">
          €{item.price.toLocaleString()}
        </span>
      </div>
    </Link>
  );
}

function BrandWatermark() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="font-accent text-[32px] italic tracking-wider text-[var(--accent)]/40 sm:text-[48px]">
        REINASLEO
      </span>
    </div>
  );
}

function BrandFallback({title, occasion}: {title: string; occasion: string | null}) {
  const grad = GRADIENTS[occasion ?? ''] ?? 'from-[#3a2018] to-[#8a5a3a]';
  return (
    <div className={`relative aspect-[3/4] w-full bg-gradient-to-br ${grad}`}>
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 25% 30%, rgba(255,255,255,0.3) 0, transparent 40%), radial-gradient(circle at 70% 60%, rgba(255,255,255,0.15) 0, transparent 35%)',
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
        <span className="font-accent text-[20px] italic tracking-[0.2em] text-[var(--accent)]/70 sm:text-[24px]">
          REINASLEO
        </span>
        <span className="text-[10px] uppercase tracking-[0.25em] text-white/40 sm:text-[11px]">
          {title}
        </span>
      </div>
    </div>
  );
}

interface ProductCardProps {
  item: ShopItem;
  idx: number;
  locale: string;
  t: Translator;
  tLook: Translator;
}

function ProductCard({item, idx, locale, t, tLook}: ProductCardProps) {
  if (idx === 0) return <HeroCard item={item} idx={idx} locale={locale} t={t} tLook={tLook} />;
  return <ListCard item={item} idx={idx} locale={locale} t={t} />;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ShopClient({initialProducts}: {initialProducts?: ShopItem[]}) {
  const t = useTranslations('shop');
  const tLook = useTranslations('look');
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

  /* ---- fetch products from API (skip if SSR already provided them) ---- */
  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) return;
    const controller = new AbortController();
    fetch(`${API_BASE}/api/catalog/products`, {signal: controller.signal})
      .then(res => res.json())
      .then((data: ShopItem[]) => {
        if (!Array.isArray(data)) {
          console.error('Catalog response is not an array', data);
          setItems([]);
          setLoading(false);
          return;
        }
        setItems(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Failed to load catalog', err);
        setLoading(false);
      });
    return () => controller.abort();
  }, [initialProducts]);

  /* ---- season from URL ---- */
  const [seasonFilter, setSeasonFilter] = useState<string | null>(null);

  /* ---- apply URL params on mount ---- */
  // Фильтры применяются, но панель остаётся свёрнутой и на мобилке, и на ПК —
  // чтобы карточки были сразу видны. Активные фильтры показываются бейджем на кнопке.
  useEffect(() => {
    const cat = searchParams.get('category');
    const occasion = searchParams.get('occasion');
    const season = searchParams.get('season');
    const sort = searchParams.get('sort');
    if (cat) {
      setFilters(prev => ({...prev, category: [cat]}));
    }
    if (occasion) {
      setFilters(prev => ({...prev, occasion: [occasion]}));
    }
    if (season) {
      setSeasonFilter(season);
    }
    if (sort && (SORT_OPTIONS as readonly string[]).includes(sort)) {
      setSortKey(sort);
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

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 pt-28 pb-10 sm:px-6 lg:px-8">
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-center">
            <BrandLoader size={48} />
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

              <FilterSection label={t('filters.occasion')}  group="occasion"  options={OCCASION_OPTIONS}  translationPrefix="occasions"  filters={filters} toggleFilter={toggleFilter} t={t} />
              <FilterSection label={t('filters.category')}  group="category"  options={CATEGORY_OPTIONS}  translationPrefix="categories" filters={filters} toggleFilter={toggleFilter} t={t} />
              <FilterSection label={t('filters.color')}     group="color"     options={COLOR_OPTIONS}     translationPrefix="colors"     filters={filters} toggleFilter={toggleFilter} t={t} />
              <FilterSection label={t('filters.size')}      group="size"      options={SIZE_OPTIONS}      translationPrefix="sizes"      filters={filters} toggleFilter={toggleFilter} t={t} />
              <FilterSection label={t('filters.season')}    group="season"    options={SEASON_OPTIONS}    translationPrefix="seasons"    filters={filters} toggleFilter={toggleFilter} t={t} />
              <FilterSection label={t('filters.material')}  group="material"  options={MATERIAL_OPTIONS}  translationPrefix="materials"  filters={filters} toggleFilter={toggleFilter} t={t} />
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
                  <h2 className="mb-6 font-display text-[22px] font-light tracking-wide text-[var(--ink)] sm:text-[26px]">
                    {t(`occasions.${occasion}`)}
                  </h2>
                  <div className="flex flex-col gap-y-14 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-16 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-20">
                    {groupItems.map((item, i) => (
                      <ListCard key={item.id} item={item} idx={i} locale={locale} t={t} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAndSorted.length > 0 ? (
            <>
              {/* 05 Couture Display — hero "лицо коллекции" + классическая сетка с порядковыми номерами */}
              <HeroCard item={filteredAndSorted[0]} idx={0} locale={locale} t={t} tLook={tLook} />
              {filteredAndSorted.length > 1 && (
                <div className="flex flex-col gap-y-14 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-16 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-20">
                  {filteredAndSorted.slice(1).map((item, i) => (
                    <ListCard key={item.id} item={item} idx={i + 1} locale={locale} t={t} />
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
