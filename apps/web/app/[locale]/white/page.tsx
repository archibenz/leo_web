import type {Metadata} from 'next';
import WhiteShowcase from './WhiteShowcase';

// The White storefront home — the site's landing page.

type Props = {params: Promise<{locale: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const ru = locale === 'ru';
  return {
    title: 'REINASLEO',
    description: ru
      ? 'Премиальная женская одежда: платья, пальто, костюмы. Тихая точность кроя — коллекция REINASLEO.'
      : 'Premium womenswear: dresses, coats, tailoring. Quiet precision of cut — the REINASLEO collection.',
    robots: {index: true, follow: true},
  };
}

export default async function WhiteVariantPage({params}: Props) {
  const {locale} = await params;
  return <WhiteShowcase locale={locale} />;
}
