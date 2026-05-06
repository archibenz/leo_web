'use client';

import {useEffect, useMemo, type ReactNode} from 'react';
import {useSearchParams} from 'next/navigation';
import FooterSlide from './FooterSlide';
import SlideLayer from './SlideLayer';
import type {MobileShopItem} from './types';

interface MobileShopRevealProps {
  products: MobileShopItem[];
  locale: string;
  footerSlide?: ReactNode;
}

export default function MobileShopReveal({products, locale, footerSlide}: MobileShopRevealProps) {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter');
  const categoryParam = searchParams.get('category');

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (filterParam === 'new' && p.badge !== 'new') return false;
      if (filterParam === 'popular' && p.badge !== 'popular') return false;
      if (categoryParam && p.category !== categoryParam) return false;
      return true;
    });
  }, [products, filterParam, categoryParam]);

  // Lock mobile-shop scroll-snap CSS only when we actually render the
  // slide-stack. With an empty filtered catalogue the global footer must stay
  // visible — otherwise users see a blank "Каталог пуст" page with nothing
  // below it.
  const hasSlides = filtered.length > 0;
  useEffect(() => {
    const apply = () => {
      const small = window.innerWidth < 1024;
      const html = document.documentElement;
      const body = document.body;
      if (small && hasSlides) {
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
  }, [hasSlides]);

  if (!products.length) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-paper px-6 text-center text-[var(--ink-soft)]">
        {locale === 'ru' ? 'Каталог временно пуст.' : 'The catalog is empty right now.'}
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-paper px-6 text-center text-[14px] text-[var(--ink-soft)]">
        {locale === 'ru'
          ? 'В этой подборке пока нет товаров. Откройте меню и попробуйте другой раздел.'
          : 'Nothing in this section yet. Open the menu and try another one.'}
      </div>
    );
  }

  return (
    <div className="relative bg-paper">
      {filtered.map((product, i) => (
        <SlideLayer
          key={product.id}
          product={product}
          index={i}
          total={filtered.length}
          locale={locale}
        />
      ))}
      {footerSlide ? (
        <FooterSlide zIndex={1 + filtered.length} locale={locale}>
          {footerSlide}
        </FooterSlide>
      ) : null}
    </div>
  );
}
