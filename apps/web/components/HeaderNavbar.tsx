'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, MenuItem, CategoryCard } from './ui/navbar-menu';
import { SearchBar } from './ui/search-bar';
import MenuOverlay from './MenuOverlay';
import { BrandHeart, BrandCart } from './icons';
import { useCart, useFavorites, useAuth } from '../contexts';

type HeaderNavbarProps = { locale: string };

/* ── Icons ── */
const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
);
const HeartIcon = ({count = 0}: {count?: number} = {}) => <BrandHeart count={count} size={18} />;
const CartIcon = ({count = 0}: {count?: number} = {}) => <BrandCart count={count} size={18} />;

const IconBtn = ({ onClick, ariaLabel, children, badge }: {
  onClick: () => void; ariaLabel: string; children: React.ReactNode; badge?: number;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    style={{ WebkitTapHighlightColor: 'transparent' }}
    className="group relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-transform duration-150 active:scale-90 motion-reduce:active:scale-100 focus-visible:rounded-full"
  >
    <span className="flex h-9 w-9 items-center justify-center rounded-full text-ink/65 transition-colors duration-200 group-hover:bg-ink/[0.07] group-hover:text-accent group-active:bg-ink/[0.12]">
      {children}
    </span>
    {badge !== undefined && badge > 0 && (
      <span aria-hidden="true" className="pointer-events-none absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-paper">
        {badge > 9 ? '9+' : badge}
      </span>
    )}
  </button>
);

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
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categoryKeys = ['dresses', 'outerwear', 'tailoring', 'knitwear', 'blouses', 'skirts', 'trousers'];
  const selectionKeys: ReadonlyArray<{ key: 'new' | 'popular'; filter: 'new' | 'popular' }> = [
    { key: 'new', filter: 'new' },
    { key: 'popular', filter: 'popular' },
  ];
  const selectionDescMap: Record<string, { en: string; ru: string }> = {
    new: { en: 'Latest arrivals', ru: 'Последние поступления' },
    popular: { en: 'Most loved', ru: 'Любимое многими' },
  };
  const categoryDescMap: Record<string, { en: string; ru: string }> = {
    dresses: { en: 'Midi, maxi, mini', ru: 'Миди, макси, мини' },
    outerwear: { en: 'Coats & jackets', ru: 'Пальто & жакеты' },
    tailoring: { en: 'Tailored suits', ru: 'Костюмы по фигуре' },
    knitwear: { en: 'Cashmere & wool', ru: 'Кашемир & шерсть' },
    blouses: { en: 'Silk & linen', ru: 'Шёлк и лён' },
    skirts: { en: 'Midi & maxi', ru: 'Миди и макси' },
    trousers: { en: 'Tailored cuts', ru: 'Точный крой' },
  };
  const aboutDescMap: Record<string, { en: string; ru: string }> = {
    about: { en: 'Our story', ru: 'Наша история' },
    contact: { en: 'Get in touch', ru: 'Связаться' },
  };

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
    // No blur() here: blurring before the overlay's focus-trap activates made it
    // capture <body> as previous-focus, so focus was lost on close (WCAG 2.4.3).
    // Leaving the trigger focused lets useFocusTrap restore focus to it on close.
    // The iOS tap highlight is handled by WebkitTapHighlightColor: transparent
    // below, and the only focus ring is :focus-visible (keyboard, not tap).
  }, []);
  const getHamburgerClass = () => !hasAnimated ? '' : isMenuOpen ? 'hamburger-open' : 'hamburger-close';
  const desc = (map: Record<string, { en: string; ru: string }>, key: string) => locale === 'ru' ? map[key]?.ru : map[key]?.en;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[200] px-3 pt-3 sm:px-4 lg:px-6">
        <div className="liquid-glass relative flex h-12 items-center rounded-full px-3 sm:px-4 lg:px-5">

          {/* Left: Hamburger (mobile) + Logo. Deliberately rigid: shrinking it would
              squish the w-auto SVG wordmark instead of truncating; on widths where the
              pill can't fit everything, the wordmark hides (see below) and the right
              block absorbs the rest. */}
          <div className="flex items-center gap-2.5 flex-shrink-0 ml-2 lg:ml-4">
            <button type="button" onClick={handleMenuToggle}
              aria-label={isMenuOpen ? t('closeMenu') : t('openMenu')} aria-expanded={isMenuOpen}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className="group relative flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-150 active:scale-90 motion-reduce:active:scale-100 focus-visible:rounded-full lg:hidden">
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
              {/* Wordmark renders 76px wide (1026/162 aspect at h-3). Below 360px logged out
                  (272px pill space vs 310px content) — and below 430px signed in, where the
                  greeting chip needs the room — it can't fit, so the 28px icon mark carries
                  the brand alone. */}
              <Image src="/logos/name-white.svg" alt="REINASLEO" width={120} height={12} className={`brand-asset h-3 w-auto ${isAuthenticated ? 'max-[429px]:hidden' : 'max-[359px]:hidden'}`} draggable={false} />
            </button>
          </div>

          {/* Center: Desktop hover nav — absolute positioned */}
          <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Menu setActive={setActive}>
              <MenuItem setActive={setActive} active={active} item={t('catalog')} href={`/${locale}/shop`}>
                <div className="p-2 w-[min(720px,calc(100vw-2rem))]">
                  <div className="mb-2 px-4 pt-3">
                    <p className="font-accent text-[14px] font-medium uppercase tracking-[0.2em] text-accent/40">{menuT('sections.selection')}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-0">
                    {selectionKeys.map((item) => (
                      <CategoryCard key={item.key} href={`/${locale}/shop?filter=${item.filter}`} label={menuT(`categories.${item.key}`)} description={desc(selectionDescMap, item.key)} />
                    ))}
                  </div>
                  <div className="mx-4 mt-2 mb-2 h-px bg-gradient-to-r from-accent/10 via-accent/5 to-transparent" />
                  <div className="mb-2 px-4">
                    <p className="font-accent text-[14px] font-medium uppercase tracking-[0.2em] text-accent/40">{menuT('sections.categories')}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-0">
                    {categoryKeys.map((key) => (
                      <CategoryCard key={key} href={`/${locale}/shop?category=${key}`} label={menuT(`categories.${key}`)} description={desc(categoryDescMap, key)} />
                    ))}
                  </div>
                  <div className="mx-4 mt-2 mb-3 h-px bg-gradient-to-r from-accent/10 via-accent/5 to-transparent" />
                  <div className="px-4 pb-3">
                    <Link href={`/${locale}/shop`} className="group/all inline-flex items-center gap-2 font-display text-[15px] uppercase tracking-[0.12em] text-ink/55 transition-colors hover:text-accent">
                      {locale === 'ru' ? 'Весь каталог' : 'View all'}
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
                  className="pointer-events-none absolute -bottom-1.5 left-0 right-0 block h-px bg-accent origin-right scale-x-0 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover/menuitem:origin-left group-hover/menuitem:scale-x-100"
                />
              </div>

              <MenuItem setActive={setActive} active={active} item={navT('about')} href={`/${locale}/about`}>
                <div className="p-2" style={{ width: '280px' }}>
                  <div className="mb-2 px-4 pt-3">
                    <p className="font-accent text-[14px] font-medium uppercase tracking-[0.2em] text-accent/40">{navT('about')}</p>
                  </div>
                  <div className="flex flex-col gap-0">
                    <CategoryCard href={`/${locale}/about`} label={navT('about')} description={desc(aboutDescMap, 'about')} />
                    <CategoryCard href={`/${locale}/contact`} label={navT('contact')} description={desc(aboutDescMap, 'contact')} />
                  </div>
                </div>
              </MenuItem>
            </Menu>
          </div>

          {/* Right: Search + Icons. Shrinkable (unlike the left block) so the signed-in
              name chip truncates instead of pushing the account control off-screen;
              every other child is flex-shrink-0 / min-w floored at the 44px tap size.
              min-w-0 here is load-bearing: without it the flex item's min-width:auto
              floors the block at its content width and none of the inner shrink
              chain ever engages. */}
          <div className="flex items-center gap-0.5 ml-auto min-w-0">
            {/* Desktop: animated search bar */}
            <div className="hidden lg:block mr-1">
              <SearchBar
                placeholder={t('search')}
                onSearch={(query) => {
                  const v = query.trim();
                  go(v ? `/shop?q=${encodeURIComponent(v)}` : '/shop');
                }}
              />
            </div>

            <IconBtn onClick={() => go('/favorites')} ariaLabel={t('favoritesWithCount', {count: favoritesCount})}><HeartIcon count={favoritesCount} /></IconBtn>
            <IconBtn onClick={() => go('/cart')} ariaLabel={t('cartWithCount', {count: cartCount})}><CartIcon count={cartCount} /></IconBtn>

            <div ref={profileDropdownRef} className="relative min-w-11" onMouseEnter={handleProfileMouseEnter} onMouseLeave={handleProfileMouseLeave}>
              {isAuthenticated && user ? (
                <button type="button" onClick={() => go('/account')} aria-label={t('profile')}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  className="group relative flex h-11 items-center rounded-full transition-transform duration-150 active:scale-95 motion-reduce:active:scale-100 focus-visible:rounded-full">
                  <span className="flex min-w-0 h-9 items-center gap-1 rounded-full px-2.5 text-ink/55 transition-colors duration-200 group-hover:bg-ink/[0.06] group-hover:text-accent">
                    <span className="truncate min-w-0 max-w-[120px] sm:max-w-[160px] text-[13px] font-medium">
                      <span className="hidden sm:inline">{t('greeting', { name: user.name })}</span>
                      <span className="sm:hidden">{user.name}</span>
                    </span>
                    <ProfileIcon />
                  </span>
                </button>
              ) : (
                <IconBtn onClick={() => go('/account')} ariaLabel={t('profile')}><ProfileIcon /></IconBtn>
              )}
              <div
                className={`dropdown-glass absolute right-0 top-full mt-3 w-56 origin-top-right rounded-2xl border border-accent/[0.08] overflow-hidden z-[100] transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none ${
                  isProfileOpen && isDesktop
                    ? 'opacity-100 scale-100 translate-y-0'
                    : 'pointer-events-none opacity-0 scale-95 translate-y-2'
                }`}
                inert={!(isProfileOpen && isDesktop)}
              >
                {isAuthenticated && user ? (
                  <>
                    {/* User info header */}
                    <div className="px-4 pt-4 pb-3">
                      <p className="font-display text-[15px] font-medium text-ink/80 truncate">{user.name}</p>
                      {user.email && <p className="mt-0.5 text-[13px] text-ink/60 truncate">{user.email}</p>}
                    </div>
                    <div className="mx-3 h-px bg-gradient-to-r from-accent/10 via-accent/5 to-transparent" />

                    <div className="py-1.5">
                      <Link href={`/${locale}/account`} onClick={() => setIsProfileOpen(false)} className="group/item flex items-center gap-3 px-4 py-2.5 text-[15px] text-ink/60 transition-all duration-200 hover:bg-accent/[0.04] hover:text-ink hover:pl-5"><ProfileIcon />{t('dropdown.profile')}</Link>
                      <span aria-disabled="true" className="flex items-center gap-3 px-4 py-2.5 text-[15px] text-ink/45 cursor-default"><svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>{t('dropdown.orders')}</span>
                      <Link href={`/${locale}/account?tab=favorites`} onClick={() => setIsProfileOpen(false)} className="group/item flex items-center gap-3 px-4 py-2.5 text-[15px] text-ink/60 transition-all duration-200 hover:bg-accent/[0.04] hover:text-ink hover:pl-5"><HeartIcon />{t('dropdown.favourites')}</Link>
                      <Link href={`/${locale}/account?tab=settings`} onClick={() => setIsProfileOpen(false)} className="group/item flex items-center gap-3 px-4 py-2.5 text-[15px] text-ink/60 transition-all duration-200 hover:bg-accent/[0.04] hover:text-ink hover:pl-5"><svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>{t('dropdown.settings')}</Link>
                      {isAdmin && (
                        <Link href={`/${locale}/admin`} onClick={() => setIsProfileOpen(false)} className="group/item flex items-center gap-3 px-4 py-2.5 text-[15px] text-accent/70 transition-all duration-200 hover:bg-accent/[0.04] hover:text-accent hover:pl-5">
                          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                          {t('dropdown.admin')}
                        </Link>
                      )}
                    </div>
                    <div className="mx-3 h-px bg-gradient-to-r from-accent/10 via-accent/5 to-transparent" />
                    <div className="py-1.5">
                      <button type="button" onClick={() => { setIsProfileOpen(false); logout(); }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-[15px] text-ink/65 transition-all duration-200 hover:bg-accent/[0.04] hover:text-ink/70 hover:pl-5">
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
                    <p className="text-[15px] text-ink/60">{t('dropdown.loginPrompt')}</p>
                    <Link
                      href={`/${locale}/account`}
                      onClick={() => setIsProfileOpen(false)}
                      className="block w-full rounded-full border border-accent/20 bg-accent/10 py-2.5 text-[14px] font-display font-medium uppercase tracking-[0.08em] text-accent transition-all duration-300 hover:bg-accent/20 hover:border-accent/35"
                    >
                      {t('dropdown.signIn')}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <MenuOverlay isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} locale={locale} />
    </>
  );
}
