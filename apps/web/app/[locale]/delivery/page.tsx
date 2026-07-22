import type {Metadata} from 'next';
import WhiteInfoShowcase from '../info/WhiteInfoShowcase';

// Variant 2 "White" — Delivery & returns page (pitch preview at /<locale>/delivery).
// Indexable — the White variant is the site. title.absolute opts out of the root template.

type Props = {params: Promise<{locale: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const ru = locale === 'ru';
  return {
    title: {absolute: `${ru ? 'Доставка и возврат' : 'Delivery & returns'} · REINASLEO`},
    robots: {index: true, follow: true},
  };
}

export default async function WhiteDeliveryPage({params}: Props) {
  const {locale} = await params;
  return <WhiteInfoShowcase locale={locale} ns="delivery" />;
}
