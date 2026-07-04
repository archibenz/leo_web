import type {Metadata} from 'next';
import WhiteAtelierShowcase from './WhiteAtelierShowcase';

// Variant 2 "White" — Atelier / About page (pitch preview at
// /<locale>/white/atelier). noindex; title.absolute opts out of the root template.

type Props = {params: Promise<{locale: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const ru = locale === 'ru';
  return {
    title: {absolute: `${ru ? 'Ателье' : 'The Atelier'} · REINASLEO`},
    description: ru
      ? 'Ателье REINASLEO: продуманные ткани, ручная доводка, одежда для долгого гардероба.'
      : 'The REINASLEO atelier: considered fabrics, hand finishing, clothes for a long wardrobe.',
    robots: {index: true, follow: true},
  };
}

export default async function WhiteAtelierPage({params}: Props) {
  const {locale} = await params;
  return <WhiteAtelierShowcase locale={locale} />;
}
