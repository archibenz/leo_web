'use client';

import {useEffect, useMemo, useState} from 'react';
import FilterBar, {EMPTY_FILTERS, type FilterValues} from './FilterBar';
import SlideLayer from './SlideLayer';
import type {MobileShopItem} from './types';

interface MobileShopRevealProps {
  products: MobileShopItem[];
  locale: string;
}

export default function MobileShopReveal({products, locale}: MobileShopRevealProps) {
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (filters.category.length && !filters.category.includes(p.category ?? '')) return false;
      if (filters.color.length && !filters.color.includes(p.color ?? '')) return false;
      if (filters.size.length && !p.sizes?.some((s) => filters.size.includes(s))) return false;
      if (filters.material.length && !filters.material.includes(p.material ?? '')) return false;
      if (filters.badge.length && !filters.badge.includes(p.badge ?? '')) return false;
      return true;
    });
  }, [products, filters]);

  const productCount = filtered.length;

  useEffect(() => {
    const apply = () => {
      const small = window.innerWidth < 1024;
      const html = document.documentElement;
      const body = document.body;
      if (small) {
        html.classList.add('mobile-shop-locked');
        body.classList.add('mobile-shop-locked');
      } else {
        html.classList.remove('mobile-shop-locked');
        body.classList.remove('mobile-shop-locked');
      }
    };
    apply();
    window.addEventListener('resize', apply);
    return () => {
      document.documentElement.classList.remove('mobile-shop-locked');
      document.body.classList.remove('mobile-shop-locked');
      window.removeEventListener('resize', apply);
    };
  }, []);

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
      <FilterBar
        locale={locale}
        filters={filters}
        setFilters={setFilters}
        resultCount={productCount}
      />

      {productCount === 0 ? (
        <div className="flex min-h-[100dvh] items-center justify-center bg-paper px-6 text-center text-[14px] text-[var(--ink-soft)]">
          {locale === 'ru'
            ? 'Под выбранные фильтры ничего не нашлось. Попробуйте сбросить.'
            : 'Nothing matches your filters. Try resetting.'}
        </div>
      ) : (
        filtered.map((product, i) => (
          <SlideLayer
            key={product.id}
            product={product}
            index={i}
            total={productCount}
            locale={locale}
          />
        ))
      )}
    </div>
  );
}
