'use client';

import {createPortal} from 'react-dom';
import {useWhitePortal} from '../../../hooks/useWhitePortal';

// Variant 2 "White" showcase. Rendered through a portal to document.body so the
// fixed full-bleed surface escapes the gradient layout's `main.z-40` stacking
// context and fully covers the dark chrome — letting both design directions be
// compared on one deploy at /<locale>/white. Imagery is placeholder (editorial
// shots arrive via the loop / Higgsfield). CSS-only motion (reduced-motion safe).

const INK = '#1c1714';
// Warm secondary grey. Tuned to 5.0:1 on #fff (WCAG AA for body text);
// the prior #8c837a was 3.72:1 and failed on descriptions/nav/prices/footer.
const MUTED = '#776e64';
const HAIR = '#e7e2db';
const SIGNAL = '#b4452f';

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
      <header
        className="sticky top-0 z-10 bg-white/85 backdrop-blur-md"
        style={{borderBottom: `1px solid ${HAIR}`}}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5 sm:px-10">
          <nav className="flex flex-1 items-center gap-7 text-[12px] uppercase tracking-[0.18em] md:gap-7" style={{color: MUTED}}>
            {/* Mobile gets a single shop entry; desktop shows the full nav (parity) */}
            <a href={`/${locale}/white/shop`} className="transition-opacity hover:opacity-60 md:hidden">{t('Shop', 'Магазин')}</a>
            {nav.map((n) => (
              <a key={n} href={`/${locale}/white/shop`} className="hidden transition-opacity hover:opacity-60 md:inline">{n}</a>
            ))}
          </nav>
          <a href={`/${locale}/white`} className="font-display text-[22px] font-medium tracking-[0.42em] sm:text-[26px]" style={{color: INK}}>
            REINASLEO
          </a>
          <div className="flex flex-1 items-center justify-end gap-6 text-[12px] uppercase tracking-[0.18em]" style={{color: MUTED}}>
            <span className="hidden cursor-pointer transition-opacity hover:opacity-60 sm:inline">{t('Search', 'Поиск')}</span>
            <span className="cursor-pointer transition-opacity hover:opacity-60">{t('Bag (0)', 'Корзина (0)')}</span>
          </div>
        </div>
      </header>

      {/* Hero — type-led editorial */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10">
        <div className="grid items-end gap-10 py-20 sm:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:py-36">
          <div className="wv-rise">
            <p className="mb-7 text-[11px] uppercase tracking-[0.32em]" style={{color: MUTED}}>
              {t('Autumn / Winter 2026', 'Осень / Зима 2026')}
            </p>
            <h1 className="font-display text-[15vw] font-light leading-[0.92] tracking-[-0.01em] sm:text-[72px] lg:text-[88px]">
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
      <footer className="border-t" style={{borderColor: HAIR}}>
        <div className="mx-auto grid max-w-[1400px] gap-10 px-6 py-16 sm:grid-cols-2 sm:px-10 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <p className="font-display text-[20px] tracking-[0.3em]">REINASLEO</p>
            <p className="mt-3 text-[12px] leading-relaxed" style={{color: MUTED}}>{t('Premium womenswear', 'Премиальная женская одежда')}</p>
          </div>
          {[
            // Prototype destinations stay inside /white (no leak to the gradient site):
            // shop categories → the white shop, brand links → the white landing.
            {h: t('Shop', 'Магазин'), href: `/${locale}/white/shop`, items: [t('New', 'Новинки'), t('Dresses', 'Платья'), t('Outerwear', 'Верхняя одежда')]},
            {h: t('Brand', 'Бренд'), href: `/${locale}/white`, items: [t('About', 'О бренде'), t('Care', 'Уход'), t('Contact', 'Контакты')]},
          ].map((col) => (
            <div key={col.h}>
              <p className="mb-4 text-[11px] uppercase tracking-[0.2em]" style={{color: INK}}>{col.h}</p>
              <ul className="space-y-2.5 text-[13px]" style={{color: MUTED}}>
                {col.items.map((it) => (
                  <li key={it}>
                    <a href={col.href} className="inline-block transition-opacity hover:opacity-60">{it}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p className="mb-4 text-[11px] uppercase tracking-[0.2em]" style={{color: INK}}>{t('Newsletter', 'Рассылка')}</p>
            <form onSubmit={(e) => e.preventDefault()} className="flex items-center border-b pb-1.5" style={{borderColor: MUTED}}>
              <label htmlFor="wv-newsletter" className="sr-only">{t('Email address', 'Email-адрес')}</label>
              <input
                id="wv-newsletter"
                type="email"
                autoComplete="email"
                placeholder={t('Email', 'Email')}
                className="w-full bg-transparent text-[13px] outline-none placeholder:text-[#7a7167]"
                style={{color: INK}}
              />
              <button
                type="submit"
                aria-label={t('Subscribe', 'Подписаться')}
                className="shrink-0 px-1 text-[12px] uppercase tracking-[0.16em] transition-opacity hover:opacity-60"
                style={{color: INK}}
              >
                →
              </button>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-[1400px] px-6 pb-10 text-[11px] uppercase tracking-[0.14em] sm:px-10" style={{color: MUTED}}>
          © 2026 REINASLEO · {t('White variant — preview', 'Белый вариант — превью')}
        </div>
      </footer>
    </div>,
    document.body,
  );
}
