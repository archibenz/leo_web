import type {Metadata} from 'next';
import WhiteLookbookShowcase from './WhiteLookbookShowcase';
import {brandMeta} from '../../../lib/openGraph';

// Variant 2 "White" — Lookbook page (pitch preview at /<locale>/lookbook).
// Indexable — the White variant is the site. title.absolute opts out of the root template.

type Props = {params: Promise<{locale: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const ru = locale === 'ru';
  const title = `${ru ? 'Лукбук' : 'Lookbook'} · REINASLEO`;
  const description = ru
    ? 'Лукбук REINASLEO — editorial-съёмки коллекции.'
    : 'The REINASLEO lookbook — editorial shots of the collection.';
  return {
    title: {absolute: title},
    description,
    robots: {index: true, follow: true},
    alternates: {canonical: `/${locale}/lookbook`},
    ...brandMeta({locale, path: '/lookbook', title, description}),
  };
}

export default async function WhiteLookbookPage({params}: Props) {
  const {locale} = await params;
  return <WhiteLookbookShowcase locale={locale} />;
}
