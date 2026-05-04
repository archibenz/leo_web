'use client';

import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';

export interface FilterValues {
  occasion: string[];
  category: string[];
  color: string[];
  size: string[];
  badge: string[];
}

export const EMPTY_FILTERS: FilterValues = {
  occasion: [],
  category: [],
  color: [],
  size: [],
  badge: [],
};

const OCCASION_OPTIONS = ['evening', 'office', 'casual', 'resort', 'ceremony'] as const;
const CATEGORY_OPTIONS = ['dresses', 'outerwear', 'tailoring', 'knitwear', 'blouses', 'skirts', 'trousers'] as const;
const COLOR_OPTIONS = ['neutrals', 'black', 'ivory', 'chocolate', 'burgundy'] as const;
const SIZE_OPTIONS = ['XS', 'S', 'M', 'L'] as const;
const BADGE_OPTIONS = ['new', 'popular'] as const;

interface FilterBarProps {
  locale: string;
  filters: FilterValues;
  setFilters: (next: FilterValues) => void;
  resultCount: number;
}

export default function FilterBar({locale, filters, setFilters, resultCount}: FilterBarProps) {
  const isRu = locale === 'ru';
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const totalActive =
    filters.occasion.length +
    filters.category.length +
    filters.color.length +
    filters.size.length +
    filters.badge.length;

  const toggle = (group: keyof FilterValues, value: string) => {
    const current = filters[group];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    setFilters({...filters, [group]: next});
  };

  const reset = () => setFilters(EMPTY_FILTERS);

  const occasionLabels: Record<string, string> = isRu
    ? {evening: 'Вечер', office: 'Офис', casual: 'Повседневный', resort: 'Курорт', ceremony: 'Торжество'}
    : {evening: 'Evening', office: 'Office', casual: 'Casual', resort: 'Resort', ceremony: 'Ceremony'};

  const categoryLabels: Record<string, string> = isRu
    ? {dresses: 'Платья', outerwear: 'Верхняя одежда', tailoring: 'Костюмы', knitwear: 'Трикотаж', blouses: 'Блузы', skirts: 'Юбки', trousers: 'Брюки'}
    : {dresses: 'Dresses', outerwear: 'Outerwear', tailoring: 'Tailoring', knitwear: 'Knitwear', blouses: 'Blouses', skirts: 'Skirts', trousers: 'Trousers'};

  const colorLabels: Record<string, string> = isRu
    ? {neutrals: 'Нейтральные', black: 'Чёрный', ivory: 'Слоновая кость', chocolate: 'Шоколад', burgundy: 'Бордо'}
    : {neutrals: 'Neutrals', black: 'Black', ivory: 'Ivory', chocolate: 'Chocolate', burgundy: 'Burgundy'};

  const sizeLabels: Record<string, string> = {XS: 'XS', S: 'S', M: 'M', L: 'L'};

  const badgeLabels: Record<string, string> = isRu
    ? {new: 'Новое', popular: 'Популярное'}
    : {new: 'New', popular: 'Popular'};

  const content = (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 z-[200] flex items-center justify-between gap-3 px-4"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + var(--shop-chrome-filter, 84px))',
          transition: 'top 0.3s ease-out',
        }}
      >
        <span className="rounded-full border border-[var(--accent)]/30 bg-paper/70 px-3 py-1 font-sans text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-soft)] backdrop-blur-md">
          {isRu ? 'Новый сезон' : 'New season'}
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/55 bg-paper/80 px-3.5 py-1.5 backdrop-blur-md transition-colors duration-200 hover:bg-paper"
          aria-label={isRu ? 'Открыть фильтры' : 'Open filters'}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M3 6h18M6 12h12M10 18h4" strokeLinecap="round" />
          </svg>
          <span className="font-sans text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink)]">
            {isRu ? 'Фильтры' : 'Filters'}
            {totalActive ? (
              <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-semibold text-paper">
                {totalActive}
              </span>
            ) : null}
          </span>
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[300] flex flex-col" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex-1 bg-black/65 backdrop-blur-sm"
            aria-label={isRu ? 'Закрыть' : 'Close'}
          />
          <div
            className="rounded-t-3xl border-t border-[var(--accent)]/30 bg-paper px-6 pt-4"
            style={{paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))'}}
          >
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-[var(--ink-soft)]/40" />
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-[22px] font-light tracking-tight text-[var(--ink)]">
                {isRu ? 'Фильтры' : 'Filters'}
              </h3>
              <div className="flex items-center gap-3">
                {totalActive > 0 ? (
                  <button
                    onClick={reset}
                    className="font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
                  >
                    {isRu ? 'Сбросить' : 'Reset'}
                  </button>
                ) : null}
                <button
                  onClick={() => setOpen(false)}
                  className="font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
                >
                  {isRu ? 'Закрыть' : 'Close'}
                </button>
              </div>
            </div>

            <div
              className="max-h-[58vh] space-y-5 overflow-y-auto pr-1"
              style={{overscrollBehavior: 'contain'}}
            >
              <FilterGroup
                title={isRu ? 'Подборка' : 'Selection'}
                options={BADGE_OPTIONS as unknown as string[]}
                values={filters.badge}
                labels={badgeLabels}
                onToggle={(v) => toggle('badge', v)}
              />
              <FilterGroup
                title={isRu ? 'Случай' : 'Occasion'}
                options={OCCASION_OPTIONS as unknown as string[]}
                values={filters.occasion}
                labels={occasionLabels}
                onToggle={(v) => toggle('occasion', v)}
              />
              <FilterGroup
                title={isRu ? 'Категория' : 'Category'}
                options={CATEGORY_OPTIONS as unknown as string[]}
                values={filters.category}
                labels={categoryLabels}
                onToggle={(v) => toggle('category', v)}
              />
              <FilterGroup
                title={isRu ? 'Цвет' : 'Color'}
                options={COLOR_OPTIONS as unknown as string[]}
                values={filters.color}
                labels={colorLabels}
                onToggle={(v) => toggle('color', v)}
              />
              <FilterGroup
                title={isRu ? 'Размер' : 'Size'}
                options={SIZE_OPTIONS as unknown as string[]}
                values={filters.size}
                labels={sizeLabels}
                onToggle={(v) => toggle('size', v)}
              />
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3.5 font-sans text-[12px] font-medium uppercase tracking-[0.22em] text-paper transition-colors duration-200 hover:bg-[var(--ink)]"
            >
              {isRu ? `Показать ${resultCount}` : `Show ${resultCount}`}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}

interface FilterGroupProps {
  title: string;
  options: string[];
  values: string[];
  labels: Record<string, string>;
  onToggle: (value: string) => void;
}

function FilterGroup({title, options, values, labels, onToggle}: FilterGroupProps) {
  return (
    <div>
      <p className="mb-2 font-accent text-[10px] uppercase tracking-[0.3em] text-[var(--accent)]/80">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = values.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={`inline-flex items-center rounded-full border px-3.5 py-1.5 font-sans text-[12px] tracking-wide transition-colors duration-150 ${
                active
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-paper'
                  : 'border-[var(--accent)]/30 bg-transparent text-[var(--ink)] hover:border-[var(--accent)]/60'
              }`}
            >
              {labels[opt] ?? opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
