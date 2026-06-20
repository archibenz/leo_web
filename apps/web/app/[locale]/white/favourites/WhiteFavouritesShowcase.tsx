'use client';

import {createPortal} from 'react-dom';
import {useTranslations} from 'next-intl';
import {useWhitePortal} from '../../../../hooks/useWhitePortal';
import {useWhiteBag} from '../../../../hooks/useWhiteBag';
import {useWhiteFavourites} from '../../../../hooks/useWhiteFavourites';
import WhiteHeader from '../WhiteHeader';
import WhiteHeaderActions from '../WhiteHeaderActions';
import WhiteFooter from '../WhiteFooter';
import WhiteProductCard from '../WhiteProductCard';
import {MUTED, HAIR, SIGNAL} from '../wv-palette';
import {whiteItemNoun} from '../wv-i18n';
import {findWhiteProduct} from '../products';

// Variant 2 "White" — favourites / wishlist. Lists the localStorage-backed
// saved products (via useWhiteFavourites), or an honest empty state. Quick Add
// lets a saved piece move straight to the bag.

export default function WhiteFavouritesShowcase({locale}: {locale: string}) {
  const mounted = useWhitePortal();
  const {count} = useWhiteBag();
  const {keys} = useWhiteFavourites();
  const t = useTranslations('white.favourites');

  if (!mounted) return null;

  // Preserve the order items were saved in; drop any stale keys.
  const saved = keys.map((k) => findWhiteProduct(k)).filter((p): p is NonNullable<typeof p> => p != null);

  return createPortal(
    <div className="wv-root fixed inset-0 z-[1000] flex min-h-full flex-col overflow-y-auto bg-white font-sans antialiased" style={{color: '#1c1714'}}>
      <WhiteHeader
        locale={locale}
        left={
          <a href={`/${locale}/white/shop`} className="text-[12px] uppercase tracking-[0.18em] transition-opacity hover:opacity-60" style={{color: MUTED}}>
            ← {t('shop')}
          </a>
        }
        right={<WhiteHeaderActions locale={locale} favCount={keys.length} count={count} current="favourites" />}
      />

      <main id="wv-main" tabIndex={-1} style={{outline: 'none'}} className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-6 py-12 sm:px-10">
        {saved.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
            {/* Square-geometry heart glyph — hairline outline, decorative. */}
            <span aria-hidden="true" className="mb-10 flex h-16 w-16 items-center justify-center" style={{border: `1px solid ${HAIR}`}}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1c1714" strokeWidth="1.2">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
              </svg>
            </span>
            <h1 className="font-display text-[32px] font-light leading-tight sm:text-[40px]">{t('noFavourites')}</h1>
            <p className="mt-5 max-w-sm text-[14px] leading-relaxed" style={{color: MUTED}}>
              {t('emptyHint')}
            </p>
            <a href={`/${locale}/white/shop`} className="wv-btn mt-10 inline-flex items-center justify-center px-9 py-4 text-[12px] uppercase tracking-[0.2em]">
              {t('browse')}
            </a>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between pb-2">
              <h1 className="font-display text-[32px] font-light leading-tight sm:text-[40px]">{t('saved')}</h1>
              <span className="text-[12px] uppercase tracking-[0.16em] tabular-nums" style={{color: MUTED}}>
                {keys.length} {whiteItemNoun(keys.length, locale)}
              </span>
            </div>
            <p className="mb-8 max-w-md text-[13px] leading-relaxed" style={{color: SIGNAL}}>
              {/* Honest note: the wishlist is held locally on this device. */}
              {t('savedOnDevice')}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-12 pb-12 sm:gap-x-6 lg:grid-cols-3">
              {saved.map((p, i) => (
                <WhiteProductCard key={p.key} locale={locale} product={p} index={i} quickAdd rise />
              ))}
            </div>
          </>
        )}
      </main>

      <WhiteFooter locale={locale} />
    </div>,
    document.body,
  );
}
