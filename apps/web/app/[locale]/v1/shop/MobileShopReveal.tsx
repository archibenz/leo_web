'use client';

import {useEffect} from 'react';
import FilterBar from './FilterBar';
import SlideLayer from './SlideLayer';
import type {MobileShopItem} from './types';

interface MobileShopRevealProps {
  products: MobileShopItem[];
  locale: string;
}

export default function MobileShopReveal({products, locale}: MobileShopRevealProps) {
  const productCount = products.length;

  useEffect(() => {
    const apply = () => {
      if (window.innerWidth < 1024) document.body.classList.add('mobile-shop-locked');
      else document.body.classList.remove('mobile-shop-locked');
    };
    apply();
    window.addEventListener('resize', apply);
    return () => {
      document.body.classList.remove('mobile-shop-locked');
      window.removeEventListener('resize', apply);
    };
  }, []);

  if (!products.length) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-paper px-6 text-center text-[var(--ink-soft)]">
        {locale === 'ru' ? 'Каталог временно пуст.' : 'The catalog is empty right now.'}
      </div>
    );
  }

  return (
    <div className="relative bg-paper">
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
    </div>
  );
}
