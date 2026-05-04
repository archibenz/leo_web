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

  // Mirror SmartHeader's scroll-direction logic so when the global header
  // hides on scroll down, the chrome zone shrinks (filter + slide rise)
  // and we don't leave a paper gap at the top of viewport.
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      if (y <= 20) {
        document.body.classList.remove('shop-header-hidden');
      } else if (y > lastY + 5) {
        document.body.classList.add('shop-header-hidden');
      } else if (y < lastY - 2) {
        document.body.classList.remove('shop-header-hidden');
      }
      lastY = y;
    };
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    lastY = window.scrollY;
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => {
      document.body.classList.remove('shop-header-hidden');
      window.removeEventListener('scroll', onScroll);
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
