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
      className="sticky flex flex-col items-start justify-center bg-paper px-8"
      style={{
        top: 'calc(env(safe-area-inset-top, 0px) + 132px)',
        height: 'calc(100dvh - env(safe-area-inset-top, 0px) - 132px)',
        zIndex,
      }}
    >
      <div className="flex max-w-[420px] flex-col items-start gap-5">
        <h2 className="font-display text-[34px] font-light leading-[1.05] tracking-tight text-[var(--ink)]">
          REINASLEO
        </h2>
        <p className="text-[14px] leading-relaxed text-[var(--ink-soft)]">
          {isRu
            ? `${total} образов сезона. Каждая вещь шьётся по индивидуальной выкройке в Москве.`
            : `${total} looks of the season. Every piece is cut to bespoke patterns in Moscow.`}
        </p>
        <Link
          href={`/${locale}/contact`}
          className="mt-1 inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-paper transition-colors duration-200 hover:bg-[var(--ink)]"
        >
          {isRu ? 'Связаться' : 'Contact'}
        </Link>
      </div>
    </div>
  );
}
