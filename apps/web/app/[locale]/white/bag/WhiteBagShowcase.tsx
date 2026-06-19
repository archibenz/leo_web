'use client';

import {createPortal} from 'react-dom';
import {useWhitePortal} from '../../../../hooks/useWhitePortal';
import WhiteHeader from '../WhiteHeader';
import WhiteFooter from '../WhiteFooter';
import {INK, MUTED, HAIR} from '../wv-palette';

// Variant 2 "White" — bag / cart (empty state). Same portal technique as the
// landing/shop/PDP. The prototype has no add-to-bag wiring yet, so this renders
// the honest empty state — no fake checkout, just a route back into the shop.
// Gives the header "Bag" a real destination instead of an inert span.

export default function WhiteBagShowcase({locale}: {locale: string}) {
  const mounted = useWhitePortal();
  const ru = locale === 'ru';
  const t = (en: string, rus: string) => (ru ? rus : en);

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
        right={<span className="text-[12px] uppercase tracking-[0.18em]" style={{color: INK}} aria-current="page">{t('Bag (0)', 'Корзина (0)')}</span>}
      />

      <main id="wv-main" tabIndex={-1} style={{outline: 'none'}} className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col items-center justify-center px-6 py-24 text-center sm:px-10">
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
      </main>

      <WhiteFooter locale={locale} />
    </div>,
    document.body,
  );
}
