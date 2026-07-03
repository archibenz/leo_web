'use client';

import {createPortal} from 'react-dom';
import {useTranslations} from 'next-intl';
import {useWhitePortal} from '../../../../hooks/useWhitePortal';
import {useWhiteBag} from '../../../../hooks/useWhiteBag';
import {useWhiteFavourites} from '../../../../hooks/useWhiteFavourites';
import WhiteHeader from '../WhiteHeader';
import WhiteHeaderActions from '../WhiteHeaderActions';
import WhiteFooter from '../WhiteFooter';
import {INK, MUTED, HAIR} from '../wv-palette';

// Variant 2 "White" — shared service-page surface (delivery, FAQ, care). One
// editorial statement column and a hairline-ruled list of short sections; the
// copy lives in white.info.<ns> so every page is the same calm shape. Same
// portal technique as the rest of the variant, CSS-only reveal.

export type WhiteInfoNs = 'delivery' | 'faq' | 'care';

export default function WhiteInfoShowcase({locale, ns}: {locale: string; ns: WhiteInfoNs}) {
  const mounted = useWhitePortal();
  const {count} = useWhiteBag();
  const {count: favCount} = useWhiteFavourites();
  const t = useTranslations(`white.info.${ns}`);
  const tc = useTranslations('white.contact');
  const sections = t.raw('sections') as {h: string; b: string}[];

  if (!mounted) return null;

  return createPortal(
    <div className="wv-root fixed inset-0 z-[1000] flex min-h-full flex-col overflow-y-auto bg-white font-sans antialiased" style={{color: INK}}>
      <WhiteHeader
        locale={locale}
        left={
          <a href={`/${locale}/white`} className="text-[12px] uppercase tracking-[0.18em] transition-opacity hover:opacity-60" style={{color: MUTED}}>
            ← {tc('back')}
          </a>
        }
        right={<WhiteHeaderActions locale={locale} favCount={favCount} count={count} />}
      />

      <main id="wv-main" tabIndex={-1} style={{outline: 'none'}} className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-20 sm:px-10 sm:py-28">
        <div className="grid gap-14 lg:grid-cols-[1fr_0.9fr] lg:gap-20">
          <div className="wv-rise">
            <p className="mb-7 text-[11px] uppercase tracking-[0.32em]" style={{color: MUTED}}>{t('eyebrow')}</p>
            <h1 className="font-display text-[clamp(44px,calc(3.6vw_+_30px),72px)] font-light leading-[0.95] tracking-[-0.01em]">{t('title')}</h1>
            <p className="mt-8 max-w-md text-[15px] leading-relaxed" style={{color: MUTED}}>{t('intro')}</p>
          </div>

          <div className="wv-rise wv-delay-1 border-t" style={{borderColor: HAIR}}>
            {sections.map((s) => (
              <div key={s.h} className="border-b py-7" style={{borderColor: HAIR}}>
                <h2 className="text-[13px] uppercase tracking-[0.18em]">{s.h}</h2>
                <p className="mt-3 max-w-lg text-[14px] leading-relaxed" style={{color: MUTED}}>{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <WhiteFooter locale={locale} />
    </div>,
    document.body,
  );
}
