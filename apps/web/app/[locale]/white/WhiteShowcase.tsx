'use client';

import {createPortal} from 'react-dom';
import {useWhitePortal} from '../../../hooks/useWhitePortal';
import WhiteHeader from './WhiteHeader';
import WhiteFooter from './WhiteFooter';
import {INK, MUTED, HAIR, SIGNAL} from './wv-palette';

// Variant 2 "White" showcase. Rendered through a portal to document.body so the
// fixed full-bleed surface escapes the gradient layout's `main.z-40` stacking
// context and fully covers the dark chrome — letting both design directions be
// compared on one deploy at /<locale>/white. Imagery is placeholder (editorial
// shots arrive via the loop / Higgsfield). CSS-only motion (reduced-motion safe).

const PRODUCTS = [
  {key: 1, en: 'Sculpted Wool Coat', ru: 'Шерстяное пальто', price: '32 900 ₽'},
  {key: 2, en: 'Silk Column Dress', ru: 'Шёлковое платье-колонна', price: '24 500 ₽'},
  {key: 3, en: 'Tailored Trousers', ru: 'Брюки прямого кроя', price: '14 900 ₽', sale: '11 900 ₽'},
  {key: 4, en: 'Cashmere Knit', ru: 'Кашемировый джемпер', price: '19 800 ₽'},
  {key: 5, en: 'Pleated Midi Skirt', ru: 'Плиссированная юбка миди', price: '16 400 ₽'},
  {key: 6, en: 'Structured Blazer', ru: 'Структурный блейзер', price: '27 200 ₽'},
];

export default function WhiteShowcase({locale}: {locale: string}) {
  const mounted = useWhitePortal();
  const ru = locale === 'ru';
  const t = (en: string, rus: string) => (ru ? rus : en);

  if (!mounted) return null;

  const nav = [t('New', 'Новинки'), t('Shop', 'Магазин')];

  return createPortal(
    <div
      className="wv-root fixed inset-0 z-[1000] overflow-y-auto bg-white font-sans antialiased"
      style={{color: INK}}
    >
      {/* Header — thin, centered wordmark */}
      <WhiteHeader
        locale={locale}
        left={
          <nav className="flex items-center gap-7 text-[12px] uppercase tracking-[0.18em]" style={{color: MUTED}} aria-label={t('Primary', 'Меню')}>
            {/* Mobile gets a single shop entry; desktop shows the full nav (parity) */}
            <a href={`/${locale}/white/shop`} className="transition-opacity hover:opacity-60 md:hidden">{t('Shop', 'Магазин')}</a>
            {nav.map((n) => (
              <a key={n} href={`/${locale}/white/shop`} className="hidden transition-opacity hover:opacity-60 md:inline">{n}</a>
            ))}
          </nav>
        }
        right={
          <div className="flex items-center gap-6 text-[12px] uppercase tracking-[0.18em]" style={{color: MUTED}}>
            <span className="hidden cursor-pointer transition-opacity hover:opacity-60 sm:inline">{t('Search', 'Поиск')}</span>
            <span className="cursor-pointer transition-opacity hover:opacity-60">{t('Bag (0)', 'Корзина (0)')}</span>
          </div>
        }
      />

      {/* Hero — type-led editorial */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10">
        <div className="grid items-end gap-10 py-20 sm:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:py-36">
          <div className="wv-rise">
            <p className="mb-7 text-[11px] uppercase tracking-[0.32em]" style={{color: MUTED}}>
              {t('Autumn / Winter 2026', 'Осень / Зима 2026')}
            </p>
            <h1 className="font-display text-[clamp(56px,calc(4.4vw_+_39.5px),88px)] font-light leading-[0.92] tracking-[-0.01em]">
              {t('Quiet', 'Тихая')}
              <br />
              <span className="italic" style={{color: MUTED}}>{t('precision', 'точность')}</span>
            </h1>
            <p className="mt-9 max-w-md text-[15px] leading-relaxed" style={{color: MUTED}}>
              {t(
                'Sculpted silhouettes in a restrained palette. Made to be worn, not noticed first.',
                'Скульптурные силуэты в сдержанной палитре. Создано, чтобы носить, а не бросаться в глаза.',
              )}
            </p>
            <a href={`/${locale}/white/shop`} className="wv-btn mt-11 inline-flex items-center justify-center px-9 py-4 text-[12px] uppercase tracking-[0.2em]">
              {t('Shop the collection', 'Смотреть коллекцию')}
            </a>
          </div>
          <div className="wv-ph wv-rise wv-delay-1 aspect-[3/4] w-full" aria-hidden="true" />
        </div>
      </section>

      {/* Editorial divider */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10">
        <div className="flex flex-col gap-6 border-t py-14 sm:flex-row sm:items-baseline sm:justify-between" style={{borderColor: HAIR}}>
          <h2 className="font-display text-[28px] font-light tracking-tight sm:text-[34px]">{t('The edit', 'Подборка')}</h2>
          <p className="max-w-sm text-[13px] leading-relaxed" style={{color: MUTED}}>
            {t('Six pieces that define the season — clean lines, considered fabric, nothing superfluous.', 'Шесть вещей сезона — чистые линии, продуманная ткань, ничего лишнего.')}
          </p>
        </div>
      </section>

      {/* Product grid — 2/3 portrait cards */}
      <section className="mx-auto max-w-[1400px] px-6 pb-24 sm:px-10">
        <div className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-3">
          {PRODUCTS.map((p, i) => (
            <a key={p.key} href={`/${locale}/white/product`} className={`wv-card wv-rise group block wv-delay-${(i % 3) + 1}`}>
              <div className="wv-ph relative aspect-[2/3] w-full overflow-hidden">
                {p.sale && (
                  <span className="absolute left-3 top-3 text-[10px] uppercase tracking-[0.16em]" style={{color: SIGNAL}}>
                    {t('Sale', 'Скидка')}
                  </span>
                )}
                <span className="wv-quickadd absolute inset-x-0 bottom-0 flex h-11 items-center justify-center bg-white/90 text-[11px] uppercase tracking-[0.2em] backdrop-blur-sm">
                  {t('Quick add', 'В корзину')}
                </span>
              </div>
              <div className="mt-4 text-center">
                <p className="text-[14px] tracking-wide transition-opacity group-hover:opacity-60">{t(p.en, p.ru)}</p>
                <p className="mt-1 text-[13px]" style={{color: p.sale ? SIGNAL : MUTED}}>
                  {p.sale ? (
                    <>
                      <span className="mr-2 line-through" style={{color: MUTED}}>{p.price}</span>
                      {p.sale}
                    </>
                  ) : (
                    p.price
                  )}
                </p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Lookbook — editorial brand statement */}
      <section className="border-t" style={{borderColor: HAIR}}>
        <div className="mx-auto grid max-w-[1400px] items-center gap-0 lg:grid-cols-2">
          <div className="wv-ph wv-rise aspect-[4/5] w-full lg:aspect-auto lg:h-full lg:min-h-[560px]" aria-hidden="true" />
          <div className="wv-rise wv-delay-1 px-6 py-16 sm:px-12 lg:px-20 lg:py-28">
            <p className="mb-7 text-[11px] uppercase tracking-[0.32em]" style={{color: MUTED}}>{t('The atelier', 'Ателье')}</p>
            <h2 className="font-display text-[30px] font-light leading-[1.1] tracking-tight sm:text-[40px]">
              {t('Made slowly,', 'Сделано медленно,')}
              <br />
              <span className="italic" style={{color: MUTED}}>{t('worn for years', 'носится годами')}</span>
            </h2>
            <p className="mt-8 max-w-md text-[15px] leading-relaxed" style={{color: MUTED}}>
              {t(
                'Each piece is cut from considered fabric and finished by hand. We design for the long wardrobe — clothes that hold their shape and their meaning season after season.',
                'Каждая вещь скроена из продуманной ткани и доведена вручную. Мы проектируем для долгого гардероба — одежду, которая держит форму и смысл сезон за сезоном.',
              )}
            </p>
            <a href={`/${locale}/white/shop`} className="wv-btn mt-10 inline-flex items-center justify-center px-9 py-4 text-[12px] uppercase tracking-[0.2em]">
              {t('Explore the atelier', 'В ателье')}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <WhiteFooter locale={locale} />
    </div>,
    document.body,
  );
}
