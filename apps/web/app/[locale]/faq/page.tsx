import type {Metadata} from 'next';
import WhiteInfoShowcase from '../info/WhiteInfoShowcase';
import {brandMeta} from '../../../lib/openGraph';

// Variant 2 "White" — FAQ page (pitch preview at /<locale>/faq).
// Indexable — the White variant is the site. title.absolute opts out of the root template.

type Props = {params: Promise<{locale: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const ru = locale === 'ru';
  const title = 'FAQ · REINASLEO';
  const description = ru
    ? 'Ответы на вопросы о размерах, заказах, доставке и возврате REINASLEO.'
    : 'Answers about sizing, orders, delivery and returns at REINASLEO.';
  return {
    title: {absolute: title},
    description,
    robots: {index: true, follow: true},
    alternates: {canonical: `/${locale}/faq`},
    ...brandMeta({locale, path: '/faq', title, description}),
  };
}

export default async function WhiteFaqPage({params}: Props) {
  const {locale} = await params;
  return <WhiteInfoShowcase locale={locale} ns="faq" />;
}
