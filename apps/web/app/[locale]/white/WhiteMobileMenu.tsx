'use client';

import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useFocusTrap} from '../../../lib/useFocusTrap';
import {WHITE_CATS, whiteCatLabel} from './products';
import {INK, MUTED, SIGNAL} from './wv-palette';

// Variant 2 "White" — minimalist mobile menu (owner ask). Stripped to essentials
// in the White DNA (Zara/H&M refs): no editorial photo, no per-link dividers —
// air separates. Large left-aligned Cormorant links with quiet muted index
// numerals as the one editorial detail; signal accent only on the active route.
// Staggered reveal is reduced-motion-safe (wv-rise). Focus-trapped; ESC +
// scroll-lock; focus returns to the hamburger on close (WCAG 2.4.3).

export default function WhiteMobileMenu({locale, activeCat}: {locale: string; activeCat?: string | null}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const t = useTranslations('white.menu');
  const pathname = usePathname();

  useFocusTrap(panelRef, open);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    // The hamburger is always mounted, so capturing it here is stable; copying to
    // a local keeps the cleanup honest (no stale-ref lint warning).
    const trigger = triggerRef.current;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      // WCAG 2.4.3 — focus order: hand focus back to the trigger on close.
      trigger?.focus();
    };
  }, [open]);

  const links = [
    {key: 'all', label: t('shop'), href: `/${locale}/white/shop`},
    ...WHITE_CATS.map((c) => ({key: c, label: whiteCatLabel(c, locale), href: `/${locale}/white/shop?cat=${c}`})),
  ];

  // Secondary tier — the brand/editorial pages, a quiet UI-font row beneath the
  // serif categories so the multi-page site is reachable from the primary nav.
  const secondary = [
    {key: 'lookbook', label: t('lookbook'), href: `/${locale}/white/lookbook`},
    {key: 'atelier', label: t('atelier'), href: `/${locale}/white/atelier`},
    {key: 'contact', label: t('contact'), href: `/${locale}/white/contact`},
  ];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-label={t('openMenu')}
        className="-ml-2 flex h-11 w-11 items-center justify-center"
      >
        <svg width="20" height="12" viewBox="0 0 20 12" fill="none" stroke={INK} strokeWidth="1.3" strokeLinecap="square">
          <line x1="0" y1="1" x2="20" y2="1" />
          <line x1="0" y1="11" x2="20" y2="11" />
        </svg>
      </button>

      {open && mounted && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={t('menu')}
          className="fixed inset-0 z-[1200] flex flex-col bg-white font-sans antialiased"
          style={{color: INK}}
        >
          <div className="flex shrink-0 items-center justify-between px-7 py-5">
            <span className="font-display text-[20px] font-medium tracking-[0.42em]">REINASLEO</span>
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

          {/* my-auto child centres the list when it fits but lets it scroll from
              the top when it overflows (short viewports / long RU labels). */}
          <nav className="flex flex-1 flex-col overflow-y-auto px-7" aria-label={t('menu')}>
            <div className="my-auto w-full py-8">
              {links.map((l, i) => {
                const active = activeCat != null && l.key === activeCat;
                return (
                  <a
                    key={l.key}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={`wv-rise wv-delay-${(i % 3) + 1} flex items-baseline gap-5 py-4 transition-colors`}
                    style={{color: active ? SIGNAL : INK}}
                  >
                    <span
                      aria-hidden="true"
                      className="w-5 shrink-0 text-[11px] tabular-nums tracking-[0.2em]"
                      style={{color: active ? SIGNAL : MUTED}}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-display text-[34px] font-light leading-none tracking-[-0.01em]">{l.label}</span>
                  </a>
                );
              })}

              {/* Secondary tier — brand/editorial pages, quiet UI-font row. */}
              <div className="wv-rise wv-delay-3 mt-12 flex flex-col text-[12px] uppercase tracking-[0.2em]">
                {secondary.map((s) => {
                  const active = pathname === s.href;
                  return (
                    <a
                      key={s.key}
                      href={s.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className="py-2 transition-opacity hover:opacity-60"
                      style={{color: active ? SIGNAL : MUTED}}
                    >
                      {s.label}
                    </a>
                  );
                })}
              </div>
            </div>
          </nav>

          <div className="shrink-0 px-7 pb-9">
            <div className="flex gap-7 text-[12px] uppercase tracking-[0.18em]" style={{color: MUTED}}>
              <a href={`/${locale}/white/favourites`} onClick={() => setOpen(false)} className="transition-opacity hover:opacity-60">
                {t('saved')}
              </a>
              <a href={`/${locale}/white/bag`} onClick={() => setOpen(false)} className="transition-opacity hover:opacity-60">
                {t('bag')}
              </a>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
