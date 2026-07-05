'use client';

import Link from 'next/link';
import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {MUTED, INK, SIGNAL} from './wv-palette';
import {whiteItemNoun} from './wv-i18n';
import {MaskIcon, WhiteFavHeart} from './wv-icons';

// Shared header right-slot. The thin-stroke heart and bag glyphs carry the
// actions at every width — quieter than spelled-out labels and they never
// crowd the wide-tracked wordmark. A non-zero count is a real signal → tiny
// SIGNAL-red number pinned to the glyph's corner. `current` marks the active
// page (renders a non-link span, like the old inline slots did on /bag and
// /favourites). Icons are static — nothing for reduced-motion to suppress.

type ActionKey = 'favourites' | 'bag';

const WRAP = 'wv-tap-sm relative flex h-11 w-11 shrink-0 items-center justify-center';

function Action({
  href,
  ariaLabel,
  isCurrent,
  icon,
  count,
}: {
  href: string;
  ariaLabel: string;
  isCurrent: boolean;
  icon: ReactNode;
  count: number;
}) {
  const inner = (
    <>
      {icon}
      {count > 0 && (
        <span className="absolute right-[8px] top-[5px] text-[10px] font-medium leading-none" style={{color: SIGNAL}}>
          {count}
        </span>
      )}
    </>
  );
  return isCurrent ? (
    // aria-label is prohibited on a plain span — the accessible name lives in
    // visually-hidden text instead.
    <span className={WRAP} style={{color: INK}} aria-current="page">
      {inner}
      <span className="sr-only">{ariaLabel}</span>
    </span>
  ) : (
    <Link href={href} aria-label={ariaLabel} className={WRAP}>
      {inner}
    </Link>
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
  const t = useTranslations('white.header');
  const icon = 'h-[18px] w-[18px]';
  return (
    <div className="flex shrink-0 items-center gap-1" style={{color: MUTED}}>
      {search && (
        /* Same glyph language as the heart/bag; the shop page carries its own
           search field, this is the landing shortcut to it. */
        <Link
          href={`/${locale}/white/shop?focus=search`}
          aria-label={t('searchCollection')}
          className={`${WRAP} hidden md:flex`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M16.5 16.5 21 21" />
          </svg>
        </Link>
      )}
      {/* Account — desktop only; the phone reaches it through the drawer. */}
      <Link href={`/${locale}/white/account`} aria-label={t('account')} className={`${WRAP} hidden md:flex`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
        </svg>
      </Link>
      <Action
        href={`/${locale}/white/favourites`}
        ariaLabel={`${t('saved')}, ${favCount} ${whiteItemNoun(favCount, locale)}`}
        isCurrent={current === 'favourites'}
        icon={<WhiteFavHeart filled={favCount > 0} size={18} />}
        count={0}
      />
      <Action
        href={`/${locale}/white/bag`}
        ariaLabel={`${t('bag')}, ${count} ${whiteItemNoun(count, locale)}`}
        isCurrent={current === 'bag'}
        icon={<MaskIcon src="/icons/cart.svg" className={icon} />}
        count={count}
      />
    </div>
  );
}
