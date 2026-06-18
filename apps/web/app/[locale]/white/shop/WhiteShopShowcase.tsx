'use client';

import {useEffect, useMemo, useState} from 'react';
import {createPortal} from 'react-dom';

// Variant 2 "White" — shop / catalog grid with filters + sort. Same portal
// technique as the landing/PDP. Client-side filter + sort over a mock catalog
// to demonstrate the browse experience. Placeholder imagery (Higgsfield later).

const INK = '#1c1714';
const MUTED = '#8c837a';
const HAIR = '#e7e2db';
const SIGNAL = '#b4452f';

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
  const [mounted, setMounted] = useState(false);
  const [cat, setCat] = useState<Cat | 'all'>('all');
  const [sort, setSort] = useState<Sort>('new');
  const ru = locale === 'ru';
  const t = (en: string, rus: string) => (ru ? rus : en);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

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
    <div className="fixed inset-0 z-[1000] overflow-y-auto bg-white font-sans antialiased" style={{color: INK}}>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur-md" style={{borderBottom: `1px solid ${HAIR}`}}>
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5 sm:px-10">
          <a href={`/${locale}/white`} className="text-[12px] uppercase tracking-[0.18em] transition-opacity hover:opacity-60" style={{color: MUTED}}>
            ← {t('Home', 'Главная')}
          </a>
          <a href={`/${locale}/white`} className="font-display text-[22px] font-medium tracking-[0.42em] sm:text-[26px]">REINASLEO</a>
          <span className="text-[12px] uppercase tracking-[0.18em]" style={{color: MUTED}}>{t('Bag (0)', 'Корзина (0)')}</span>
        </div>
      </header>

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
                className="shrink-0 px-3.5 py-2 text-[12px] uppercase tracking-[0.14em] transition-colors"
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
              <div className="relative aspect-[2/3] w-full overflow-hidden" style={{background: 'linear-gradient(160deg,#f5f2ed,#e8e2d9)'}}>
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
                      <span className="mr-2 line-through" style={{color: MUTED}}>{fmt(p.price)}</span>
                      {fmt(p.sale)}
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

        <div className="pb-16 text-center">
          <a href={`/${locale}/white`} className="text-[12px] uppercase tracking-[0.18em] underline-offset-4 hover:underline" style={{color: MUTED}}>
            ← {t('Back to home', 'На главную')}
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}
