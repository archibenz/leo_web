'use client';

import {useEffect, useRef, useState, useCallback} from 'react';
import {useTranslations} from 'next-intl';
import Link from 'next/link';
import {useFocusTrap} from '../lib/useFocusTrap';

type MenuOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  locale: string;
};

const SELECTION_ITEMS: ReadonlyArray<{key: 'new' | 'popular'; filter: 'new' | 'popular'}> = [
  {key: 'new', filter: 'new'},
  {key: 'popular', filter: 'popular'},
];

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
      const timer = setTimeout(() => setIsAnimating(false), 260);
      return () => clearTimeout(timer);
    }
  }, [isOpen, handleClose]);

  if (!isOpen && !isAnimating) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      handleClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[180] transition-opacity duration-300 ease-out ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={handleBackdropClick}
      style={{
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        cursor: 'pointer',
      }}
      role="presentation"
    >
      <div className="flex items-start justify-center pt-[80px] px-3 sm:px-4 lg:px-6">
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className={`menu-panel liquid-glass-strong relative w-full max-w-[calc(100%-24px)] sm:max-w-[calc(100%-32px)] lg:max-w-[calc(100%-48px)] rounded-2xl cursor-default ${
            isOpen ? 'menu-panel-open' : 'menu-panel-close'
          }`}
          style={{boxShadow: '0 0 60px rgba(212, 165, 116, 0.08), 0 25px 50px rgba(0, 0, 0, 0.5)'}}
          role="menu"
          aria-label="Main menu"
        >
          <div className="max-h-[calc(100vh-110px)] overflow-y-auto px-4 py-5 sm:px-7 sm:py-7">
            <p className="mb-3 font-accent text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]/70">
              {t('sections.selection')}
            </p>
            <nav className="grid grid-cols-2 gap-x-3 gap-y-1">
              {SELECTION_ITEMS.map((item, index) => (
                <Link
                  key={item.key}
                  ref={index === 0 ? firstLinkRef : undefined}
                  href={`/${locale}/v1/shop?filter=${item.filter}`}
                  onClick={onClose}
                  className="group flex items-baseline gap-2 py-2 text-[15px] font-medium uppercase tracking-[0.06em] text-[#F2E6D8] transition-colors hover:text-accent focus:text-accent"
                  role="menuitem"
                >
                  <span className="text-[var(--accent)]/45 transition-colors group-hover:text-[var(--accent)]">·</span>
                  {t(`categories.${item.key}`)}
                </Link>
              ))}
            </nav>

            <div className="my-5 border-t border-[#F2E6D8]/10" />

            <p className="mb-3 font-accent text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]/70">
              {t('sections.categories')}
            </p>
            <nav className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
              {CATEGORY_ITEMS.map((key) => (
                <Link
                  key={key}
                  href={`/${locale}/v1/shop?category=${key}`}
                  onClick={onClose}
                  className="block py-2 text-[15px] font-medium uppercase tracking-[0.06em] text-[#F2E6D8] transition-colors hover:text-accent focus:text-accent truncate"
                  role="menuitem"
                >
                  {t(`categories.${key}`)}
                </Link>
              ))}
            </nav>

            <div className="my-5 border-t border-[#F2E6D8]/10" />

            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
              <Link
                href={`/${locale}/v1/shop`}
                onClick={onClose}
                className="text-[13px] uppercase tracking-[0.08em] text-[#F2E6D8]/70 transition-colors hover:text-accent focus:text-accent"
                role="menuitem"
              >
                {nav('shop')}
              </Link>
              <Link
                href={`/${locale}/care`}
                onClick={onClose}
                className="text-[13px] uppercase tracking-[0.08em] text-[#F2E6D8]/70 transition-colors hover:text-accent focus:text-accent"
                role="menuitem"
              >
                {t('categories.care')}
              </Link>
              <Link
                href={`/${locale}/about`}
                onClick={onClose}
                className="text-[13px] uppercase tracking-[0.08em] text-[#F2E6D8]/70 transition-colors hover:text-accent focus:text-accent"
                role="menuitem"
              >
                {nav('about')}
              </Link>
              <Link
                href={`/${locale}/contact`}
                onClick={onClose}
                className="text-[13px] uppercase tracking-[0.08em] text-[#F2E6D8]/70 transition-colors hover:text-accent focus:text-accent"
                role="menuitem"
              >
                {nav('contact')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
