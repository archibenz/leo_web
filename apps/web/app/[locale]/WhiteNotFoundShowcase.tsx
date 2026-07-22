'use client';

import {useTranslations} from 'next-intl';
import {useWhiteBag} from '../../hooks/useWhiteBag';
import {useWhiteFavourites} from '../../hooks/useWhiteFavourites';
import WhiteHeader from './WhiteHeader';
import WhiteHeaderActions from './WhiteHeaderActions';
import WhiteFooter from './WhiteFooter';
import {MUTED} from './wv-palette';
import WhiteErrorFigure from './WhiteErrorFigure';

// Variant 2 "White" — 404. An unmatched storefront URL would otherwise fall to the
// dark gradient not-found, breaking the White experience. This keeps the segment
// consistent: a centred Cormorant statement with Home / Shop ways out, rendered
// through the same portal as the rest of the prototype. CSS-only reveal (wv-rise).

export default function WhiteNotFoundShowcase({locale}: {locale: string}) {
  const {count} = useWhiteBag();
  const {count: favCount} = useWhiteFavourites();
  const t = useTranslations('white.notFound');

  return (
    <>

      <main id="wv-main" tabIndex={-1} style={{outline: 'none'}} className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <div className="wv-rise">
          <WhiteErrorFigure left="4" right="4" />
        </div>
        <p className="wv-rise wv-delay-1 mt-8 text-[11px] uppercase tracking-[0.32em]" style={{color: MUTED}}>{t('eyebrow')}</p>
        <h1 className="wv-rise wv-delay-1 mt-4 font-display text-[clamp(30px,calc(2vw_+_22px),44px)] font-light leading-[1.05] tracking-[-0.01em]">{t('title')}</h1>
        <p className="wv-rise wv-delay-2 mt-7 max-w-sm text-[15px] leading-relaxed" style={{color: MUTED}}>{t('intro')}</p>
        <div className="wv-rise wv-delay-3 mt-11 flex flex-col items-center gap-5">
          <a href={`/${locale}`} className="wv-btn inline-flex items-center justify-center px-9 py-4 text-[12px] uppercase tracking-[0.2em]">
            {t('home')}
          </a>
          <a
            href={`/${locale}/shop`}
            className="text-[12px] uppercase tracking-[0.2em] underline-offset-4 transition-opacity hover:opacity-60"
            style={{color: MUTED}}
          >
            {t('shop')}
          </a>
        </div>
      </main>
    </>
  );
}