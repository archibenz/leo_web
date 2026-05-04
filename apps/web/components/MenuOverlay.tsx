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

type CollectionItem = {
  id: string;
  season: string;
  subItemKeys: string[];
};

export default function MenuOverlay({isOpen, onClose, locale}: MenuOverlayProps) {
  const t = useTranslations('menu');
  const nav = useTranslations('nav');
  
  const menuRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hoveredCollection, setHoveredCollection] = useState<string | null>(null);

  useFocusTrap(menuRef, isOpen);

  // Main category keys
  const categoryKeys = ['new', 'outerwear', 'dresses', 'knitwear', 'trousers', 'skirts', 'blouses', 'care'];

  // Collections with sub-item keys
  const collections: CollectionItem[] = [
    {id: 'winter', season: 'winter', subItemKeys: ['skirts', 'dresses', 'jackets']},
    {id: 'spring', season: 'spring', subItemKeys: ['coats', 'trousers', 'blouses']},
    {id: 'summer', season: 'summer', subItemKeys: ['eveningDresses', 'tops']},
    {id: 'autumn', season: 'autumn', subItemKeys: ['suits', 'midiSkirts', 'cardigans']},
  ];

  // Footer link keys
  const footerLinkKeys = [
    {key: 'shop', href: `/${locale}/shop`},
    {key: 'about', href: `/${locale}/about`},
    {key: 'contact', href: `/${locale}/contact`},
  ];

  // Stable close handler
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Body scroll lock + ESC key when open
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
      
      // Focus first link after animation
      const focusTimer = setTimeout(() => firstLinkRef.current?.focus(), 280);
      
      // ESC key handler
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleClose();
        }
      };
      document.addEventListener('keydown', handleEsc);
      
      return () => {
        document.body.style.overflow = '';
        clearTimeout(focusTimer);
        document.removeEventListener('keydown', handleEsc);
      };
    } else {
      document.body.style.overflow = '';
      setHoveredCollection(null);
      // Delay unmounting to match menuSwingOut animation (220ms + safety)
      const timer = setTimeout(() => setIsAnimating(false), 260);
      return () => clearTimeout(timer);
    }
  }, [isOpen, handleClose]);

  if (!isOpen && !isAnimating) return null;

  // Handler for backdrop clicks - close menu when clicking outside panel
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Close if clicking anywhere on backdrop (not inside menu panel)
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      handleClose();
    }
  };

  return (
    <>
      {/* Full-screen backdrop - subtle darkening for focus on menu */}
      <div
        className={`fixed inset-0 z-[180] transition-opacity duration-300 ease-out ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleBackdropClick}
        style={{
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          cursor: 'pointer'
        }}
        role="presentation"
      >
        {/* Menu panel - tempered fade-down */}
        <div className="flex items-start justify-center pt-[80px] px-3 sm:px-4 lg:px-6">
          <div
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
            className={`menu-panel liquid-glass-strong relative w-full max-w-[calc(100%-24px)] sm:max-w-[calc(100%-32px)] lg:max-w-[calc(100%-48px)] rounded-2xl cursor-default ${
              isOpen ? 'menu-panel-open' : 'menu-panel-close'
            }`}
            style={{
              boxShadow: '0 0 60px rgba(212, 165, 116, 0.08), 0 25px 50px rgba(0, 0, 0, 0.5)'
            }}
            role="menu"
            aria-label="Main menu"
          >
          <div className="max-h-[calc(100vh-110px)] overflow-y-auto px-3 py-3 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            {/* Main categories grid */}
            <nav className="grid grid-cols-2 gap-x-3 gap-y-0 sm:gap-x-8 sm:gap-y-1 lg:grid-cols-4">
              {categoryKeys.map((key, index) => (
                <Link
                  key={key}
                  ref={index === 0 ? firstLinkRef : undefined}
                  href={key === 'care' ? `/${locale}/care` : `/${locale}/shop?category=${key}`}
                  onClick={onClose}
                  className="block py-1.5 text-sm font-medium uppercase tracking-[0.04em] sm:tracking-[0.08em] text-[#F2E6D8] transition-colors hover:text-accent focus:text-accent sm:py-2.5 sm:text-base truncate"
                  role="menuitem"
                >
                  {t(`categories.${key}`)}
                </Link>
              ))}
            </nav>

            {/* Divider */}
            <div className="my-3 border-t border-[#F2E6D8]/10 sm:my-5" />

            {/* Collections section */}
            <div className="mb-4 sm:mb-6">
              <p className="mb-2 font-accent text-[14px] uppercase tracking-[0.1em] sm:tracking-[0.18em] text-[#F2E6D8]/40 sm:mb-4">
                {t('collections')}
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:gap-x-10 sm:gap-y-2 lg:grid-cols-4">
                {collections.map((collection) => (
                  <div
                    key={collection.id}
                    className="relative"
                    onMouseEnter={() => setHoveredCollection(collection.id)}
                    onMouseLeave={() => setHoveredCollection(null)}
                    onFocus={() => setHoveredCollection(collection.id)}
                    onBlur={() => setHoveredCollection(null)}
                  >
                    <Link
                      href={`/${locale}/shop?season=${collection.season}`}
                      onClick={onClose}
                      className="block py-1.5 text-sm font-medium uppercase tracking-[0.04em] sm:tracking-[0.08em] text-[#F2E6D8] transition-colors hover:text-accent focus:text-accent sm:py-2.5 sm:text-base truncate"
                      role="menuitem"
                    >
                      {t(collection.id)}
                    </Link>
                    
                    {/* Sub-items on hover */}
                    <div
                      className={`overflow-hidden transition-all duration-200 ease-out ${
                        hoveredCollection === collection.id
                          ? 'max-h-48 opacity-100'
                          : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="pt-2 pb-4 pl-1 space-y-2">
                        {collection.subItemKeys.map((subKey) => (
                          <Link
                            key={subKey}
                            href={`/${locale}/shop?season=${collection.season}&category=${subKey}`}
                            onClick={onClose}
                            className="block text-sm leading-relaxed text-[#F2E6D8]/65 transition-colors duration-150 hover:text-accent"
                            role="menuitem"
                          >
                            {t(`clothing.${subKey}`)}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="my-3 border-t border-[#F2E6D8]/10 sm:my-5" />

            {/* Footer links */}
            <div className="flex flex-wrap gap-x-5 gap-y-1 mb-1 sm:gap-x-6 sm:gap-y-2 sm:mb-5">
              {footerLinkKeys.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={onClose}
                  className="text-sm uppercase tracking-[0.04em] sm:tracking-[0.08em] text-[#F2E6D8]/70 transition-colors hover:text-accent focus:text-accent"
                  role="menuitem"
                >
                  {nav(item.key)}
                </Link>
              ))}
            </div>

          </div>
          </div>
        </div>
      </div>
    </>
  );
}
