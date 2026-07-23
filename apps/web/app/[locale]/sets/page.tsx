import type {Metadata} from 'next';
import WhiteSetsShowcase from './WhiteSetsShowcase';
import {brandMeta} from '../../../lib/openGraph';

// Curated sets — ready looks assembled from the catalogue.

type Props = {params: Promise<{locale: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const ru = locale === 'ru';
  const title = `${ru ? 'Сеты' : 'Sets'} · REINASLEO`;
  const description = ru
    ? 'Готовые образы из вещей коллекции REINASLEO — целиком или по отдельности.'
    : 'Ready looks assembled from the REINASLEO collection — together or piece by piece.';
  return {
    title: {absolute: title},
    description,
    robots: {index: true, follow: true},
    alternates: {canonical: `/${locale}/sets`},
    ...brandMeta({locale, path: '/sets', title, description}),
  };
}

export default async function WhiteSetsPage({params}: Props) {
  const {locale} = await params;
  return <WhiteSetsShowcase locale={locale} />;
}
