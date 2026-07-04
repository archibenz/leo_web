'use client';

import Image from 'next/image';
import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useFocusTrap} from '../../../lib/useFocusTrap';
import {useMountTransition} from '../../../lib/useMountTransition';
import {WHITE_CATS, whiteCatLabel} from './products';
import {INK, MUTED, SIGNAL, HAIR} from './wv-palette';

// Variant 2 "White" — a left side drawer (owner redesign). Slides in over a
// dimmed home rather than a full-screen list: reads as a boutique, keeps the
// shopper's place. Large left-aligned Cormorant category links (no index
// numbers — navigation isn't a sequence), a lookbook image gives the drawer a
// point of view, signal accent only on the active route. Slide is CSS +
// reduced-motion safe. Focus-trapped; ESC + scroll-lock (restores the white
// portal's own lock); focus returns to the hamburger on close (WCAG 2.4.3).

const SLIDE_MS = 440;

export default function WhiteMobileMenu({locale, activeCat}: {locale: string; activeCat?: string | null}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [portalReady, setPortalReady] = useState(false);
  // Focus returns to the burger only for keyboard closes; a pointer close would
  // paint the focus ring for no reason.
  const closedByKeyboard = useRef(false);
  const {mounted: shown, entered} = useMountTransition(open, SLIDE_MS);
  const t = useTranslations('white.menu');
  const pathname = usePathname();

  useFocusTrap(panelRef, open, {returnFocus: false});
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

  const links = [
    {key: 'all', label: t('shop'), href: `/${locale}/white/shop`},
    ...WHITE_CATS.map((c) => ({key: c, label: whiteCatLabel(c, locale), href: `/${locale}/white/shop?cat=${c}`})),
  ];

  // Secondary tier — brand and service pages, stacked under the categories.
  const secondary = [
    {key: 'sets', label: t('sets'), href: `/${locale}/white/sets`},
    {key: 'lookbook', label: t('lookbook'), href: `/${locale}/white/lookbook`},
    {key: 'contact', label: t('contact'), href: `/${locale}/white/contact`},
    {key: 'delivery', label: t('delivery'), href: `/${locale}/white/delivery`},
    {key: 'faq', label: t('faq'), href: `/${locale}/white/faq`},
    {key: 'care', label: t('care'), href: `/${locale}/white/care`},
  ];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-label={t('openMenu')}
        style={{WebkitTapHighlightColor: 'transparent'}}
        className={`-ml-2 flex h-11 w-11 shrink-0 items-center justify-center transition-opacity duration-200 active:scale-90 motion-reduce:active:scale-100 ${shown ? 'pointer-events-none opacity-0' : ''}`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="square">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      {portalReady && shown && createPortal(
        <>
          {/* The burger's travelling twin: rides to the drawer's edge while
              morphing into an X, slides home on close. Lives in the portal so
              it can paint above the panel (the header's own stacking context
              can't). */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t('close')}
            style={{
              WebkitTapHighlightColor: 'transparent',
              left: '4px',
              transform: entered ? 'translateX(calc(min(87vw, 420px) - 56px))' : 'translateX(0)',
            }}
            className="fixed top-2.5 z-[1202] flex h-11 w-11 items-center justify-center sm:top-5 transition-transform duration-[440ms] ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            <svg viewBox="0 0 24 24" className={`h-5 w-5 ${entered ? 'hamburger-open' : 'hamburger-close'}`} fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="square">
              <line x1="4" y1="7" x2="20" y2="7" className="hamburger-line hamburger-top" />
              <line x1="4" y1="12" x2="20" y2="12" className="hamburger-line hamburger-middle" />
              <line x1="4" y1="17" x2="20" y2="17" className="hamburger-line hamburger-bottom" />
            </svg>
          </button>

          {/* Scrim — dims the home behind and closes on tap. */}
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[1200] bg-[rgba(28,23,20,0.30)] backdrop-blur-[1px] transition-opacity duration-[400ms] ease-out motion-reduce:transition-none"
            style={{opacity: entered ? 1 : 0}}
          />
          <aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('menu')}
            className="wv-root fixed inset-y-0 left-0 z-[1201] flex w-[87%] max-w-[420px] flex-col bg-white font-sans antialiased shadow-[30px_0_60px_-30px_rgba(28,23,20,0.5)] transition-transform duration-[440ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
            style={{color: INK, transform: entered ? 'translateX(0)' : 'translateX(-100%)'}}
          >
            {/* The travelling burger (now an X at the drawer's edge) is the close
                control; the head row carries the brand asset alone. */}
            <div className="flex shrink-0 items-center px-6 pb-2 pt-5 sm:pt-7">
              <Image src="/logos/name-black.svg" alt="REINASLEO" width={1026} height={162} className="h-[13px] w-auto" />
            </div>

            {/* Primary nav — centres when it fits, scrolls from the top when the
                list overflows (short viewports / long RU labels). */}
            <nav className="flex flex-1 flex-col overflow-y-auto px-6">
              <div className="my-auto flex w-full flex-col py-6">
                {links.map((l) => {
                  const active = activeCat != null && l.key === activeCat;
                  return (
                    <a
                      key={l.key}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className="wv-menu-item wv-menu-link flex min-h-11 items-center font-display text-[26px] font-light tracking-[-0.01em]"
                      style={{color: active ? SIGNAL : INK, animationDelay: `${90 + links.indexOf(l) * 45}ms`}}
                    >
                      {l.label}
                    </a>
                  );
                })}
              </div>
            </nav>

            {/* Service pages — small stacked rows, each arriving on the same
                cadence as the categories above. */}
            <div className="mx-6 flex shrink-0 flex-col border-t pb-2 pt-3" style={{borderColor: HAIR}}>
              {secondary.map((sc, i) => {
                const active = pathname === sc.href;
                return (
                  <a
                    key={sc.key}
                    href={sc.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className="wv-menu-item wv-link inline-flex min-h-9 items-center self-start text-[11px] uppercase tracking-[0.12em]"
                    style={{color: active ? SIGNAL : MUTED, animationDelay: `${360 + i * 40}ms`}}
                  >
                    {sc.label}
                  </a>
                );
              })}
            </div>


            <div className="mx-6 mt-4 flex shrink-0 items-center gap-4 border-t pb-8 pt-3 text-[12px] uppercase tracking-[0.12em]" style={{borderColor: HAIR, color: INK}}>
              <a href={`/${locale}/white/account`} onClick={() => setOpen(false)} className="wv-link -my-2 inline-flex min-h-11 items-center">
                {t('account')}
              </a>
              <a href={`/${locale}/white/favourites`} onClick={() => setOpen(false)} className="wv-link -my-2 inline-flex min-h-11 items-center">
                {t('saved')}
              </a>
              <a href={`/${locale}/white/bag`} onClick={() => setOpen(false)} className="wv-link -my-2 inline-flex min-h-11 items-center">
                {t('bag')}
              </a>
            </div>
          </aside>
        </>,
        document.body,
      )}
    </>
  );
}
