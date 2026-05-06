'use client';

import {motion, useMotionTemplate} from 'framer-motion';
import {useMemo} from 'react';
import PhotoCarousel from './PhotoCarousel';
import SlideOverlay from './SlideOverlay';
import {useStackedScroll} from '../../../../hooks/useStackedScroll';
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

function pickImages(item: MobileShopItem): string[] {
  const all: string[] = [];
  if (item.images) {
    try {
      const parsed: unknown = JSON.parse(item.images);
      if (Array.isArray(parsed)) {
        for (const img of parsed) {
          if (
            img &&
            typeof img === 'object' &&
            'src' in img &&
            typeof (img as {src: unknown}).src === 'string'
          ) {
            all.push(resolveAssetUrl((img as {src: string}).src));
          }
        }
      }
    } catch { /* fall through */ }
  }
  if (all.length === 0 && item.image) all.push(resolveAssetUrl(item.image));
  return all;
}

interface SlideLayerProps {
  product: MobileShopItem;
  index: number;
  locale: string;
}

export default function SlideLayer({product, index, locale}: SlideLayerProps) {
  const images = useMemo(() => pickImages(product), [product]);
  const fallback = GRADIENTS[product.occasion ?? ''] ?? 'from-[#3a2018] to-[#8a5a3a]';
  const isFirst = index === 0;

  const stack = useStackedScroll<HTMLElement>({
    disabled: isFirst,
    shadow: !isFirst,
  });

  const boxShadow = useMotionTemplate`0 -22px 44px rgba(0, 0, 0, ${stack.shadowAlpha})`;

  return (
    <section
      ref={stack.ref}
      className="relative w-full"
      style={{
        height: '100dvh',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        // Skip rendering off-screen slides until the user scrolls near them —
        // big win when there are 10+ slides in the catalogue.
        contentVisibility: 'auto',
        containIntrinsicSize: '100dvh',
      }}
    >
      <motion.div
        className="sticky top-0 h-[100dvh] w-full overflow-hidden bg-paper"
        style={{
          zIndex: 1 + index,
          contain: 'paint',
          willChange: 'clip-path',
          transform: 'translateZ(0)',
          clipPath: stack.clipPath,
          boxShadow,
        }}
      >
        <PhotoCarousel
          images={images}
          alt={product.title}
          fallbackGradient={fallback}
          productHref={`/${locale}/product/${product.id}`}
          priorityFirst={index < 2}
        />
        <SlideOverlay product={product} locale={locale} />
      </motion.div>
    </section>
  );
}
