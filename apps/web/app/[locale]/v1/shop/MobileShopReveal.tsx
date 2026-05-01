'use client';

import {useEffect, useRef} from 'react';
import {useMotionValue} from 'framer-motion';
import DotsIndicator from './DotsIndicator';
import FilterBar from './FilterBar';
import InfoSection from './InfoSection';
import SlideLayer from './SlideLayer';
import type {MobileShopItem} from './types';

interface MobileShopRevealProps {
  products: MobileShopItem[];
  locale: string;
}

export default function MobileShopReveal({products, locale}: MobileShopRevealProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scrollProgress = useMotionValue(0);
  const productCount = products.length;
  const segments = productCount;

  useEffect(() => {
    const wrap = wrapperRef.current;
    if (!wrap) return;
    const update = () => {
      const rect = wrap.getBoundingClientRect();
      const vh = window.innerHeight;
      const max = rect.height - vh;
      const offset = -rect.top;
      const p = max > 0 ? Math.max(0, Math.min(1, offset / max)) : 0;
      scrollProgress.set(p);
    };
    update();
    window.addEventListener('scroll', update, {passive: true});
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [scrollProgress]);

  if (!products.length) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-paper px-6 text-center text-[var(--ink-soft)]">
        {locale === 'ru' ? 'Каталог временно пуст.' : 'The catalog is empty right now.'}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative bg-paper">
      <FilterBar locale={locale} />

      {products.map((product, i) => (
        <SlideLayer
          key={product.id}
          product={product}
          index={i}
          total={productCount}
          locale={locale}
        />
      ))}

      <InfoSection
        total={productCount}
        locale={locale}
        zIndex={1 + productCount}
      />

      <DotsIndicator
        total={productCount}
        segments={segments}
        scrollProgress={scrollProgress}
      />
    </div>
  );
}
