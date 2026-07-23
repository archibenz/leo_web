import type {Metadata} from 'next';
import WhiteContactShowcase from './WhiteContactShowcase';
import {brandMeta} from '../../../lib/openGraph';

// Variant 2 "White" — Contact page (pitch preview at /<locale>/contact).
// Indexable — the White variant is the site. title.absolute opts out of the root template.

type Props = {params: Promise<{locale: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const ru = locale === 'ru';
  const title = `${ru ? 'Контакты' : 'Contact'} · REINASLEO`;
  const description = ru
    ? 'Свяжитесь с REINASLEO — вопросы о заказах, размерах и коллекции.'
    : 'Get in touch with REINASLEO — questions about orders, sizing and the collection.';
  return {
    title: {absolute: title},
    description,
    robots: {index: true, follow: true},
    alternates: {canonical: `/${locale}/contact`},
    ...brandMeta({locale, path: '/contact', title, description}),
  };
}

export default async function WhiteContactPage({params}: Props) {
  const {locale} = await params;
  return <WhiteContactShowcase locale={locale} />;
}
