'use client';

import Image from 'next/image';
import {useState, useEffect, useRef} from 'react';
import {useTranslations} from 'next-intl';
import {useFocusTrap} from '../../../lib/useFocusTrap';
import {useWhiteBag} from '../../../hooks/useWhiteBag';
import {useWhiteFavourites} from '../../../hooks/useWhiteFavourites';
import WhiteHeader from '../WhiteHeader';
import WhiteHeaderActions from '../WhiteHeaderActions';
import WhiteFooter from '../WhiteFooter';
import WhiteProductCard from '../WhiteProductCard';
import WildberriesButton from '../../../components/WildberriesButton';
import WhitePreorder from './WhitePreorder';
import {ozonProductUrl} from '../../../lib/ozon';
import {INK, MUTED, HAIR, SIGNAL} from '../wv-palette';
import {WhiteFavHeart, WhiteArrow} from '../wv-icons';
import {WHITE_PRODUCTS, WHITE_SETS, WHITE_SIZES, whiteInStock, whiteAvailability, type WhiteProduct} from '../products';
import {WHITE_LQIP} from '../products-lqip';

// Variant 2 "White" — product detail (PDP) showcase. Same portal technique as
// the landing: a full-bleed white surface over the gradient chrome, reviewed at
// /<locale>/product?p=<key>. The route 404s on an unknown key, so the
// product here is always a real catalogue entry. CSS-only, reduced-motion safe.

const SIZES = WHITE_SIZES;
// Gallery is built per-product below: the product's own photo, plus any extra
// views it carries — never other products' shots.
// Demo measurements (cm) for the size-guide disclosure.
const SIZE_GUIDE = [
  {size: 'XS', bust: 82, waist: 62, hips: 88},
  {size: 'S', bust: 86, waist: 66, hips: 92},
  {size: 'M', bust: 90, waist: 70, hips: 96},
  {size: 'L', bust: 96, waist: 76, hips: 102},
  {size: 'XL', bust: 102, waist: 82, hips: 108},
];

export default function WhitePdpShowcase({
  locale,
  product,
  // Live from the marketplace snapshot. Defaults to true so a render without it
  // (a test, a story) behaves as it did before stock was wired up.
  onWildberries = true,
}: {locale: string; product: WhiteProduct; onWildberries?: boolean}) {
  const productColors = product.colors;
  const [activeImg, setActiveImg] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState(productColors[0]!.key);
  const activeColor = productColors.find((c) => c.key === color) ?? productColors[0]!;
  const galleryRef = useRef<HTMLDivElement>(null);

  // A link may name the colour it means — `?c=brown` — so arriving from a set
  // opens the garment in the colour that look is wearing rather than in the
  // default. Read after mount rather than with useSearchParams: the hook would
  // opt this page out of static rendering, and reading it during the first
  // render would make that render disagree with the server's.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('c');
    if (wanted && productColors.some((c) => c.key === wanted)) setColor(wanted);
  }, [productColors]);

  // Picking a colour swaps the whole album, and a colour with fewer frames
  // shrinks the gallery above the scroll position — which yanks the page. When
  // the reader has scrolled past the gallery to reach the swatches, bring them
  // back to the top of the album so they see the piece in the new colour at
  // once instead of hunting for what changed. If they're already looking at the
  // gallery, leave the scroll where it is.
  const pickColour = (key: string) => {
    setColor(key);
    setActiveImg(0);
    const el = galleryRef.current;
    if (!el) return;
    if (el.getBoundingClientRect().top < 0) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.requestAnimationFrame(() =>
        el.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'start'})
      );
    }
  };
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
  const bagProduct = product;
  const inStock = whiteInStock(product);
  // The product's own photo, plus any extra views it carries. No cross-product
  // editorial filler — a gallery slot on a PDP must be this garment.
  // A colourway with its own photography swaps the whole album; otherwise the
  // base garment shots stand in — no colour is ever left with a blank frame.
  const gallery = activeColor.image
    ? [activeColor.image, ...(activeColor.gallery ?? [])]
    : bagProduct.gallery?.length
      ? [bagProduct.image, ...bagProduct.gallery]
      : [bagProduct.image];
  const favourited = isFavourite(bagProduct.key);
  const handleAdd = () => {
    if (!size) return;
    // Charge the effective (sale) price the PDP shows — not the struck regular.
    add({key: bagProduct.key, en: bagProduct.en, ru: bagProduct.ru, price: bagProduct.sale ?? bagProduct.price, size, colorEn: selectedColor.en, colorRu: selectedColor.ru});
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1600);
  };

  // Mobile sticky add-to-bag: reveal it once the inline CTA scrolls out of view.
  const inlineAddRef = useRef<HTMLButtonElement>(null);
  const pageEndRef = useRef<HTMLDivElement>(null);
  const [pastInline, setPastInline] = useState(false);
  const [nearEnd, setNearEnd] = useState(false);
  useEffect(() => {
    const el = inlineAddRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setPastInline(!entry.isIntersecting), {rootMargin: '0px 0px -48px 0px'});
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // Slide the bar away at the page end so it never sits over the footer's
  // links (the locale switch lives there).
  useEffect(() => {
    const el = pageEndRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setNearEnd(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const showSticky = pastInline && !nearEnd;
  const handleStickyAdd = () => {
    if (!size) {
      const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.getElementById('wv-pdp-size')?.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'center'});
      return;
    }
    handleAdd();
  };
  const wbUrl = `https://www.wildberries.ru/catalog/${bagProduct.nm}/detail.aspx`;
  const ozonUrl = ozonProductUrl(bagProduct);
  const availability = whiteAvailability(bagProduct, {onOzon: Boolean(ozonUrl), onWb: onWildberries});
  const stickyPrice = `${(bagProduct.sale ?? bagProduct.price).toLocaleString('ru-RU')} ₽`;


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
    const prevRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomed(false);
      else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveImg((p) => Math.max(p - 1, 0));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveImg((p) => Math.min(p + 1, gallery.length - 1));
      }
    };
    document.addEventListener('keydown', onKey);
    const raf = window.requestAnimationFrame(() => lightboxRef.current?.focus());
    return () => {
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overflow = prevRootOverflow;
      document.removeEventListener('keydown', onKey);
      window.cancelAnimationFrame(raf);
    };
  }, [zoomed, gallery.length]);
  const name = ru ? product.ru : product.en;
  const priceStr = `${product.price.toLocaleString('ru-RU')} ₽`;
  const desc = ru ? product.descRu : product.descEn;
  const story = ru ? product.storyRu : product.storyEn;
  // Every album frame gets a real alt naming the garment and its colourway.
  // Only the opening shot used to be described and the rest shipped alt="" —
  // which hid ~280 photographs from image search and told a screen reader
  // nothing about what it was skipping.
  const frameAlt = (i: number) => {
    const colour = ru ? selectedColor.ru : selectedColor.en;
    const subject = `${name} — ${colour}`;
    if (i === 0) return subject;
    return ru ? `${subject}, вид ${i + 1}` : `${subject}, view ${i + 1}`;
  };
  // "You may also like" — same category first, then fill from the rest, current excluded.
  const pool = WHITE_PRODUCTS.filter((p) => p.key !== product.key);
  const sameCat = pool.filter((p) => p.cat === product.cat);
  const related = [...sameCat, ...pool.filter((p) => !sameCat.includes(p))].slice(0, 4);
  // The set this piece belongs to — its other items become "complete the look".
  const look = WHITE_SETS.find((st) => st.productKeys.includes(product.key));
  const lookItems = look
    ? look.productKeys.filter((k) => k !== product.key).map((k) => WHITE_PRODUCTS.find((pr) => pr.key === k)).filter((pr): pr is NonNullable<typeof pr> => pr != null)
    : [];

  return (
    <>

      <main id="wv-main" tabIndex={-1} style={{outline: 'none'}}>
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10">
        {/* Breadcrumb. The shop step carries a hairline arrow pointing back the
            way the reader came — arriving here from the grid, the way out should
            be the most obvious thing on the page, and a word alone was not it. */}
        {/* The links are 11px type, which on a phone measured 16px tall — well
            under a fingertip. The hit area is grown by an absolutely positioned
            pseudo-element rather than by making the link itself 44px tall: a
            tall inline-flex box takes its baseline from its centred contents,
            so the shop step floated above the words either side of it on the
            same line. The box stays exactly text-height; only the touch target
            is larger. */}
        <nav className="py-2 text-[11px] uppercase tracking-[0.18em] sm:py-5" style={{color: MUTED}} aria-label={t('breadcrumb')}>
          <a href={`/${locale}`} className="wv-tap relative transition-opacity hover:opacity-60">REINASLEO</a>
          <span className="mx-2">/</span>
          <a href={`/${locale}/shop`} className="wv-arrow-link wv-tap relative whitespace-nowrap transition-opacity hover:opacity-60">
            <WhiteArrow back />
            <span className="ml-2">{t('shop')}</span>
          </a>
          <span className="mx-2">/</span>
          <span style={{color: INK}} aria-current="page">{name}</span>
        </nav>

        <div className="grid gap-10 pb-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          {/* Gallery */}
          {/* Photo album — the shots stack and read top to bottom; each opens
              the zoom at its own frame. */}
          {/* On phones the album runs edge-to-edge: it breaks out of the page's
              px-6 gutter (-mx-6) and the frames butt together seamlessly
              (gap-0). The gutter and the small gap return at sm, where the
              gallery sits inside the two-column layout. */}
          <div ref={galleryRef} className="wv-rise -mx-6 flex scroll-mt-20 flex-col gap-0 sm:mx-0 sm:gap-2">
            {gallery.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setActiveImg(i);
                  setZoomed(true);
                }}
                aria-label={`${t('zoomImage')} ${i + 1}`}
                className="wv-zoom relative block aspect-[2/3] w-full overflow-hidden"
              >
                <Image
                  src={src}
                  alt={frameAlt(i)}
                  fill
                  {...(i === 0 ? {priority: true} : {loading: 'lazy' as const})}
                  placeholder={WHITE_LQIP[src] ? 'blur' : 'empty'}
                  blurDataURL={WHITE_LQIP[src]}
                  quality={90}
                  sizes="(max-width: 1024px) 100vw, 560px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>

          {/* Info */}
          <div className="wv-rise wv-delay-1 lg:sticky lg:top-24 lg:self-start lg:pt-6">
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
                    onClick={() => pickColour(c.key)}
                    aria-label={(ru ? c.ru : c.en)}
                    aria-pressed={color === c.key}
                    className="group flex h-11 w-11 items-center justify-center"
                  >
                    <span
                      aria-hidden="true"
                      className="h-8 w-8 rounded-full transition-transform motion-safe:group-hover:scale-105"
                      style={{background: c.hex, outline: color === c.key ? `1.5px solid ${INK}` : `1px solid ${HAIR}`, outlineOffset: '3px'}}
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
                  className="wv-link -my-3.5 py-3.5 text-[11px] uppercase tracking-[0.16em]"
                  style={{color: MUTED}}
                >
                  <span className="wv-link-ink">{t('sizeGuide')}</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    disabled={!inStock}
                    aria-pressed={size === s}
                    className="wv-tap h-11 min-w-11 rounded-full px-4 text-[13px] tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                    style={{
                      border: `1px solid ${size === s ? INK : HAIR}`,
                      background: size === s ? INK : 'transparent',
                      color: size === s ? '#fff' : MUTED,
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

            {/* Add to bag — or, where there is no bag to add to, whichever route
                is honest: the marketplaces if they still hold it, a pre-order if
                nobody does. */}
            <div className="mt-9 flex gap-3">
              {availability === 'none' ? (
                <div className="flex-1">
                  <p className="mb-3 text-[12px] uppercase tracking-[0.2em]" style={{color: MUTED}}>{t('outOfStock')}</p>
                  <WhitePreorder product={name} size={size} />
                </div>
              ) : (
                <button ref={inlineAddRef} type="button" disabled={!inStock || !size} onClick={handleAdd} aria-live="polite" className="wv-btn flex-1 px-8 py-3 text-[11px] uppercase tracking-[0.2em] sm:py-4 sm:text-[12px]">
                  {!inStock ? (ozonUrl ? t('onlyOnMarketplaces') : t('onlyOnWb')) : justAdded ? t('added') : size ? t('addToBag') : t('selectSize')}
                </button>
              )}
              <button
                type="button"
                onClick={() => toggleFavourite(bagProduct.key)}
                aria-pressed={favourited}
                aria-label={favourited ? t('removeFav') : t('addFav')}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[#f5f2ed] sm:h-[52px] sm:w-[52px]"
                style={{border: `1px solid ${favourited ? SIGNAL : HAIR}`}}
              >
                <WhiteFavHeart filled={favourited} size={18} />
              </button>
            </div>

            {/* The same piece on Wildberries — the brand's primary sales channel.
                The gradient's wave-fill button, recoloured for the white ground:
                violet outline at rest, the WB-violet ripple floods it on hover
                and the label flips to white.

                Hidden once the marketplace snapshot says the article has no
                stock. A button that opens a sold-out card is worse than no
                button: it costs a tap to learn what the page could have said. */}
            {availability !== 'none' && onWildberries && (
            <div className="mt-4 sm:mt-5">
              <WildberriesButton
                href={wbUrl}
                className="relative flex h-11 w-full items-center justify-center gap-2.5 overflow-hidden rounded-full border border-[#CB11AB] bg-[#CB11AB]/[0.06] text-[11px] font-medium uppercase tracking-[0.18em] text-[#CB11AB] transition-colors duration-300 hover:text-white active:scale-[0.98] motion-reduce:active:scale-100 sm:h-14 sm:border-2 sm:text-[13px]"
              >
                {t('buyOnWb')}
              </WildberriesButton>
            </div>
            )}

            {/* Ozon carries only the pieces shipped from our own warehouse, so
                this appears on those cards alone. Deliberately quieter than the
                Wildberries button above — same capsule, Ozon blue, a plain fill
                on hover rather than the ripple. Two floods stacked would compete
                for the same attention and hide which channel is the main one. */}
            {ozonUrl && (
              <div className="mt-2.5 sm:mt-3">
                <a
                  href={ozonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-full items-center justify-center rounded-full border border-[#005BFF] bg-[#005BFF]/[0.04] text-[11px] font-medium uppercase tracking-[0.18em] text-[#005BFF] transition-colors duration-300 hover:bg-[#005BFF] hover:text-white active:scale-[0.98] motion-reduce:active:scale-100 sm:h-14 sm:border-2 sm:text-[13px]"
                >
                  {t('buyOnOzon')}
                </a>
              </div>
            )}

            {/* The long read. Search needs prose on the page, and a shopper
                deciding on a cut needs more than the two lines above — this is
                where the garment is actually described. */}
            {story && (
              <section className="mt-10 border-t pt-8" style={{borderColor: HAIR}} aria-labelledby="wv-pdp-about">
                <h2 id="wv-pdp-about" className="mb-4 text-[11px] uppercase tracking-[0.2em]" style={{color: MUTED}}>
                  {t('about')}
                </h2>
                <p className="max-w-prose text-[14px] leading-[1.75]" style={{color: INK}}>{story}</p>
              </section>
            )}

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

      {/* Complete the look — the rest of this piece's set */}
      {lookItems.length > 0 && look && (
        <section className="mx-auto w-full max-w-[1400px] border-t px-6 pb-4 pt-14 sm:px-10" style={{borderColor: HAIR}}>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-[24px] font-light tracking-tight sm:text-[30px]">{t('completeLook')}</h2>
            <a href={`/${locale}/sets`} className="wv-link wv-tap relative text-[12px] uppercase tracking-[0.18em]" style={{color: MUTED}}>
              <span className="wv-link-ink">{ru ? look.ru : look.en}</span> →
            </a>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 pb-10 sm:gap-x-6 lg:grid-cols-4">
            {lookItems.map((pr, i) => (
              <WhiteProductCard key={pr.key} locale={locale} product={pr} index={i} quickAdd />
            ))}
          </div>
        </section>
      )}

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
                  <Image src={src ?? gallery[0]!} alt={frameAlt(i)} fill sizes="100vw" className="object-contain" />
                </div>
              ))}
            </div>
          </div>
          {gallery.length > 1 && (
            <p
              className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[12px] tabular-nums tracking-[0.2em]"
              style={{color: MUTED}}
              role="status"
              aria-live="polite"
            >
              {activeImg + 1} / {gallery.length}
            </p>
          )}
        </div>
      )}

      <div ref={pageEndRef} aria-hidden="true" />

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
          {/* Mirrors the inline CTA. Left ungated it still could not fill a bag
              (the size run is disabled, so `size` never sets), but it invited
              the tap and then scrolled the reader to a row of dead buttons. */}
          <button
            type="button"
            onClick={handleStickyAdd}
            disabled={!inStock}
            tabIndex={showSticky ? 0 : -1}
            className="wv-btn flex-1 py-3.5 text-[12px] uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {availability === 'none'
              ? t('outOfStock')
              : !inStock
                ? (ozonUrl ? t('onlyOnMarketplaces') : t('onlyOnWb'))
                : justAdded
                  ? t('added')
                  : size
                    ? t('addToBag')
                    : t('selectSize')}
          </button>
        </div>
      </div>
    </>
  );
}