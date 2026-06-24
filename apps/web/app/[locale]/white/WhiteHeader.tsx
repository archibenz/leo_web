'use client';

import type {ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import WhiteMobileMenu from './WhiteMobileMenu';
import {INK, HAIR} from './wv-palette';

// Variant 2 "White" — shared sticky header. Owns the chrome (blur, hairline,
// padding) and the flex-1 left/right slots that keep the REINASLEO wordmark
// dead-centre on every page; each page passes its own left/right content.

export default function WhiteHeader({locale, left, right, activeCat}: {locale: string; left: ReactNode; right: ReactNode; activeCat?: string}) {
  const pathname = usePathname();
  const t = useTranslations('white.header');
  const home = `/${locale}/white`;
  return (
    <header className="sticky top-0 z-10 bg-white/85 backdrop-blur-md" style={{borderBottom: `1px solid ${HAIR}`}}>
      {/* Skip-link: first focusable element so keyboard users bypass the repeated
          nav straight to <main id="wv-main"> (WCAG 2.4.1). */}
      <a
        href="#wv-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-[#1c1714] focus:px-4 focus:py-2 focus:text-[11px] focus:uppercase focus:tracking-[0.18em] focus:text-white"
      >
        {t('skipToContent')}
      </a>
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex flex-1 items-center justify-start">
          {/* Mobile: full-screen menu (hamburger). Desktop: the page's own nav. */}
          <div className="md:hidden">
            <WhiteMobileMenu locale={locale} activeCat={activeCat} />
          </div>
          <div className="hidden items-center md:flex">{left}</div>
        </div>
        <a
          href={home}
          onClick={(e) => {
            // On the home page the wordmark scrolls to top instead of a no-op
            // navigation. The showcase scrolls inside the .wv-root portal
            // (overflow-y-auto), not window — so scroll that container.
            if (pathname !== home) return;
            e.preventDefault();
            const root = e.currentTarget.closest('.wv-root');
            root?.scrollTo({top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
          }}
          className="font-display text-[22px] font-medium tracking-[0.42em] sm:text-[26px]"
          style={{color: INK}}
        >
          REINASLEO
        </a>
        <div className="flex flex-1 items-center justify-end">{right}</div>
      </div>
    </header>
  );
}
