'use client';

import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import Image from 'next/image';
import {useFocusTrap} from '../../../lib/useFocusTrap';
import {WHITE_CATS, whiteCatLabel, WHITE_HERO_IMAGE} from './products';
import {INK, MUTED, HAIR, SIGNAL} from './wv-palette';

// Variant 2 "White" — mobile menu. The header only had a single Shop link; this
// is a full-screen white-DNA menu: large Cormorant category links centred with
// air, an editorial photo, signal accent on the active route. Staggered reveal
// is reduced-motion-safe (wv-rise). Focus-trapped, ESC + scroll-lock.

export default function WhiteMobileMenu({locale, activeCat}: {locale: string; activeCat?: string | null}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const ru = locale === 'ru';
  const t = (en: string, rus: string) => (ru ? rus : en);

  useFocusTrap(panelRef, open);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const links = [
    {key: 'all', label: t('Shop', 'Магазин'), href: `/${locale}/white/shop`},
    ...WHITE_CATS.map((c) => ({key: c, label: whiteCatLabel(c, locale), href: `/${locale}/white/shop?cat=${c}`})),
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-label={t('Open menu', 'Открыть меню')}
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
          aria-label={t('Menu', 'Меню')}
          className="fixed inset-0 z-[1200] flex flex-col bg-white font-sans antialiased"
          style={{color: INK}}
        >
          <div className="flex shrink-0 items-center justify-between px-6 py-5">
            <span className="font-display text-[20px] font-medium tracking-[0.42em]">REINASLEO</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('Close', 'Закрыть')}
              className="-mr-2 flex h-11 w-11 items-center justify-center transition-opacity hover:opacity-60"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.3" strokeLinecap="square">
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            </button>
          </div>

          <nav className="flex flex-1 flex-col justify-center overflow-y-auto px-6" aria-label={t('Menu', 'Меню')}>
            {links.map((l, i) => {
              const active = activeCat != null && l.key === activeCat;
              return (
                <a
                  key={l.key}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`wv-rise wv-delay-${(i % 3) + 1} border-b py-3.5 font-display text-[30px] font-light leading-tight tracking-[-0.01em] transition-colors`}
                  style={{borderColor: HAIR, color: active ? SIGNAL : INK}}
                >
                  {l.label}
                </a>
              );
            })}
          </nav>

          <div className="shrink-0 px-6 pb-8">
            <div className="wv-rise relative mb-5 aspect-[3/1] w-full overflow-hidden">
              <Image src={WHITE_HERO_IMAGE} alt="" fill sizes="100vw" className="object-cover" />
            </div>
            <div className="flex gap-6 text-[12px] uppercase tracking-[0.18em]" style={{color: MUTED}}>
              <a href={`/${locale}/white/favourites`} onClick={() => setOpen(false)} className="transition-opacity hover:opacity-60">
                {t('Saved', 'Избранное')}
              </a>
              <a href={`/${locale}/white/bag`} onClick={() => setOpen(false)} className="transition-opacity hover:opacity-60">
                {t('Bag', 'Корзина')}
              </a>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
