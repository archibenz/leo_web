'use client';

import {useTranslations} from 'next-intl';
import Link from 'next/link';
import {useParams} from 'next/navigation';
import {MUTED} from './wv-palette';
import WhiteErrorFigure from './WhiteErrorFigure';

// Render errors inside the storefront keep the chrome and answer in the same
// voice as the 404 — the diamond figure, one line, two ways out.

export default function WhiteError({reset}: {error: Error & {digest?: string}; reset: () => void}) {
  const t = useTranslations('white.error');
  const params = useParams<{locale: string}>();
  const locale = params?.locale ?? 'ru';

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="wv-rise">
        <WhiteErrorFigure left="5" right="0" />
      </div>
      <p className="wv-rise wv-delay-1 mt-8 text-[11px] uppercase tracking-[0.32em]" style={{color: MUTED}}>{t('eyebrow')}</p>
      <h1 className="wv-rise wv-delay-1 mt-4 font-display text-[clamp(30px,calc(2vw_+_22px),44px)] font-light leading-[1.05] tracking-[-0.01em]">{t('title')}</h1>
      <p className="wv-rise wv-delay-2 mt-6 max-w-sm text-[15px] leading-relaxed" style={{color: MUTED}}>{t('intro')}</p>
      <div className="wv-rise wv-delay-3 mt-10 flex flex-col items-center gap-5">
        <button type="button" onClick={reset} className="wv-btn inline-flex items-center justify-center px-9 py-4 text-[12px] uppercase tracking-[0.2em]">
          {t('retry')}
        </button>
        <Link href={`/${locale}`} className="wv-link text-[12px] uppercase tracking-[0.2em]" style={{color: MUTED}}>
          {t('home')}
        </Link>
      </div>
    </main>
  );
}
