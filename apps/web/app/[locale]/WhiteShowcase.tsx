'use client';

import {Fragment, useEffect, useRef} from 'react';
import {useTranslations} from 'next-intl';
import {useWhiteBag} from '../../hooks/useWhiteBag';
import {useWhiteFavourites} from '../../hooks/useWhiteFavourites';
import WhiteHeader from './WhiteHeader';
import WhiteHeaderActions from './WhiteHeaderActions';
import WhiteFooter from './WhiteFooter';
import WhiteProductCard from './WhiteProductCard';
import WhiteTicker from './WhiteTicker';
import {INK, MUTED, HAIR} from './wv-palette';
import {WhiteArrow} from './wv-icons';
import EditableSection from '../../components/editor/EditableSection';
import {safeJsonLd} from '../../lib/jsonLd';
import type {StorefrontSection, WhiteProduct} from '../../lib/catalogue/types';

// Variant 2 "White" showcase. Rendered through a portal to document.body so the
// fixed full-bleed surface escapes the gradient layout's `main.z-40` stacking
// context and fully covers the dark chrome — letting both design directions be
// compared on one deploy at /<locale>. Imagery is placeholder (editorial
// shots arrive via the loop / Higgsfield). CSS-only motion (reduced-motion safe).
//
// The edit and the two media blocks arrive as props from the server page. The
// bundled copy and files stay as the fallback: an empty sections table must
// leave a working landing page, not a blank band.

// Today's files, kept as the fallback for a storefront with no sections yet.
const HERO_POSTER = '/images/white/hero-mark2.jpg';
const HERO_VIDEO = '/videos/white/hero-mark2.mp4';
const HERO_POSTER_DESKTOP = '/images/white/hero-desktop.jpg';
const HERO_VIDEO_DESKTOP = '/videos/white/hero-desktop.mp4';
const SETS_POSTER = '/images/white/sets-static.jpg';
const SETS_VIDEO = '/videos/white/sets-static.mp4';

export default function WhiteShowcase({locale, featured, hero, setsTeaser, ticker, nonce}: {
  locale: string;
  featured: WhiteProduct[];
  hero?: StorefrontSection;
  setsTeaser?: StorefrontSection;
  ticker?: StorefrontSection;
  /** Тот же поразовый nonce, которым подписаны JSON-LD на этой странице. */
  nonce?: string;
}) {
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const setsVideoRef = useRef<HTMLVideoElement>(null);
  const {count} = useWhiteBag();
  const {count: favCount} = useWhiteFavourites();
  const t = useTranslations('white.landing');
  const ts = useTranslations('white.sets');
  const ru = locale === 'ru';

  const heroPoster = hero?.posterUrl ?? HERO_POSTER;
  const heroVideo = hero?.videoUrl ?? HERO_VIDEO;
  const heroPosterDesktop = hero?.posterDesktopUrl ?? HERO_POSTER_DESKTOP;
  const heroVideoDesktop = hero?.videoDesktopUrl ?? HERO_VIDEO_DESKTOP;
  const heroEyebrow = (ru ? hero?.eyebrowRu : hero?.eyebrowEn) ?? t('season');
  // Headlines are stored as one string, the line breaks included, so rewording
  // the hero is a row in the database and not a component change.
  const heroHeadline = ru ? hero?.headlineRu : hero?.headlineEn;
  const heroLines = heroHeadline ? heroHeadline.split('\n') : [t('heroLine1'), t('heroLine2')];

  const setsPoster = setsTeaser?.posterUrl ?? SETS_POSTER;
  const setsVideo = setsTeaser?.videoUrl ?? SETS_VIDEO;
  const setsEyebrow = (ru ? setsTeaser?.eyebrowRu : setsTeaser?.eyebrowEn) ?? ts('eyebrow');
  const setsHeadline = ru ? setsTeaser?.headlineRu : setsTeaser?.headlineEn;
  const setsLines = setsHeadline ? setsHeadline.split('\n') : [ts('landingTitle1'), ts('landingTitle2')];
  const setsBody = (ru ? setsTeaser?.bodyRu : setsTeaser?.bodyEn) ?? ts('landingBody');

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

  // РОЛИК СЕТОВ НЕ ЗАБИРАЕТ КАНАЛ У ГЕРОЯ.
  //
  // Он лежит ниже сгиба, но стоял с autoPlay — а autoPlay заставляет браузер
  // качать файл НЕЗАВИСИМО от preload="none": чтобы играть, надо скачать.
  // Адрес при этом виден сканеру предзагрузки прямо в разметке, тогда как у
  // героя адреса в разметке нет вовсе (он появляется после гидратации, см.
  // объяснение ниже). Итог измерен 21.09 на телефонном профиле:
  //
  //   sets-static.mp4 (не виден)  @1813 мс
  //   hero-mark2.mp4  (на экране) @4729 мс
  //
  // Ролик, которого человек не видит, начинал грузиться на 2,9 секунды раньше
  // того, на который он смотрит, и на узком канале это прямо отодвигает первый
  // кадр героя.
  //
  // Лечение: играть, когда подходит к экрану, а не при загрузке страницы.
  // rootMargin в пол-экрана — чтобы к моменту, когда блок доехал до глаз, файл
  // уже был. Наблюдателя нет (старый движок) — играем сразу, как раньше: без
  // ролика блок теряет смысл, а постер у него и так стоит.
  useEffect(() => {
    const v = setsVideoRef.current;
    if (!v) return;
    const пуск = () => void v.play()?.catch(() => {});
    if (typeof IntersectionObserver === 'undefined') {
      пуск();
      return;
    }
    const наблюдатель = new IntersectionObserver(
      (записи) => {
        if (!записи.some((з) => з.isIntersecting)) return;
        пуск();
        наблюдатель.disconnect();
      },
      {rootMargin: '50% 0px'},
    );
    наблюдатель.observe(v);
    return () => наблюдатель.disconnect();
  }, []);

  // Two single-source <video> elements (one per breakpoint, toggled by CSS)
  // were also tried and measured: a `display:none` container does not stop
  // either engine from fetching its <video>, so that layout traded the
  // flicker for doubled traffic and was dropped (see the report).
  //
  // What's here instead: the video ships with no <source> at all, and JS is
  // the only thing that ever picks one, on every engine. `media` on
  // <video><source> looked like a safe native alternative and is not one —
  // measured, Safari does not evaluate it and settles on whichever source
  // lacks a `media` condition, while parsing the initial HTML, before
  // hydration can run. A wide Safari session opened the portrait file
  // regardless of JS, and the fix that used to live here (forcing `v.src`
  // after the fact) corrected playback but not that first, already-wasted
  // request. Removing the native `<source>` removes the request.
  //
  // Cost, stated plainly: motion now starts after hydration on every engine,
  // where Chrome used to start it natively from the parsed HTML. The
  // <picture> layer above is what makes that an acceptable trade — the frame
  // on screen for the entire gap before this effect runs is already the
  // correct one, not a placeholder standing in for it.
  useEffect(() => {
    const v = heroVideoRef.current;
    if (!v) return;
    // Reduced motion leaves the poster as the whole banner — no source is
    // ever set, so there is nothing to later pause.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Источник мог уже поставить встроенный скрипт при разборе HTML. Тогда
    // трогать его нельзя: повторное присваивание начинает загрузку заново и
    // съедает ровно тот выигрыш, ради которого скрипт и добавлен.
    if (!v.getAttribute('src')) {
      v.src = window.matchMedia('(min-width: 1024px)').matches ? heroVideoDesktop : heroVideo;
      v.load();
    }
    // Optional chaining, not just the catch: jsdom's HTMLMediaElement.play()
    // returns undefined instead of a Promise, and a real browser is not
    // guaranteed to differ in every embedding (e.g. some WebViews).
    void v.play()?.catch(() => {});
  }, [heroVideo, heroVideoDesktop]);



  return (
    <>

      {/* Under the header, above the hero — a calm strip, not a promo insert.
          A ticker used to live on this page and was removed on purpose (see
          the house-line comment lower down); this one earns its place back
          by staying out of the way when the owner has nothing to announce. */}
      <EditableSection section={ticker} label="Бегущая строка">
        <WhiteTicker locale={locale} items={ticker?.items} />
      </EditableSection>

      <main id="wv-main" tabIndex={-1} style={{outline: 'none'}}>
      {/* Hero — a full-bleed fashion-film loop with the season + line set over
          its base. */}
      <EditableSection section={hero} label="Герой">
      <section className="relative h-[82vh] min-h-[540px] w-full overflow-hidden">
        {/* The season banner is a quiet fashion-film loop; the still frame
            below (the <picture>) is the poster, so slow networks and
            reduced-motion see the photo — and it's what's on screen for the
            entire gap before the effect above picks a video file.

            Two cuts of the film, because the band is a different shape on each.
            A phone gets the 3:4 portrait; a desktop is a ~2:1 letterbox, and
            filling it from the portrait file meant scaling 1080px of width up
            by nearly two, which is what made it look soft. The wide cut is its
            own shot at 2160px. Picked once on mount, not re-checked on resize —
            nobody resizes a window across that boundary mid-visit. */}
        {/* `poster` takes one value and the server can't know the viewport, so
            the still frame is its own layer instead of a video attribute —
            `<picture><source media>` is evaluated before any script runs and
            works the same in every engine, Safari included (measured; the
            video below can't say the same about `media` on its own
            <source>, which is why it no longer has one). Sits under the
            video, same box, pixel for pixel; the video paints over it the
            moment it has a frame to show, exactly like `poster` used to.
            Plain `<img>` on purpose, not next/image: art direction that
            swaps the whole file per media query has no next/image
            equivalent — this is the one deliberate exception to the
            project's "raster goes through next/image" rule. */}
        <picture aria-hidden="true">
          <source media="(min-width: 1024px)" srcSet={heroPosterDesktop} />
          <img
            src={heroPoster}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[50%_22%]"
          />
        </picture>
        {/* No <source>, no autoPlay: the effect above is the only thing that
            ever sets a src, on every engine — see it for why. */}
        <video
          id="wv-hero-video"
          ref={heroVideoRef}
          muted
          loop
          playsInline
          preload="none"
          className="absolute inset-0 h-full w-full object-cover object-[50%_22%]"
        />
        {/* ИСТОЧНИК СТАВИТСЯ ПРИ РАЗБОРЕ HTML, А НЕ ПОСЛЕ ГИДРАТАЦИИ.
            Выбор по-прежнему делает JS — значит ловушка, из-за которой убрали
            <source>, не возвращается: Safari не вычисляет `media` на <source>,
            а matchMedia вычисляют все.

            Цена прежнего устройства измерена 21.09 на телефонном профиле
            (1,5 Мбит/с, процессор ×4): источник появлялся на 4,3 с, первый кадр
            на 5,7 с. Всё это время канал простаивал, потому что браузер не знал
            адреса.

            <link rel="preload" as="video"> пробовал первым — НЕ РАБОТАЕТ:
            Chromium пишет в консоль «uses an unsupported `as` value» и
            игнорирует подсказку целиком. Замер это и показал: ни одного
            лишнего запроса, ни одной выигранной миллисекунды.

            Адреса приходят из админки (hero.videoUrl), поэтому экранируются тем
            же safeJsonLd, что и JSON-LD на этой странице: `</script>` в поле
            иначе закрыл бы скрипт. nonce — тот же поразовый, что у JSON-LD;
            без него CSP отобьёт встроенный скрипт, и тогда сработает запасной
            путь в эффекте ниже. */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html:
              '(function(){var a=' +
              safeJsonLd([heroVideo, heroVideoDesktop]) +
              ',v=document.getElementById("wv-hero-video");' +
              'if(!v||!window.matchMedia)return;' +
              'if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;' +
              'v.src=matchMedia("(min-width: 1024px)").matches?a[1]:a[0];' +
              'v.load();var p=v.play();if(p&&p.catch)p.catch(function(){});})();',
          }}
        />
        {/* The scrim carries the text contrast on its own so any Higgsfield shot
            (however light in its lower third) keeps the white type AA-legible —
            it ramps to a firm base across the bottom band where the text sits,
            not just at the very edge. A soft text-shadow is a belt-and-braces
            backstop. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,23,20,0.06)_0%,rgba(28,23,20,0)_22%,rgba(28,23,20,0.52)_58%,rgba(28,23,20,0.82)_100%)]"
        />
        {/* The whole banner opens the collection, not just the button under it —
            a full-bleed image that looks clickable and isn't is its own small
            frustration. It sits as a sibling layer rather than a wrapper because
            the CTA below is itself an anchor, and an anchor inside an anchor is
            invalid markup that browsers silently unnest. The text block above
            carries a higher z-index so the button keeps its own click. */}
        {/* Hidden from assistive tech and from the tab order on purpose: it is
            the same destination as the button below, and announcing "shop the
            collection" twice is worse than not announcing this layer at all.
            Keyboard and screen-reader users get there through the CTA. */}
        <a
          href={`/${locale}/shop`}
          aria-hidden="true"
          tabIndex={-1}
          className="absolute inset-0 z-[5]"
        />
        <div className="wv-rise pointer-events-none absolute inset-x-0 bottom-0 z-[6] px-6 pb-12 [text-shadow:0_1px_26px_rgba(28,23,20,0.5)] sm:px-10 sm:pb-16">
          <p className="text-[11px] uppercase tracking-[0.34em] text-white">{heroEyebrow}</p>
          <h1 className="mt-4 font-display text-[clamp(54px,15vw,96px)] font-light leading-[0.9] tracking-[-0.015em] text-white">
            {heroLines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {i === 0 ? line : <span className="italic text-white/85">{line}</span>}
              </Fragment>
            ))}
          </h1>
          {/* pointer-events return here: the wrapper above releases them so the
              banner-wide link underneath stays reachable across the whole scrim. */}
          <a
            href={`/${locale}/shop`}
            className="wv-hero-cta wv-arrow-link pointer-events-auto mt-8 inline-flex items-center justify-center gap-3 border border-white/80 px-9 py-4 text-[12px] uppercase tracking-[0.2em] text-white transition-colors [text-shadow:none] hover:bg-white hover:text-[#1c1714]"
          >
            {t('shopCollection')}
            <WhiteArrow />
          </a>
        </div>
      </section>
      </EditableSection>

      {/* Editorial divider */}
      <section id="wv-edit" className="mx-auto max-w-[1400px] scroll-mt-24 px-6 sm:px-10">
        {/* The heading stands alone — the line under it described the selection
            in words the six photographs below say better. */}
        <div className="border-t py-14" style={{borderColor: HAIR}}>
          <h2 className="font-display text-[28px] font-light tracking-tight sm:text-[34px]">{t('theEdit')}</h2>
        </div>
      </section>

      {/* Product grid — 2/3 portrait cards */}
      <section className="mx-auto max-w-[1400px] pb-24 sm:px-10">
        <div className="grid grid-cols-1 gap-y-10 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-14 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-16">
          {featured.map((p, i) => (
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
      <EditableSection section={setsTeaser} label="Блок образов">
      <section id="wv-atelier" className="mt-8 scroll-mt-24 border-t sm:mt-12" style={{borderColor: HAIR}}>
        {/* Full-width: the photograph runs to the left edge of the screen with no
            frame around it; the copy column keeps its own padding so it stays
            readable however wide the display. */}
        <div className="grid items-center gap-0 lg:grid-cols-2">
          {/* 3:4 on both breakpoints — the film's own ratio, so it plays whole
              with nothing cropped away. A fixed ratio rather than stretching to
              the copy column: left to stretch, the cell grew wider with the
              viewport and on a 2560 display cut the models off at the shins.
              Portrait also buys height on a phone, where the three of them need
              to read as near, not as a group seen across a room.
              Capped at 560px on a desktop: at half of a wide viewport the film
              stood 960px tall, and beside something that size the copy next to
              it read as fine print. */}
          <div className="wv-rise wv-scrub relative mx-auto aspect-[3/4] w-full overflow-hidden lg:max-w-[560px]">
            {/* Без autoPlay: он тянет файл независимо от preload="none" и
                отодвигал первый кадр героя (эффект выше, там числа).
                Пуск даёт наблюдатель, когда блок подходит к экрану. */}
            <video
              ref={setsVideoRef}
              muted
              loop
              playsInline
              preload="none"
              poster={setsPoster}
              aria-label={setsLines[0]}
              className="absolute inset-0 h-full w-full object-cover"
            >
              <source src={setsVideo} type="video/mp4" />
            </video>
            {/* The film opens the sets too. Nothing interactive sits inside this
                cell, so a plain overlay link is enough — no nesting to work
                around like the hero. */}
            <a
              href={`/${locale}/sets`}
              aria-hidden="true"
              tabIndex={-1}
              className="absolute inset-0"
            />
          </div>
          <div className="wv-rise wv-scrub wv-delay-1 flex flex-col justify-center px-6 py-16 sm:px-12 lg:px-20 lg:py-24 xl:px-28">
            <p className="mb-7 text-[11px] uppercase tracking-[0.32em]" style={{color: MUTED}}>{setsEyebrow}</p>
            <h2 className="font-display text-[30px] font-light leading-[1.1] tracking-tight sm:text-[40px]">
              {setsLines.map((line, i) => (
                <Fragment key={i}>
                  {i > 0 && <br />}
                  {i === 0 ? line : <span className="italic" style={{color: MUTED}}>{line}</span>}
                </Fragment>
              ))}
            </h2>
            <p className="mt-8 max-w-md text-[15px] leading-relaxed" style={{color: MUTED}}>
              {setsBody}
            </p>
            <a href={`/${locale}/sets`} className="wv-btn wv-arrow-link mt-10 inline-flex items-center justify-center gap-3 self-start px-9 py-4 text-[12px] uppercase tracking-[0.2em]">
              {ts('explore')}
              <WhiteArrow />
            </a>
          </div>
        </div>
      </section>
      </EditableSection>
      </main>
    </>
  );
}