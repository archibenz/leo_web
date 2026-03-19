import {Suspense} from 'react';
import type {Metadata} from 'next';
import type {Locale} from '../../../i18n';
import ShopClient from '../../../components/ShopClient';

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
  void locale;
  return (
    <Suspense>
      <ShopClient />
    </Suspense>
  );
}
