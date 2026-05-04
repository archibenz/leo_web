'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useMemo, useState} from 'react';
import SlideOverlay from './SlideOverlay';
import type {MobileShopItem} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

const GRADIENTS: Record<string, string> = {
  evening:  'from-[#3b1a2e] to-[#6b3a5e]',
  office:   'from-[#2e2e2e] to-[#5a5a5a]',
  casual:   'from-[#7a6a5a] to-[#b8a898]',
  resort:   'from-[#8a7a5a] to-[#d4c9a8]',
  ceremony: 'from-[#1a1a2e] to-[#4a3a5e]',
};

function resolveAssetUrl(src: string): string {
  if (!src.startsWith('/')) return src;
  if (src.startsWith('/uploads/') || src.startsWith('/api/')) return `${API_BASE}${src}`;
  return src;
}

function pickPrimaryImage(item: MobileShopItem): string | null {
  if (item.images) {
    try {
      const parsed: unknown = JSON.parse(item.images);
      if (Array.isArray(parsed)) {
        for (const img of parsed) {
          if (img && typeof img === 'object' && 'src' in img && typeof (img as {src: unknown}).src === 'string') {
            return resolveAssetUrl((img as {src: string}).src);
          }
        }
      }
    } catch { /* fall through */ }
  }
  if (item.image) return resolveAssetUrl(item.image);
  return null;
}

interface SlideLayerProps {
  product: MobileShopItem;
  index: number;
  total: number;
  locale: string;
}

export default function SlideLayer({product, index, total, locale}: SlideLayerProps) {
  const primaryImage = useMemo(() => pickPrimaryImage(product), [product]);
  const [imgError, setImgError] = useState(false);

  // Sticky stacking: each slide pins at top:108px (leaving a paper band for the filter row),
  // height fills the rest of the viewport. Higher z-index = later slide covers earlier from below.
  return (
    <div
      className="sticky top-[108px] h-[calc(100dvh-108px)] w-full overflow-hidden bg-paper"
      style={{zIndex: 1 + index}}
    >
      <Link
        href={`/${locale}/product/${product.id}`}
        prefetch={false}
        aria-label={product.title}
        className="absolute inset-0 block"
      >
        <div
          className={`absolute inset-0 bg-gradient-to-br ${
            GRADIENTS[product.occasion ?? ''] ?? 'from-[#3a2018] to-[#8a5a3a]'
          }`}
        />
        {primaryImage && !imgError ? (
          <Image
            src={primaryImage}
            alt={product.title}
            fill
            sizes="100vw"
            priority={index < 2}
            loading={index < 2 ? undefined : 'lazy'}
            onError={() => setImgError(true)}
            className="object-cover"
            style={{objectPosition: 'center 30%'}}
          />
        ) : null}
      </Link>
      <SlideOverlay
        product={product}
        index={index}
        total={total}
        locale={locale}
        primaryImage={primaryImage ?? undefined}
      />
    </div>
  );
}
