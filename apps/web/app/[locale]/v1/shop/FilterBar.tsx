'use client';

interface FilterBarProps {
  locale: string;
}

export default function FilterBar({locale}: FilterBarProps) {
  const isRu = locale === 'ru';

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[60] flex items-center justify-between gap-3 px-4"
      style={{
        top: 'calc(env(safe-area-inset-top, 0px) + 60px)',
      }}
    >
      <button
        type="button"
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/55 bg-black/40 px-3.5 py-1.5 backdrop-blur-md transition-colors duration-200 hover:bg-black/60"
        aria-label={isRu ? 'Открыть фильтры' : 'Open filters'}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M3 6h18M6 12h12M10 18h4" strokeLinecap="round" />
        </svg>
        <span className="font-sans text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink)]">
          {isRu ? 'Фильтры' : 'Filters'}
        </span>
      </button>

      <span className="rounded-full border border-[var(--accent)]/35 bg-black/35 px-3 py-1 font-sans text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-soft)] backdrop-blur-md">
        {isRu ? 'Новый сезон' : 'New season'}
      </span>
    </div>
  );
}
