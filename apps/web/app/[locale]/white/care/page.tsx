import type {Metadata} from 'next';
import WhiteInfoShowcase from '../info/WhiteInfoShowcase';

// Variant 2 "White" — Garment care page (pitch preview at /<locale>/white/care).
// noindex; title.absolute opts out of the root template.

type Props = {params: Promise<{locale: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const ru = locale === 'ru';
  return {
    title: {absolute: `${ru ? 'Уход за вещами' : 'Garment care'} · REINASLEO — White`},
    robots: {index: false, follow: false},
  };
}

export default async function WhiteCarePage({params}: Props) {
  const {locale} = await params;
  return <WhiteInfoShowcase locale={locale} ns="care" />;
}
