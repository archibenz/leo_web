'use client';

import Link from 'next/link';
import type {ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useEffect, useRef, useState} from 'react';
import Image from 'next/image';
import WhiteMobileMenu from './WhiteMobileMenu';
import {MUTED, HAIR} from './wv-palette';

// Variant 2 "White" — shared sticky header. Owns the chrome (blur, hairline,
// padding) and the flex-1 left/right slots that keep the REINASLEO wordmark
// dead-centre on every page; each page passes its own left/right content.

export default function WhiteHeader({locale, left, right, activeCat}: {locale: string; left: ReactNode; right: ReactNode; activeCat?: string}) {
  const pathname = usePathname();
  const t = useTranslations('white.header');
  const home = `/${locale}/white`;
  // Dynamic bar: hides on scroll down past the hero's edge, returns the moment
  // the reader scrolls up. rAF-throttled; the drawer keeps it pinned via the
  // body scroll-lock (no scroll events while open).
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        const delta = y - lastY.current;
        if (y < 96) setHidden(false);
        else if (delta > 6) setHidden(true);
        else if (delta < -6) setHidden(false);
        lastY.current = y;
      });
    };
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md transition-transform duration-300 ease-out motion-reduce:transition-none" style={{borderBottom: `1px solid ${HAIR}`, transform: hidden ? 'translateY(-100%)' : 'translateY(0)'}}>
      {/* Skip-link: first focusable element so keyboard users bypass the repeated
          nav straight to <main id="wv-main"> (WCAG 2.4.1). */}
      <Link
        href="#wv-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-[#1c1714] focus:px-4 focus:py-2 focus:text-[11px] focus:uppercase focus:tracking-[0.18em] focus:text-white"
      >
        {t('skipToContent')}
      </Link>
      {/* px-6 through the md band: the wordmark's wide tracking leaves the
          equal-split side slots ~178px each at 768, and the ru action labels
          need every pixel of it — full px-10 returns at lg. */}
      <div className="-my-2 flex items-center py-2 justify-between px-3 py-2.5 sm:px-4 sm:py-5 lg:px-5">
        <div className="flex flex-1 items-center justify-start">
          {/* The side drawer is the navigation at every width. */}
          <WhiteMobileMenu locale={locale} activeCat={activeCat} />
          <div className="hidden items-center md:flex">{left}</div>
        </div>
        <Link
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
          {/* The brand mark — the name with the diamond set in the O. */}
          <Image src="/logos/name-mark-black.svg" alt="REINASLEO" width={1038} height={174} priority className="h-[26px] w-auto sm:h-[30px]" />
        </Link>
        <div className="flex flex-1 items-center justify-end">{right}</div>
      </div>
    </header>
  );
}
