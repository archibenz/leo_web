'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {getSizeChart} from '../lib/sizeChartData';
import {useFocusTrap} from '../lib/useFocusTrap';

interface SizeChartProps {
  open: boolean;
  onClose: () => void;
  category: string | null;
}

export default function SizeChart({open, onClose, category}: SizeChartProps) {
  const t = useTranslations('product.sizeChart');
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // The size table is wider than a phone (7 columns); track scroll position so
  // the edge fades only show when there is actually more table off-screen.
  const [edges, setEdges] = useState({left: false, right: false});

  const syncEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 2,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
    });
  }, []);

  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  // Measure the table's overflow once it is in the DOM and on resize/category
  // change, so the scroll-edge fades reflect the real overflow on any width.
  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(syncEdges);
    window.addEventListener('resize', syncEdges);
    // Web fonts change column widths as they load; an early measure can read a
    // stale fallback-font overflow (e.g. a phantom fade on desktop). Re-measure
    // once fonts settle.
    document.fonts?.ready.then(syncEdges);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener('resize', syncEdges);
    };
  }, [open, category, syncEdges]);

  if (!open) return null;

  const chart = getSizeChart(category);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xl"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="size-chart-title"
    >
      <div
        ref={dialogRef}
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[var(--paper)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full text-[var(--ink)] transition hover:bg-[var(--ink)]/5"
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

        <div className="relative mt-5">
          <div
            ref={scrollRef}
            onScroll={syncEdges}
            className="overflow-x-auto rounded-xl border border-[var(--ink)]/10"
          >
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--ink)]/10 bg-[var(--ink)]/[0.02]">
                <th scope="col" className="sticky left-0 z-20 border-r border-[var(--ink)]/10 bg-[var(--paper)] px-3 py-2 text-left font-medium text-[var(--ink-soft)]">
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
                    <th scope="row" className="sticky left-0 z-10 border-r border-[var(--ink)]/10 bg-[var(--paper)] px-3 py-2.5 text-left font-normal text-[var(--ink-soft)]">
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
          {/* Scroll-edge fades — only visible while the table has more columns
              off-screen in that direction. Decorative; the table itself scrolls. */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 left-0 w-8 rounded-l-xl bg-gradient-to-r from-[var(--paper)] to-transparent transition-opacity duration-200 ${edges.left ? 'opacity-100' : 'opacity-0'}`}
          />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-xl bg-gradient-to-l from-[var(--paper)] to-transparent transition-opacity duration-200 ${edges.right ? 'opacity-100' : 'opacity-0'}`}
          />
        </div>

        <div className="mt-5 flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-[var(--ink)]/15 bg-[var(--ink)]/[0.02] p-4 text-center">
          <p className="text-sm text-[var(--ink-soft)]">{t('photoComingSoon')}</p>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-[var(--ink-soft)]">{t('bodyNote')}</p>
      </div>
    </div>
  );
}
