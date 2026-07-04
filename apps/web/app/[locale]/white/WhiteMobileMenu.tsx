'use client';

import Image from 'next/image';
import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useFocusTrap} from '../../../lib/useFocusTrap';
import {useMountTransition} from '../../../lib/useMountTransition';
import {WHITE_CATS, whiteCatLabel, WHITE_EDITORIAL} from './products';
import {INK, MUTED, SIGNAL, HAIR} from './wv-palette';

// Variant 2 "White" — a left side drawer (owner redesign). Slides in over a
// dimmed home rather than a full-screen list: reads as a boutique, keeps the
// shopper's place. Large left-aligned Cormorant category links (no index
// numbers — navigation isn't a sequence), a lookbook image gives the drawer a
// point of view, signal accent only on the active route. Slide is CSS +
// reduced-motion safe. Focus-trapped; ESC + scroll-lock (restores the white
// portal's own lock); focus returns to the hamburger on close (WCAG 2.4.3).

const SLIDE_MS = 320;

export default function WhiteMobileMenu({locale, activeCat}: {locale: string; activeCat?: string | null}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [portalReady, setPortalReady] = useState(false);
  const {mounted: shown, entered} = useMountTransition(open, SLIDE_MS);
  const t = useTranslations('white.menu');
  const pathname = usePathname();

  useFocusTrap(panelRef, open);
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
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      // WCAG 2.4.3 — focus order: hand focus back to the trigger on close.
      trigger?.focus();
    };
  }, [open]);

  const links = [
    {key: 'all', label: t('shop'), href: `/${locale}/white/shop`},
    ...WHITE_CATS.map((c) => ({key: c, label: whiteCatLabel(c, locale), href: `/${locale}/white/shop?cat=${c}`})),
  ];

  // Secondary tier — brand and service pages, stacked under the categories.
  const secondary = [
    {key: 'atelier', label: t('atelier'), href: `/${locale}/white/atelier`},
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
        className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center"
      >
        <svg width="20" height="12" viewBox="0 0 20 12" fill="none" stroke={INK} strokeWidth="1.3" strokeLinecap="square">
          <line x1="0" y1="1" x2="20" y2="1" />
          <line x1="0" y1="11" x2="20" y2="11" />
        </svg>
      </button>

      {portalReady && shown && createPortal(
        <>
          {/* Scrim — dims the home behind and closes on tap. */}
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[1200] bg-[rgba(28,23,20,0.30)] backdrop-blur-[1px] transition-opacity duration-300 ease-out motion-reduce:transition-none"
            style={{opacity: entered ? 1 : 0}}
          />
          <aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('menu')}
            className="wv-root fixed inset-y-0 left-0 z-[1201] flex w-[87%] max-w-[420px] flex-col bg-white font-sans antialiased shadow-[30px_0_60px_-30px_rgba(28,23,20,0.5)] transition-transform duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{color: INK, transform: entered ? 'translateX(0)' : 'translateX(-100%)'}}
          >
            <div className="flex shrink-0 items-center justify-between px-6 pb-2 pt-6">
              <span className="font-display text-[19px] font-medium tracking-[0.34em]">REINASLEO</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('close')}
                className="-mr-2 flex h-11 w-11 items-center justify-center transition-opacity hover:opacity-60"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.3" strokeLinecap="square">
                  <path d="M5 5l14 14M19 5L5 19" />
                </svg>
              </button>
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
                      className="wv-tap wv-menu-item flex min-h-[52px] items-center px-2 font-display text-[33px] font-light tracking-[-0.01em]"
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
                    className="wv-tap wv-menu-item flex min-h-10 items-center px-2 text-[12px] uppercase tracking-[0.12em]"
                    style={{color: active ? SIGNAL : MUTED, animationDelay: `${360 + i * 40}ms`}}
                  >
                    {sc.label}
                  </a>
                );
              })}
            </div>

            {/* Lookbook — the drawer's one editorial image, a real entry not decor. */}
            <a
              href={`/${locale}/white/lookbook`}
              onClick={() => setOpen(false)}
              className="wv-menu-item relative mx-6 block aspect-[16/6] overflow-hidden"
              style={{animationDelay: '560ms'}}
            >
              <Image src={WHITE_EDITORIAL[0]} alt="" fill sizes="420px" className="object-cover" />
              <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(28,23,20,0.34))]" />
              <span className="absolute bottom-3 left-4 font-display text-[18px] font-light italic text-white">
                {t('lookbook')}
              </span>
            </a>

            <div className="mx-6 mt-4 flex shrink-0 items-center gap-4 border-t pb-8 pt-3 text-[12px] uppercase tracking-[0.12em]" style={{borderColor: HAIR, color: INK}}>
              <a href={`/${locale}/white/favourites`} onClick={() => setOpen(false)} className="wv-tap -my-2 inline-flex min-h-11 items-center px-2">
                {t('saved')}
              </a>
              <a href={`/${locale}/white/bag`} onClick={() => setOpen(false)} className="wv-tap -my-2 inline-flex min-h-11 items-center px-2">
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
