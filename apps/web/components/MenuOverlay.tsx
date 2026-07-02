'use client';

import {useEffect, useRef, useState, useCallback} from 'react';
import {useTranslations} from 'next-intl';
import Link from 'next/link';
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
      // Move focus into the panel (not the first link) so the drawer is
      // announced without ringing/scrolling a link on touch-open. Wait for the
      // slide-in so the focus ring doesn't paint mid-transform.
      const focusTimer = setTimeout(() => menuRef.current?.focus(), 380);
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
      const timer = setTimeout(() => setIsAnimating(false), 380);
      return () => clearTimeout(timer);
    }
  }, [isOpen, handleClose]);

  if (!isOpen && !isAnimating) return null;

  const primary = [
    {key: 'home', href: `/${locale}`, label: nav('home')},
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

  // Side drawer — a scrim over the page (tap to close) plus a panel that slides
  // in from the left. Sits above the header (z-210). Brand-dark surface, gold
  // index numerals beside compact serif links, hairline rules. The slide and
  // scrim fade are reduced-motion-safe (transition-none collapses them to an
  // instant show/hide); menu-rise already no-ops under reduced motion.
  return (
    <div className="fixed inset-0 z-[210]">
      {/* Scrim — tap to dismiss. */}
      <button
        type="button"
        aria-label={t('label')}
        tabIndex={-1}
        onClick={handleClose}
        className={`absolute inset-0 h-full w-full cursor-default bg-[#0A0705]/70 backdrop-blur-[2px] transition-opacity duration-300 ease-out motion-reduce:transition-none ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Panel — slides from the left. */}
      <div
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('label')}
        tabIndex={-1}
        className={`absolute left-0 top-0 flex h-[100dvh] w-[min(87vw,340px)] flex-col border-r border-[rgba(242,230,216,0.09)] shadow-[0_0_60px_rgba(0,0,0,0.55)] outline-none transition-transform duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{background: 'linear-gradient(180deg, #2B1711 0%, #1E120D 42%)'}}
      >
        {/* Top bar — wordmark + close. */}
        <div className="flex shrink-0 items-center justify-between px-5 py-4">
          <span className="font-display text-[14px] font-medium tracking-[0.32em] text-inkSoft">REINASLEO</span>
          <button
            type="button"
            onClick={handleClose}
            aria-label={t('label')}
            className="-mr-1.5 flex h-11 w-11 items-center justify-center text-inkSoft transition-colors hover:text-accent focus-visible:text-accent"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        </div>

        {/* Primary nav — scrollable list. */}
        <nav className="flex flex-1 flex-col overflow-y-auto px-5 py-1" aria-label={t('label')}>
          {primary.map((item, index) => {
            const onShop = pathname === `/${locale}/shop`;
            const current = item.key === 'home'
              ? pathname === `/${locale}`
              : item.key === 'shop'
              ? onShop && !activeCat
              : onShop && item.key === activeCat;
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={onClose}
                aria-current={current ? 'page' : undefined}
                className="menu-rise group flex items-baseline gap-4 border-b py-3 transition-colors"
                style={{animationDelay: `${40 + index * 34}ms`, borderColor: 'rgba(242,230,216,0.08)'}}
              >
                <span
                  aria-hidden="true"
                  className={`w-5 shrink-0 font-accent text-[11px] tabular-nums tracking-[0.06em] transition-colors ${
                    current ? 'text-accent' : 'text-accent/45 group-hover:text-accent group-focus-visible:text-accent'
                  }`}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span
                  className={`flex-1 font-display text-[22px] font-light leading-[1.12] tracking-[-0.01em] transition-colors group-hover:text-accent group-focus-visible:text-accent ${
                    current ? 'text-accent' : 'text-inkSoft'
                  }`}
                >
                  {item.label}
                </span>
                <span
                  aria-hidden="true"
                  className={`self-center font-accent text-[14px] transition-all duration-200 group-hover:translate-x-1 group-hover:text-accent group-focus-visible:translate-x-1 group-focus-visible:text-accent ${
                    current ? 'text-accent' : 'text-inkSoft/20'
                  }`}
                >
                  →
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Secondary quiet links + tagline. */}
        <div className="shrink-0 px-5 pb-7 pt-4">
          <nav className="-my-1 flex flex-wrap gap-x-4" aria-label={t('sections.more')}>
            {secondary.map(({href, label}) => (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className="inline-flex min-h-11 items-center text-[11.5px] uppercase tracking-[0.1em] text-inkSoft/65 transition-colors hover:text-accent focus-visible:text-accent"
              >
                {label}
              </Link>
            ))}
          </nav>
          <p className="mt-4 font-accent text-[11px] uppercase tracking-[0.18em] text-inkSoft/40">{t('footer.tagline')}</p>
        </div>
      </div>
    </div>
  );
}
