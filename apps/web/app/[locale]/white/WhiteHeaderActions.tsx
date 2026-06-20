'use client';

import type {ReactNode} from 'react';
import {MUTED, INK, SIGNAL} from './wv-palette';
import {whiteItemNoun} from './wv-i18n';

// Shared header right-slot. On mobile the full-text labels ("Избранное (0)",
// "Корзина (0)") crowd the wordmark on a 375px header; the reference set
// (Zara/Lichi/H&M) all collapse these to icons on mobile. So: thin-stroke
// square-leaning icons < sm, the editorial text labels at sm+ (desktop
// untouched). A non-zero count is a real signal → tiny SIGNAL-red number, only
// when > 0. `current` marks the active page (renders a non-link span, like the
// old inline slots did on /bag and /favourites). Icons are static — nothing for
// reduced-motion to suppress.

type ActionKey = 'favourites' | 'bag';

function HeartIcon({className}: {className?: string}) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20.7 5 13.6a4.5 4.5 0 0 1 6.4-6.3l.6.6.6-.6a4.5 4.5 0 0 1 6.4 6.3l-7 7.1Z" />
    </svg>
  );
}

function BagIcon({className}: {className?: string}) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 8h12l-.8 11.4a1.4 1.4 0 0 1-1.4 1.3H8.2a1.4 1.4 0 0 1-1.4-1.3L6 8Z" />
      <path d="M9.3 8V6.6a2.7 2.7 0 0 1 5.4 0V8" />
    </svg>
  );
}

const WRAP = 'relative flex h-11 w-11 items-center justify-center sm:h-auto sm:w-auto';

function Action({
  href,
  ariaLabel,
  isCurrent,
  icon,
  label,
  count,
}: {
  href: string;
  ariaLabel: string;
  isCurrent: boolean;
  icon: ReactNode;
  label: string;
  count: number;
}) {
  const inner = (
    <>
      {icon}
      <span className="hidden sm:inline">
        {label} ({count})
      </span>
      {count > 0 && (
        <span className="absolute right-1 top-1 text-[10px] font-medium leading-none sm:hidden" style={{color: SIGNAL}}>
          {count}
        </span>
      )}
    </>
  );
  return isCurrent ? (
    <span className={WRAP} style={{color: INK}} aria-current="page" aria-label={ariaLabel}>
      {inner}
    </span>
  ) : (
    <a href={href} aria-label={ariaLabel} className={`${WRAP} transition-opacity hover:opacity-60`}>
      {inner}
    </a>
  );
}

export default function WhiteHeaderActions({
  locale,
  favCount,
  count,
  current,
  search,
}: {
  locale: string;
  favCount: number;
  count: number;
  current?: ActionKey;
  search?: boolean;
}) {
  const t = (en: string, ru: string) => (locale === 'ru' ? ru : en);
  const icon = 'h-[18px] w-[18px] sm:hidden';
  return (
    <div className="flex items-center gap-1 sm:gap-6 sm:text-[12px] sm:uppercase sm:tracking-[0.18em]" style={{color: MUTED}}>
      {search && (
        <a
          href={`/${locale}/white/shop?focus=search`}
          aria-label={t('Search the collection', 'Поиск по коллекции')}
          className="hidden transition-opacity hover:opacity-60 sm:inline"
        >
          {t('Search', 'Поиск')}
        </a>
      )}
      <Action
        href={`/${locale}/white/favourites`}
        ariaLabel={`${t('Saved', 'Избранное')}, ${favCount} ${whiteItemNoun(favCount, locale)}`}
        isCurrent={current === 'favourites'}
        icon={<HeartIcon className={icon} />}
        label={t('Saved', 'Избранное')}
        count={favCount}
      />
      <Action
        href={`/${locale}/white/bag`}
        ariaLabel={`${t('Bag', 'Корзина')}, ${count} ${whiteItemNoun(count, locale)}`}
        isCurrent={current === 'bag'}
        icon={<BagIcon className={icon} />}
        label={t('Bag', 'Корзина')}
        count={count}
      />
    </div>
  );
}
