'use client';

import Link from 'next/link';
import Image from 'next/image';
import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useFocusTrap} from '../../lib/useFocusTrap';
import {useWhiteAuth} from '../../hooks/useWhiteAuth';
import {useMountTransition} from '../../lib/useMountTransition';
import {WHITE_CATS, whiteCatLabel} from './products';
import {INK, MUTED, HAIR} from './wv-palette';

// Variant 2 "White" — a left side drawer (owner redesign). Slides in over a
// dimmed home rather than a full-screen list: reads as a boutique, keeps the
// shopper's place. Large left-aligned Cormorant category links (no index
// numbers — navigation isn't a sequence), a lookbook image gives the drawer a
// point of view, signal accent only on the active route. Slide is CSS +
// reduced-motion safe. Focus-trapped; ESC + scroll-lock (restores the white
// portal's own lock); focus returns to the hamburger on close (WCAG 2.4.3).

const SLIDE_MS = 640;

export default function WhiteMobileMenu({locale, activeCat}: {locale: string; activeCat?: string | null}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [portalReady, setPortalReady] = useState(false);
  // Where the header's burger actually is, so the stand-in can sit on top of it
  // rather than at a hardcoded offset that drifts with the header's padding.
  const [triggerBox, setTriggerBox] = useState<{left: number; top: number} | null>(null);
  // Focus returns to the burger only for keyboard closes; a pointer close would
  // paint the focus ring for no reason.
  const closedByKeyboard = useRef(false);
  // The twin's morph must not fire on mount — closing plays only after the
  // drawer has actually been open, otherwise the two keyframes race and the
  // icon collapses into a single bar for the first frames.
  const everEntered = useRef(false);
  const {mounted: shown, entered} = useMountTransition(open, SLIDE_MS);
  const t = useTranslations('white.menu');
  const {user} = useWhiteAuth();
  const pathname = usePathname();

  useFocusTrap(panelRef, open, {returnFocus: false});

  useEffect(() => {
    if (entered) everEntered.current = true;
    if (!shown) everEntered.current = false;
  }, [entered, shown]);
  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    if (!open) return;
    // The hamburger is always mounted, so capturing it here is stable; copying to
    // a local keeps the cleanup honest (no stale-ref lint warning).
    const trigger = triggerRef.current;
    // The page itself scrolls the window, so the drawer owns body scroll-lock on
    // every White page, so restore whatever was there — writing '' would unlock
    // the page behind the still-mounted portal for the rest of the session.
    const prevOverflow = document.body.style.overflow;
    const prevRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closedByKeyboard.current = true;
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overflow = prevRootOverflow;
      document.removeEventListener('keydown', onKey);
      // WCAG 2.4.3 — focus order: hand focus back to the trigger, but only for
      // keyboard closes; pointer users would just see a ring appear.
      if (closedByKeyboard.current) trigger?.focus({preventScroll: true});
      closedByKeyboard.current = false;
    };
  }, [open]);

  // Sets sit second, right after the shop and set in the same display type as
  // the categories. They were a line of 11px caps in the service list below,
  // which is where a shipping page belongs — but a made-up look is the thing
  // this house is actually known for, and the menu should say so.
  const links = [
    {key: 'all', label: t('shop'), href: `/${locale}/shop`},
    {key: 'sets', label: t('sets'), href: `/${locale}/sets`},
    ...WHITE_CATS.map((c) => ({key: c, label: whiteCatLabel(c, locale), href: `/${locale}/shop?cat=${c}`})),
  ];

  // Secondary tier — service pages, stacked under the categories.
  const secondary = [
    {key: 'lookbook', label: t('lookbook'), href: `/${locale}/lookbook`},
    {key: 'contact', label: t('contact'), href: `/${locale}/contact`},
    {key: 'delivery', label: t('delivery'), href: `/${locale}/delivery`},
    {key: 'faq', label: t('faq'), href: `/${locale}/faq`},
    {key: 'care', label: t('care'), href: `/${locale}/care`},
  ];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          const r = triggerRef.current?.getBoundingClientRect();
          if (r) setTriggerBox({left: r.left, top: r.top});
          setOpen(true);
        }}
        aria-expanded={open}
        aria-label={t('openMenu')}
        style={{WebkitTapHighlightColor: 'transparent'}}
        className={`-ml-2 flex h-11 w-11 shrink-0 items-center justify-center transition-opacity duration-200 active:scale-90 motion-reduce:active:scale-100 ${shown ? 'opacity-0' : ''}`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="square">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      {portalReady && shown && createPortal(
        <>
          {/* The burger's stand-in. It does not travel: it sits exactly where the
              header's own burger sits — the rect is measured from that button on
              open — and only morphs into an X in place. The drawer is the thing
              that moves; an icon that rides out with it and clips itself to its
              edge reads as two controls arguing over one job. It lives in the
              portal purely so it can paint above the panel, which the header's
              stacking context cannot do. */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? t('close') : t('openMenu')}
            style={{
              WebkitTapHighlightColor: 'transparent',
              left: triggerBox ? `${triggerBox.left}px` : '16px',
              top: triggerBox ? `${triggerBox.top}px` : undefined,
            }}
            className="wv-twin fixed z-[1202] flex h-11 w-11 items-center justify-center active:scale-90 motion-reduce:active:scale-100"
          >
            <svg viewBox="0 0 24 24" className={`h-5 w-5 ${entered ? 'hamburger-open' : everEntered.current ? 'hamburger-close' : ''}`} fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="square">
              <line x1="4" y1="7" x2="20" y2="7" className="hamburger-line hamburger-top" />
              <line x1="4" y1="12" x2="20" y2="12" className="hamburger-line hamburger-middle" />
              <line x1="4" y1="17" x2="20" y2="17" className="hamburger-line hamburger-bottom" />
            </svg>
          </button>

          {/* Scrim — dims the home behind and closes on tap. */}
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[1200] bg-[rgba(28,23,20,0.30)] backdrop-blur-[1px] transition-opacity ease-out motion-reduce:transition-none"
            style={{opacity: entered ? 1 : 0, transitionDuration: '560ms', transitionDelay: '40ms'}}
          />
          <aside
            ref={panelRef}
            role="dialog"
            tabIndex={-1}
            aria-modal="true"
            aria-label={t('menu')}
            className="wv-root fixed inset-y-0 left-0 z-[1201] flex w-[87%] max-w-[420px] flex-col bg-white font-sans antialiased shadow-[30px_0_60px_-30px_rgba(28,23,20,0.5)] transition-transform motion-reduce:transition-none"
            style={{
              color: INK,
              transform: entered ? 'translateX(0)' : 'translateX(-100%)',
              transitionDuration: '560ms',
              transitionDelay: '70ms',
              transitionTimingFunction: entered ? 'cubic-bezier(0.16, 1, 0.3, 1)' : 'cubic-bezier(0.55, 0.05, 0.25, 1)',
            }}
          >
            {/* The mark over the wordmark, both centred. Left-aligned it shared
                the corner with the X and had to be pushed down the panel to
                clear it; centred it has the width to itself, and the drawer
                opens on the house rather than on a corner of it. */}
            <div className="flex shrink-0 flex-col px-6 pb-1 pt-4">
              <div className="flex flex-col items-center gap-3">
                <Image src="/logos/icon-black.svg" alt="" aria-hidden="true" width={1000} height={1000} className="h-12 w-12" />
                <Image src="/logos/name-black.svg" alt="REINASLEO" width={1026} height={162} className="h-[25px] w-auto" />
              </div>
              {/* A short rule between the house and the hello. Without it the two
                  ran together as one line — "REINASLEO добро пожаловать" — when
                  the second is a greeting that carries the visitor's own name. */}
              <span aria-hidden="true" className="mx-auto mt-4 block h-px w-8" style={{background: INK, opacity: 0.28}} />
              {/* A personal hello right under the brand — the account is one tap
                  away. The greeting reads larger and the sign-in sits below it on
                  its own line, roomier to the touch. */}
              <div className="wv-menu-item mt-4 flex flex-col items-center gap-3" style={{animationDelay: '60ms'}}>
                <span className="text-[17px] leading-snug md:text-[19px]" style={{color: INK}}>
                  {user ? t('welcomeName', {name: user.name}) : t('welcome')}
                </span>
                <Link
                  href={`/${locale}/account`}
                  onClick={() => setOpen(false)}
                  className="wv-cta relative inline-flex w-full items-center justify-center overflow-hidden border px-6 py-3.5 text-[12px] uppercase tracking-[0.2em]"
                  style={{borderColor: INK, color: INK}}
                >
                  <span className="wv-cta-label relative z-[1]">{user ? t('toAccount') : t('signIn')}</span>
                </Link>
              </div>
            </div>

            {/* Primary nav — starts under the head and scrolls. It used to centre
                itself with my-auto, but a centred child of a scroll container
                clips at the top once it overflows, and with sets added the list
                no longer fits a 900px desktop: the last category was hidden
                behind the service block. */}
            <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6">
              <div className="flex w-full flex-col pb-6 pt-1">
                {links.map((l) => {
                  // Sets is a page of its own, so it answers to the path; the
                  // rest are filters on the shop and answer to the category.
                  const active = l.key === 'sets' ? pathname === l.href : activeCat != null && l.key === activeCat;
                  return (
                    <Link
                      key={l.key}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className="wv-menu-item wv-menu-link relative flex min-h-10 items-center font-display text-[26px] sm:min-h-11 font-light tracking-[-0.01em] md:min-h-[44px] md:text-[30px]"
                      style={{color: active ? INK : MUTED, fontWeight: active ? 500 : 300, animationDelay: `${90 + links.indexOf(l) * 45}ms`}}
                    >
                      <span className="wv-menu-label">{l.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Service pages — small stacked rows, each arriving on the same
                cadence as the categories above. */}
            <div className="mx-6 flex shrink-0 flex-col border-t pb-1 pt-2" style={{borderColor: HAIR}}>
              {secondary.map((sc, i) => {
                const active = pathname === sc.href;
                return (
                  <Link
                    key={sc.key}
                    href={sc.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className="wv-menu-item wv-link inline-flex min-h-8 items-center self-start text-[11px] uppercase tracking-[0.12em] md:min-h-9 md:text-[12px]"
                    style={{color: active ? INK : MUTED, fontWeight: active ? 600 : 400, textDecoration: active ? 'underline' : 'none', textUnderlineOffset: '3px', textDecorationThickness: '1px', animationDelay: `${360 + i * 40}ms`}}
                  >
                    <span className="wv-link-ink">{sc.label}</span>
                  </Link>
                );
              })}
            </div>


            <div className="wv-menu-item mx-6 mt-3 flex shrink-0 items-center gap-4 border-t pb-6 pt-3 text-[12px] uppercase tracking-[0.12em] md:gap-6 md:text-[13px]" style={{animationDelay: '620ms', borderColor: HAIR, color: INK}}>
              <Link href={`/${locale}/account`} onClick={() => setOpen(false)} className="wv-link -my-2 inline-flex min-h-11 items-center">
                <span className="wv-link-ink">{t('account')}</span>
              </Link>
              <Link href={`/${locale}/favourites`} onClick={() => setOpen(false)} className="wv-link -my-2 inline-flex min-h-11 items-center">
                <span className="wv-link-ink">{t('saved')}</span>
              </Link>
              <Link href={`/${locale}/bag`} onClick={() => setOpen(false)} className="wv-link -my-2 inline-flex min-h-11 items-center">
                <span className="wv-link-ink">{t('bag')}</span>
              </Link>
            </div>
          </aside>
        </>,
        document.body,
      )}
    </>
  );
}
