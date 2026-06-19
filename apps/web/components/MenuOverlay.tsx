'use client';

import {useEffect, useRef, useState, useCallback} from 'react';
import {useTranslations} from 'next-intl';
import Image from 'next/image';
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

// Editorial full-screen menu image — from the shared shop asset base (CSP 'self').
const MENU_IMAGE = '/images/shop/editorial-clean.jpg';

export default function MenuOverlay({isOpen, onClose, locale}: MenuOverlayProps) {
  const t = useTranslations('menu');
  const nav = useTranslations('nav');
  const pathname = usePathname();

  const menuRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useFocusTrap(menuRef, isOpen);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
      const focusTimer = setTimeout(() => firstLinkRef.current?.focus(), 280);
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
      const timer = setTimeout(() => setIsAnimating(false), 360);
      return () => clearTimeout(timer);
    }
  }, [isOpen, handleClose]);

  if (!isOpen && !isAnimating) return null;

  // Primary list — Shop, then the categories. Indexed editorial numbering.
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

  return (
    <div
      ref={menuRef}
      className={`fixed inset-0 z-[180] flex h-[100dvh] flex-col transition-opacity duration-300 ease-out ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{background: 'var(--paper)'}}
      role="dialog"
      aria-modal="true"
      aria-label={t('label')}
    >
      {/* The site header (hamburger→✕, wordmark, icons) stays above this overlay
          and owns the close affordance — so the menu is pure content, padded to
          clear the header. ESC also closes (handler above). */}

      {/* Primary nav — large indexed serif links, staggered reveal */}
      <nav className="flex-1 overflow-y-auto px-6 pt-[92px] sm:px-8" aria-label={t('label')}>
        {primary.map((item, index) => {
          const current = pathname === item.href;
          return (
            <Link
              key={item.key}
              ref={index === 0 ? firstLinkRef : undefined}
              href={item.href}
              onClick={onClose}
              aria-current={current ? 'page' : undefined}
              className="menu-rise group flex items-baseline gap-4 py-2"
              style={{animationDelay: `${90 + index * 50}ms`}}
            >
              <span className="w-6 shrink-0 font-accent text-[11px] tabular-nums text-[var(--accent)]/55">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span
                className={`font-display text-[30px] leading-[1.08] tracking-[-0.01em] transition-colors group-hover:text-accent group-focus-visible:text-accent ${
                  current ? 'text-accent' : 'text-inkSoft'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Editorial strip + quiet secondary links */}
      <div className="menu-rise shrink-0 px-6 pb-7 sm:px-8" style={{animationDelay: `${90 + primary.length * 50}ms`}}>
        <div className="relative mb-5 aspect-[3/1] w-full overflow-hidden">
          <Image src={MENU_IMAGE} alt="" fill sizes="100vw" className="object-cover" />
          <span className="absolute bottom-2.5 left-3 font-accent text-[10px] uppercase tracking-[0.24em] text-white/90">
            {locale === 'ru' ? 'Осень / Зима 2026' : 'Autumn / Winter 2026'}
          </span>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label={t('sections.categories')}>
          {secondary.map(({href, label}) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="text-[12px] uppercase tracking-[0.08em] text-inkSoft/55 transition-colors hover:text-accent focus-visible:text-accent"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
