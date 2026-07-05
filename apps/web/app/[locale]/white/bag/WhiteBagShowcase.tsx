'use client';

import Link from 'next/link';
import Image from 'next/image';
import {useTranslations} from 'next-intl';
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
  const {items, count, remove, setQty} = useWhiteBag();
  const {count: favCount} = useWhiteFavourites();
  const ru = locale === 'ru';
  const t = useTranslations('white.bag');
  const fmt = (n: number) => `${n.toLocaleString('ru-RU')} ₽`;
  // Prices come from the catalogue, not from the persisted line (storage is
  // hand-editable) — the stored value only covers items the catalogue dropped.
  const linePrice = (i: (typeof items)[number]) => {
    const p = findWhiteProduct(i.key);
    return p ? (p.sale ?? p.price) : i.price;
  };
  const total = items.reduce((sum, i) => sum + linePrice(i) * i.qty, 0);

  return (
    <>

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
                <li key={i.id} className="grid grid-cols-[88px_1fr_auto] gap-x-4 border-b py-6 sm:grid-cols-[96px_1fr_auto]" style={{borderColor: HAIR}}>
                  <Link
                    href={`/${locale}/white/product?p=${i.key}`}
                    aria-label={(ru ? i.ru : i.en)}
                    className="wv-ph relative row-span-2 aspect-[3/4] w-[88px] overflow-hidden sm:w-24"
                  >
                    <Image src={findWhiteProduct(i.key)?.image ?? '/images/shop/editorial-clean.jpg'} alt="" fill sizes="96px" className="object-cover" />
                  </Link>

                  <div className="min-w-0">
                    <p className="text-[14px] leading-snug sm:text-[15px]">{(ru ? i.ru : i.en)}</p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[11px] uppercase tracking-[0.14em]" style={{color: MUTED}}>
                      <span>{i.size}</span>
                      {(ru ? i.colorRu : i.colorEn) && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{ru ? i.colorRu : i.colorEn}</span>
                        </>
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(i.id)}
                    aria-label={t('removeFromBag', {name: ru ? i.ru : i.en})}
                    className="-mr-2 -mt-2 flex h-10 w-10 items-start justify-end self-start pr-2 pt-2 text-[18px] leading-none transition-opacity hover:opacity-60"
                    style={{color: MUTED}}
                  >
                    ×
                  </button>

                  <div className="col-start-2 flex items-end justify-between gap-4 self-end">
                    {/* Quantity — bare glyph stepper, no boxes. */}
                    <div className="-ml-3 flex items-center" role="group" aria-label={t('quantity')}>
                      <button
                        type="button"
                        onClick={() => setQty(i.id, i.qty - 1)}
                        disabled={i.qty <= 1}
                        aria-label={t('decreaseQty')}
                        className="flex h-10 w-10 items-center justify-center text-[16px] leading-none transition-opacity hover:opacity-60 disabled:opacity-30"
                        style={{color: INK}}
                      >
                        −
                      </button>
                      <span aria-live="polite" className="min-w-7 text-center text-[13px] tabular-nums">{i.qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty(i.id, i.qty + 1)}
                        aria-label={t('increaseQty')}
                        className="flex h-10 w-10 items-center justify-center text-[16px] leading-none transition-opacity hover:opacity-60"
                        style={{color: INK}}
                      >
                        +
                      </button>
                    </div>
                    <p className="text-[14px] tabular-nums">{fmt(linePrice(i) * i.qty)}</p>
                  </div>

                  {findWhiteProduct(i.key)?.nm && (
                    <a
                      href={`https://www.wildberries.ru/catalog/${findWhiteProduct(i.key)!.nm}/detail.aspx`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="wv-link col-start-2 mt-2 justify-self-start text-[10px] uppercase tracking-[0.16em]"
                      style={{color: MUTED}}
                    >
                      Wildberries ↗
                    </a>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex items-baseline justify-between">
              <span className="text-[12px] uppercase tracking-[0.18em]" style={{color: MUTED}}>{t('total')}</span>
              <span className="text-[18px] tabular-nums">{fmt(total)}</span>
            </div>

            {/* min-h-11 → 44px tap floor (this is the bag's only nav affordance
                besides qty/remove); mt-4 trims the gap the taller box adds. */}
            <a href={`/${locale}/white/shop`} className="wv-btn mt-8 inline-flex items-center justify-center self-start px-9 py-4 text-[12px] uppercase tracking-[0.2em]">
              {t('viewCollection')}
            </a>
          </div>
        )}
      </main>
    </>
  );
}