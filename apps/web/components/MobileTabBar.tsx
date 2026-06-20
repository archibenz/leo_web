'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useCart, useFavorites} from '../contexts';

// Persistent mobile bottom navigation (lg:hidden). Dark-brand surface, accent on
// the active tab, badge counts on Saved/Bag. Hidden on the PDP, where the sticky
// add-to-bag owns the bottom. Renders an in-flow spacer so the fixed bar never
// covers the footer. Square-geometry line icons, 44px+ targets.

type IconProps = {className?: string};

const HomeIcon = ({className}: IconProps) => (
  <svg className={className} width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square">
    <path d="M4 11l8-6 8 6M6 10v9h12v-9" />
  </svg>
);
const ShopIcon = ({className}: IconProps) => (
  <svg className={className} width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
  </svg>
);
const HeartIcon = ({className}: IconProps) => (
  <svg className={className} width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
);
const BagIcon = ({className}: IconProps) => (
  <svg className={className} width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square">
    <path d="M6 8h12l-1 12H7L6 8zM9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);

export default function MobileTabBar({locale}: {locale: string}) {
  const pathname = usePathname();
  const {count: cartCount} = useCart();
  const {count: favCount} = useFavorites();
  const ru = locale === 'ru';
  const tr = (en: string, rus: string) => (ru ? rus : en);

  // The PDP has its own sticky add-to-bag at the bottom — don't stack.
  if (/\/product\//.test(pathname)) return null;

  const home = `/${locale}`;
  const tabs = [
    {key: 'home', href: home, label: tr('Home', 'Главная'), active: pathname === home, Icon: HomeIcon, badge: 0},
    {key: 'shop', href: `/${locale}/shop`, label: tr('Shop', 'Магазин'), active: pathname.startsWith(`/${locale}/shop`), Icon: ShopIcon, badge: 0},
    {key: 'saved', href: `/${locale}/favorites`, label: tr('Saved', 'Избранное'), active: pathname.startsWith(`/${locale}/favorites`), Icon: HeartIcon, badge: favCount},
    {key: 'bag', href: `/${locale}/cart`, label: tr('Bag', 'Корзина'), active: pathname.startsWith(`/${locale}/cart`), Icon: BagIcon, badge: cartCount},
  ];

  return (
    <>
      <div className="h-[60px] lg:hidden" aria-hidden="true" />
      <nav
        aria-label={tr('Primary', 'Навигация')}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--ink)]/10 bg-[var(--paper)]/95 backdrop-blur-md lg:hidden"
        style={{paddingBottom: 'env(safe-area-inset-bottom)'}}
      >
        <ul className="mx-auto flex max-w-md items-stretch">
          {tabs.map(({key, href, label, active, Icon, badge}) => (
            <li key={key} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                aria-label={label}
                onClick={(e) => {
                  // Tapping the already-active tab scrolls to top (iOS/Android
                  // convention) instead of a no-op navigation. preventDefault
                  // keeps the current query (e.g. shop filters) intact.
                  if (!active) return;
                  e.preventDefault();
                  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                  window.scrollTo({top: 0, behavior: reduce ? 'auto' : 'smooth'});
                }}
                className={`relative flex h-[60px] flex-col items-center justify-center gap-1 transition-colors ${
                  active ? 'text-accent' : 'text-inkSoft/55 hover:text-inkSoft'
                }`}
              >
                <span className="relative">
                  <Icon />
                  {badge > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-medium leading-none text-[var(--paper)]">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>
                <span className="text-[10px] uppercase tracking-[0.08em]">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
