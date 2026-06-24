'use client';

import Image from 'next/image';
import {createPortal} from 'react-dom';
import {useTranslations} from 'next-intl';
import {useWhitePortal} from '../../../../hooks/useWhitePortal';
import {useWhiteBag} from '../../../../hooks/useWhiteBag';
import {useWhiteFavourites} from '../../../../hooks/useWhiteFavourites';
import WhiteHeader from '../WhiteHeader';
import WhiteHeaderActions from '../WhiteHeaderActions';
import WhiteFooter from '../WhiteFooter';
import {findWhiteProduct} from '../products';
import {INK, MUTED, HAIR} from '../wv-palette';
import {MaskIcon} from '../wv-icons';

// Variant 2 "White" — bag / cart. Lists the localStorage-backed picks (via
// useWhiteBag) with remove + total, or an honest empty state. No checkout — the
// prototype holds the user's selection locally; it does not claim a purchase.

export default function WhiteBagShowcase({locale}: {locale: string}) {
  const mounted = useWhitePortal();
  const {items, count, remove, setQty} = useWhiteBag();
  const {count: favCount} = useWhiteFavourites();
  const ru = locale === 'ru';
  const t = useTranslations('white.bag');
  const fmt = (n: number) => `${n.toLocaleString('ru-RU')} ₽`;
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  if (!mounted) return null;

  return createPortal(
    <div className="wv-root fixed inset-0 z-[1000] flex min-h-full flex-col overflow-y-auto bg-white font-sans antialiased" style={{color: INK}}>
      <WhiteHeader
        locale={locale}
        left={
          <a href={`/${locale}/white/shop`} className="text-[12px] uppercase tracking-[0.18em] transition-opacity hover:opacity-60" style={{color: MUTED}}>
            ← {t('shop')}
          </a>
        }
        right={<WhiteHeaderActions locale={locale} favCount={favCount} count={count} current="bag" />}
      />

      <main id="wv-main" tabIndex={-1} style={{outline: 'none'}} className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-6 py-12 sm:px-10">
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
            {/* Square-geometry bag glyph — hairline outline, ink, decorative. */}
            <span aria-hidden="true" className="mb-10 flex h-16 w-16 items-center justify-center" style={{border: `1px solid ${HAIR}`}}>
              <MaskIcon src="/icons/cart.svg" className="h-[26px] w-[26px]" color={INK} />
            </span>
            <h1 className="font-display text-[32px] font-light leading-tight sm:text-[40px]">{t('bagEmpty')}</h1>
            <p className="mt-5 max-w-sm text-[14px] leading-relaxed" style={{color: MUTED}}>
              {t('emptyHint')}
            </p>
            <a href={`/${locale}/white/shop`} className="wv-btn mt-10 inline-flex items-center justify-center px-9 py-4 text-[12px] uppercase tracking-[0.2em]">
              {t('continueShopping')}
            </a>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-2xl">
            <h1 className="font-display text-[32px] font-light leading-tight sm:text-[40px]">{t('bag')}</h1>

            <ul className="mt-10 border-t" style={{borderColor: HAIR}}>
              {items.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b py-5" style={{borderColor: HAIR}}>
                  <a
                    href={`/${locale}/white/product?p=${i.key}`}
                    aria-label={(ru ? i.ru : i.en)}
                    className="wv-ph relative aspect-[2/3] w-16 shrink-0 overflow-hidden"
                  >
                    <Image src={findWhiteProduct(i.key)?.image ?? '/images/shop/editorial-clean.jpg'} alt="" fill sizes="64px" className="object-cover" />
                  </a>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px]">{(ru ? i.ru : i.en)}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] uppercase tracking-[0.16em]" style={{color: MUTED}}>
                      <span>{t('size')}: {i.size}</span>
                      {(ru ? i.colorRu : i.colorEn) && (
                        <>
                          <span aria-hidden="true">·</span>
                          {(() => {
                            const hex = findWhiteProduct(i.key)?.colors.find((c) => c.en === i.colorEn)?.hex;
                            return hex ? (
                              <span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0" style={{background: hex, border: `1px solid ${HAIR}`}} />
                            ) : null;
                          })()}
                          <span>{ru ? i.colorRu : i.colorEn}</span>
                        </>
                      )}
                    </p>
                  </div>
                  {/* Controls — own full-width row on phones so the product name
                      above keeps the whole line (it was truncating to ~103px);
                      inline single row on sm+. */}
                  <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-end">
                    {/* Quantity stepper — min 1 (× removes); 44px tap targets, square. */}
                    <div className="flex shrink-0 items-center" role="group" aria-label={t('quantity')}>
                      <button
                        type="button"
                        onClick={() => setQty(i.id, i.qty - 1)}
                        disabled={i.qty <= 1}
                        aria-label={t('decreaseQty')}
                        className="flex h-11 w-11 items-center justify-center text-[16px] leading-none transition-colors disabled:opacity-30"
                        style={{border: `1px solid ${HAIR}`, color: INK}}
                      >
                        −
                      </button>
                      <span aria-live="polite" className="min-w-10 text-center text-[14px] tabular-nums">{i.qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty(i.id, i.qty + 1)}
                        aria-label={t('increaseQty')}
                        className="flex h-11 w-11 items-center justify-center text-[16px] leading-none transition-colors"
                        style={{border: `1px solid ${HAIR}`, color: INK}}
                      >
                        +
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="w-24 shrink-0 text-right text-[14px] tabular-nums">{fmt(i.price * i.qty)}</p>
                      <button
                        type="button"
                        onClick={() => remove(i.id)}
                        aria-label={t('removeFromBag', {name: ru ? i.ru : i.en})}
                        className="flex h-11 w-11 shrink-0 items-center justify-center text-[20px] leading-none transition-opacity hover:opacity-60"
                        style={{color: MUTED}}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex items-baseline justify-between">
              <span className="text-[12px] uppercase tracking-[0.18em]" style={{color: MUTED}}>{t('total')}</span>
              <span className="text-[18px] tabular-nums">{fmt(total)}</span>
            </div>

            {/* min-h-11 → 44px tap floor (this is the bag's only nav affordance
                besides qty/remove); mt-4 trims the gap the taller box adds. */}
            <a href={`/${locale}/white/shop`} className="mt-4 inline-flex min-h-11 items-center text-[12px] uppercase tracking-[0.18em] underline-offset-4 transition-opacity hover:opacity-60" style={{color: MUTED}}>
              ← {t('continueShopping')}
            </a>
          </div>
        )}
      </main>

      <WhiteFooter locale={locale} />
    </div>,
    document.body,
  );
}
