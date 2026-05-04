'use client';

import {useEffect, useState} from 'react';

interface FilterBarProps {
  locale: string;
}

export default function FilterBar({locale}: FilterBarProps) {
  const isRu = locale === 'ru';
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 z-[60] flex items-center justify-between gap-3 px-4"
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
          </span>
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[120] flex flex-col" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex-1 bg-black/65 backdrop-blur-sm"
            aria-label={isRu ? 'Закрыть' : 'Close'}
          />
          <div
            className="rounded-t-3xl border-t border-[var(--accent)]/30 bg-paper px-6 pt-5"
            style={{paddingBottom: 'max(2rem, env(safe-area-inset-bottom))'}}
          >
            <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-[var(--ink-soft)]/40" />
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-display text-[22px] font-light tracking-tight text-[var(--ink)]">
                {isRu ? 'Фильтры' : 'Filters'}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
              >
                {isRu ? 'Закрыть' : 'Close'}
              </button>
            </div>
            <p className="text-[13px] leading-relaxed text-[var(--ink-soft)]">
              {isRu
                ? 'Фильтры по случаю, цвету и размеру скоро появятся здесь. Пока — листайте каталог.'
                : 'Filters by occasion, color and size will appear here soon. For now — browse the catalog.'}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
