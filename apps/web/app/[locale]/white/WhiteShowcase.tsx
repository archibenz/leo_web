'use client';

import Image from 'next/image';
import {useEffect} from 'react';
import {createPortal} from 'react-dom';
import {useTranslations} from 'next-intl';
import {useWhitePortal} from '../../../hooks/useWhitePortal';
import {useWhiteBag} from '../../../hooks/useWhiteBag';
import {useWhiteFavourites} from '../../../hooks/useWhiteFavourites';
import WhiteHeader from './WhiteHeader';
import WhiteHeaderActions from './WhiteHeaderActions';
import WhiteFooter from './WhiteFooter';
import WhiteProductCard from './WhiteProductCard';
import {INK, MUTED, HAIR} from './wv-palette';
import {WHITE_PRODUCTS, WHITE_HERO_IMAGE, WHITE_ATELIER_IMAGE} from './products';

// Variant 2 "White" showcase. Rendered through a portal to document.body so the
// fixed full-bleed surface escapes the gradient layout's `main.z-40` stacking
// context and fully covers the dark chrome — letting both design directions be
// compared on one deploy at /<locale>/white. Imagery is placeholder (editorial
// shots arrive via the loop / Higgsfield). CSS-only motion (reduced-motion safe).

// "The edit" — a curated six from the shared catalog (in the landing's order),
// so each card opens the matching product PDP via ?p.
const FEATURED = [2, 1, 3, 4, 5, 6].map((k) => WHITE_PRODUCTS.find((p) => p.key === k)!);

export default function WhiteShowcase({locale}: {locale: string}) {
  const mounted = useWhitePortal();
  const {count} = useWhiteBag();
  const {count: favCount} = useWhiteFavourites();
  const t = useTranslations('white.landing');

  // The landing renders in a fixed overflow-y-auto portal, so native hash
  // scrolling (#wv-atelier / #wv-edit from the footer) doesn't move the inner
  // container — scrollIntoView does. Run on mount (deep-link) + on hashchange
  // (same-page footer clicks). Reduced-motion → instant.
  useEffect(() => {
    if (!mounted) return;
    const toHash = () => {
      const id = window.location.hash.slice(1);
      const el = id ? document.getElementById(id) : null;
      if (!el) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'start'});
    };
    toHash();
    window.addEventListener('hashchange', toHash);
    return () => window.removeEventListener('hashchange', toHash);
  }, [mounted]);

  if (!mounted) return null;

  // Two truthful, distinct entries — not two links to the same /shop. "The edit"
  // deep-links to the curated section on this landing (the scrollIntoView effect
  // above handles it, same as the footer deep-links); "Shop" is the full catalog.
  const nav = [
    {label: t('theEdit'), href: `/${locale}/white#wv-edit`},
    {label: t('shop'), href: `/${locale}/white/shop`},
  ];

  return createPortal(
    <div
      className="wv-root fixed inset-0 z-[1000] overflow-y-auto bg-white font-sans antialiased"
      style={{color: INK}}
    >
      {/* Header — thin, centered wordmark */}
      <WhiteHeader
        locale={locale}
        left={
          <nav className="flex items-center gap-7 text-[12px] uppercase tracking-[0.18em]" style={{color: MUTED}} aria-label={t('primary')}>
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="wv-link hidden md:inline">{n.label}</a>
            ))}
          </nav>
        }
        right={<WhiteHeaderActions locale={locale} favCount={favCount} count={count} search />}
      />

      <main id="wv-main" tabIndex={-1} style={{outline: 'none'}}>
      {/* Hero — image-led editorial: a full-bleed model-on-white shot with the
          season + line set over its base. The image is a placeholder; the
          Higgsfield model-on-white shots swap in via WHITE_HERO_IMAGE. */}
      <section className="relative h-[82vh] min-h-[540px] w-full overflow-hidden">
        <Image src={WHITE_HERO_IMAGE} alt="" fill priority quality={95} sizes="100vw" className="wv-drift object-cover object-[50%_22%]" />
        {/* The scrim carries the text contrast on its own so any Higgsfield shot
            (however light in its lower third) keeps the white type AA-legible —
            it ramps to a firm base across the bottom band where the text sits,
            not just at the very edge. A soft text-shadow is a belt-and-braces
            backstop. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,23,20,0.06)_0%,rgba(28,23,20,0)_22%,rgba(28,23,20,0.52)_58%,rgba(28,23,20,0.82)_100%)]"
        />
        <div className="wv-rise absolute inset-x-0 bottom-0 px-6 pb-12 [text-shadow:0_1px_26px_rgba(28,23,20,0.5)] sm:px-10 sm:pb-16">
          <p className="text-[11px] uppercase tracking-[0.34em] text-white">{t('season')}</p>
          <h1 className="mt-4 font-display text-[clamp(54px,15vw,96px)] font-light leading-[0.9] tracking-[-0.015em] text-white">
            {t('heroLine1')}
            <br />
            <span className="italic text-white/85">{t('heroLine2')}</span>
          </h1>
          <a
            href={`/${locale}/white/shop`}
            className="wv-hero-cta mt-8 inline-flex items-center justify-center border border-white/80 px-9 py-4 text-[12px] uppercase tracking-[0.2em] text-white transition-colors [text-shadow:none] hover:bg-white hover:text-[#1c1714]"
          >
            {t('shopCollection')}
          </a>
        </div>
      </section>

      {/* Editorial divider */}
      <section id="wv-edit" className="mx-auto max-w-[1400px] scroll-mt-24 px-6 sm:px-10">
        <div className="flex flex-col gap-6 border-t py-14 sm:flex-row sm:items-baseline sm:justify-between" style={{borderColor: HAIR}}>
          <h2 className="font-display text-[28px] font-light tracking-tight sm:text-[34px]">{t('theEdit')}</h2>
          <p className="max-w-sm text-[13px] leading-relaxed" style={{color: MUTED}}>
            {t('editIntro')}
          </p>
        </div>
      </section>

      {/* Product grid — 2/3 portrait cards */}
      <section className="mx-auto max-w-[1400px] px-6 pb-24 sm:px-10">
        <div className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-3">
          {FEATURED.map((p, i) => (
            <WhiteProductCard key={p.key} locale={locale} product={p} index={i} quickAdd rise />
          ))}
        </div>
      </section>

      {/* House line — one oversized editorial statement, the brand philosophy in
          a single breath. Replaces the busy marquee; the calm is the point. */}
      <section className="mx-auto max-w-[1100px] border-t px-6 py-24 sm:px-10 sm:py-32" style={{borderColor: HAIR}}>
        <p className="mx-auto max-w-[760px] text-center font-display text-[clamp(30px,7.5vw,54px)] font-light italic leading-[1.12] tracking-[-0.01em]">
          {t('houseLine')}
        </p>
      </section>

      {/* Lookbook — editorial brand statement */}
      <section id="wv-atelier" className="scroll-mt-24 border-t" style={{borderColor: HAIR}}>
        <div className="mx-auto grid max-w-[1400px] items-center gap-0 lg:grid-cols-2">
          <div className="wv-zoom relative aspect-[4/5] w-full overflow-hidden lg:aspect-auto lg:min-h-[620px]">
            <Image src={WHITE_ATELIER_IMAGE} alt="" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
          </div>
          <div className="wv-rise wv-delay-1 flex flex-col justify-center px-6 py-16 sm:px-12 lg:px-20 lg:py-24">
            <p className="mb-7 text-[11px] uppercase tracking-[0.32em]" style={{color: MUTED}}>{t('atelier')}</p>
            <h2 className="font-display text-[30px] font-light leading-[1.1] tracking-tight sm:text-[40px]">
              {t('atelierLine1')}
              <br />
              <span className="italic" style={{color: MUTED}}>{t('atelierLine2')}</span>
            </h2>
            <p className="mt-8 max-w-md text-[15px] leading-relaxed" style={{color: MUTED}}>
              {t('atelierBody')}
            </p>
            <a href={`/${locale}/white/atelier`} className="wv-btn mt-10 inline-flex items-center justify-center self-start px-9 py-4 text-[12px] uppercase tracking-[0.2em]">
              {t('exploreAtelier')}
            </a>
          </div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <WhiteFooter locale={locale} />
    </div>,
    document.body,
  );
}
