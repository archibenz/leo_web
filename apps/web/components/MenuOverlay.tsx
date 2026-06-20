'use client';

import {useEffect, useRef, useState, useCallback} from 'react';
import {useTranslations} from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import {usePathname} from 'next/navigation';
import {useFocusTrap} from '../lib/useFocusTrap';

type MenuOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  locale: string;
};

const CATEGORY_ITEMS = [
  'dresses',
  'outerwear',
  'tailoring',
  'knitwear',
  'blouses',
  'skirts',
  'trousers',
] as const;

// Editorial anchor for the takeover — outerwear shot in the warm brand key.
const MENU_EDITORIAL_IMAGE = '/images/shop/editorial-outer.jpg';

export default function MenuOverlay({isOpen, onClose, locale}: MenuOverlayProps) {
  const t = useTranslations('menu');
  const nav = useTranslations('nav');
  const pathname = usePathname();

  const menuRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  // Active category is read from the URL on open (window.location, not
  // useSearchParams — keeps this global-header component out of a Suspense
  // bailout). The ?category lives in the query, which usePathname omits.
  const [activeCat, setActiveCat] = useState<string | null>(null);

  useFocusTrap(menuRef, isOpen);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      setActiveCat(new URLSearchParams(window.location.search).get('category'));
      document.body.style.overflow = 'hidden';
      // Move focus into the dialog container (not the first link) so the
      // overlay is announced without ringing/scrolling a link on touch-open.
      const focusTimer = setTimeout(() => menuRef.current?.focus(), 320);
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') handleClose();
      };
      document.addEventListener('keydown', handleEsc);
      return () => {
        document.body.style.overflow = '';
        clearTimeout(focusTimer);
        document.removeEventListener('keydown', handleEsc);
      };
    } else {
      document.body.style.overflow = '';
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, handleClose]);

  if (!isOpen && !isAnimating) return null;

  const primary = [
    {key: 'shop', href: `/${locale}/shop`, label: nav('shop')},
    ...CATEGORY_ITEMS.map((key) => ({key, href: `/${locale}/shop?category=${key}`, label: t(`categories.${key}`)})),
  ];
  const secondary = [
    {href: `/${locale}/shop?filter=new`, label: t('categories.new')},
    {href: `/${locale}/shop?filter=popular`, label: t('categories.popular')},
    {href: `/${locale}/care`, label: t('categories.care')},
    {href: `/${locale}/about`, label: nav('about')},
    {href: `/${locale}/contact`, label: nav('contact')},
  ];

  // Full-screen editorial takeover — sits above the header (z-200) so the menu
  // is the entire context. Fashion-contents layout: two-digit gold index
  // numerals beside large serif category links, hairline rules, staggered
  // reveal (menu-rise is reduced-motion-safe), an editorial photo footer.
  return (
    <div
      ref={menuRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('label')}
      tabIndex={-1}
      className={`fixed inset-0 z-[210] flex h-[100dvh] w-full flex-col outline-none transition-opacity duration-300 ease-out ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{background: 'radial-gradient(125% 85% at 50% -12%, #2B1711 0%, #1E120D 58%)'}}
    >
      {/* Top bar — wordmark + close (header is covered, so close lives here). */}
      <div className="flex shrink-0 items-center justify-between px-6 py-5">
        <span className="font-display text-[15px] font-medium tracking-[0.34em] text-inkSoft">REINASLEO</span>
        <button
          type="button"
          onClick={handleClose}
          aria-label={t('label')}
          className="-mr-2 flex h-11 w-11 items-center justify-center text-inkSoft transition-colors hover:text-accent focus-visible:text-accent"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        </button>
      </div>

      {/* Primary — editorial table of contents. my-auto centres the list when
          there is spare height and collapses to a clean top-aligned scroll when
          the list overflows (justify-center would clip both ends instead). */}
      <nav className="flex flex-1 flex-col overflow-y-auto" aria-label={t('label')}>
        <div className="my-auto flex w-full flex-col px-6 py-4">
        {primary.map((item, index) => {
          const onShop = pathname === `/${locale}/shop`;
          const current = item.key === 'shop' ? onShop && !activeCat : onShop && item.key === activeCat;
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onClose}
              aria-current={current ? 'page' : undefined}
              className="menu-rise group flex items-baseline gap-5 border-b py-3.5 transition-colors"
              style={{animationDelay: `${60 + index * 42}ms`, borderColor: 'rgba(242,230,216,0.10)'}}
            >
              <span
                aria-hidden="true"
                className={`w-6 shrink-0 font-accent text-[12px] tabular-nums tracking-[0.06em] transition-colors ${
                  current ? 'text-accent' : 'text-accent/45 group-hover:text-accent group-focus-visible:text-accent'
                }`}
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <span
                className={`flex-1 font-display text-[30px] font-light leading-[1.08] tracking-[-0.01em] transition-colors group-hover:text-accent group-focus-visible:text-accent ${
                  current ? 'text-accent' : 'text-inkSoft'
                }`}
              >
                {item.label}
              </span>
              <span
                aria-hidden="true"
                className={`font-accent text-[15px] transition-all duration-200 group-hover:translate-x-1 group-hover:text-accent group-focus-visible:translate-x-1 group-focus-visible:text-accent ${
                  current ? 'text-accent' : 'text-inkSoft/20'
                }`}
              >
                →
              </span>
            </Link>
          );
        })}
        </div>
      </nav>

      {/* Secondary quiet row + editorial photo footer. */}
      <div className="shrink-0 px-6 pb-8 pt-4">
        <nav className="flex flex-wrap gap-x-5 gap-y-0.5" aria-label={t('sections.more')}>
          {secondary.map(({href, label}) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="inline-flex items-center py-2.5 text-[12px] uppercase tracking-[0.1em] text-inkSoft/70 transition-colors hover:text-accent focus-visible:text-accent"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="menu-rise relative mt-5 aspect-[16/9] w-full overflow-hidden rounded-[18px]" style={{animationDelay: '420ms'}}>
          <Image src={MENU_EDITORIAL_IMAGE} alt="" fill sizes="100vw" className="object-cover" />
          <div
            className="absolute inset-x-0 bottom-0 flex items-end p-4"
            style={{background: 'linear-gradient(to top, rgba(8,5,3,0.62), transparent)'}}
          >
            <span className="font-accent text-[12px] uppercase tracking-[0.18em] text-inkSoft/90">{t('footer.tagline')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
