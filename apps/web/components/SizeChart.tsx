'use client';

import {useEffect, useRef} from 'react';
import {useTranslations} from 'next-intl';
import {getSizeChart} from '../lib/sizeChartData';

interface SizeChartProps {
  open: boolean;
  onClose: () => void;
  category: string | null;
}

export default function SizeChart({open, onClose, category}: SizeChartProps) {
  const t = useTranslations('product.sizeChart');
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
      previousFocus?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const chart = getSizeChart(category);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="size-chart-title"
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[var(--paper)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink)] transition hover:bg-[var(--ink)]/5"
          aria-label={t('close')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>

        <h2 id="size-chart-title" className="pr-10 text-xl font-display text-[var(--ink)] sm:text-2xl">
          {t('title')}
        </h2>
        <p className="mt-1 text-xs text-[var(--ink-soft)]">{t('unit')}</p>

        <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--ink)]/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--ink)]/10 bg-[var(--ink)]/[0.02]">
                <th scope="col" className="px-3 py-2 text-left font-medium text-[var(--ink-soft)]">
                  {t('sizeHeader')}
                </th>
                {chart.sizes.map((size) => (
                  <th key={size.intl} scope="col" className="px-3 py-2 text-center font-medium text-[var(--ink)]">
                    <div>{size.intl}</div>
                    <div className="text-xs font-normal text-[var(--ink-soft)]">{size.ru}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.measurementOrder.map((key) => {
                const values = chart.values[key];
                return (
                  <tr key={key} className="border-b border-[var(--ink)]/5 last:border-b-0">
                    <th scope="row" className="px-3 py-2.5 text-left font-normal text-[var(--ink-soft)]">
                      {t(`measurements.${key}`)}
                    </th>
                    {values.map((v, i) => (
                      <td key={i} className="px-3 py-2.5 text-center text-[var(--ink)]">
                        {v}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-[var(--ink)]/15 bg-[var(--ink)]/[0.02] p-4 text-center">
          <p className="text-sm text-[var(--ink-soft)]">{t('photoComingSoon')}</p>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-[var(--ink-soft)]">{t('bodyNote')}</p>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full border border-[var(--ink)]/20 py-3 text-sm font-medium text-[var(--ink)] transition hover:border-[var(--ink)]/40"
        >
          {t('close')}
        </button>
      </div>
    </div>
  );
}
