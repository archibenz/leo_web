import type {Metadata} from 'next';
import WhiteSetsShowcase from './WhiteSetsShowcase';

// Curated sets — ready looks assembled from the catalogue.

type Props = {params: Promise<{locale: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const ru = locale === 'ru';
  return {
    title: {absolute: `${ru ? 'Сеты' : 'Sets'} · REINASLEO`},
    description: ru
      ? 'Готовые образы из вещей коллекции REINASLEO — целиком или по отдельности.'
      : 'Ready looks assembled from the REINASLEO collection — together or piece by piece.',
    robots: {index: true, follow: true},
  };
}

export default async function WhiteSetsPage({params}: Props) {
  const {locale} = await params;
  return <WhiteSetsShowcase locale={locale} />;
}
