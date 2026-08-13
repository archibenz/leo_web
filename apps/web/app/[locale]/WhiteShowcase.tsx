'use client';

import {useEffect, useRef} from 'react';
import {useTranslations} from 'next-intl';
import {useWhiteBag} from '../../hooks/useWhiteBag';
import {useWhiteFavourites} from '../../hooks/useWhiteFavourites';
import WhiteHeader from './WhiteHeader';
import WhiteHeaderActions from './WhiteHeaderActions';
import WhiteFooter from './WhiteFooter';
import WhiteProductCard from './WhiteProductCard';
import {INK, MUTED, HAIR} from './wv-palette';
import {WHITE_PRODUCTS} from './products';

// Variant 2 "White" showcase. Rendered through a portal to document.body so the
// fixed full-bleed surface escapes the gradient layout's `main.z-40` stacking
// context and fully covers the dark chrome — letting both design directions be
// compared on one deploy at /<locale>. Imagery is placeholder (editorial
// shots arrive via the loop / Higgsfield). CSS-only motion (reduced-motion safe).

// "The edit" — a curated six from the shared catalog (in the landing's order),
// so each card opens the matching product PDP via ?p.
const FEATURED = [2, 1, 3, 4, 8, 6].map((k) => WHITE_PRODUCTS.find((p) => p.key === k)!);

export default function WhiteShowcase({locale}: {locale: string}) {
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const {count} = useWhiteBag();
  const {count: favCount} = useWhiteFavourites();
  const t = useTranslations('white.landing');
  const ts = useTranslations('white.sets');

  // The landing renders in a fixed overflow-y-auto portal, so native hash
  // scrolling (#wv-atelier / #wv-edit from the footer) doesn't move the inner
  // container — scrollIntoView does. Run on mount (deep-link) + on hashchange
  // (same-page footer clicks). Reduced-motion → instant.
  useEffect(() => {
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
  }, []);

  // Reduced-motion keeps the banner still — the poster frame stays.
  useEffect(() => {
    const v = heroVideoRef.current;
    if (!v) return;
    // `poster` takes one value, so it is the portrait frame in the markup and
    // gets swapped here on a wide screen. It matters most under reduced motion,
    // where the poster is the whole banner and a phone-shaped still stretched
    // across a desktop band would be the thing people see.
    if (window.matchMedia('(min-width: 1024px)').matches) {
      v.poster = '/images/white/hero-desktop.jpg';
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      v.pause();
      v.removeAttribute('autoplay');
    }
  }, []);



  return (
    <>

      <main id="wv-main" tabIndex={-1} style={{outline: 'none'}}>
      {/* Hero — a full-bleed fashion-film loop with the season + line set over
          its base. */}
      <section className="relative h-[82vh] min-h-[540px] w-full overflow-hidden">
        {/* The season banner is a quiet fashion-film loop; the still frame is
            the poster, so slow networks and reduced-motion see the photo.

            Two cuts of the film, because the band is a different shape on each.
            A phone gets the 3:4 portrait; a desktop is a ~2:1 letterbox, and
            filling it from the portrait file meant scaling 1080px of width up
            by nearly two, which is what made it look soft. The wide cut is its
            own shot at 2160px. `media` on <source> is read once at load — which
            is all we need, nobody resizes a window across that boundary
            mid-visit — and it keeps the browser from fetching both. */}
        <video
          ref={heroVideoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/images/white/hero.jpg"
          className="absolute inset-0 h-full w-full object-cover object-[50%_22%]"
        >
          <source src="/videos/white/hero-desktop.mp4" type="video/mp4" media="(min-width: 1024px)" />
          <source src="/videos/white/hero.mp4" type="video/mp4" />
        </video>
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
            href={`/${locale}/shop`}
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
      <section className="mx-auto max-w-[1400px] pb-24 sm:px-10">
        <div className="grid grid-cols-1 gap-y-10 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-14 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-16">
          {FEATURED.map((p, i) => (
            <WhiteProductCard key={p.key} locale={locale} product={p} index={i} rise bleed />
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
      <section id="wv-atelier" className="mt-8 scroll-mt-24 border-t sm:mt-12" style={{borderColor: HAIR}}>
        {/* Full-width: the photograph runs to the left edge of the screen with no
            frame around it; the copy column keeps its own padding so it stays
            readable however wide the display. */}
        <div className="grid items-stretch gap-0 lg:grid-cols-2">
          {/* A fixed 4:3 on desktop rather than stretching to the copy column.
              Left to stretch, the cell grew wider with the viewport — on a 2560
              display it reached nearly 2:1 and the crop cut the models off at
              the shins. A constant ratio means the same framing on every screen. */}
          <div className="wv-rise wv-scrub relative aspect-[4/5] w-full overflow-hidden lg:aspect-[4/3] lg:min-h-[640px]">
            {/* One square film serves both shapes: the phone takes 4:5 out of
                it, the desktop 4:3, and the shot is composed with enough air
                around the three women that neither crop touches them. */}
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              poster="/images/white/sets.jpg"
              aria-label={ts('landingTitle1')}
              className="absolute inset-0 h-full w-full object-cover"
            >
              <source src="/videos/white/sets.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="wv-rise wv-scrub wv-delay-1 flex flex-col justify-center px-6 py-16 sm:px-12 lg:px-20 lg:py-24 xl:px-28">
            <p className="mb-7 text-[11px] uppercase tracking-[0.32em]" style={{color: MUTED}}>{ts('eyebrow')}</p>
            <h2 className="font-display text-[30px] font-light leading-[1.1] tracking-tight sm:text-[40px]">
              {ts('landingTitle1')}
              <br />
              <span className="italic" style={{color: MUTED}}>{ts('landingTitle2')}</span>
            </h2>
            <p className="mt-8 max-w-md text-[15px] leading-relaxed" style={{color: MUTED}}>
              {ts('landingBody')}
            </p>
            <a href={`/${locale}/sets`} className="wv-btn mt-10 inline-flex items-center justify-center self-start px-9 py-4 text-[12px] uppercase tracking-[0.2em]">
              {ts('explore')}
            </a>
          </div>
        </div>
      </section>
      </main>
    </>
  );
}