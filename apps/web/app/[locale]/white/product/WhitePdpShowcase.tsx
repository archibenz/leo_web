'use client';

import Image from 'next/image';
import {useState, useEffect, useRef} from 'react';
import {createPortal} from 'react-dom';
import {useTranslations} from 'next-intl';
import {useFocusTrap} from '../../../../lib/useFocusTrap';
import {useWhitePortal} from '../../../../hooks/useWhitePortal';
import {useWhiteBag} from '../../../../hooks/useWhiteBag';
import {useWhiteFavourites} from '../../../../hooks/useWhiteFavourites';
import WhiteHeader from '../WhiteHeader';
import WhiteHeaderActions from '../WhiteHeaderActions';
import WhiteFooter from '../WhiteFooter';
import WhiteProductCard from '../WhiteProductCard';
import {INK, MUTED, HAIR, SIGNAL} from '../wv-palette';
import {WhiteFavHeart} from '../wv-icons';
import {WHITE_PRODUCTS, WHITE_SIZES, WHITE_EDITORIAL, type WhiteProduct} from '../products';

// Variant 2 "White" — product detail (PDP) showcase. Same portal technique as
// the landing: a full-bleed white surface over the gradient chrome so the
// minimalist direction can be reviewed at /<locale>/white/product. Placeholder
// imagery (editorial shots via Higgsfield later). CSS-only, reduced-motion safe.

const SIZES = WHITE_SIZES;
// Fallback colourways for the default demo dress (no ?p) — mirrors the Silk
// product. Real products carry their own per-product colours (products.ts).
const DEFAULT_COLORS = [
  {key: 'ivory', hex: '#ece6da', en: 'Ivory', ru: 'Слоновая кость'},
  {key: 'black', hex: '#2b2722', en: 'Black', ru: 'Чёрный'},
  {key: 'bordeaux', hex: '#6e2a2a', en: 'Bordeaux', ru: 'Бордовый'},
];
// Gallery = the product photo first, then shared editorial views (gradient asset
// base). Selecting a thumbnail swaps the main image. Built per-product below.
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
  const productColors = product?.colors ?? DEFAULT_COLORS;
  const mounted = useWhitePortal();
  const [activeImg, setActiveImg] = useState(0);
  // Live horizontal drag offset of the gallery track (px). null = not dragging.
  const [dragDelta, setDragDelta] = useState<number | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState(productColors[0]!.key);
  const [guideOpen, setGuideOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  // Tap-to-zoom lightbox for the active gallery image.
  const [zoomed, setZoomed] = useState(false);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const lbTrackRef = useRef<HTMLDivElement>(null);
  const [lbDragDelta, setLbDragDelta] = useState<number | null>(null);
  // Vertical pull-to-dismiss: lbDismissY = live offset (px), lbDismissing gates
  // the snap-back transition so the pull follows the finger 1:1.
  const [lbDismissY, setLbDismissY] = useState(0);
  const [lbDismissing, setLbDismissing] = useState(false);
  useFocusTrap(lightboxRef, zoomed);
  const {add, count} = useWhiteBag();
  const {has: isFavourite, toggle: toggleFavourite, count: favCount} = useWhiteFavourites();
  const ru = locale === 'ru';
  const t = useTranslations('white.pdp');
  const selectedColor = productColors.find((c) => c.key === color) ?? productColors[0]!;
  // Concrete product for the bag/wishlist — fall back to the demo dress (key 1).
  const bagProduct = product ?? WHITE_PRODUCTS[0]!;
  // Product photo first, then shared editorial views — 4 gallery slots (THUMBS).
  const gallery = [bagProduct.image, ...WHITE_EDITORIAL];
  const favourited = isFavourite(bagProduct.key);
  const handleAdd = () => {
    if (!size) return;
    // Charge the effective (sale) price the PDP shows — not the struck regular.
    add({key: bagProduct.key, en: bagProduct.en, ru: bagProduct.ru, price: bagProduct.sale ?? bagProduct.price, size});
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1600);
  };

  // Mobile sticky add-to-bag: reveal it once the inline CTA scrolls out of view.
  const inlineAddRef = useRef<HTMLButtonElement>(null);
  const [showSticky, setShowSticky] = useState(false);
  useEffect(() => {
    const el = inlineAddRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting), {rootMargin: '0px 0px -48px 0px'});
    io.observe(el);
    return () => io.disconnect();
  }, [mounted]);
  const handleStickyAdd = () => {
    if (!size) {
      const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.getElementById('wv-pdp-size')?.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'center'});
      return;
    }
    handleAdd();
  };
  const stickyPrice = `${(bagProduct.sale ?? bagProduct.price).toLocaleString('ru-RU')} ₽`;

  // Mobile: live-drag the gallery track horizontally — the frames follow the
  // finger, then snap to the nearest. Rubber-band resistance at the clamped
  // bounds (White keeps clamp, no wrap). The snap transition lives on the track
  // and is disabled under reduced-motion; the drag itself is direct manipulation.
  const galleryRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = galleryRef.current;
    if (!el || gallery.length < 2) return;
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let dir: 'h' | 'v' | null = null;
    const onStart = (e: TouchEvent) => {
      const tch = e.touches[0];
      if (!tch) return;
      startX = tch.clientX;
      startY = tch.clientY;
      dx = 0;
      dir = null;
    };
    const onMove = (e: TouchEvent) => {
      const tch = e.touches[0];
      if (!tch) return;
      const cdx = tch.clientX - startX;
      const cdy = tch.clientY - startY;
      if (!dir && (Math.abs(cdx) > 8 || Math.abs(cdy) > 8)) {
        dir = Math.abs(cdx) > Math.abs(cdy) ? 'h' : 'v';
      }
      if (dir === 'h') {
        e.preventDefault();
        dx = cdx;
        const atStart = activeImg === 0 && dx > 0;
        const atEnd = activeImg === gallery.length - 1 && dx < 0;
        setDragDelta(atStart || atEnd ? dx * 0.35 : dx);
      }
    };
    const onEnd = () => {
      const threshold = el.clientWidth * 0.18;
      if (dx > threshold) setActiveImg((p) => Math.max(p - 1, 0));
      else if (dx < -threshold) setActiveImg((p) => Math.min(p + 1, gallery.length - 1));
      dx = 0;
      dir = null;
      setDragDelta(null);
    };
    el.addEventListener('touchstart', onStart, {passive: true});
    el.addEventListener('touchmove', onMove, {passive: false});
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [mounted, gallery.length, activeImg]);

  // Lightbox: same live-drag track as the main gallery (consistency), attached
  // only while the zoom view is mounted. Non-passive touchmove → preventDefault.
  useEffect(() => {
    const el = lbTrackRef.current;
    if (!zoomed || !el || gallery.length < 2) return;
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let dy = 0;
    let dir: 'h' | 'v' | null = null;
    const onStart = (e: TouchEvent) => {
      const tch = e.touches[0];
      if (!tch) return;
      startX = tch.clientX;
      startY = tch.clientY;
      dx = 0;
      dy = 0;
      dir = null;
    };
    const onMove = (e: TouchEvent) => {
      const tch = e.touches[0];
      if (!tch) return;
      const cdx = tch.clientX - startX;
      const cdy = tch.clientY - startY;
      if (!dir && (Math.abs(cdx) > 8 || Math.abs(cdy) > 8)) {
        dir = Math.abs(cdx) > Math.abs(cdy) ? 'h' : 'v';
      }
      if (dir === 'h') {
        e.preventDefault();
        dx = cdx;
        const atStart = activeImg === 0 && dx > 0;
        const atEnd = activeImg === gallery.length - 1 && dx < 0;
        setLbDragDelta(atStart || atEnd ? dx * 0.35 : dx);
      } else if (dir === 'v') {
        // Pull-to-dismiss — follow the finger up or down, close past a threshold.
        e.preventDefault();
        dy = cdy;
        setLbDismissing(true);
        setLbDismissY(dy);
      }
    };
    const onEnd = () => {
      if (dir === 'v') {
        if (Math.abs(dy) > 110) setZoomed(false);
        setLbDismissing(false);
        setLbDismissY(0);
      } else {
        const threshold = el.clientWidth * 0.18;
        if (dx > threshold) setActiveImg((p) => Math.max(p - 1, 0));
        else if (dx < -threshold) setActiveImg((p) => Math.min(p + 1, gallery.length - 1));
        setLbDragDelta(null);
      }
      dx = 0;
      dy = 0;
      dir = null;
    };
    el.addEventListener('touchstart', onStart, {passive: true});
    el.addEventListener('touchmove', onMove, {passive: false});
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [zoomed, gallery.length, activeImg]);

  // Lightbox: lock scroll, ESC to close, move focus into the dialog. Focus
  // returns to the zoom trigger on close via useFocusTrap (it was the active
  // element when opened). The overlay itself has no entrance animation, so it
  // is reduced-motion-safe by construction.
  useEffect(() => {
    if (!zoomed) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomed(false);
    };
    document.addEventListener('keydown', onKey);
    const raf = window.requestAnimationFrame(() => lightboxRef.current?.focus());
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      window.cancelAnimationFrame(raf);
    };
  }, [zoomed]);
  // ?p selects the catalog product; fall back to the default demo dress.
  const name = product ? (ru ? product.ru : product.en) : t('nameFallback');
  const priceStr = product ? `${product.price.toLocaleString('ru-RU')} ₽` : '24 500 ₽';
  const desc = product
    ? (ru ? product.descRu : product.descEn)
    : t('descFallback');
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
            ← {t('back')}
          </a>
        }
        right={<WhiteHeaderActions locale={locale} favCount={favCount} count={count} />}
      />

      <main id="wv-main" tabIndex={-1} style={{outline: 'none'}}>
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10">
        {/* Breadcrumb */}
        <nav className="py-5 text-[11px] uppercase tracking-[0.18em]" style={{color: MUTED}} aria-label={t('breadcrumb')}>
          <a href={`/${locale}/white`} className="transition-opacity hover:opacity-60">REINASLEO</a>
          <span className="mx-2">/</span>
          <a href={`/${locale}/white/shop`} className="transition-opacity hover:opacity-60">{t('shop')}</a>
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
                  aria-label={t('viewImage', {n: i + 1})}
                  aria-pressed={i === activeImg}
                  className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden transition-opacity"
                  style={{
                    outline: i === activeImg ? `1px solid ${INK}` : 'none',
                    opacity: i === activeImg ? 1 : 0.55,
                  }}
                >
                  <Image src={gallery[i] ?? gallery[0]!} alt="" fill sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
            <div ref={galleryRef} className="relative order-1 aspect-[2/3] w-full touch-pan-y overflow-hidden sm:order-2">
              {/* Track — all frames in a row; follows the finger during a drag
                  (dragDelta), then snaps. The snap eases unless reduced-motion. */}
              <div
                className={`absolute inset-0 flex h-full w-full ${
                  dragDelta === null ? 'transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none' : ''
                }`}
                style={{transform: `translate3d(calc(${-activeImg * 100}% + ${dragDelta ?? 0}px), 0, 0)`, willChange: 'transform'}}
              >
                {gallery.map((src, i) => {
                  const neighbour = Math.abs(i - activeImg) <= 1;
                  return (
                    <div key={i} className="relative h-full w-full flex-shrink-0">
                      <Image
                        src={src ?? gallery[0]!}
                        alt={i === activeImg ? name : ''}
                        fill
                        draggable={false}
                        {...(i === 0 ? {priority: true} : {loading: neighbour ? ('eager' as const) : ('lazy' as const)})}
                        sizes="(max-width: 1024px) 100vw, 560px"
                        className="object-cover"
                      />
                    </div>
                  );
                })}
              </div>
              {/* Tap-to-zoom — always-visible square trigger (no hover gate), opens
                  a full-screen view of the active photo. */}
              <button
                type="button"
                onClick={() => setZoomed(true)}
                aria-label={t('zoomImage')}
                className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center bg-white/85 backdrop-blur-sm transition-opacity hover:opacity-70"
                style={{border: `1px solid ${HAIR}`, color: INK}}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" aria-hidden="true">
                  <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                </svg>
              </button>
              {/* Editorial gallery index — immediate position for the mobile
                  swipe (thumbnails sit below on phones; desktop has the column).
                  Decorative: the thumbnails carry the accessible position. */}
              <span
                aria-hidden="true"
                className="absolute bottom-3 left-3 z-10 bg-white/85 px-2.5 py-1 font-display text-[13px] leading-none tabular-nums backdrop-blur-sm sm:hidden"
                style={{border: `1px solid ${HAIR}`, color: INK}}
              >
                {String(activeImg + 1).padStart(2, '0')}
                <span style={{color: MUTED}}>{' / '}</span>
                {String(gallery.length).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="wv-rise wv-delay-1 lg:pt-6">
            <p className="text-[11px] uppercase tracking-[0.3em]" style={{color: MUTED}}>{t('season')}</p>
            <h1 className="mt-4 font-display text-[34px] font-light leading-tight sm:text-[42px]">{name}</h1>
            <p className="mt-3 text-[18px]" style={{color: INK}}>{priceStr}</p>
            <p className="mt-6 max-w-md text-[14px] leading-relaxed" style={{color: MUTED}}>{desc}</p>

            {/* Color */}
            <div className="mt-8">
              <p className="mb-3 text-[11px] uppercase tracking-[0.2em]" style={{color: MUTED}}>
                {t('colour')} — <span style={{color: INK}}>{(ru ? selectedColor.ru : selectedColor.en)}</span>
              </p>
              {/* 44px tap targets (project a11y rule); the 32px inner dot keeps
                  the visual unchanged — gap-0 since 44-32=12px padding reproduces
                  the previous gap-3 spacing between dots. */}
              <div className="flex">
                {productColors.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setColor(c.key)}
                    aria-label={(ru ? c.ru : c.en)}
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
            <div id="wv-pdp-size" className="mt-8 scroll-mt-24">
              <div className="mb-3 flex items-baseline justify-between">
                <p className="text-[11px] uppercase tracking-[0.2em]" style={{color: MUTED}}>{t('size')}</p>
                <button
                  type="button"
                  onClick={() => setGuideOpen((o) => !o)}
                  aria-expanded={guideOpen}
                  aria-controls="wv-size-guide"
                  className="-my-2 py-2 text-[11px] uppercase tracking-[0.16em] underline-offset-4 hover:underline"
                  style={{color: MUTED}}
                >
                  {t('sizeGuide')}
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
                  <caption className="sr-only">{t('sizeGuideCaption')}</caption>
                  <thead>
                    <tr style={{color: MUTED}}>
                      <th scope="col" className="border-b py-2 text-left font-normal uppercase tracking-[0.14em]" style={{borderColor: HAIR}}>{t('size')}</th>
                      <th scope="col" className="border-b py-2 text-right font-normal uppercase tracking-[0.14em]" style={{borderColor: HAIR}}>{t('bust')}</th>
                      <th scope="col" className="border-b py-2 text-right font-normal uppercase tracking-[0.14em]" style={{borderColor: HAIR}}>{t('waist')}</th>
                      <th scope="col" className="border-b py-2 text-right font-normal uppercase tracking-[0.14em]" style={{borderColor: HAIR}}>{t('hips')}</th>
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
                <p className="mt-2 text-[11px]" style={{color: MUTED}}>{t('measurementsCm')}</p>
              </div>
            </div>

            {/* Add to bag */}
            <div className="mt-9 flex gap-3">
              <button ref={inlineAddRef} type="button" disabled={!size} onClick={handleAdd} aria-live="polite" className="wv-btn flex-1 px-8 py-4 text-[12px] uppercase tracking-[0.2em]">
                {justAdded ? t('added') : size ? t('addToBag') : t('selectSize')}
              </button>
              <button
                type="button"
                onClick={() => toggleFavourite(bagProduct.key)}
                aria-pressed={favourited}
                aria-label={favourited ? t('removeFav') : t('addFav')}
                className="flex h-[52px] w-[52px] items-center justify-center transition-colors hover:bg-[#f5f2ed]"
                style={{border: `1px solid ${favourited ? SIGNAL : HAIR}`}}
              >
                <WhiteFavHeart filled={favourited} size={18} />
              </button>
            </div>

            {/* Details */}
            <dl className="mt-10 divide-y" style={{borderColor: HAIR}}>
              {[
                [t('composition'), product ? (ru ? product.compositionRu : product.compositionEn) : t('compositionFallback')],
                [t('care'), product ? (ru ? product.careRu : product.careEn) : t('careFallback')],
                [t('delivery'), t('deliveryValue')],
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
              {t('relatedHeading')}
            </h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-4">
              {related.map((p) => (
                <WhiteProductCard key={p.key} locale={locale} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
      </main>

      {/* Image lightbox — full-screen view of the active photo, White DNA
          (white field, square close, generous air). No entrance animation →
          reduced-motion-safe. Backdrop tap / ESC / × close; focus-trapped. */}
      {zoomed && (
        <div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label={t('zoomImage')}
          tabIndex={-1}
          onClick={() => setZoomed(false)}
          className="fixed inset-0 z-[1100] flex items-center justify-center overscroll-contain outline-none"
          style={{backgroundColor: `rgba(255,255,255,${(1 - Math.min(Math.abs(lbDismissY) / 350, 0.55)).toFixed(3)})`}}
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label={t('close')}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center transition-opacity hover:opacity-60"
            style={{color: INK}}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" aria-hidden="true">
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
          {/* Live-drag track — horizontal swipe navigates; a vertical pull moves
              this whole block (translateY) and the backdrop fades → dismiss. */}
          <div
            ref={lbTrackRef}
            className={`relative h-[88%] w-[92%] overflow-hidden ${
              lbDismissing ? '' : 'transition-transform duration-300 ease-out motion-reduce:transition-none'
            }`}
            style={{transform: `translateY(${lbDismissY}px)`}}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`absolute inset-0 flex h-full w-full ${
                lbDragDelta === null ? 'transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none' : ''
              }`}
              style={{transform: `translate3d(calc(${-activeImg * 100}% + ${lbDragDelta ?? 0}px), 0, 0)`, willChange: 'transform'}}
            >
              {gallery.map((src, i) => (
                <div key={i} className="relative h-full w-full flex-shrink-0">
                  <Image src={src ?? gallery[0]!} alt={i === activeImg ? name : ''} fill sizes="100vw" className="object-contain" />
                </div>
              ))}
            </div>
          </div>
          {gallery.length > 1 && (
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[12px] tabular-nums tracking-[0.2em]" style={{color: MUTED}} aria-hidden="true">
              {activeImg + 1} / {gallery.length}
            </p>
          )}
        </div>
      )}

      <WhiteFooter locale={locale} />

      {/* Mobile sticky add-to-bag — slides up once the inline CTA scrolls away,
          keeping the action within thumb reach on a long PDP. */}
      <div
        aria-hidden={!showSticky}
        className={`fixed inset-x-0 bottom-0 z-[60] border-t bg-white/95 px-6 pt-3 backdrop-blur-sm transition-transform duration-300 ease-out lg:hidden motion-reduce:transition-none ${
          showSticky ? 'translate-y-0' : 'pointer-events-none translate-y-full'
        }`}
        style={{borderColor: HAIR, paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))'}}
      >
        <div className="flex items-center gap-4">
          <span className="shrink-0 text-[15px]" style={{color: INK}}>{stickyPrice}</span>
          <button
            type="button"
            onClick={handleStickyAdd}
            tabIndex={showSticky ? 0 : -1}
            className="wv-btn flex-1 py-3.5 text-[12px] uppercase tracking-[0.2em]"
          >
            {justAdded ? t('added') : size ? t('addToBag') : t('selectSize')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
