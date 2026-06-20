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
      const timer = setTimeout(() => setIsAnimating(false), 280);
      return () => clearTimeout(timer);
    }
  }, [isOpen, handleClose]);

  if (!isOpen && !isAnimating) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      handleClose();
    }
  };

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
      className={`fixed inset-0 z-[180] transition-opacity duration-300 ease-out ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={handleBackdropClick}
      style={{
        background: 'rgba(8, 5, 3, 0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        cursor: 'pointer',
      }}
      role="presentation"
    >
      <div className="flex items-start justify-center px-3 pt-[70px] sm:px-4">
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className={`liquid-glass-menu menu-panel relative w-full max-w-[calc(100%-12px)] cursor-default rounded-[28px] ${
            isOpen ? 'menu-panel-open' : 'menu-panel-close'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label={t('label')}
        >
          <div className="relative max-h-[calc(100dvh-100px)] overflow-y-auto px-3 py-4 sm:px-4">
            {/* Primary — each row is a tactile glass pill. */}
            <nav className="flex flex-col gap-0.5">
              {primary.map((item, index) => {
                const current = pathname === item.href;
                return (
                  <Link
                    key={item.key}
                    ref={index === 0 ? firstLinkRef : undefined}
                    href={item.href}
                    onClick={onClose}
                    aria-current={current ? 'page' : undefined}
                    className="menu-rise group flex items-center justify-between rounded-2xl px-4 py-3 transition-colors duration-200 hover:bg-[rgba(242,230,216,0.07)] focus-visible:bg-[rgba(242,230,216,0.07)] active:bg-[rgba(212,165,116,0.10)]"
                    style={{animationDelay: `${70 + index * 45}ms`}}
                  >
                    <span
                      className={`font-display text-[19px] tracking-[0.01em] transition-colors group-hover:text-accent group-focus-visible:text-accent ${
                        current ? 'text-accent' : 'text-inkSoft'
                      }`}
                    >
                      {item.label}
                    </span>
                    <span
                      aria-hidden="true"
                      className="font-accent text-[13px] text-inkSoft/20 transition-all duration-200 group-hover:translate-x-1 group-hover:text-accent group-focus-visible:translate-x-1 group-focus-visible:text-accent"
                    >
                      →
                    </span>
                  </Link>
                );
              })}
            </nav>

            <div className="mx-4 my-3 h-px bg-[rgba(242,230,216,0.1)]" />

            {/* Quiet secondary links. */}
            <nav className="flex flex-wrap gap-x-5 gap-y-2.5 px-4 pb-1">
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
      </div>
    </div>
  );
}
