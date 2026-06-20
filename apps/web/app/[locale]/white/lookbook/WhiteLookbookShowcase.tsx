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
import {WHITE_PRODUCTS} from '../products';
import {INK, MUTED} from '../wv-palette';

// Variant 2 "White" — Lookbook. An editorial counterpart to the shop grid: a
// few curated looks shown large, one at a time, each with an editorial caption
// and a "shop this look" link to its PDP. Different presentation (full-bleed
// magazine vs compact grid) + a shoppable funnel, so it earns its place rather
// than repeating the grid. CSS-only reveal (wv-rise, reduced-motion-safe).

const LOOKS = [2, 1, 6, 4, 8].map((k) => WHITE_PRODUCTS.find((p) => p.key === k)!);

export default function WhiteLookbookShowcase({locale}: {locale: string}) {
  const mounted = useWhitePortal();
  const {count} = useWhiteBag();
  const {count: favCount} = useWhiteFavourites();
  const ru = locale === 'ru';
  const t = useTranslations('white.lookbook');

  if (!mounted) return null;

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
        {/* Intro */}
        <section className="mx-auto max-w-[1400px] px-6 py-20 sm:px-10 sm:py-28">
          <div className="wv-rise">
            <p className="mb-7 text-[11px] uppercase tracking-[0.32em]" style={{color: MUTED}}>{t('eyebrow')}</p>
            <h1 className="font-display text-[clamp(44px,calc(3.6vw_+_30px),72px)] font-light leading-[0.95] tracking-[-0.01em]">{t('title')}</h1>
            <p className="mt-8 max-w-md text-[15px] leading-relaxed" style={{color: MUTED}}>{t('intro')}</p>
          </div>
        </section>

        {/* Looks — large, alternating on desktop */}
        {LOOKS.map((p, i) => {
          const name = ru ? p.ru : p.en;
          const desc = ru ? p.descRu : p.descEn;
          const href = `/${locale}/white/product?p=${p.key}`;
          const reversed = i % 2 === 1;
          return (
            <section key={p.key} className="mx-auto max-w-[1400px] px-6 pb-20 sm:px-10 sm:pb-28">
              <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
                <a
                  href={href}
                  aria-label={name}
                  className={`wv-rise wv-ph relative block aspect-[3/4] w-full overflow-hidden ${reversed ? 'lg:order-2' : ''}`}
                >
                  <Image src={p.image} alt={name} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
                </a>
                <div className={`wv-rise wv-delay-1 ${reversed ? 'lg:order-1' : ''}`}>
                  <p className="text-[12px] uppercase tabular-nums tracking-[0.2em]" style={{color: MUTED}}>
                    {t('look')} {String(i + 1).padStart(2, '0')}
                  </p>
                  <h2 className="mt-4 font-display text-[30px] font-light leading-tight tracking-tight sm:text-[36px]">{name}</h2>
                  <p className="mt-4 max-w-sm text-[14px] leading-relaxed" style={{color: MUTED}}>{desc}</p>
                  {/* min-h-11 → 44px tap floor (this is the primary shop-this-look
                      CTA); mt-4 trims the visual gap the taller box would add. */}
                  <a
                    href={href}
                    className="mt-4 inline-flex min-h-11 items-center text-[12px] uppercase tracking-[0.2em] underline-offset-4 transition-opacity hover:opacity-60"
                    style={{color: INK}}
                  >
                    {t('shopLook')} →
                  </a>
                </div>
              </div>
            </section>
          );
        })}
      </main>

      <WhiteFooter locale={locale} />
    </div>,
    document.body,
  );
}
