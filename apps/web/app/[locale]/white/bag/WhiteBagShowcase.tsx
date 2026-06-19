'use client';

import {createPortal} from 'react-dom';
import {useWhitePortal} from '../../../../hooks/useWhitePortal';
import {useWhiteBag} from '../../../../hooks/useWhiteBag';
import {useWhiteFavourites} from '../../../../hooks/useWhiteFavourites';
import WhiteHeader from '../WhiteHeader';
import WhiteFooter from '../WhiteFooter';
import {INK, MUTED, HAIR} from '../wv-palette';

// Variant 2 "White" — bag / cart. Lists the localStorage-backed picks (via
// useWhiteBag) with remove + total, or an honest empty state. No checkout — the
// prototype holds the user's selection locally; it does not claim a purchase.

export default function WhiteBagShowcase({locale}: {locale: string}) {
  const mounted = useWhitePortal();
  const {items, count, remove, setQty} = useWhiteBag();
  const {count: favCount} = useWhiteFavourites();
  const ru = locale === 'ru';
  const t = (en: string, rus: string) => (ru ? rus : en);
  const fmt = (n: number) => `${n.toLocaleString('ru-RU')} ₽`;
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  if (!mounted) return null;

  return createPortal(
    <div className="wv-root fixed inset-0 z-[1000] flex min-h-full flex-col overflow-y-auto bg-white font-sans antialiased" style={{color: INK}}>
      <WhiteHeader
        locale={locale}
        left={
          <a href={`/${locale}/white/shop`} className="text-[12px] uppercase tracking-[0.18em] transition-opacity hover:opacity-60" style={{color: MUTED}}>
            ← {t('Shop', 'Магазин')}
          </a>
        }
        right={
          <div className="flex items-center gap-6 text-[12px] uppercase tracking-[0.18em]" style={{color: MUTED}}>
            <a href={`/${locale}/white/favourites`} aria-label={t(`Saved, ${favCount} items`, `Избранное, ${favCount} товаров`)} className="transition-opacity hover:opacity-60">{t('Saved', 'Избранное')} ({favCount})</a>
            <span style={{color: INK}} aria-current="page">{t('Bag', 'Корзина')} ({count})</span>
          </div>
        }
      />

      <main id="wv-main" tabIndex={-1} style={{outline: 'none'}} className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-6 py-12 sm:px-10">
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
            {/* Square-geometry bag glyph — hairline outline, ink, decorative. */}
            <span aria-hidden="true" className="mb-10 flex h-16 w-16 items-center justify-center" style={{border: `1px solid ${HAIR}`}}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.2" strokeLinecap="square">
                <path d="M5 7h14l-1 13H6L5 7z" />
                <path d="M9 7V5.5a3 3 0 0 1 6 0V7" />
              </svg>
            </span>
            <h1 className="font-display text-[32px] font-light leading-tight sm:text-[40px]">{t('Your bag is empty', 'Ваша корзина пуста')}</h1>
            <p className="mt-5 max-w-sm text-[14px] leading-relaxed" style={{color: MUTED}}>
              {t(
                'Nothing here yet. Explore the collection and add the pieces you love.',
                'Здесь пока пусто. Загляните в коллекцию и добавьте вещи, которые вам по душе.',
              )}
            </p>
            <a href={`/${locale}/white/shop`} className="wv-btn mt-10 inline-flex items-center justify-center px-9 py-4 text-[12px] uppercase tracking-[0.2em]">
              {t('Continue shopping', 'Продолжить покупки')}
            </a>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-2xl">
            <h1 className="font-display text-[32px] font-light leading-tight sm:text-[40px]">{t('Bag', 'Корзина')}</h1>

            <ul className="mt-10 border-t" style={{borderColor: HAIR}}>
              {items.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b py-5" style={{borderColor: HAIR}}>
                  <div className="wv-ph aspect-[2/3] w-16 shrink-0" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px]">{t(i.en, i.ru)}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.16em]" style={{color: MUTED}}>{t('Size', 'Размер')}: {i.size}</p>
                  </div>
                  {/* Quantity stepper — min 1 (× removes); 44px tap targets, square. */}
                  <div className="flex shrink-0 items-center" role="group" aria-label={t('Quantity', 'Количество')}>
                    <button
                      type="button"
                      onClick={() => setQty(i.id, i.qty - 1)}
                      disabled={i.qty <= 1}
                      aria-label={t('Decrease quantity', 'Уменьшить количество')}
                      className="flex h-11 w-11 items-center justify-center text-[16px] leading-none transition-colors disabled:opacity-30"
                      style={{border: `1px solid ${HAIR}`, color: INK}}
                    >
                      −
                    </button>
                    <span aria-live="polite" className="min-w-10 text-center text-[14px] tabular-nums">{i.qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(i.id, i.qty + 1)}
                      aria-label={t('Increase quantity', 'Увеличить количество')}
                      className="flex h-11 w-11 items-center justify-center text-[16px] leading-none transition-colors"
                      style={{border: `1px solid ${HAIR}`, color: INK}}
                    >
                      +
                    </button>
                  </div>
                  <p className="w-24 shrink-0 text-right text-[14px] tabular-nums">{fmt(i.price * i.qty)}</p>
                  <button
                    type="button"
                    onClick={() => remove(i.id)}
                    aria-label={t(`Remove ${i.en} from bag`, `Убрать ${i.ru} из корзины`)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center text-[20px] leading-none transition-opacity hover:opacity-60"
                    style={{color: MUTED}}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex items-baseline justify-between">
              <span className="text-[12px] uppercase tracking-[0.18em]" style={{color: MUTED}}>{t('Total', 'Итого')}</span>
              <span className="text-[18px] tabular-nums">{fmt(total)}</span>
            </div>

            <a href={`/${locale}/white/shop`} className="mt-8 inline-block text-[12px] uppercase tracking-[0.18em] underline-offset-4 transition-opacity hover:opacity-60" style={{color: MUTED}}>
              ← {t('Continue shopping', 'Продолжить покупки')}
            </a>
          </div>
        )}
      </main>

      <WhiteFooter locale={locale} />
    </div>,
    document.body,
  );
}
