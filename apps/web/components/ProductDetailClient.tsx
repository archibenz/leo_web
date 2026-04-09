'use client';

import {useState, useEffect} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname, useRouter} from 'next/navigation';
import Link from 'next/link';
import {useCart} from '../contexts/CartContext';
import {useFavorites} from '../contexts/FavoritesContext';
import ProductGallery from './ProductGallery';
import type {ProductImage} from './ProductGallery';
import Spinner from './ui/Spinner';
import SizeSelector from './SizeSelector';
import type {SizeOption} from './SizeSelector';
import SizeChart from './SizeChart';
import ProductAccordion from './ProductAccordion';
import {CareSymbolsRow} from './CareSymbols';

/* ── Types ── */

interface ApiProduct {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  price: number;
  image: string | null;
  category: string | null;
  sizes: string[] | null;
  isTest: boolean;
  occasion: string | null;
  color: string | null;
  material: string | null;
  sku: string | null;
  images: string | null;
  collectionId: string | null;
  collectionName: string | null;
  inStock: boolean;
  careInstructions: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

/* ── Stars component ── */

function Stars({rating}: {rating: number}) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={star <= Math.round(rating) ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.5"
          className={star <= Math.round(rating) ? 'text-[var(--accent)]' : 'text-[var(--ink)]/25'}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

/* ── Cart item ID helper ── */

function cartItemId(productId: string, size: string | null): string {
  return size ? `${productId}__${size}` : productId;
}

/* ── Gradient palette ── */
const GRADIENTS: Record<string, string> = {
  evening:  'from-[#3b1a2e] to-[#6b3a5e]',
  office:   'from-[#2e2e2e] to-[#5a5a5a]',
  casual:   'from-[#7a6a5a] to-[#b8a898]',
  resort:   'from-[#8a7a5a] to-[#d4c9a8]',
  ceremony: 'from-[#1a1a2e] to-[#4a3a5e]',
};

/* ── Main component ── */

interface ProductDetailClientProps {
  productId: string;
}

export default function ProductDetailClient({productId}: ProductDetailClientProps) {
  const t = useTranslations('product');
  const router = useRouter();
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';

  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<ApiProduct[]>([]);

  const {addItem: addToCart, getItemQuantity, updateQuantity, items: cartItems} = useCart();
  const {toggleItem, isFavorite} = useFavorites();

  useEffect(() => {
    fetch(`${API_BASE}/api/catalog/products/${productId}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data: ApiProduct) => {
        setProduct(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [productId]);

  useEffect(() => {
    if (!product) return;
    fetch(`${API_BASE}/api/catalog/products/${product.id}/recommendations`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setRecommendations(data))
      .catch(() => {});
  }, [product]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 pt-28 pb-16 sm:px-6 lg:px-8">
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-7xl px-4 pt-28 pb-16 sm:px-6 lg:px-8">
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
          <p className="text-lg text-[var(--ink-soft)]">{t('notFound')}</p>
          <Link href={`/${locale}/shop`} className="lux-btn-secondary">
            {t('back')}
          </Link>
        </div>
      </div>
    );
  }

  // Parse images from JSON
  let galleryImages: ProductImage[] = [];
  if (product.images) {
    try {
      const parsed = JSON.parse(product.images);
      if (Array.isArray(parsed)) {
        galleryImages = parsed.map((img: {src?: string; alt?: string}, i: number) => ({
          id: String(i + 1),
          src: img.src ? (img.src.startsWith('/') ? `${API_BASE}${img.src}` : img.src) : '',
          alt: img.alt ?? `${product.title} — ${i + 1}`,
          gradient: GRADIENTS[product.occasion ?? ''] ?? 'from-[#4a4a4a] to-[#7a7a7a]',
        }));
      }
    } catch { /* ignore */ }
  }
  if (galleryImages.length === 0) {
    galleryImages = [{
      id: '1',
      src: product.image ? (product.image.startsWith('/') ? `${API_BASE}${product.image}` : product.image) : '',
      alt: product.title,
      gradient: GRADIENTS[product.occasion ?? ''] ?? 'from-[#4a4a4a] to-[#7a7a7a]',
    }];
  }

  // Parse sizes
  const sizeOptions: SizeOption[] = (product.sizes ?? []).map(s => ({
    label: s,
    available: true,
  }));

  const isFav = isFavorite(product.id);

  const totalProductInCart = cartItems
    .filter((i) => i.id === product.id || i.id.startsWith(`${product.id}__`))
    .reduce((sum, i) => sum + i.quantity, 0);

  const currentCartId = cartItemId(product.id, selectedSize);
  const currentSizeQty = getItemQuantity(currentCartId);

  const handleAddToBag = () => {
    if (!selectedSize) {
      setSizeError(true);
      return;
    }
    setSizeError(false);
    const id = cartItemId(product.id, selectedSize);
    addToCart({
      id,
      title: product.title,
      price: product.price,
      size: selectedSize,
      isTest: product.isTest,
    });
  };

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
    setSizeError(false);
  };

  const handleToggleFav = () => {
    toggleItem({id: product.id, title: product.title, image: product.image ?? undefined});
  };

  const accordionItems = [
    {
      title: t('deliveryTitle'),
      content: <p>{t('deliveryBody')}</p>,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pt-28 pb-16 sm:px-6 lg:px-8">
      {/* ── Back button ── */}
      <button
        onClick={() => router.back()}
        className="group mb-6 flex items-center gap-2 text-sm uppercase tracking-[0.12em] text-[var(--ink-soft)] transition-colors duration-200 hover:text-[var(--ink)]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:-translate-x-1">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        {t('back')}
      </button>

      {/* ── PDP top: gallery + info ── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_420px] lg:gap-12 xl:gap-16">
        {/* Left: gallery */}
        <ProductGallery images={galleryImages} />

        {/* Right: product info */}
        <div className="flex flex-col gap-6">
          {/* Title block */}
          <div className="flex flex-col gap-2">
            {product.isTest && (
              <span
                className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]"
                aria-label="Demo product"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                </span>
                Demo
              </span>
            )}
            {product.subtitle && (
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                {product.subtitle}
              </p>
            )}
            <h1 className="text-2xl font-display text-[var(--ink)] sm:text-3xl">
              {product.title}
            </h1>
            <p className="mt-1 text-xl font-accent text-[var(--ink)]">
              &euro;{product.price.toLocaleString()}
            </p>
          </div>

          {/* Size selector */}
          {sizeOptions.length > 0 && (
            <div>
              <SizeSelector
                sizes={sizeOptions}
                selected={selectedSize}
                onSelect={handleSizeSelect}
                sizeGuideLabel={t('sizeGuide')}
                selectSizeLabel={t('selectSize')}
                unavailableLabel={t('sizeUnavailable')}
                onSizeGuideClick={() => setSizeGuideOpen(true)}
              />
              <SizeChart
                open={sizeGuideOpen}
                onClose={() => setSizeGuideOpen(false)}
                category={product.category}
              />
              {sizeError && (
                <p className="mt-2 text-sm text-red-400">{t('selectSizeFirst')}</p>
              )}
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <a
              href="https://www.wildberries.ru/seller/609562"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full border-2 border-[#CB11AB] bg-[#CB11AB]/[0.08] text-base font-medium text-white transition hover:bg-[#CB11AB]/[0.15] active:scale-[0.98]"
            >
              {locale === 'ru' ? 'Купить на Wildberries' : 'Buy on Wildberries'}
            </a>

            <button
              onClick={handleToggleFav}
              className={`flex h-14 w-full items-center justify-center gap-2.5 rounded-full border text-base font-medium transition active:scale-[0.98] ${
                isFav
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-[var(--ink)]/20 text-[var(--ink)] hover:border-[var(--ink)]/40'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {isFav ? t('favouriteAdded') : t('favourite')}
            </button>
          </div>

          {/* Description */}
          {product.description && (
            <div>
              <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
                {product.description}
              </p>
            </div>
          )}

          {/* Meta */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-[var(--ink-soft)]">
            {product.color && <span>{t('color')}: {product.color}</span>}
            {product.sku && <span>{t('sku')}: {product.sku}</span>}
            {product.material && <span>{t('material')}: {product.material}</span>}
          </div>

          {/* Collection badge */}
          {product.collectionName && (
            <div className="rounded-lg border border-[var(--ink)]/10 px-4 py-3">
              <p className="text-xs uppercase tracking-wider text-[var(--ink-soft)]">
                {locale === 'ru' ? 'Коллекция' : 'Collection'}
              </p>
              <p className="mt-0.5 text-sm font-medium text-[var(--ink)]">{product.collectionName}</p>
            </div>
          )}

          {/* Care instructions */}
          {product.careInstructions && (() => {
            try {
              const ci = JSON.parse(product.careInstructions);
              const symbols = (ci.symbols as string[]) || [];
              const text = (ci.text as string) || '';
              if (!symbols.length && !text) return null;
              return (
                <div className="rounded-lg border border-[var(--ink)]/10 px-4 py-4 space-y-3">
                  <p className="text-xs uppercase tracking-wider text-[var(--ink-soft)] font-medium">
                    {locale === 'ru' ? 'Уход за изделием' : 'Garment care'}
                  </p>
                  {symbols.length > 0 && (
                    <CareSymbolsRow symbols={symbols} locale={locale} size={26} showLabels />
                  )}
                  {text && (
                    <p className="text-sm text-[var(--ink-soft)] leading-relaxed">{text}</p>
                  )}
                </div>
              );
            } catch { return null; }
          })()}

          {/* Accordions */}
          <ProductAccordion items={accordionItems} />
        </div>
      </div>

      {/* Complete the look */}
      {recommendations.length > 0 && (
        <div className="mt-12 pt-8 border-t border-[var(--ink)]/8">
          <h2 className="font-display text-xl text-[var(--ink)] mb-6">
            {locale === 'ru' ? 'Дополните образ' : 'Complete the look'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {recommendations.map(rec => (
              <Link key={rec.id} href={`/${locale}/product/${rec.id}`} className="group block">
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-[var(--paper-muted)]">
                  {rec.image ? (
                    <img src={rec.image} alt={rec.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-[var(--ink)]/20 text-sm">No image</span>
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <p className="text-sm text-[var(--ink)] truncate">{rec.title}</p>
                  <p className="text-sm text-[var(--ink)]/50">{new Intl.NumberFormat(locale, {style: 'currency', currency: 'RUB', maximumFractionDigits: 0}).format(rec.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
