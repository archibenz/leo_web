'use client';

import {createPortal} from 'react-dom';
import {useTranslations} from 'next-intl';
import {useWhitePortal} from '../../../hooks/useWhitePortal';
import {useWhiteBag} from '../../../hooks/useWhiteBag';
import {useWhiteFavourites} from '../../../hooks/useWhiteFavourites';
import WhiteHeader from './WhiteHeader';
import WhiteHeaderActions from './WhiteHeaderActions';
import WhiteFooter from './WhiteFooter';
import {INK, MUTED} from './wv-palette';

// Variant 2 "White" — 404. An unmatched /white/* URL would otherwise fall to the
// dark gradient not-found, breaking the White experience. This keeps the segment
// consistent: a centred Cormorant statement with Home / Shop ways out, rendered
// through the same portal as the rest of the prototype. CSS-only reveal (wv-rise).

export default function WhiteNotFoundShowcase({locale}: {locale: string}) {
  const mounted = useWhitePortal();
  const {count} = useWhiteBag();
  const {count: favCount} = useWhiteFavourites();
  const t = useTranslations('white.notFound');

  if (!mounted) return null;

  return createPortal(
    <div className="wv-root fixed inset-0 z-[1000] flex min-h-full flex-col overflow-y-auto bg-white font-sans antialiased" style={{color: INK}}>
      <WhiteHeader
        locale={locale}
        left={
          <a href={`/${locale}/white`} className="text-[12px] uppercase tracking-[0.18em] transition-opacity hover:opacity-60" style={{color: MUTED}}>
            ← {t('home')}
          </a>
        }
        right={<WhiteHeaderActions locale={locale} favCount={favCount} count={count} />}
      />

      <main id="wv-main" tabIndex={-1} style={{outline: 'none'}} className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="wv-rise text-[11px] uppercase tracking-[0.32em]" style={{color: MUTED}}>{t('eyebrow')}</p>
        <h1 className="wv-rise wv-delay-1 mt-6 font-display text-[clamp(40px,calc(3vw_+_28px),64px)] font-light leading-[1.0] tracking-[-0.01em]">{t('title')}</h1>
        <p className="wv-rise wv-delay-2 mt-7 max-w-sm text-[15px] leading-relaxed" style={{color: MUTED}}>{t('intro')}</p>
        <div className="wv-rise wv-delay-3 mt-11 flex flex-col items-center gap-5">
          <a href={`/${locale}/white`} className="wv-btn inline-flex items-center justify-center px-9 py-4 text-[12px] uppercase tracking-[0.2em]">
            {t('home')}
          </a>
          <a
            href={`/${locale}/white/shop`}
            className="text-[12px] uppercase tracking-[0.2em] underline-offset-4 transition-opacity hover:opacity-60"
            style={{color: MUTED}}
          >
            {t('shop')}
          </a>
        </div>
      </main>

      <WhiteFooter locale={locale} />
    </div>,
    document.body,
  );
}
