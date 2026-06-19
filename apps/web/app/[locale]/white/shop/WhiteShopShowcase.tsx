'use client';

import {useMemo, useState} from 'react';
import {createPortal} from 'react-dom';
import {useWhitePortal} from '../../../../hooks/useWhitePortal';
import WhiteHeader from '../WhiteHeader';
import WhiteFooter from '../WhiteFooter';
import {INK, MUTED, HAIR, SIGNAL} from '../wv-palette';
import {WHITE_PRODUCTS as ITEMS, type WhiteProduct as Item, type WhiteCat as Cat} from '../products';

// Variant 2 "White" — shop / catalog grid with filters + sort. Same portal
// technique as the landing/PDP. Catalog lives in ../products (shared with the
// PDP so a card opens that product). Placeholder imagery (Higgsfield later).

type Sort = 'new' | 'asc' | 'desc';

export default function WhiteShopShowcase({locale, initialCat = 'all', initialQuery = ''}: {locale: string; initialCat?: Cat | 'all'; initialQuery?: string}) {
  const mounted = useWhitePortal();
  const [cat, setCat] = useState<Cat | 'all'>(initialCat);
  const [sort, setSort] = useState<Sort>('new');
  const [query, setQuery] = useState(initialQuery);
  const ru = locale === 'ru';
  const t = (en: string, rus: string) => (ru ? rus : en);

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

  const catLabels: Record<Cat | 'all', string> = {
    all: t('All', 'Все'),
    dresses: t('Dresses', 'Платья'),
    outerwear: t('Outerwear', 'Верхняя одежда'),
    knitwear: t('Knitwear', 'Трикотаж'),
    tailoring: t('Tailoring', 'Костюмы'),
    skirts: t('Skirts', 'Юбки'),
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = cat === 'all' ? ITEMS : ITEMS.filter((i) => i.cat === cat);
    // Free-text match against both locales so "dress" and "платье" both work.
    if (q) filtered = filtered.filter((i) => `${i.en} ${i.ru}`.toLowerCase().includes(q));
    const price = (i: Item) => i.sale ?? i.price;
    if (sort === 'asc') return [...filtered].sort((a, b) => price(a) - price(b));
    if (sort === 'desc') return [...filtered].sort((a, b) => price(b) - price(a));
    return filtered;
  }, [cat, sort, query]);

  if (!mounted) return null;

  const cats: (Cat | 'all')[] = ['all', 'dresses', 'outerwear', 'knitwear', 'tailoring', 'skirts'];
  const fmt = (n: number) => `${n.toLocaleString('ru-RU')} ₽`;
  // Pluralised item count: en item/items, ru 3-form (one/few/many).
  const itemsLabel = (n: number) => {
    if (!ru) return n === 1 ? 'item' : 'items';
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 'товар';
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'товара';
    return 'товаров';
  };

  return createPortal(
    <div className="wv-root fixed inset-0 z-[1000] overflow-y-auto bg-white font-sans antialiased" style={{color: INK}}>
      {/* Header */}
      <WhiteHeader
        locale={locale}
        left={
          <a href={`/${locale}/white`} className="text-[12px] uppercase tracking-[0.18em] transition-opacity hover:opacity-60" style={{color: MUTED}}>
            ← {t('Home', 'Главная')}
          </a>
        }
        right={<a href={`/${locale}/white/bag`} aria-label={t('Bag, 0 items', 'Корзина, 0 товаров')} className="text-[12px] uppercase tracking-[0.18em] transition-opacity hover:opacity-60" style={{color: MUTED}}>{t('Bag (0)', 'Корзина (0)')}</a>}
      />

      <div className="mx-auto max-w-[1400px] px-6 sm:px-10">
        {/* Title */}
        <div className="flex items-baseline justify-between pt-12 pb-6">
          <h1 className="font-display text-[34px] font-light tracking-tight sm:text-[44px]">{t('Shop', 'Магазин')}</h1>
          <span aria-live="polite" aria-atomic="true" className="text-[12px] uppercase tracking-[0.16em] tabular-nums" style={{color: MUTED}}>
            {shown.length} {itemsLabel(shown.length)}
          </span>
        </div>

        {/* Search — free-text filter by product name (en+ru). Hairline underline, square. */}
        <div className="pb-6">
          <label htmlFor="wv-shop-search" className="sr-only">{t('Search products', 'Поиск по товарам')}</label>
          <input
            id="wv-shop-search"
            type="search"
            value={query}
            onChange={(e) => pickQuery(e.target.value)}
            placeholder={t('Search the collection', 'Поиск по коллекции')}
            className="w-full border-b bg-transparent pb-2 text-[15px] outline-none placeholder:text-[#8c837a]"
            style={{borderColor: HAIR, color: INK}}
          />
        </div>

        {/* Filter bar */}
        <div className="flex flex-col gap-4 border-y py-4 sm:flex-row sm:items-center sm:justify-between" style={{borderColor: HAIR}}>
          <div className="-mx-1 flex gap-1 overflow-x-auto sm:mx-0 sm:flex-wrap">
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
                {catLabels[c]}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em]" style={{color: MUTED}}>
            {t('Sort', 'Сортировка')}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="cursor-pointer border-b bg-transparent py-1 text-[12px] uppercase tracking-[0.14em] outline-none"
              style={{color: INK, borderColor: MUTED}}
            >
              <option value="new">{t('Newest', 'Новизна')}</option>
              <option value="asc">{t('Price: low to high', 'Цена: по возр.')}</option>
              <option value="desc">{t('Price: high to low', 'Цена: по убыв.')}</option>
            </select>
          </label>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-12 py-12 sm:gap-x-6 lg:grid-cols-3">
          {shown.map((p, i) => (
            <a key={p.key} href={`/${locale}/white/product?p=${p.key}`} className={`wv-card group block wv-rise wv-delay-${(i % 3) + 1}`}>
              <div className="wv-ph relative aspect-[2/3] w-full overflow-hidden">
                {p.sale && (
                  <span className="absolute left-3 top-3 text-[10px] uppercase tracking-[0.16em]" style={{color: SIGNAL}}>{t('Sale', 'Скидка')}</span>
                )}
                <span aria-hidden="true" className="wv-quickadd absolute inset-x-0 bottom-0 flex h-11 items-center justify-center bg-white/90 text-[11px] uppercase tracking-[0.2em] backdrop-blur-sm">
                  {t('Quick add', 'В корзину')}
                </span>
              </div>
              <div className="mt-4 text-center">
                <p className="text-[14px] tracking-wide transition-opacity group-hover:opacity-60">{t(p.en, p.ru)}</p>
                <p className="mt-1 text-[13px]" style={{color: p.sale ? SIGNAL : MUTED}}>
                  {p.sale ? (
                    <>
                      <s className="mr-2 line-through" style={{color: MUTED}}>
                        <span className="sr-only">{t('Regular price', 'Обычная цена')}: </span>{fmt(p.price)}
                      </s>
                      <span>
                        <span className="sr-only">{t('Sale price', 'Цена со скидкой')}: </span>{fmt(p.sale)}
                      </span>
                    </>
                  ) : (
                    fmt(p.price)
                  )}
                </p>
              </div>
            </a>
          ))}
        </div>

        {shown.length === 0 && (
          <p className="py-24 text-center text-[14px]" style={{color: MUTED}}>
            {query.trim()
              ? t(`Nothing found for “${query.trim()}”.`, `Ничего не найдено по «${query.trim()}».`)
              : t('Nothing here yet.', 'Здесь пока пусто.')}
          </p>
        )}
      </div>

      <WhiteFooter locale={locale} />
    </div>,
    document.body,
  );
}
