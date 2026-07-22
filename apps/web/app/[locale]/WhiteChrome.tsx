'use client';

import type {ReactNode} from 'react';
import {usePathname, useSearchParams} from 'next/navigation';
import {useWhiteBag} from '../../hooks/useWhiteBag';
import {useWhiteFavourites} from '../../hooks/useWhiteFavourites';
import WhiteHeader from './WhiteHeader';
import WhiteHeaderActions from './WhiteHeaderActions';
import WhiteFooter from './WhiteFooter';
import {INK} from './wv-palette';

// The storefront chrome lives in the layout: one header and one footer that
// survive page navigations, so the bar never re-mounts (no blink) while the
// pages change underneath.

export default function WhiteChrome({locale, children}: {locale: string; children: ReactNode}) {
  const {count} = useWhiteBag();
  const {count: favCount} = useWhiteFavourites();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onShop = /^\/[^/]+\/shop(?:\/|$)/.test(pathname);
  const activeCat = onShop ? (searchParams.get('cat') ?? 'all') : null;

  return (
    <div className="wv-root relative flex min-h-screen flex-col bg-white font-sans antialiased" style={{color: INK}}>
      <WhiteHeader
        locale={locale}
        activeCat={activeCat ?? undefined}
        left={null}
        right={<WhiteHeaderActions locale={locale} favCount={favCount} count={count} search={!onShop} />}
      />
      <div className="flex flex-1 flex-col">{children}</div>
      <WhiteFooter locale={locale} />
    </div>
  );
}
