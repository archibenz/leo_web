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
          role="dialog"
          aria-modal="true"
          aria-label={t('label')}
        >
          <div className="max-h-[calc(100vh-110px)] overflow-y-auto px-6 py-7 sm:px-9 sm:py-9">
            {/* Minimal: one calm vertical column — Shop + categories, large type,
                hairline dividers, generous air. No multi-column grids. */}
            <nav className="flex flex-col">
              {[{key: 'shop', href: `/${locale}/shop`, label: nav('shop')}].concat(
                CATEGORY_ITEMS.map((key) => ({key, href: `/${locale}/shop?category=${key}`, label: t(`categories.${key}`)})),
              ).map((item, index) => {
                const current = pathname === item.href;
                return (
                  <Link
                    key={item.key}
                    ref={index === 0 ? firstLinkRef : undefined}
                    href={item.href}
                    onClick={onClose}
                    aria-current={current ? 'page' : undefined}
                    className={`border-b border-inkSoft/10 py-4 font-accent text-[21px] tracking-[0.03em] transition-colors hover:text-accent focus:text-accent ${current ? 'text-accent' : 'text-inkSoft'}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Quiet secondary row — editorial / info links. */}
            <nav className="mt-7 flex flex-wrap gap-x-5 gap-y-2.5">
              {[
                {href: `/${locale}/shop?filter=new`, label: t('categories.new')},
                {href: `/${locale}/shop?filter=popular`, label: t('categories.popular')},
                {href: `/${locale}/care`, label: t('categories.care')},
                {href: `/${locale}/about`, label: nav('about')},
                {href: `/${locale}/contact`, label: nav('contact')},
              ].map(({href, label}) => (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className="text-[12px] uppercase tracking-[0.08em] text-inkSoft/55 transition-colors hover:text-accent focus:text-accent"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
