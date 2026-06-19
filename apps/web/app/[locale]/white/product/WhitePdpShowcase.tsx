'use client';

import {useState} from 'react';
import {createPortal} from 'react-dom';
import {useWhitePortal} from '../../../../hooks/useWhitePortal';

// Variant 2 "White" — product detail (PDP) showcase. Same portal technique as
// the landing: a full-bleed white surface over the gradient chrome so the
// minimalist direction can be reviewed at /<locale>/white/product. Placeholder
// imagery (editorial shots via Higgsfield later). CSS-only, reduced-motion safe.

const INK = '#1c1714';
// Warm secondary grey at 5.0:1 on #fff (WCAG AA); see WhiteShowcase note.
const MUTED = '#776e64';
const HAIR = '#e7e2db';

const SIZES = ['XS', 'S', 'M', 'L', 'XL'] as const;
const COLORS = [
  {key: 'sand', hex: '#d8cdbd', en: 'Sand', ru: 'Песочный'},
  {key: 'ink', hex: '#2b2722', en: 'Ink', ru: 'Чернильный'},
  {key: 'bordeaux', hex: '#6e2a2a', en: 'Bordeaux', ru: 'Бордовый'},
];
const THUMBS = [0, 1, 2, 3];

export default function WhitePdpShowcase({locale}: {locale: string}) {
  const mounted = useWhitePortal();
  const [activeImg, setActiveImg] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState(COLORS[0]!.key);
  const ru = locale === 'ru';
  const t = (en: string, rus: string) => (ru ? rus : en);
  const selectedColor = COLORS.find((c) => c.key === color) ?? COLORS[0]!;

  if (!mounted) return null;

  return createPortal(
    <div className="wv-root fixed inset-0 z-[1000] overflow-y-auto bg-white font-sans antialiased" style={{color: INK}}>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur-md" style={{borderBottom: `1px solid ${HAIR}`}}>
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5 sm:px-10">
          <a href={`/${locale}/white`} className="text-[12px] uppercase tracking-[0.18em] transition-opacity hover:opacity-60" style={{color: MUTED}}>
            ← {t('Back', 'Назад')}
          </a>
          <a href={`/${locale}/white`} className="font-display text-[22px] font-medium tracking-[0.42em] sm:text-[26px]">REINASLEO</a>
          <span className="text-[12px] uppercase tracking-[0.18em]" style={{color: MUTED}}>{t('Bag (0)', 'Корзина (0)')}</span>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-6 sm:px-10">
        {/* Breadcrumb */}
        <nav className="py-5 text-[11px] uppercase tracking-[0.18em]" style={{color: MUTED}} aria-label="Breadcrumb">
          REINASLEO <span className="mx-2">/</span> {t('Shop', 'Магазин')} <span className="mx-2">/</span>
          <span style={{color: INK}}> {t('Silk Column Dress', 'Шёлковое платье-колонна')}</span>
        </nav>

        <div className="grid gap-10 pb-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          {/* Gallery */}
          <div className="wv-rise grid gap-4 sm:grid-cols-[64px_1fr]">
            <div className="order-2 flex gap-3 sm:order-1 sm:flex-col">
              {THUMBS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImg(i)}
                  aria-label={t(`View image ${i + 1}`, `Фото ${i + 1}`)}
                  className="wv-ph aspect-[2/3] w-16 shrink-0 transition-opacity"
                  style={{
                    outline: i === activeImg ? `1px solid ${INK}` : 'none',
                    opacity: i === activeImg ? 1 : 0.55,
                  }}
                />
              ))}
            </div>
            <div className="wv-ph order-1 aspect-[2/3] w-full sm:order-2" aria-hidden="true" />
          </div>

          {/* Info */}
          <div className="wv-rise wv-delay-1 lg:pt-6">
            <p className="text-[11px] uppercase tracking-[0.3em]" style={{color: MUTED}}>{t('Autumn / Winter 2026', 'Осень / Зима 2026')}</p>
            <h1 className="mt-4 font-display text-[34px] font-light leading-tight sm:text-[42px]">{t('Silk Column Dress', 'Шёлковое платье-колонна')}</h1>
            <p className="mt-3 text-[18px]" style={{color: INK}}>24 500 ₽</p>
            <p className="mt-6 max-w-md text-[14px] leading-relaxed" style={{color: MUTED}}>
              {t(
                'A fluid floor-length silhouette in matte silk. Bias-cut, unlined, with a concealed side zip. Designed to move quietly.',
                'Текучий силуэт в пол из матового шёлка. Косой крой, без подклада, скрытая боковая молния. Создано двигаться тихо.',
              )}
            </p>

            {/* Color */}
            <div className="mt-8">
              <p className="mb-3 text-[11px] uppercase tracking-[0.2em]" style={{color: MUTED}}>
                {t('Colour', 'Цвет')} — <span style={{color: INK}}>{t(selectedColor.en, selectedColor.ru)}</span>
              </p>
              {/* 44px tap targets (project a11y rule); the 32px inner dot keeps
                  the visual unchanged — gap-0 since 44-32=12px padding reproduces
                  the previous gap-3 spacing between dots. */}
              <div className="flex">
                {COLORS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setColor(c.key)}
                    aria-label={t(c.en, c.ru)}
                    aria-pressed={color === c.key}
                    className="group flex h-11 w-11 items-center justify-center"
                  >
                    <span
                      aria-hidden="true"
                      className="h-8 w-8 rounded-full transition-transform motion-safe:group-hover:scale-105"
                      style={{background: c.hex, outline: color === c.key ? `1px solid ${INK}` : `1px solid ${HAIR}`, outlineOffset: '2px'}}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div className="mt-8">
              <div className="mb-3 flex items-baseline justify-between">
                <p className="text-[11px] uppercase tracking-[0.2em]" style={{color: MUTED}}>{t('Size', 'Размер')}</p>
                <span className="text-[11px] uppercase tracking-[0.16em] underline-offset-4 hover:underline" style={{color: MUTED, cursor: 'pointer'}}>{t('Size guide', 'Таблица размеров')}</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    aria-pressed={size === s}
                    className="h-11 min-w-11 px-3 text-[13px] tracking-wide transition-colors"
                    style={{
                      border: `1px solid ${size === s ? INK : HAIR}`,
                      background: size === s ? INK : 'transparent',
                      color: size === s ? '#fff' : INK,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Add to bag */}
            <div className="mt-9 flex gap-3">
              <button type="button" className="wv-btn flex-1 px-8 py-4 text-[12px] uppercase tracking-[0.2em]">
                {size ? t('Add to bag', 'В корзину') : t('Select a size', 'Выберите размер')}
              </button>
              <button
                type="button"
                aria-label={t('Add to favourites', 'В избранное')}
                className="flex h-[52px] w-[52px] items-center justify-center transition-colors hover:bg-[#f5f2ed]"
                style={{border: `1px solid ${HAIR}`}}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.4">
                  <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
                </svg>
              </button>
            </div>

            {/* Details */}
            <dl className="mt-10 divide-y" style={{borderColor: HAIR}}>
              {[
                [t('Composition', 'Состав'), t('100% mulberry silk', '100% тутовый шёлк')],
                [t('Care', 'Уход'), t('Dry clean only', 'Только химчистка')],
                [t('Delivery', 'Доставка'), t('2–5 business days', '2–5 рабочих дней')],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-3.5 text-[13px]" style={{borderColor: HAIR}}>
                  <dt style={{color: MUTED}}>{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
