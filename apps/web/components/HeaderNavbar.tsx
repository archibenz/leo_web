'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, MenuItem, CategoryCard, CollectionCard } from './ui/navbar-menu';
import { SearchBar } from './ui/search-bar';
import MenuOverlay from './MenuOverlay';
import { useCart, useFavorites, useAuth } from '../contexts';

type HeaderNavbarProps = { locale: string };

/* ── Icons ── */
const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
);
const HeartIcon = ({filled = false}: {filled?: boolean} = {}) => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
);
const CartIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6h12l1.5 12a1 1 0 0 1-1 1H7.5a1 1 0 0 1-1-1L6 6z" /><path d="M9 6V5a3 3 0 0 1 6 0v1" /></svg>
);

const IconBtn = ({ onClick, ariaLabel, children, badge }: {
  onClick: () => void; ariaLabel: string; children: React.ReactNode; badge?: number;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    style={{ WebkitTapHighlightColor: 'transparent' }}
    className="group relative flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-150 active:scale-90 focus:outline-none"
  >
    <span className="flex h-9 w-9 items-center justify-center rounded-full text-ink/55 transition-colors duration-200 group-hover:bg-ink/[0.07] group-hover:text-accent group-active:bg-ink/[0.12]">
      {children}
    </span>
    {badge !== undefined && badge > 0 && (
      <span className="pointer-events-none absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-paper">
        {badge > 9 ? '9+' : badge}
      </span>
    )}
  </button>
);

const collectionImages = [
  'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=600&h=900&fit=crop&q=85',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&h=900&fit=crop&q=85',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=900&fit=crop&q=85',
  'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&h=900&fit=crop&q=85',
];

export default function HeaderNavbar({ locale }: HeaderNavbarProps) {
  const t = useTranslations('header');
  const menuT = useTranslations('menu');
  const navT = useTranslations('nav');
  const router = useRouter();
  const { count: cartCount } = useCart();
  const { count: favoritesCount } = useFavorites();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  const [active, setActive] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categoryKeys = ['new', 'outerwear', 'dresses', 'knitwear', 'trousers', 'skirts', 'blouses', 'care'];
  const categoryDescMap: Record<string, { en: string; ru: string }> = {
    new: { en: 'Latest arrivals', ru: 'Последние поступления' },
    outerwear: { en: 'Coats & jackets', ru: 'Пальто & жакеты' },
    dresses: { en: 'Midi, maxi, mini', ru: 'Миди, макси, мини' },
    knitwear: { en: 'Cashmere & wool', ru: 'Кашемир & шерсть' },
    trousers: { en: 'Tailored cuts', ru: 'Точный крой' },
    skirts: { en: 'Midi & maxi', ru: 'Миди и макси' },
    blouses: { en: 'Silk & linen', ru: 'Шёлк и лён' },
    care: { en: 'Garment care', ru: 'Уход за одеждой' },
  };
  const aboutDescMap: Record<string, { en: string; ru: string }> = {
    about: { en: 'Our story', ru: 'Наша история' },
    contact: { en: 'Get in touch', ru: 'Связаться' },
  };
  const collections = [
    { id: 'winter', season: 'winter', subItemKeys: ['skirts', 'dresses', 'jackets'] },
    { id: 'spring', season: 'spring', subItemKeys: ['coats', 'trousers', 'blouses'] },
    { id: 'summer', season: 'summer', subItemKeys: ['eveningDresses', 'tops'] },
    { id: 'autumn', season: 'autumn', subItemKeys: ['suits', 'midiSkirts', 'cardigans'] },
  ];

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleProfileMouseEnter = useCallback(() => {
    if (!isDesktop) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsProfileOpen(true);
  }, [isDesktop]);
  const handleProfileMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => setIsProfileOpen(false), 150);
  }, []);

  const go = useCallback((path: string) => { setIsMenuOpen(false); router.push(`/${locale}${path}`); }, [router, locale]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (active) setActive(null);
        else if (isProfileOpen) setIsProfileOpen(false);
        else if (isMenuOpen) setIsMenuOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (isProfileOpen && profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) setIsProfileOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('keydown', handleKeyDown); document.removeEventListener('mousedown', handleClickOutside); };
  }, [isMenuOpen, isProfileOpen, active]);

  // On mobile scroll: close dropdowns
  useEffect(() => {
    const onScroll = () => {
      if (isDesktop) return;
      if (active) setActive(null);
      if (isMenuOpen) setIsMenuOpen(false);
      if (isProfileOpen) setIsProfileOpen(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isDesktop, active, isMenuOpen, isProfileOpen]);

  const handleMenuToggle = useCallback(() => {
    setHasAnimated(true);
    setIsMenuOpen((p) => !p);
    // Sheds focus so iOS Safari doesn't keep the visual highlight after tap
    menuButtonRef.current?.blur();
  }, []);
  const getHamburgerClass = () => !hasAnimated ? '' : isMenuOpen ? 'hamburger-open' : 'hamburger-close';
  const desc = (map: Record<string, { en: string; ru: string }>, key: string) => locale === 'ru' ? map[key]?.ru : map[key]?.en;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[200] px-3 pt-3 sm:px-4 lg:px-6">
        <div className="liquid-glass relative flex h-12 items-center rounded-full px-3 sm:px-4 lg:px-5">

          {/* Left: Hamburger (mobile) + Logo */}
          <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0 ml-2 lg:ml-4">
            <button ref={menuButtonRef} type="button" onClick={handleMenuToggle}
              aria-label={isMenuOpen ? t('closeMenu') : t('openMenu')} aria-expanded={isMenuOpen}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className="group relative flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-150 active:scale-90 focus:outline-none lg:hidden">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full text-ink/60 transition-colors duration-150 ${
                isMenuOpen ? '' : 'group-active:bg-ink/[0.12]'
              }`}>
                <svg viewBox="0 0 24 24" className={`h-5 w-5 ${getHamburgerClass()}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="7" x2="20" y2="7" className="hamburger-line hamburger-top" />
                  <line x1="4" y1="12" x2="20" y2="12" className="hamburger-line hamburger-middle" />
                  <line x1="4" y1="17" x2="20" y2="17" className="hamburger-line hamburger-bottom" />
                </svg>
              </span>
            </button>
            <button type="button" onClick={() => go('')} className="flex items-center gap-2" aria-label={t('goHome')}>
              <Image src="/logos/icon-white.svg" alt="" aria-hidden="true" width={28} height={28} className="brand-asset h-7 w-7 flex-shrink-0" draggable={false} />
              <Image src="/logos/name-white.svg" alt="REINASLEO" width={120} height={12} className="brand-asset h-3 min-w-0 w-auto" draggable={false} />
            </button>
          </div>

          {/* Center: Desktop hover nav — absolute positioned */}
          <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Menu setActive={setActive}>
              <MenuItem setActive={setActive} active={active} item={t('catalog')} href={`/${locale}/shop`}>
                <div className="p-2 w-[min(720px,calc(100vw-2rem))]">
                  <div className="mb-3 px-4 pt-3">
                    <p className="font-accent text-[14px] font-medium uppercase tracking-[0.2em] text-[#D4A574]/40">{t('catalog')}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-0">
                    {categoryKeys.map((key) => (
                      <CategoryCard key={key} href={key === 'care' ? `/${locale}/care` : `/${locale}/shop?category=${key}`} label={menuT(`categories.${key}`)} description={desc(categoryDescMap, key)} />
                    ))}
                  </div>
                  <div className="mx-4 mt-2 mb-3 h-px bg-gradient-to-r from-[#D4A574]/10 via-[#D4A574]/5 to-transparent" />
                  <div className="px-4 pb-3">
                    <Link href={`/${locale}/shop`} className="group/all inline-flex items-center gap-2 font-display text-[15px] uppercase tracking-[0.12em] text-ink/40 transition-colors hover:text-[#D4A574]">
                      {locale === 'ru' ? 'Весь каталог' : 'View all'}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="transition-transform duration-300 group-hover/all:translate-x-1"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
                    </Link>
                  </div>
                </div>
              </MenuItem>

              <MenuItem setActive={setActive} active={active} item={t('collections')} href={`/${locale}/collections`}>
                <div className="p-2 w-[min(1000px,calc(100vw-2rem))]">
                  <div className="mb-3 px-5 pt-3">
                    <p className="font-accent text-[14px] font-medium uppercase tracking-[0.2em] text-[#D4A574]/40">{t('collections')}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-6 px-5 pb-4">
                    {collections.map((col, i) => (
                      <CollectionCard key={col.id} href={`/${locale}/shop?season=${col.season}`} title={menuT(col.id)}
                        subtitle={`${col.subItemKeys.length} ${locale === 'ru' ? 'вещи' : 'items'}`}
                        imageSrc={collectionImages[i]}
                        items={col.subItemKeys.map((subKey) => ({ label: menuT(`clothing.${subKey}`), href: `/${locale}/shop?season=${col.season}&category=${subKey}` }))} />
                    ))}
                  </div>
                  <div className="mx-5 h-px bg-gradient-to-r from-[#D4A574]/10 via-[#D4A574]/5 to-transparent" />
                  <div className="px-5 py-3">
                    <Link href={`/${locale}/collections`} className="group/all inline-flex items-center gap-2 font-display text-[15px] uppercase tracking-[0.12em] text-ink/40 transition-colors hover:text-[#D4A574]">
                      {menuT('viewAllCollections')}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="transition-transform duration-300 group-hover/all:translate-x-1"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
                    </Link>
                  </div>
                </div>
              </MenuItem>

              <div className="group/menuitem relative" onMouseEnter={() => setActive(null)}>
                <Link href={`/${locale}/shop`}
                  className="cursor-pointer text-[15px] leading-none font-display font-medium uppercase tracking-[0.12em] text-ink/70 transition-colors duration-200 hover:text-ink">
                  {navT('shop')}
                </Link>
                <span
                  aria-hidden
                  className="pointer-events-none absolute -bottom-1.5 left-0 right-0 block h-px bg-[#D4A574] origin-right scale-x-0 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover/menuitem:origin-left group-hover/menuitem:scale-x-100"
                />
              </div>

              <MenuItem setActive={setActive} active={active} item={navT('about')} href={`/${locale}/about`}>
                <div className="p-2" style={{ width: '280px' }}>
                  <div className="mb-2 px-4 pt-3">
                    <p className="font-accent text-[14px] font-medium uppercase tracking-[0.2em] text-[#D4A574]/40">{navT('about')}</p>
                  </div>
                  <div className="flex flex-col gap-0">
                    <CategoryCard href={`/${locale}/about`} label={navT('about')} description={desc(aboutDescMap, 'about')} />
                    <CategoryCard href={`/${locale}/contact`} label={navT('contact')} description={desc(aboutDescMap, 'contact')} />
                  </div>
                </div>
              </MenuItem>
            </Menu>
          </div>

          {/* Right: Search + Icons */}
          <div className="flex items-center gap-0.5 ml-auto flex-shrink-0">
            {/* Desktop: animated search bar */}
            <div className="hidden lg:block mr-1">
              <SearchBar placeholder={t('search')} />
            </div>

            <IconBtn onClick={() => go('/favorites')} ariaLabel={t('favorites')} badge={favoritesCount}><HeartIcon filled={favoritesCount > 0} /></IconBtn>
            <IconBtn onClick={() => go('/cart')} ariaLabel={t('cart')} badge={cartCount}><CartIcon /></IconBtn>

            <div ref={profileDropdownRef} className="relative" onMouseEnter={handleProfileMouseEnter} onMouseLeave={handleProfileMouseLeave}>
              {isAuthenticated && user ? (
                <button type="button" onClick={() => go('/account')} aria-label={t('profile')}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  className="group relative flex h-11 items-center rounded-full transition-transform duration-150 active:scale-95 focus:outline-none">
                  <span className="flex h-9 items-center gap-1 rounded-full px-2.5 text-ink/55 transition-colors duration-200 group-hover:bg-ink/[0.06] group-hover:text-accent">
                    <span className="truncate max-w-[120px] sm:max-w-[160px] text-[13px] font-medium">
                      <span className="hidden sm:inline">{t('greeting', { name: user.name })}</span>
                      <span className="sm:hidden">{user.name}</span>
                    </span>
                    <ProfileIcon />
                  </span>
                </button>
              ) : (
                <IconBtn onClick={() => go('/account')} ariaLabel={t('profile')}><ProfileIcon /></IconBtn>
              )}
              <AnimatePresence>
                {isProfileOpen && isDesktop && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 8, pointerEvents: "none" as never }}
                    transition={{ type: 'spring', mass: 0.5, damping: 11.5, stiffness: 100, restDelta: 0.001 }}
                    className="absolute right-0 top-full mt-3 w-56 rounded-2xl border border-[#D4A574]/[0.08] overflow-hidden z-[100]"
                    style={{
                      background: 'linear-gradient(165deg, rgba(26,16,12,0.98) 0%, rgba(36,21,16,0.97) 50%, rgba(30,18,13,0.98) 100%)',
                      backdropFilter: 'blur(40px) saturate(1.2)',
                      WebkitBackdropFilter: 'blur(40px) saturate(1.2)',
                      boxShadow: '0 0 0 1px rgba(212,165,116,0.05), 0 25px 60px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(242,230,216,0.04)',
                    }}
                  >
                    {isAuthenticated && user ? (
                      <>
                        {/* User info header */}
                        <div className="px-4 pt-4 pb-3">
                          <p className="font-display text-[15px] font-medium text-ink/80 truncate">{user.name}</p>
                          {user.email && <p className="mt-0.5 text-[13px] text-ink/30 truncate">{user.email}</p>}
                        </div>
                        <div className="mx-3 h-px bg-gradient-to-r from-[#D4A574]/10 via-[#D4A574]/5 to-transparent" />

                        <div className="py-1.5">
                          <Link href={`/${locale}/account`} onClick={() => setIsProfileOpen(false)} className="group/item flex items-center gap-3 px-4 py-2.5 text-[15px] text-ink/60 transition-all duration-200 hover:bg-[#D4A574]/[0.04] hover:text-ink hover:pl-5"><ProfileIcon />{t('dropdown.profile')}</Link>
                          <span className="flex items-center gap-3 px-4 py-2.5 text-[15px] text-ink/20 cursor-default"><svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>{t('dropdown.orders')}</span>
                          <Link href={`/${locale}/account?tab=favorites`} onClick={() => setIsProfileOpen(false)} className="group/item flex items-center gap-3 px-4 py-2.5 text-[15px] text-ink/60 transition-all duration-200 hover:bg-[#D4A574]/[0.04] hover:text-ink hover:pl-5"><HeartIcon />{t('dropdown.favourites')}</Link>
                          <Link href={`/${locale}/account?tab=settings`} onClick={() => setIsProfileOpen(false)} className="group/item flex items-center gap-3 px-4 py-2.5 text-[15px] text-ink/60 transition-all duration-200 hover:bg-[#D4A574]/[0.04] hover:text-ink hover:pl-5"><svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>{t('dropdown.settings')}</Link>
                          {isAdmin && (
                            <Link href={`/${locale}/admin`} onClick={() => setIsProfileOpen(false)} className="group/item flex items-center gap-3 px-4 py-2.5 text-[15px] text-[#D4A574]/70 transition-all duration-200 hover:bg-[#D4A574]/[0.04] hover:text-[#D4A574] hover:pl-5">
                              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                              {t('dropdown.admin')}
                            </Link>
                          )}
                        </div>
                        <div className="mx-3 h-px bg-gradient-to-r from-[#D4A574]/10 via-[#D4A574]/5 to-transparent" />
                        <div className="py-1.5">
                          <button type="button" onClick={() => { setIsProfileOpen(false); logout(); }}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-[15px] text-ink/50 transition-all duration-200 hover:bg-[#D4A574]/[0.04] hover:text-ink/70 hover:pl-5">
                            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                            {t('dropdown.logOut')}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="p-5 text-center space-y-3">
                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-ink/8 bg-ink/[0.04]">
                          <ProfileIcon />
                        </div>
                        <p className="text-[15px] text-ink/45">{t('dropdown.loginPrompt')}</p>
                        <Link
                          href={`/${locale}/account`}
                          onClick={() => setIsProfileOpen(false)}
                          className="block w-full rounded-full border border-[#D4A574]/20 bg-[#D4A574]/10 py-2.5 text-[14px] font-display font-medium uppercase tracking-[0.08em] text-[#D4A574] transition-all duration-300 hover:bg-[#D4A574]/20 hover:border-[#D4A574]/35"
                        >
                          {t('dropdown.signIn')}
                        </Link>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <MenuOverlay isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} locale={locale} />
    </>
  );
}
