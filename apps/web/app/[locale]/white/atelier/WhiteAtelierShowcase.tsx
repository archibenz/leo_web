'use client';

import Image from 'next/image';
import {createPortal} from 'react-dom';
import {useTranslations} from 'next-intl';
import {useWhitePortal} from '../../../../hooks/useWhitePortal';
import {useWhiteBag} from '../../../../hooks/useWhiteBag';
import {useWhiteFavourites} from '../../../../hooks/useWhiteFavourites';
import WhiteHeader from '../WhiteHeader';
import WhiteHeaderActions from '../WhiteHeaderActions';
import WhiteFooter from '../WhiteFooter';
import {WHITE_ATELIER_IMAGE} from '../products';
import {INK, MUTED, HAIR} from '../wv-palette';

// Variant 2 "White" — Atelier / About page. A real standalone editorial page so
// the prototype reads as a multi-page house, not a one-pager: a brand statement,
// the atelier image, and three numbered principles (echoing the menu's numbered
// motif). noindex (prototype). CSS-only reveal (wv-rise, reduced-motion-safe).

export default function WhiteAtelierShowcase({locale}: {locale: string}) {
  const mounted = useWhitePortal();
  const {count} = useWhiteBag();
  const {count: favCount} = useWhiteFavourites();
  const t = useTranslations('white.atelier');

  if (!mounted) return null;

  const principles = [
    {n: '01', label: t('p1Label'), body: t('p1Body')},
    {n: '02', label: t('p2Label'), body: t('p2Body')},
    {n: '03', label: t('p3Label'), body: t('p3Body')},
  ];

  return createPortal(
    <div className="wv-root fixed inset-0 z-[1000] flex min-h-full flex-col overflow-y-auto bg-white font-sans antialiased" style={{color: INK}}>
      <WhiteHeader
        locale={locale}
        left={
          <a href={`/${locale}/white`} className="text-[12px] uppercase tracking-[0.18em] transition-opacity hover:opacity-60" style={{color: MUTED}}>
            ← {t('back')}
          </a>
        }
        right={<WhiteHeaderActions locale={locale} favCount={favCount} count={count} />}
      />

      <main id="wv-main" tabIndex={-1} style={{outline: 'none'}} className="flex-1">
        {/* Hero statement */}
        <section className="mx-auto max-w-[1400px] px-6 sm:px-10">
          <div className="grid items-end gap-10 py-20 sm:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:py-32">
            <div className="wv-rise">
              <p className="mb-7 text-[11px] uppercase tracking-[0.32em]" style={{color: MUTED}}>{t('eyebrow')}</p>
              <h1 className="font-display text-[clamp(44px,calc(3.6vw_+_30px),72px)] font-light leading-[0.95] tracking-[-0.01em]">
                {t('titleLine1')}
                <br />
                <span className="italic" style={{color: MUTED}}>{t('titleLine2')}</span>
              </h1>
              <p className="mt-9 max-w-md text-[15px] leading-relaxed" style={{color: MUTED}}>{t('intro')}</p>
            </div>
            <div className="wv-ph wv-rise wv-delay-1 relative aspect-[3/4] w-full overflow-hidden">
              <Image src={WHITE_ATELIER_IMAGE} alt="" fill priority sizes="(max-width: 1024px) 100vw, 45vw" className="object-cover" />
            </div>
          </div>
        </section>

        {/* Principles — numbered editorial (cohesive with the menu) */}
        <section className="mx-auto max-w-[1400px] border-t px-6 py-16 sm:px-10 sm:py-20" style={{borderColor: HAIR}}>
          <p className="mb-12 text-[11px] uppercase tracking-[0.32em]" style={{color: MUTED}}>{t('principles')}</p>
          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-3">
            {principles.map((p, i) => (
              <div key={p.n} className={`wv-rise wv-delay-${(i % 3) + 1}`}>
                <p className="text-[12px] tabular-nums tracking-[0.2em]" style={{color: MUTED}}>{p.n}</p>
                <h2 className="mt-4 font-display text-[26px] font-light tracking-tight">{p.label}</h2>
                <p className="mt-3 max-w-xs text-[14px] leading-relaxed" style={{color: MUTED}}>{p.body}</p>
              </div>
            ))}
          </div>
          <a href={`/${locale}/white/shop`} className="wv-btn mt-16 inline-flex items-center justify-center px-9 py-4 text-[12px] uppercase tracking-[0.2em]">
            {t('cta')}
          </a>
        </section>
      </main>

      <WhiteFooter locale={locale} />
    </div>,
    document.body,
  );
}
