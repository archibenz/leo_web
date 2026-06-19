'use client';

import {useMemo, useState} from 'react';
import {createPortal} from 'react-dom';
import {useWhitePortal} from '../../../../hooks/useWhitePortal';
import WhiteHeader from '../WhiteHeader';
import WhiteFooter from '../WhiteFooter';
import {INK, MUTED, HAIR, SIGNAL} from '../wv-palette';

// Variant 2 "White" — shop / catalog grid with filters + sort. Same portal
// technique as the landing/PDP. Client-side filter + sort over a mock catalog
// to demonstrate the browse experience. Placeholder imagery (Higgsfield later).

type Cat = 'dresses' | 'outerwear' | 'knitwear' | 'tailoring' | 'skirts';
type Item = {key: number; en: string; ru: string; cat: Cat; price: number; sale?: number};

const ITEMS: Item[] = [
  {key: 1, en: 'Silk Column Dress', ru: 'Шёлковое платье-колонна', cat: 'dresses', price: 24500},
  {key: 2, en: 'Sculpted Wool Coat', ru: 'Шерстяное пальто', cat: 'outerwear', price: 32900},
  {key: 3, en: 'Tailored Trousers', ru: 'Брюки прямого кроя', cat: 'tailoring', price: 14900, sale: 11900},
  {key: 4, en: 'Cashmere Knit', ru: 'Кашемировый джемпер', cat: 'knitwear', price: 19800},
  {key: 5, en: 'Pleated Midi Skirt', ru: 'Плиссированная юбка миди', cat: 'skirts', price: 16400},
  {key: 6, en: 'Structured Blazer', ru: 'Структурный блейзер', cat: 'tailoring', price: 27200},
  {key: 7, en: 'Bias Slip Dress', ru: 'Платье-комбинация', cat: 'dresses', price: 18900},
  {key: 8, en: 'Belted Trench', ru: 'Тренч с поясом', cat: 'outerwear', price: 34500},
  {key: 9, en: 'Ribbed Cardigan', ru: 'Кардиган в рубчик', cat: 'knitwear', price: 17600, sale: 13200},
];

type Sort = 'new' | 'asc' | 'desc';

export default function WhiteShopShowcase({locale}: {locale: string}) {
  const mounted = useWhitePortal();
  const [cat, setCat] = useState<Cat | 'all'>('all');
  const [sort, setSort] = useState<Sort>('new');
  const ru = locale === 'ru';
  const t = (en: string, rus: string) => (ru ? rus : en);

  const catLabels: Record<Cat | 'all', string> = {
    all: t('All', 'Все'),
    dresses: t('Dresses', 'Платья'),
    outerwear: t('Outerwear', 'Верхняя одежда'),
    knitwear: t('Knitwear', 'Трикотаж'),
    tailoring: t('Tailoring', 'Костюмы'),
    skirts: t('Skirts', 'Юбки'),
  };

  const shown = useMemo(() => {
    const filtered = cat === 'all' ? ITEMS : ITEMS.filter((i) => i.cat === cat);
    const price = (i: Item) => i.sale ?? i.price;
    if (sort === 'asc') return [...filtered].sort((a, b) => price(a) - price(b));
    if (sort === 'desc') return [...filtered].sort((a, b) => price(b) - price(a));
    return filtered;
  }, [cat, sort]);

  if (!mounted) return null;

  const cats: (Cat | 'all')[] = ['all', 'dresses', 'outerwear', 'knitwear', 'tailoring', 'skirts'];
  const fmt = (n: number) => `${n.toLocaleString('ru-RU')} ₽`;

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
        right={<span className="text-[12px] uppercase tracking-[0.18em]" style={{color: MUTED}}>{t('Bag (0)', 'Корзина (0)')}</span>}
      />

      <div className="mx-auto max-w-[1400px] px-6 sm:px-10">
        {/* Title */}
        <div className="flex items-baseline justify-between pt-12 pb-6">
          <h1 className="font-display text-[34px] font-light tracking-tight sm:text-[44px]">{t('Shop', 'Магазин')}</h1>
          <span className="text-[12px] uppercase tracking-[0.16em] tabular-nums" style={{color: MUTED}}>
            {shown.length} {t('items', 'товаров')}
          </span>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col gap-4 border-y py-4 sm:flex-row sm:items-center sm:justify-between" style={{borderColor: HAIR}}>
          <div className="-mx-1 flex gap-1 overflow-x-auto sm:mx-0 sm:flex-wrap">
            {cats.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
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
            <a key={p.key} href={`/${locale}/white/product`} className={`wv-card group block wv-rise wv-delay-${(i % 3) + 1}`}>
              <div className="wv-ph relative aspect-[2/3] w-full overflow-hidden">
                {p.sale && (
                  <span className="absolute left-3 top-3 text-[10px] uppercase tracking-[0.16em]" style={{color: SIGNAL}}>{t('Sale', 'Скидка')}</span>
                )}
                <span className="wv-quickadd absolute inset-x-0 bottom-0 flex h-11 items-center justify-center bg-white/90 text-[11px] uppercase tracking-[0.2em] backdrop-blur-sm">
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
          <p className="py-24 text-center text-[14px]" style={{color: MUTED}}>{t('Nothing here yet.', 'Здесь пока пусто.')}</p>
        )}
      </div>

      <WhiteFooter locale={locale} />
    </div>,
    document.body,
  );
}
