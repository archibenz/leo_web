import type {Metadata} from 'next';
import WhiteLookbookShowcase from './WhiteLookbookShowcase';

// Variant 2 "White" — Lookbook page (pitch preview at /<locale>/lookbook).
// Indexable — the White variant is the site. title.absolute opts out of the root template.

type Props = {params: Promise<{locale: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const ru = locale === 'ru';
  return {
    title: {absolute: `${ru ? 'Лукбук' : 'Lookbook'} · REINASLEO`},
    description: ru
      ? 'Лукбук REINASLEO — editorial-съёмки коллекции.'
      : 'The REINASLEO lookbook — editorial shots of the collection.',
    robots: {index: true, follow: true},
  };
}

export default async function WhiteLookbookPage({params}: Props) {
  const {locale} = await params;
  return <WhiteLookbookShowcase locale={locale} />;
}
