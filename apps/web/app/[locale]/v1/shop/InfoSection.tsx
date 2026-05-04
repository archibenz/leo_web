'use client';

import Link from 'next/link';

interface InfoSectionProps {
  total: number;
  locale: string;
  zIndex: number;
}

export default function InfoSection({total, locale, zIndex}: InfoSectionProps) {
  const isRu = locale === 'ru';
  const year = new Date().getFullYear();

  return (
    <div
      className="sticky top-[108px] flex h-[calc(100dvh-108px)] flex-col bg-paper px-8"
      style={{zIndex}}
    >
      <div className="flex flex-1 items-center">
        <div className="flex max-w-[420px] flex-col items-start gap-5">
          <p className="font-accent text-[10px] uppercase tracking-[0.3em] text-[var(--accent)]">
            {isRu ? 'Это весь каталог' : 'End of catalog'}
          </p>
          <h2 className="font-display text-[34px] font-light leading-[1.05] tracking-tight text-[var(--ink)]">
            REINASLEO
          </h2>
          <p className="text-[14px] leading-relaxed text-[var(--ink-soft)]">
            {isRu
              ? `Вы просмотрели ${total} образов сезона. Каждая вещь шьётся по индивидуальной выкройке в Москве.`
              : `You've seen ${total} looks of the season. Every piece is cut to bespoke patterns in Moscow.`}
          </p>
          <Link
            href={`/${locale}/contact`}
            className="mt-1 inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-paper transition-colors duration-200 hover:bg-[var(--ink)]"
          >
            {isRu ? 'Связаться' : 'Contact'}
          </Link>
        </div>
      </div>

      <div
        className="border-t border-[var(--accent)]/15 pt-4 text-center font-sans text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)]/70"
        style={{paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'}}
      >
        © {year} REINASLEO. {isRu ? 'Все права защищены' : 'All rights reserved'}
      </div>
    </div>
  );
}
