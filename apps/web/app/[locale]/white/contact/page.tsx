import type {Metadata} from 'next';
import WhiteContactShowcase from './WhiteContactShowcase';

// Variant 2 "White" — Contact page (pitch preview at /<locale>/white/contact).
// noindex; title.absolute opts out of the root template.

type Props = {params: Promise<{locale: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const ru = locale === 'ru';
  return {
    title: {absolute: `${ru ? 'Контакты' : 'Contact'} · REINASLEO — White`},
    robots: {index: false, follow: false},
  };
}

export default async function WhiteContactPage({params}: Props) {
  const {locale} = await params;
  return <WhiteContactShowcase locale={locale} />;
}
