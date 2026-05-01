'use client';

import Link from 'next/link';

interface InfoSectionProps {
  total: number;
  locale: string;
  zIndex: number;
}

export default function InfoSection({total, locale, zIndex}: InfoSectionProps) {
  const isRu = locale === 'ru';

  return (
    <div
      className="sticky top-0 flex h-[100dvh] flex-col justify-center bg-paper px-8"
      style={{zIndex}}
    >
      <div className="flex flex-col items-start gap-6">
        <p className="font-accent text-[10px] uppercase tracking-[0.3em] text-[var(--accent)]">
          {isRu ? 'Это весь каталог' : 'End of catalog'}
        </p>
        <h2 className="font-display text-[40px] font-light leading-[1.02] tracking-tight text-[var(--ink)]">
          REINASLEO
        </h2>
        <p className="text-[15px] leading-relaxed text-[var(--ink-soft)]">
          {isRu
            ? `Вы просмотрели все ${total} образов текущей коллекции. Премиальные ткани, скульптурные силуэты, точная посадка — каждая вещь шьётся по индивидуальной выкройке в Москве.`
            : `You've seen all ${total} looks of the current collection. Premium fabrics, sculpted silhouettes, precise fit — every piece is cut to bespoke patterns in Moscow.`}
        </p>
        <div className="flex w-full flex-col gap-3 pt-4">
          <Link
            href={`/${locale}/shop`}
            className="inline-flex items-center justify-center rounded-full border border-[var(--accent)] px-6 py-3 text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--accent)] transition-colors duration-200 hover:bg-[var(--accent)] hover:text-paper"
          >
            {isRu ? 'Полный каталог' : 'Full catalog'}
          </Link>
          <Link
            href={`/${locale}/contact`}
            className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-[11px] font-medium uppercase tracking-[0.22em] text-paper transition-colors duration-200 hover:bg-[var(--ink)]"
          >
            {isRu ? 'Связаться' : 'Contact'}
          </Link>
        </div>
      </div>
    </div>
  );
}
