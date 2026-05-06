import {Suspense} from 'react';
import type {Metadata} from 'next';
import FooterEditorial from '../../../components/FooterEditorial';
import type {Locale} from '../../../i18n';
import ShopClient from '../../../components/ShopClient';
import {API_BASE} from '../../../lib/api';
import MobileShopReveal from '../v1/shop/MobileShopReveal';
import {mixCatalog} from '../v1/shop/mixCatalog';
import type {ShopItem} from '../v1/shop/types';

type Props = {params: Promise<{locale: Locale}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const isRu = locale === 'ru';
  return {
    title: isRu ? 'Каталог' : 'Shop',
    description: isRu
      ? 'Откройте коллекцию REINASLEO: платья, костюмы, аксессуары премиум-класса.'
      : 'Explore the REINASLEO collection: dresses, suits, and premium accessories.',
    alternates: {
      canonical: `/${locale}/shop`,
      languages: {en: '/en/shop', ru: '/ru/shop'},
    },
  };
}

export default async function ShopPage({params}: Props) {
  const {locale} = await params;

  let products: ShopItem[] = [];
  try {
    const res = await fetch(`${API_BASE}/api/catalog/products`, {next: {revalidate: 60}});
    if (res.ok) products = (await res.json()) as ShopItem[];
  } catch { /* fallback to client-side fetch */ }

  const mixed = mixCatalog(products);

  return (
    <Suspense>
      <div className="hidden lg:block">
        <ShopClient initialProducts={products} />
      </div>
      <div className="lg:hidden">
        <MobileShopReveal
          products={mixed}
          locale={locale}
          footerSlide={<FooterEditorial locale={locale} compact />}
        />
      </div>
    </Suspense>
  );
}
