import {Suspense} from 'react';
import type {Metadata} from 'next';
import Footer from '../../../../components/Footer';
import type {Locale} from '../../../../i18n';
import {API_BASE} from '../../../../lib/api';
import DesktopNudge from './DesktopNudge';
import MobileShopReveal from './MobileShopReveal';
import {mixCatalog} from './mixCatalog';
import type {ShopItem} from './types';

type Props = {params: Promise<{locale: Locale}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const isRu = locale === 'ru';
  return {
    title: isRu ? 'Каталог · Мобильный' : 'Shop · Mobile',
    description: isRu
      ? 'Полноэкранный мобильный просмотр коллекции REINASLEO.'
      : 'Full-screen mobile view of the REINASLEO collection.',
    robots: {index: false, follow: false},
    alternates: {canonical: `/${locale}/v1/shop`},
  };
}

export default async function MobileShopPage({params}: Props) {
  const {locale} = await params;

  let products: ShopItem[] = [];
  try {
    const res = await fetch(`${API_BASE}/api/catalog/products`, {next: {revalidate: 60}});
    if (res.ok) products = (await res.json()) as ShopItem[];
  } catch { /* render empty state on fetch failure */ }

  const mixed = mixCatalog(products);

  return (
    <Suspense>
      <div className="hidden lg:block">
        <DesktopNudge locale={locale} />
      </div>
      <div className="lg:hidden">
        <MobileShopReveal
          products={mixed}
          locale={locale}
          footerSlide={<Footer locale={locale} compact />}
        />
      </div>
    </Suspense>
  );
}
