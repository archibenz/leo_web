'use client';

import {motion, useMotionTemplate} from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {useMemo, useState} from 'react';
import {useTranslations} from 'next-intl';
import {useStackedScroll} from '../hooks/useStackedScroll';
import {API_BASE} from '../lib/api';

export interface StackedSheetItem {
  id: string;
  title: string;
  subtitle: string | null;
  occasion: string | null;
  price: number;
  image: string | null;
  images: string | null;
  isTest: boolean;
}

interface DesktopStackedSheetProps {
  item: StackedSheetItem;
  index: number;
  total: number;
  locale: string;
  isFirst: boolean;
}

const GRADIENTS: Record<string, string> = {
  evening: 'from-[#3b1a2e] to-[#6b3a5e]',
  office: 'from-[#2e2e2e] to-[#5a5a5a]',
  casual: 'from-[#7a6a5a] to-[#b8a898]',
  resort: 'from-[#8a7a5a] to-[#d4c9a8]',
  ceremony: 'from-[#1a1a2e] to-[#4a3a5e]',
};

function resolveAssetUrl(src: string): string {
  if (!src.startsWith('/')) return src;
  if (src.startsWith('/uploads/') || src.startsWith('/api/')) return `${API_BASE}${src}`;
  return src;
}

function pickFirstImage(item: StackedSheetItem): string | null {
  if (item.images) {
    try {
      const parsed: unknown = JSON.parse(item.images);
      if (Array.isArray(parsed) && parsed[0] && typeof parsed[0] === 'object') {
        const first = parsed[0] as {src?: unknown};
        if (typeof first.src === 'string') return resolveAssetUrl(first.src);
      }
    } catch { /* ignore */ }
  }
  return item.image ? resolveAssetUrl(item.image) : null;
}

export default function DesktopStackedSheet({
  item,
  index,
  total,
  locale,
  isFirst,
}: DesktopStackedSheetProps) {
  const t = useTranslations('shop');
  const tLook = useTranslations('look');
  const [imgError, setImgError] = useState(false);
  const img = useMemo(() => pickFirstImage(item), [item]);

  const stack = useStackedScroll<HTMLElement>({
    disabled: isFirst,
    shadow: !isFirst,
    edgeHighlight: !isFirst,
  });

  const boxShadow = useMotionTemplate`0 -28px 56px rgba(0, 0, 0, ${stack.shadowAlpha})`;
  const fallbackGradient =
    GRADIENTS[item.occasion ?? ''] ?? 'from-[#3a2018] to-[#8a5a3a]';

  return (
    <section
      ref={stack.ref}
      className="relative w-full"
      style={{height: '120vh'}}
    >
      <motion.div
        className="sticky mx-auto w-full max-w-[1400px] overflow-hidden rounded-[6px] bg-[#1a0f0a]"
        style={{
          top: '12vh',
          height: 'min(80vh, 760px)',
          zIndex: 10 + index,
          contain: 'paint',
          willChange: 'clip-path',
          clipPath: stack.clipPath,
          boxShadow,
        }}
      >
        <Link
          href={`/${locale}/product/${item.id}`}
          className="group relative block h-full w-full"
          aria-label={item.title}
        >
          <div className="absolute inset-0">
            {img && !imgError ? (
              <Image
                src={img}
                alt={item.title}
                fill
                sizes="(min-width: 1400px) 1400px, 100vw"
                priority={index < 2}
                onError={() => setImgError(true)}
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              />
            ) : (
              <div className={`h-full w-full bg-gradient-to-br ${fallbackGradient}`} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(13,7,5,0.85)] via-[rgba(13,7,5,0.25)] to-transparent" />
          </div>

          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 px-10 pb-10 lg:px-16 lg:pb-14">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-accent text-[11px] uppercase tracking-[0.25em] text-[#D4A574]">
              <span>
                {tLook('lookNumber')} {String(index + 1).padStart(2, '0')}
              </span>
              <span className="opacity-40">·</span>
              <span>
                {item.occasion ? t(`occasions.${item.occasion}`) : tLook('author')}
              </span>
              <span className="opacity-40">/</span>
              <span className="opacity-65">
                {String(index + 1)}/{total}
              </span>
            </div>
            <h2 className="font-display text-[40px] font-light leading-[1.05] tracking-tight text-[#F2E6D8] sm:text-[52px] lg:text-[64px]">
              {item.title}
            </h2>
            <div className="flex items-end justify-between gap-4">
              <span className="font-accent text-[18px] italic text-[#F2E6D8]/85">
                €{item.price.toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#F2E6D8]/70 transition-colors duration-200 group-hover:text-[#D4A574]">
                {tLook('openLook')}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform duration-300 group-hover:translate-x-1"
                >
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </div>

          {item.isTest && (
            <span className="absolute left-8 top-8 rounded-full bg-[#D4A574]/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#1a0f0a]">
              Demo
            </span>
          )}
        </Link>

        {!isFirst && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              background:
                'linear-gradient(to bottom, rgba(255,255,255,0.7) 0%, transparent 100%)',
              opacity: stack.edgeOpacity,
            }}
          />
        )}
      </motion.div>
    </section>
  );
}
