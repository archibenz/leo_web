'use client';

import {useState} from 'react';
import {createPortal} from 'react-dom';
import {useWhitePortal} from '../../../../hooks/useWhitePortal';
import {useWhiteBag} from '../../../../hooks/useWhiteBag';
import WhiteHeader from '../WhiteHeader';
import WhiteFooter from '../WhiteFooter';
import {INK, MUTED, HAIR, SIGNAL} from '../wv-palette';
import {WHITE_PRODUCTS, type WhiteProduct} from '../products';

// Variant 2 "White" — product detail (PDP) showcase. Same portal technique as
// the landing: a full-bleed white surface over the gradient chrome so the
// minimalist direction can be reviewed at /<locale>/white/product. Placeholder
// imagery (editorial shots via Higgsfield later). CSS-only, reduced-motion safe.

const SIZES = ['XS', 'S', 'M', 'L', 'XL'] as const;
const COLORS = [
  {key: 'sand', hex: '#d8cdbd', en: 'Sand', ru: 'Песочный'},
  {key: 'ink', hex: '#2b2722', en: 'Ink', ru: 'Чернильный'},
  {key: 'bordeaux', hex: '#6e2a2a', en: 'Bordeaux', ru: 'Бордовый'},
];
const THUMBS = [0, 1, 2, 3];
// Demo measurements (cm) for the size-guide disclosure.
const SIZE_GUIDE = [
  {size: 'XS', bust: 82, waist: 62, hips: 88},
  {size: 'S', bust: 86, waist: 66, hips: 92},
  {size: 'M', bust: 90, waist: 70, hips: 96},
  {size: 'L', bust: 96, waist: 76, hips: 102},
  {size: 'XL', bust: 102, waist: 82, hips: 108},
];

export default function WhitePdpShowcase({locale, product}: {locale: string; product?: WhiteProduct | null}) {
  const mounted = useWhitePortal();
  const [activeImg, setActiveImg] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState(COLORS[0]!.key);
  const [guideOpen, setGuideOpen] = useState(false);
  const [favourited, setFavourited] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const {add, count} = useWhiteBag();
  const ru = locale === 'ru';
  const t = (en: string, rus: string) => (ru ? rus : en);
  const selectedColor = COLORS.find((c) => c.key === color) ?? COLORS[0]!;
  // Concrete product for the bag — fall back to the default demo dress (key 1).
  const bagProduct = product ?? WHITE_PRODUCTS[0]!;
  const handleAdd = () => {
    if (!size) return;
    add({key: bagProduct.key, en: bagProduct.en, ru: bagProduct.ru, price: bagProduct.price, size});
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1600);
  };
  // ?p selects the catalog product; fall back to the default demo dress.
  const name = product ? t(product.en, product.ru) : t('Silk Column Dress', 'Шёлковое платье-колонна');
  const priceStr = product ? `${product.price.toLocaleString('ru-RU')} ₽` : '24 500 ₽';
  const desc = product
    ? t(product.descEn, product.descRu)
    : t(
        'A fluid floor-length silhouette in matte silk. Bias-cut, unlined, with a concealed side zip. Designed to move quietly.',
        'Текучий силуэт в пол из матового шёлка. Косой крой, без подклада, скрытая боковая молния. Создано двигаться тихо.',
      );
  const fmt = (n: number) => `${n.toLocaleString('ru-RU')} ₽`;
  // "You may also like" — same category first, then fill from the rest, current excluded.
  const pool = WHITE_PRODUCTS.filter((p) => p.key !== product?.key);
  const sameCat = product ? pool.filter((p) => p.cat === product.cat) : [];
  const related = [...sameCat, ...pool.filter((p) => !sameCat.includes(p))].slice(0, 4);

  if (!mounted) return null;

  return createPortal(
    <div className="wv-root fixed inset-0 z-[1000] overflow-y-auto bg-white font-sans antialiased" style={{color: INK}}>
      {/* Header */}
      <WhiteHeader
        locale={locale}
        left={
          <a href={`/${locale}/white`} className="text-[12px] uppercase tracking-[0.18em] transition-opacity hover:opacity-60" style={{color: MUTED}}>
            ← {t('Back', 'Назад')}
          </a>
        }
        right={<a href={`/${locale}/white/bag`} aria-label={t(`Bag, ${count} items`, `Корзина, ${count} товаров`)} className="text-[12px] uppercase tracking-[0.18em] transition-opacity hover:opacity-60" style={{color: MUTED}}>{t('Bag', 'Корзина')} ({count})</a>}
      />

      <main id="wv-main" tabIndex={-1} style={{outline: 'none'}}>
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10">
        {/* Breadcrumb */}
        <nav className="py-5 text-[11px] uppercase tracking-[0.18em]" style={{color: MUTED}} aria-label={t('Breadcrumb', 'Хлебные крошки')}>
          <a href={`/${locale}/white`} className="transition-opacity hover:opacity-60">REINASLEO</a>
          <span className="mx-2">/</span>
          <a href={`/${locale}/white/shop`} className="transition-opacity hover:opacity-60">{t('Shop', 'Магазин')}</a>
          <span className="mx-2">/</span>
          <span style={{color: INK}} aria-current="page">{name}</span>
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
                  aria-pressed={i === activeImg}
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
            <h1 className="mt-4 font-display text-[34px] font-light leading-tight sm:text-[42px]">{name}</h1>
            <p className="mt-3 text-[18px]" style={{color: INK}}>{priceStr}</p>
            <p className="mt-6 max-w-md text-[14px] leading-relaxed" style={{color: MUTED}}>{desc}</p>

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
                <button
                  type="button"
                  onClick={() => setGuideOpen((o) => !o)}
                  aria-expanded={guideOpen}
                  aria-controls="wv-size-guide"
                  className="text-[11px] uppercase tracking-[0.16em] underline-offset-4 hover:underline"
                  style={{color: MUTED}}
                >
                  {t('Size guide', 'Таблица размеров')}
                </button>
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
              {/* Size-guide disclosure — semantic table, square/hairline, reduced-motion safe (hidden toggle). */}
              <div id="wv-size-guide" hidden={!guideOpen} className="mt-4">
                <table className="w-full border-collapse text-[12px]">
                  <caption className="sr-only">{t('Size guide, measurements in cm', 'Таблица размеров, в сантиметрах')}</caption>
                  <thead>
                    <tr style={{color: MUTED}}>
                      <th scope="col" className="border-b py-2 text-left font-normal uppercase tracking-[0.14em]" style={{borderColor: HAIR}}>{t('Size', 'Размер')}</th>
                      <th scope="col" className="border-b py-2 text-right font-normal uppercase tracking-[0.14em]" style={{borderColor: HAIR}}>{t('Bust', 'Грудь')}</th>
                      <th scope="col" className="border-b py-2 text-right font-normal uppercase tracking-[0.14em]" style={{borderColor: HAIR}}>{t('Waist', 'Талия')}</th>
                      <th scope="col" className="border-b py-2 text-right font-normal uppercase tracking-[0.14em]" style={{borderColor: HAIR}}>{t('Hips', 'Бёдра')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SIZE_GUIDE.map((r) => (
                      <tr key={r.size}>
                        <th scope="row" className="border-b py-2 text-left font-medium" style={{borderColor: HAIR, color: INK}}>{r.size}</th>
                        <td className="border-b py-2 text-right tabular-nums" style={{borderColor: HAIR}}>{r.bust}</td>
                        <td className="border-b py-2 text-right tabular-nums" style={{borderColor: HAIR}}>{r.waist}</td>
                        <td className="border-b py-2 text-right tabular-nums" style={{borderColor: HAIR}}>{r.hips}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[11px]" style={{color: MUTED}}>{t('Measurements in cm.', 'Размеры в сантиметрах.')}</p>
              </div>
            </div>

            {/* Add to bag */}
            <div className="mt-9 flex gap-3">
              <button type="button" disabled={!size} onClick={handleAdd} aria-live="polite" className="wv-btn flex-1 px-8 py-4 text-[12px] uppercase tracking-[0.2em]">
                {justAdded ? t('Added', 'Добавлено') : size ? t('Add to bag', 'В корзину') : t('Select a size', 'Выберите размер')}
              </button>
              <button
                type="button"
                onClick={() => setFavourited((f) => !f)}
                aria-pressed={favourited}
                aria-label={favourited ? t('Remove from favourites', 'Убрать из избранного') : t('Add to favourites', 'В избранное')}
                className="flex h-[52px] w-[52px] items-center justify-center transition-colors hover:bg-[#f5f2ed]"
                style={{border: `1px solid ${favourited ? SIGNAL : HAIR}`}}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={favourited ? SIGNAL : 'none'} stroke={favourited ? SIGNAL : INK} strokeWidth="1.4">
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

      {/* You may also like — related products (same card pattern as shop/landing) */}
      {related.length > 0 && (
        <section className="border-t" style={{borderColor: HAIR}} aria-labelledby="wv-related-heading">
          <div className="mx-auto max-w-[1400px] px-6 py-16 sm:px-10">
            <h2 id="wv-related-heading" className="mb-10 font-display text-[24px] font-light tracking-tight sm:text-[30px]">
              {t('You may also like', 'Вам также может понравиться')}
            </h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-4">
              {related.map((p) => (
                <a key={p.key} href={`/${locale}/white/product?p=${p.key}`} className="wv-card group block">
                  <div className="wv-ph relative aspect-[2/3] w-full overflow-hidden">
                    {p.sale && (
                      <span className="absolute left-3 top-3 text-[10px] uppercase tracking-[0.16em]" style={{color: SIGNAL}}>{t('Sale', 'Скидка')}</span>
                    )}
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-[14px] tracking-wide transition-opacity group-hover:opacity-60">{t(p.en, p.ru)}</p>
                    <p className="mt-1 text-[13px]" style={{color: p.sale ? SIGNAL : MUTED}}>
                      {p.sale ? (
                        <>
                          <s className="mr-2 line-through" style={{color: MUTED}}><span className="sr-only">{t('Regular price', 'Обычная цена')}: </span>{fmt(p.price)}</s>
                          <span><span className="sr-only">{t('Sale price', 'Цена со скидкой')}: </span>{fmt(p.sale)}</span>
                        </>
                      ) : (
                        fmt(p.price)
                      )}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
      </main>

      <WhiteFooter locale={locale} />
    </div>,
    document.body,
  );
}
