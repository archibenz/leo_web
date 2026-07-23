import type {Metadata} from 'next';
import WhiteInfoShowcase from '../info/WhiteInfoShowcase';
import {brandMeta} from '../../../lib/openGraph';

// Variant 2 "White" — Garment care page (pitch preview at /<locale>/care).
// Indexable — the White variant is the site. title.absolute opts out of the root template.

type Props = {params: Promise<{locale: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const ru = locale === 'ru';
  const title = `${ru ? 'Уход за вещами' : 'Garment care'} · REINASLEO`;
  const description = ru
    ? 'Как ухаживать за вещами REINASLEO — стирка, хранение и повседневный уход.'
    : 'How to care for your REINASLEO garments — washing, storage and everyday keeping.';
  return {
    title: {absolute: title},
    description,
    robots: {index: true, follow: true},
    alternates: {canonical: `/${locale}/care`},
    ...brandMeta({locale, path: '/care', title, description}),
  };
}

export default async function WhiteCarePage({params}: Props) {
  const {locale} = await params;
  return <WhiteInfoShowcase locale={locale} ns="care" />;
}
