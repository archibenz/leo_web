import type {Metadata} from 'next';
import WhiteAtelierShowcase from './WhiteAtelierShowcase';

// Variant 2 "White" — Atelier / About page (pitch preview at
// /<locale>/white/atelier). noindex; title.absolute opts out of the root template.

type Props = {params: Promise<{locale: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const ru = locale === 'ru';
  return {
    title: {absolute: `${ru ? 'Ателье' : 'The Atelier'} · REINASLEO — White`},
    robots: {index: false, follow: false},
  };
}

export default async function WhiteAtelierPage({params}: Props) {
  const {locale} = await params;
  return <WhiteAtelierShowcase locale={locale} />;
}
