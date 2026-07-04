'use client';

import type {ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import Image from 'next/image';
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
      {/* px-6 through the md band: the wordmark's wide tracking leaves the
          equal-split side slots ~178px each at 768, and the ru action labels
          need every pixel of it — full px-10 returns at lg. */}
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-5 sm:px-6 lg:px-10">
        <div className="flex flex-1 items-center justify-start">
          {/* The side drawer is the navigation at every width. */}
          <WhiteMobileMenu locale={locale} activeCat={activeCat} />
          <div className="hidden items-center md:flex">{left}</div>
        </div>
        <a
          href={home}
          onClick={(e) => {
            // On the home page the wordmark scrolls to top instead of a no-op
            // navigation.
            if (pathname !== home) return;
            e.preventDefault();
            window.scrollTo({top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
          }}
          className="shrink-0"
          aria-label="REINASLEO"
        >
          {/* The brand lockup from the asset files — the cube icon, then the
              name set to the cube's height. */}
          <span className="flex items-center gap-2.5 sm:gap-3">
            <Image src="/logos/icon-black.svg" alt="" width={100} height={100} priority className="h-[26px] w-auto sm:h-[31px]" />
            <Image src="/logos/name-black.svg" alt="REINASLEO" width={1026} height={162} priority className="h-[20px] w-auto sm:h-[24px]" />
          </span>
        </a>
        <div className="flex flex-1 items-center justify-end">{right}</div>
      </div>
    </header>
  );
}
